import { crofModelCost, modelCostFromApi, type ModelCost } from "./pricing";
import type { ModelsDevModelMetadata } from "./metadata";

export const FALLBACK_MODELS = [
  "deepseek-v4-pro-0813",
  "deepseek-v4-flash-0731",
  "deepseek-v4-flash-vision-exp",
  "kimi-k3",
  "kimi-k3-eco",
  "kimi-k2.7-code",
  "kimi-k2.6",
  "glm-5.3",
  "glm-5.3-flash",
  "glm-5.2",
  "greg-2-ultra",
  "greg-2-super",
  "mimo-v2.5-pro",
  "gemma-4-31b-it",
  "qwen3.8-27b",
  "qwen3.5-9b",
] as const;

export const DEFAULT_MAX_INPUT_TOKENS = 262_144;
export const DEFAULT_MAX_OUTPUT_TOKENS = 131_072;

const OFFICIAL_REASONING_EFFORT_MODELS = new Set([
  "deepseek-v4-pro-0813",
  "deepseek-v4-flash-0731",
  "deepseek-v4-flash-vision-exp",
  "kimi-k3",
  "kimi-k3-eco",
  "kimi-k2.7-code",
  "kimi-k2.6",
  "glm-5.3",
  "glm-5.3-flash",
  "glm-5.2",
  "mimo-v2.5-pro",
  "gemma-4-31b-it",
  "qwen3.8-27b",
  "qwen3.5-9b",
]);

export interface CrofAIModelMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly contextLength: number;
  readonly maxOutputTokens: number;
  readonly imageInput: boolean;
  readonly toolCalling: boolean;
  readonly reasoningEffort: boolean;
  readonly description?: string;
  readonly releaseDate?: string;
  readonly cost?: ModelCost;
}

export interface CrofAIApiModel {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly version?: unknown;
  readonly context_length?: unknown;
  readonly max_context_tokens?: unknown;
  readonly max_model_len?: unknown;
  readonly max_output_tokens?: unknown;
  readonly max_completion_tokens?: unknown;
  readonly input_modalities?: unknown;
  readonly architecture?: unknown;
  readonly pricing?: unknown;
  readonly tool_calling?: unknown;
  readonly tool_call?: unknown;
  readonly reasoning_effort?: unknown;
  readonly custom_reasoning?: unknown;
  readonly description?: unknown;
  readonly created?: unknown;
}

const OFFICIAL_MODEL_NAMES: Readonly<Record<string, string>> = {
  "deepseek-v4-flash-vision-exp": "DeepSeek V4 Flash Vision (Experimental)",
};

const VENDOR_LABELS: Readonly<Record<string, string>> = {
  deepseek: "DeepSeek",
  kimi: "Kimi",
  glm: "GLM",
  greg: "Greg",
  mimo: "MiMo",
  gemma: "Gemma",
  qwen: "Qwen",
};

export const FALLBACK_MODEL_METADATA: readonly CrofAIModelMetadata[] = [
  model("deepseek-v4-pro-0813", 1_000_000, 131_072),
  model("deepseek-v4-flash-0731", 1_000_000, 131_072),
  model("deepseek-v4-flash-vision-exp", 1_000_000, 131_072, true),
  model("kimi-k3", 1_000_000, 262_144),
  model("kimi-k3-eco", 1_000_000, 131_072),
  model("kimi-k2.7-code", 262_144, 262_144),
  model("kimi-k2.6", 262_144, 262_144),
  model("glm-5.3", 1_000_000, 131_072),
  model("glm-5.3-flash", 1_000_000, 131_072),
  model("glm-5.2", 1_000_000, 131_072),
  model("greg-2-ultra", 229_376, 229_376),
  model("greg-2-super", 229_376, 229_376),
  model("mimo-v2.5-pro", 1_000_000, 131_072),
  model("gemma-4-31b-it", 262_144, 262_144),
  model("qwen3.8-27b", 262_144, 262_144),
  model("qwen3.5-9b", 262_144, 262_144),
];

const PREFERRED_ORDER = new Map<string, number>(FALLBACK_MODELS.map((id, index) => [id, index]));
const FALLBACK_METADATA_BY_ID = new Map(FALLBACK_MODEL_METADATA.map((metadata) => [metadata.id, metadata]));

export function isCrofAIChatModel(id: string): boolean {
  const value = id.trim().toLowerCase();
  return Boolean(value) && !/(?:^|[-/])(point|embed(?:ding)?s?|image|video|audio|voice|rerank)(?:[-/.]|$)/.test(value);
}

export function orderModels(ids: readonly string[]): string[] {
  return [...new Set(ids.map(canonicalModelId))].filter(isCrofAIChatModel).sort((left, right) => {
    const leftRank = PREFERRED_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = PREFERRED_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.localeCompare(right);
  });
}

export function getModelMetadata(id: string): CrofAIModelMetadata {
  const canonical = canonicalModelId(id);
  return (
    FALLBACK_METADATA_BY_ID.get(canonical) ?? model(canonical, DEFAULT_MAX_INPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS)
  );
}

export function resolveMaxOutputTokens(configured: number, advertised: number): number {
  return configured > 0 ? Math.min(configured, advertised) : advertised;
}

