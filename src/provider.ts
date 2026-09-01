import * as vscode from "vscode";
import { CrofAIAuth } from "./auth/auth";
import { messageOf } from "./errors";
import {
  FALLBACK_MODEL_METADATA,
  FALLBACK_MODELS,
  formatTokenLimit,
  formatModelName,
  orderModelMetadata,
  resolveMaxOutputTokens,
  type CrofAIApiModel,
  type CrofAIModelMetadata,
} from "./models/catalog";
import {
  DEFAULT_REASONING_EFFORT,
  applyReasoningEffort,
  buildModelConfigurationSchema,
  resolveReasoningEffort,
  type ReasoningEffort,
} from "./models/options";
import { modelPricingFields } from "./models/pricing";
import { ChatCompletionStreamParser, type ChatStreamEvent, validateStreamCompletion } from "./transport/sse";
import { CROF_ENDPOINTS, crofHeaders } from "./transport/protocol";
import { toProviderUsagePayload } from "./usage/domain";
import { apiKeyFromConfiguration, credentialRefForApiKey, qualifiedModelId } from "./provider-profile";

export { API_BASE } from "./transport/protocol";

export interface CrofAIModel extends vscode.LanguageModelChatInformation {
  rawModelId: string;
  credentialRef: string;
}

interface ApiMessage {
  role: "user" | "assistant" | "tool";
  content: string | ApiContentPart[] | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
}

