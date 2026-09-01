/** User-facing CrofAI commands and connection workflows. */

import * as vscode from "vscode";
import { CrofAIAuth } from "../auth/auth";
import { messageOf } from "../errors";
import { API_BASE, CrofAIProvider } from "../provider";

const API_KEYS_URL = "https://crof.ai/dashboard";

export function registerCommands(
  auth: CrofAIAuth,
  provider: CrofAIProvider,
  output: vscode.OutputChannel,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand("crofCopilot.manage", () => manage(auth, provider, output)),
    vscode.commands.registerCommand("crofCopilot.configureApiKey", () => configureApiKey(provider, output)),
    vscode.commands.registerCommand("crofCopilot.removeApiKey", () => removeApiKey(provider)),
    vscode.commands.registerCommand("crofCopilot.refreshModels", () => refreshModels(provider)),
    vscode.commands.registerCommand("crofCopilot.testConnection", () => testConnection(provider, output)),
    vscode.commands.registerCommand("crofCopilot.openApiKeys", () => openApiKeys()),
    vscode.commands.registerCommand("crofCopilot.diagnostics", () => diagnostics(auth, output)),
  ];
}

async function manage(
  auth: CrofAIAuth,
  provider: CrofAIProvider,
  output: vscode.OutputChannel,
): Promise<void> {
  const configured = await auth.hasApiKey();
  const choices = configured
    ? [
        { label: "$(check) Test CrofAI inference", action: "test" },
        { label: "$(refresh) Refresh hosted models", action: "refresh" },
        { label: "$(key) Replace API key", action: "configure" },
        { label: "$(link-external) Open CrofAI API keys", action: "open" },
        { label: "$(output) Show CrofAI logs", action: "logs" },
        { label: "$(info) Show diagnostics", action: "diagnostics" },
        { label: "$(trash) Remove API key", action: "remove" },
      ]
    : [
        { label: "$(key) Configure CrofAI API key", action: "configure" },
        { label: "$(link-external) Open CrofAI API keys", action: "open" },
        { label: "$(output) Show CrofAI logs", action: "logs" },
      ];
  const picked = await vscode.window.showQuickPick(choices, {
    title: `CrofAI — API key ${configured ? "configured" : "not configured"}`,
  });
  if (!picked) return;
  if (picked.action === "configure") await configureApiKey(provider, output);
  else if (picked.action === "refresh") await refreshModels(provider);
  else if (picked.action === "test") await testConnection(provider, output);
  else if (picked.action === "open") await openApiKeys();
  else if (picked.action === "logs") output.show(true);
  else if (picked.action === "diagnostics") await diagnostics(auth, output);
  else if (picked.action === "remove") await removeApiKey(provider);
}

async function configureApiKey(
  provider: CrofAIProvider,
  output: vscode.OutputChannel,
): Promise<boolean> {
  const apiKey = await vscode.window.showInputBox({
    title: "Configure CrofAI API key",
    prompt: "The key is validated with CrofAI, then stored in VS Code Secret Storage.",
    placeHolder: "Paste your CrofAI API key",
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => value.trim() ? undefined : "Enter a CrofAI API key",
  });
  if (!apiKey) return false;

  try {
    const models = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Validating CrofAI API key…" },
      () => provider.configureApiKey(apiKey),
    );
    output.appendLine(`[auth] API key configured; models=${models.join(",")}`);
    vscode.window.showInformationMessage(`CrofAI connected. Found ${models.length} hosted models.`);
    return true;
  } catch (error) {
    const message = messageOf(error);
    output.appendLine(`[auth] API key validation failed: ${message}`);
    vscode.window.showErrorMessage(`CrofAI API key was not saved: ${message}`);
    return false;
  }
}

async function removeApiKey(provider: CrofAIProvider): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    "Remove the CrofAI API key from VS Code Secret Storage?",
    { modal: true },
    "Remove API Key",
  );
  if (choice !== "Remove API Key") return;
  await provider.clearApiKey();
  vscode.window.showInformationMessage("CrofAI API key removed.");
}

async function refreshModels(provider: CrofAIProvider): Promise<void> {
  try {
    const models = await provider.refreshModels();
    vscode.window.showInformationMessage(`Refreshed ${models.length} CrofAI hosted models.`);
  } catch (error) {
    vscode.window.showErrorMessage(messageOf(error));
  }
}

async function testConnection(provider: CrofAIProvider, output: vscode.OutputChannel): Promise<void> {
  try {
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Testing CrofAI inference…" },
      () => provider.testConnection(),
    );
    output.appendLine(`[test] model=${result.model} effort=${result.reasoningEffort} response=${result.text}`);
    vscode.window.showInformationMessage(
      `CrofAI verified with ${result.model} (${result.reasoningEffort} effort): ${result.text}`,
    );
  } catch (error) {
    const message = messageOf(error);
    output.appendLine(`[test] ${message}`);
    vscode.window.showErrorMessage(`CrofAI connection test failed: ${message}`);
  }
}

async function openApiKeys(): Promise<void> {
  const opened = await vscode.env.openExternal(vscode.Uri.parse(API_KEYS_URL));
  if (!opened) vscode.window.showWarningMessage("VS Code could not open the CrofAI dashboard.");
}

async function diagnostics(auth: CrofAIAuth, output: vscode.OutputChannel): Promise<void> {
  const models = await vscode.lm.selectChatModels({ vendor: "crof" });
  const lines = [
    "# CrofAI for Copilot Chat diagnostics",
    "",
    `- VS Code: ${vscode.version}`,
    `- API endpoint: ${API_BASE}`,
    `- API key: ${(await auth.hasApiKey()) ? "configured in Secret Storage" : "missing"}`,
    `- Default reasoning effort: ${vscode.workspace.getConfiguration("crofCopilot").get("reasoningEffort", "high")}`,
    `- Registered models: ${models.length}`,
    "",
    ...models.map((model) => `- ${model.id} (${model.maxInputTokens} input tokens)`),
  ];
  output.appendLine(`[diagnostics] models=${models.length}`);
  const doc = await vscode.workspace.openTextDocument({ content: lines.join("\n"), language: "markdown" });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}
