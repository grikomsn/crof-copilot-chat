export const FALLBACK_MODELS = ["deepseek-v3.2", "kimi-k2.7-code", "glm-5.2", "qwen3.8-27b"] as const;

export const DEFAULT_MAX_INPUT_TOKENS = 262_144;
export const DEFAULT_MAX_OUTPUT_TOKENS = 131_072;

export interface CrofAIModelMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly contextLength: number;
  readonly maxOutputTokens: number;
  readonly imageInput: boolean;
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
}

export const FALLBACK_MODEL_METADATA: readonly CrofAIModelMetadata[] = [
  model("deepseek-v3.2", 163_840, 163_840),
  model("kimi-k2.7-code", 262_144, 262_144),
  model("glm-5.2", 1_000_000, 131_072),
  model("qwen3.8-27b", 262_144, 262_144),
];

const PREFERRED_ORDER = new Map<string, number>(FALLBACK_MODELS.map((id, index) => [id, index]));
const FALLBACK_METADATA_BY_ID = new Map(FALLBACK_MODEL_METADATA.map((metadata) => [metadata.id, metadata]));

export function isCrofAIChatModel(id: string): boolean {
  const value = id.trim().toLowerCase();
  return Boolean(value)
    && !/(?:^|[-/])(point|embed(?:ding)?s?|image|video|audio|voice|rerank)(?:[-/.]|$)/.test(value);
}

export function orderModels(ids: readonly string[]): string[] {
  return [...new Set(ids.map(canonicalModelId))]
    .filter(isCrofAIChatModel)
    .sort((left, right) => {
      const leftRank = PREFERRED_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = PREFERRED_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.localeCompare(right);
    });
}

export function getModelMetadata(id: string): CrofAIModelMetadata {
  const canonical = canonicalModelId(id);
  return FALLBACK_METADATA_BY_ID.get(canonical)
    ?? model(canonical, DEFAULT_MAX_INPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS);
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

export function formatTokenLimit(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  if (tokens >= 1024) return `${Math.round(tokens / 1024)}K`;
  return `${tokens}`;
}

export function formatModelName(id: string): string {
  return id.split("-").map((part) => {
    if (/^(ai|glm|kimi|mimo|qwen|vl|v\d+(?:\.\d+)?)$/i.test(part)) return part.toUpperCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}

function modelMetadataFromApi(raw: CrofAIApiModel): CrofAIModelMetadata | undefined {
  if (typeof raw.id !== "string" || !isCrofAIChatModel(raw.id)) return undefined;
  const id = canonicalModelId(raw.id);
  const fallback = getModelMetadata(id);
  const architecture = record(raw.architecture);
  const modalities = stringArray(raw.input_modalities) ?? stringArray(architecture?.input_modalities);
  const rawName = typeof raw.name === "string" ? raw.name : "";
  return {
    id,
    name: rawName.trim() ? rawName.replace(/^CrofAI:\s*/i, "").trim() : fallback.name,
    version: typeof raw.version === "string" && raw.version ? raw.version : fallback.version,
    contextLength: positiveInteger(raw.context_length ?? raw.max_context_tokens ?? raw.max_model_len)
      ?? fallback.contextLength,
    maxOutputTokens: positiveInteger(raw.max_completion_tokens ?? raw.max_output_tokens)
      ?? fallback.maxOutputTokens,
    imageInput: modalities?.some((value) => value.toLowerCase() === "image")
      ?? /(?:vision|\bvl\b)/i.test(rawName),
  };
}

function model(id: string, contextLength: number, maxOutputTokens: number): CrofAIModelMetadata {
  return { id, name: formatModelName(id), version: "unknown", contextLength, maxOutputTokens, imageInput: false };
}

function canonicalModelId(id: string): string {
  return id.trim().toLowerCase();
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}