interface ApiContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ApiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export class CrofAIProvider implements vscode.LanguageModelChatProvider<CrofAIModel> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation = this.changeEmitter.event;
  private readonly catalogs = new Map<string, CrofAIModelMetadata[]>();
  private readonly refreshedAt = new Map<string, number>();
  private readonly apiKeys = new Map<string, string>();

  private get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("crofCopilot");
  }

  private get debugLogging(): boolean {
    return this.configuration.get("debugLogging", false);
  }

  constructor(
    private readonly auth: CrofAIAuth,
    private readonly output: vscode.OutputChannel,
    private readonly userAgent: string,
  ) {}

  fireDidChange(): void {
    this.changeEmitter.fire();
  }

  async configureApiKey(apiKey: string): Promise<string[]> {
    const models = await this.fetchModels(apiKey.trim());
    await this.auth.storeApiKey(apiKey);
    this.setCatalog("legacy", models);
    this.changeEmitter.fire();
    return models.map(({ id }) => id);
  }

  async clearApiKey(): Promise<void> {
    await this.auth.clearApiKey();
    this.apiKeys.delete("legacy");
    this.setCatalog("legacy", [...FALLBACK_MODEL_METADATA]);
    this.refreshedAt.delete("legacy");
    this.changeEmitter.fire();
  }

  async refreshModels(): Promise<string[]> {
    const apiKey = await this.requireApiKey(false, "legacy");
    const models = await this.refreshCatalog("legacy", apiKey);
    this.changeEmitter.fire();
    return models.map(({ id }) => id);
  }

  async provideLanguageModelChatInformation(
    options: vscode.PrepareLanguageModelChatModelOptions,
    token: vscode.CancellationToken,
  ): Promise<CrofAIModel[]> {
    const legacyApiKey = await this.auth.getApiKey();
    const configuredApiKey = options.configuration
      ? apiKeyFromConfiguration(options.configuration)
      : undefined;
    if (token.isCancellationRequested || (options.configuration && !configuredApiKey)) return [];
    const apiKey = configuredApiKey ?? legacyApiKey;
    const credentialRef = configuredApiKey
      ? credentialRefForApiKey(configuredApiKey, legacyApiKey)
      : "legacy";
    if (apiKey) this.apiKeys.set(credentialRef, apiKey);
    const maxAge = Math.max(1, this.configuration.get("catalogCacheMinutes", 5)) * 60_000;
    if (apiKey && Date.now() - (this.refreshedAt.get(credentialRef) ?? 0) > maxAge) {
      try {
        await this.refreshCatalog(credentialRef, apiKey, token);
      } catch (error) {
        if (!token.isCancellationRequested) {
          this.output.appendLine(`[models] discovery failed; using cached/fallback list: ${messageOf(error)}`);
        }
      }
    }

    const defaultEffort = resolveReasoningEffort(
      undefined,
      this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT),
    );
    return this.catalogFor(credentialRef).map((metadata) => {
      const pricing = modelPricingFields(metadata.cost);
      return {
        id: qualifiedModelId(credentialRef, metadata.id),
        rawModelId: metadata.id,
        credentialRef,
        name: metadata.name || formatModelName(metadata.id),
        family: modelFamily(metadata.id),
        version: metadata.version,
        detail: credentialRef === "legacy"
          ? (apiKey ? "CrofAI" : "CrofAI API key required")
          : `CrofAI · ${credentialRef.slice(0, 8)}`,
        tooltip: `${metadata.id} via CrofAI · ${formatTokenLimit(metadata.contextLength)} context · ${formatTokenLimit(metadata.maxOutputTokens)} max output${metadata.imageInput ? " · image input" : " · text input"}${pricing ? ` · ${pricing.pricing}` : ""}`,
        maxInputTokens: metadata.contextLength,
        maxOutputTokens: metadata.maxOutputTokens,
        isUserSelectable: true,
        ...(credentialRef !== "legacy" ? { isBYOK: true } : {}),
        ...(credentialRef === "legacy" && !apiKey
          ? { requiresAuthorization: { label: "Configure CrofAI API key" } }
          : {}),
        configurationSchema: buildModelConfigurationSchema(defaultEffort),
        capabilities: {
          imageInput: metadata.imageInput,
          toolCalling: true,
        },
        ...(pricing ?? {}),
      };
    });
  }

  async provideLanguageModelChatResponse(
    model: CrofAIModel,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart2>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const apiKey = await this.requireApiKey(false, model.credentialRef);
    const reasoningEffort = resolveReasoningEffort(
      options.modelConfiguration,
      this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT),
    );
    const requestBody = buildRequest(
      model.rawModelId,
      messages,
      options,
      reasoningEffort,
      model.maxOutputTokens,
      Boolean(model.capabilities?.imageInput),
    );
    const controller = new AbortController();
    const cancellation = token.onCancellationRequested(() => controller.abort());
    const timeoutSeconds = Math.max(10, this.configuration.get("requestTimeoutSeconds", 600));
    const idleTimeoutSeconds = Math.max(10, this.configuration.get("streamIdleTimeoutSeconds", 120));
    let timedOut: "total" | "idle" | undefined;
    const totalTimeout = setTimeout(() => {
      timedOut = "total";
      controller.abort();
    }, timeoutSeconds * 1000);
    let idleTimeout: ReturnType<typeof setTimeout> | undefined;
    const resetIdleTimeout = (): void => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        timedOut = "idle";
        controller.abort();
      }, idleTimeoutSeconds * 1000);
    };
    resetIdleTimeout();
    try {
      if (this.debugLogging) {
        this.output.appendLine(`[request] model=${model.rawModelId} effort=${reasoningEffort} initiator=${options.requestInitiator ?? "unknown"}`);
      }
      const response = await fetch(CROF_ENDPOINTS.chat, {
        method: "POST",
        headers: this.requestHeaders(apiKey, "text/event-stream"),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      if (!response.ok) throw await apiError(`CrofAI request failed for ${model.rawModelId}`, response);
      if (!response.body) throw new Error("CrofAI returned an empty response stream");

      const parser = new ChatCompletionStreamParser();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        if (token.isCancellationRequested) {
          await reader.cancel();
          return;
        }
        const result = await reader.read();
        if (result.done) break;
        resetIdleTimeout();
        for (const event of parser.push(decoder.decode(result.value, { stream: true }))) {
          this.reportEvent(event, progress);
        }
      }
      for (const event of parser.finish()) this.reportEvent(event, progress);
      validateStreamCompletion(parser.finishReason);
    } catch (error) {
      if (token.isCancellationRequested) return;
      if (timedOut === "idle") throw new Error(`CrofAI request for ${model.rawModelId} received no data for ${idleTimeoutSeconds} seconds`);
      if (timedOut === "total") throw new Error(`CrofAI request for ${model.rawModelId} exceeded ${timeoutSeconds} seconds`);
      throw error;
    } finally {
      clearTimeout(totalTimeout);
      if (idleTimeout) clearTimeout(idleTimeout);
      cancellation.dispose();
    }
  }

  async provideTokenCount(
    _model: CrofAIModel,
    value: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    const text = typeof value === "string" ? value : messageToText(value);
    return Math.max(1, Math.ceil(text.length / 4));
  }

  async testConnection(): Promise<{ model: string; reasoningEffort: ReasoningEffort; text: string }> {
    const credentialRef = "legacy";
    const apiKey = await this.requireApiKey(false, credentialRef);
    const models = this.catalogFor(credentialRef);
    const model = models[0]?.id ?? FALLBACK_MODELS[0];
    const reasoningEffort = resolveReasoningEffort(
      undefined,
      this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT),
    );
    const response = await fetch(CROF_ENDPOINTS.chat, {
      method: "POST",
      headers: this.requestHeaders(apiKey, "application/json"),
      body: JSON.stringify(applyReasoningEffort({
        model,
        messages: [{ role: "user", content: "Reply with exactly: CrofAI connection verified" }],
        max_completion_tokens: 512,
        stream: false,
      }, reasoningEffort)),
    });
    if (!response.ok) throw await apiError("CrofAI connection test failed", response);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { model, reasoningEffort, text: body.choices?.[0]?.message?.content?.trim() ?? "(empty response)" };
  }

  private async fetchModels(apiKey: string): Promise<CrofAIModelMetadata[]> {
    if (!apiKey) throw new Error("CrofAI API key is not configured");
    const response = await fetch(CROF_ENDPOINTS.models, {
      headers: this.requestHeaders(apiKey, "application/json, application/problem+json"),
    });
    if (!response.ok) throw await apiError("Unable to list CrofAI models", response);
    const body = (await response.json()) as { data?: CrofAIApiModel[] };
    const models = orderModelMetadata(body.data ?? []);
    if (!models.length) throw new Error("CrofAI returned no chat-capable models");
    if (this.debugLogging) this.output.appendLine(`[models] ${models.map(({ id }) => id).join(", ")}`);
    return models;
  }

  private async requireApiKey(prompt: boolean, credentialRef: string): Promise<string> {
    let apiKey = credentialRef === "legacy" ? await this.auth.getApiKey() : this.apiKeys.get(credentialRef);
    if (!apiKey && prompt && credentialRef === "legacy") {
      await vscode.commands.executeCommand("crofCopilot.configureApiKey");
      apiKey = await this.auth.getApiKey();
    }
    if (!apiKey) {
      throw new Error(credentialRef === "legacy"
        ? "CrofAI API key is not configured. Run ‘CrofAI: Configure API Key’."
        : "The API key for this CrofAI provider entry is unavailable. Update the entry in Manage Language Models.");
    }
    return apiKey;
  }

  private catalogFor(credentialRef: string): CrofAIModelMetadata[] {
    let catalog = this.catalogs.get(credentialRef);
    if (!catalog) {
      catalog = [...FALLBACK_MODEL_METADATA];
      this.catalogs.set(credentialRef, catalog);
    }
    return catalog;
  }

  private setCatalog(credentialRef: string, models: readonly CrofAIModelMetadata[]): void {
    this.catalogs.set(credentialRef, [...models]);
    this.refreshedAt.set(credentialRef, Date.now());
  }

  private async refreshCatalog(
    credentialRef: string,
    apiKey: string,
    token?: vscode.CancellationToken,
  ): Promise<CrofAIModelMetadata[]> {
    if (token?.isCancellationRequested) return this.catalogFor(credentialRef);
    const models = await this.fetchModels(apiKey);
    this.setCatalog(credentialRef, models);
    return models;
  }

  private requestHeaders(apiKey: string, accept: string): Record<string, string> {
    return crofHeaders(apiKey, accept, this.userAgent);
  }

  private reportEvent(
    event: ChatStreamEvent,
    progress: vscode.Progress<vscode.LanguageModelResponsePart2>,
  ): void {
    if (event.text) progress.report(new vscode.LanguageModelTextPart(event.text));
    if (event.reasoning) {
      const ThinkingPart = (vscode as unknown as { LanguageModelThinkingPart?: typeof vscode.LanguageModelThinkingPart })
        .LanguageModelThinkingPart;
      if (ThinkingPart) progress.report(new ThinkingPart(event.reasoning));
    }
    for (const tool of event.toolCalls ?? []) {
      progress.report(new vscode.LanguageModelToolCallPart(
        tool.id || `Crof-tool-${Date.now()}`,
        tool.name,
        parseArguments(tool.arguments),
      ));
    }
    if (event.usage) {
      const payload = toProviderUsagePayload(event.usage);
      if (this.debugLogging) this.output.appendLine(`[usage] ${JSON.stringify(payload)}`);
      progress.report(new vscode.LanguageModelDataPart(
        new TextEncoder().encode(JSON.stringify(payload)),
        "usage",
      ));
    }
  }
}