export function orderModelMetadata(models: readonly CrofAIApiModel[]): CrofAIModelMetadata[] {
  const discovered = new Map<string, CrofAIModelMetadata>();
  for (const raw of models) {
    const metadata = modelMetadataFromApi(raw);
    if (metadata && !discovered.has(metadata.id)) discovered.set(metadata.id, metadata);
  }
  if (!discovered.size) return [...FALLBACK_MODEL_METADATA];
  return orderModels([...discovered.keys()]).flatMap((id) => {
    const metadata = discovered.get(id);
    return metadata ? [metadata] : [];
  });
}

export function enrichModelMetadata(
  model: CrofAIModelMetadata,
  metadata: ModelsDevModelMetadata | undefined,
): CrofAIModelMetadata {
  if (!metadata) return model;
  return {
    ...model,
    contextLength: model.contextLength || metadata.contextLength || DEFAULT_MAX_INPUT_TOKENS,
    maxOutputTokens: model.maxOutputTokens || metadata.maxOutputTokens || DEFAULT_MAX_OUTPUT_TOKENS,
    imageInput: model.imageInput || metadata.imageInput === true,
    toolCalling: metadata.toolCalling ?? model.toolCalling,
    reasoningEffort: metadata.reasoningOptions?.includes("low") === true || model.reasoningEffort,
    description: model.description ?? metadata.description,
    releaseDate: model.releaseDate ?? metadata.releaseDate,
  };
}

export function formatTokenLimit(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  if (tokens >= 1024) return `${Math.round(tokens / 1024)}K`;
  return `${tokens}`;
}

export function formatModelName(id: string): string {
  const canonical = canonicalModelId(id);
  const official = OFFICIAL_MODEL_NAMES[canonical];
  if (official) return official;
  const parts = canonical.split("-");
  // Keep the base-vendor brand casing (DeepSeek, MiMo, GLM, …) and strip it
  // from the remaining label parts.
  const vendor = VENDOR_LABELS[parts[0] ?? ""];
  const rest = vendor ? parts.slice(1) : parts;
  // Qwen families embed the version in the family name (qwen3.8) and keep the
  // parameter count together (27b), so render the family and model separately.
  if (parts[0]?.startsWith("qwen") && !vendor) {
    const [family, ...tail] = parts;
    return `${family.charAt(0).toUpperCase() + family.slice(1)} ${
      tail
        .map((part) => (/\d+b$/i.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(" ")
    }`.trim();
  }
  return `${vendor} ${formatModelLabel(rest)}`.trim();
}

function formatModelLabel(parts: string[]): string {
  return parts
    .map((part) => {
      if (/^(ai|glm|kimi|mimo|qwen|vl|it|v\d+(?:\.\d+)?|k2\.\d|k3|27b|31b|9b)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function modelMetadataFromApi(raw: CrofAIApiModel): CrofAIModelMetadata | undefined {
  if (typeof raw.id !== "string" || !isCrofAIChatModel(raw.id)) return undefined;
  const id = canonicalModelId(raw.id);
  const fallback = getModelMetadata(id);
  const architecture = record(raw.architecture);
  const modalities = stringArray(raw.input_modalities) ?? stringArray(architecture?.input_modalities);
  const rawName = typeof raw.name === "string" ? raw.name : "";
  const apiName = rawName.trim().replace(/^CrofAI:\s*/i, "").trim();
  return {
    id,
    name: OFFICIAL_MODEL_NAMES[id] ?? (apiName || fallback.name),
    version: typeof raw.version === "string" && raw.version ? raw.version : fallback.version,
    contextLength:
      positiveInteger(raw.context_length ?? raw.max_context_tokens ?? raw.max_model_len) ?? fallback.contextLength,
    maxOutputTokens: positiveInteger(raw.max_completion_tokens ?? raw.max_output_tokens) ?? fallback.maxOutputTokens,
    imageInput:
      modalities?.some((value) => value.toLowerCase() === "image")
      ?? (/(?:vision|\bvl\b)/i.test(rawName) || /(?:^|[-/])vision(?:[-/.]|$)/.test(id)),
    toolCalling: boolean(raw.tool_calling ?? raw.tool_call) ?? fallback.toolCalling,
    reasoningEffort: boolean(raw.reasoning_effort ?? raw.custom_reasoning) ?? fallback.reasoningEffort,
    ...(typeof raw.description === "string" && raw.description.trim() ? { description: raw.description.trim() } : {}),
    ...(unixDate(raw.created) ? { releaseDate: unixDate(raw.created) } : {}),
    cost: crofModelCost(id, modelCostFromApi(raw.pricing)),
  };
}

function model(id: string, contextLength: number, maxOutputTokens: number, imageInput = false): CrofAIModelMetadata {
  return {
    id,
    name: formatModelName(id),
    version: "unknown",
    contextLength,
    maxOutputTokens,
    imageInput,
    toolCalling: true,
    reasoningEffort: OFFICIAL_REASONING_EFFORT_MODELS.has(id),
    cost: crofModelCost(id),
  };
}

function canonicalModelId(id: string): string {
  return id.trim().toLowerCase();
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function boolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
function unixDate(value: unknown): string | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1_000).toISOString().slice(0, 10)
    : undefined;
}