function buildRequest(
  model: string,
  messages: readonly vscode.LanguageModelChatRequestMessage[],
  options: vscode.ProvideLanguageModelChatResponseOptions,
  reasoningEffort: ReasoningEffort,
  advertisedMaxTokens: number,
  imageInput: boolean,
): Record<string, unknown> {
  const configuredMaxTokens = vscode.workspace
    .getConfiguration("crofCopilot")
    .get("maxOutputTokens", 0);
  const maxTokens = resolveMaxOutputTokens(configuredMaxTokens, advertisedMaxTokens);
  const tools = (options.tools ?? []).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: sanitizeSchema(tool.inputSchema),
    },
  }));
  return applyReasoningEffort({
    model,
    messages: normalizeMessages(messages.flatMap((message) => convertMessage(message, imageInput))),
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: maxTokens,
    ...(tools.length ? { tools, tool_choice: toolMode(options.toolMode), parallel_tool_calls: true } : {}),
  }, reasoningEffort);
}

function convertMessage(message: vscode.LanguageModelChatRequestMessage, imageInput: boolean): ApiMessage[] {
  const role = message.role === vscode.LanguageModelChatMessageRole.Assistant ? "assistant" : "user";
  const text: string[] = [];
  const images: ApiContentPart[] = [];
  const toolCalls: ApiToolCall[] = [];
  const results: ApiMessage[] = [];

  for (const part of message.content) {
    if (part instanceof vscode.LanguageModelTextPart) text.push(part.value);
    else if (part instanceof vscode.LanguageModelToolCallPart) {
      toolCalls.push({
        id: part.callId,
        type: "function",
        function: { name: part.name, arguments: JSON.stringify(part.input ?? {}) },
      });
    } else if (part instanceof vscode.LanguageModelToolResultPart) {
      results.push({ role: "tool", tool_call_id: part.callId, content: part.content.map(inputPartText).join("\n") });
    } else if (part instanceof vscode.LanguageModelDataPart && part.mimeType.startsWith("image/")) {
      if (!imageInput) throw new Error("The selected CrofAI model does not advertise image input support.");
      images.push({
        type: "image_url",
        image_url: { url: `data:${part.mimeType};base64,${Buffer.from(part.data).toString("base64")}` },
      });
    }
  }

  const plainText = text.join("\n");
  const content: string | ApiContentPart[] = images.length
    ? [...(plainText ? [{ type: "text" as const, text: plainText }] : []), ...images]
    : plainText;
  if (role === "assistant" && toolCalls.length) {
    return [{ role, content: content || null, tool_calls: toolCalls }];
  }
  if (results.length) return content ? [{ role, content }, ...results] : results;
  return [{ role, content }];
}

function normalizeMessages(messages: ApiMessage[]): ApiMessage[] {
  const filtered = messages.filter((message) =>
    Boolean(message.tool_calls?.length || message.tool_call_id || message.content),
  );
  if (filtered[0]?.role === "assistant") {
    filtered.unshift({ role: "user", content: "Continue from the previous assistant response." });
  }
  return filtered.length ? filtered : [{ role: "user", content: "" }];
}

function inputPartText(part: vscode.LanguageModelInputPart | unknown): string {
  if (part instanceof vscode.LanguageModelTextPart) return part.value;
  if (part instanceof vscode.LanguageModelToolCallPart) return JSON.stringify(part.input ?? {});
  if (part instanceof vscode.LanguageModelToolResultPart) return part.content.map(inputPartText).join("\n");
  if (part instanceof vscode.LanguageModelDataPart) return `[${part.mimeType} data omitted]`;
  if (typeof part === "string") return part;
  return "";
}

function messageToText(message: vscode.LanguageModelChatRequestMessage): string {
  return message.content.map(inputPartText).join("\n");
}

function sanitizeSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object", properties: {} };
  }
  return schema as Record<string, unknown>;
}

function toolMode(mode: vscode.LanguageModelChatToolMode | undefined): "auto" | "required" {
  return mode === vscode.LanguageModelChatToolMode.Required ? "required" : "auto";
}

function parseArguments(value: string): object {
  try {
    const parsed = JSON.parse(value || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : { value: parsed };
  } catch {
    return { value };
  }
}

async function apiError(prefix: string, response: Response): Promise<Error> {
  const text = (await response.text().catch(() => "")).trim();
  let detail = text;
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string } | string;
      detail?: string;
      message?: string;
      title?: string;
    };
    detail = typeof json.error === "string"
      ? json.error
      : json.error?.message ?? json.detail ?? json.message ?? json.title ?? text;
  } catch {
    // Use the response text as-is.
  }
  return new Error(`${prefix} (HTTP ${response.status})${detail ? `: ${detail.slice(0, 1000)}` : ""}`);
}

function modelFamily(modelId: string): string {
  return modelId.toLowerCase().split(/[-/]/, 1)[0] || "crofai";
}
