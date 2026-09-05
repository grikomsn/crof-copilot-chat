export interface ModelCost {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
}

export interface ModelPricingFields {
  readonly pricing: string;
  readonly inputCost: number;
  readonly outputCost: number;
  readonly cacheCost?: number;
  readonly priceCategory: "low" | "medium" | "high" | "very_high";
}

const OFFICIAL_MODEL_COSTS: Readonly<Record<string, ModelCost>> = {
  "deepseek-v4-pro-0813": { input: 0.35, cacheRead: 0.01, output: 0.8 },
  "deepseek-v4-flash-0731": { input: 0.08, cacheRead: 0.003, output: 0.1 },
  "deepseek-v4-flash-vision-exp": { input: 0.08, cacheRead: 0.007, output: 0.2 },
  "kimi-k3": { input: 2, cacheRead: 0.25, output: 8 },
  "kimi-k3-eco": { input: 1, cacheRead: 0.1, output: 4 },
  "kimi-k2.7-code": { input: 0.55, cacheRead: 0.05, output: 2.25 },
  "kimi-k2.6": { input: 0.5, cacheRead: 0.05, output: 1.99 },
  "glm-5.3": { input: 0.4, cacheRead: 0.06, output: 1.4 },
  "glm-5.3-flash": { input: 0.07, cacheRead: 0.01, output: 0.22 },
  "glm-5.2": { input: 0.3, cacheRead: 0.05, output: 1.05 },
  "greg-2-ultra": { input: 3, cacheRead: 0.5, output: 10 },
  "greg-2-super": { input: 1.5, cacheRead: 0.25, output: 5 },
  "mimo-v2.5-pro": { input: 0.4, cacheRead: 0.003, output: 0.8 },
  "gemma-4-31b-it": { input: 0.1, cacheRead: 0.02, output: 0.3 },
  "qwen3.8-27b": { input: 0.09, cacheRead: 0.01, output: 0.3 },
  "qwen3.5-9b": { input: 0.04, cacheRead: 0.008, output: 0.15 },
};

export function crofModelCost(id: string, discovered?: ModelCost): ModelCost | undefined {
  return discovered ?? OFFICIAL_MODEL_COSTS[id];
}

/**
 * Converts the per-million pricing strings from `GET /v1/models` into costs.
 * CrofAI reports rates already per 1M tokens (e.g. `"prompt": "0.35"`), so the
 * values pass through unchanged; no per-token scaling is applied.
 */
export function modelCostFromApi(value: unknown): ModelCost | undefined {
  const pricing = record(value);
  if (!pricing) return undefined;
  const input = nonNegativeNumber(pricing.prompt);
  const output = nonNegativeNumber(pricing.completion);
  if (input === undefined || output === undefined) return undefined;
  const cacheRead = nonNegativeNumber(pricing.cache_prompt);
  return {
    input,
    output,
    ...(cacheRead === undefined ? {} : { cacheRead }),
  };
}

export function modelPricingFields(cost: ModelCost | undefined): ModelPricingFields | undefined {
  if (!cost) return undefined;
  if (cost.input === 0 && cost.output === 0) {
    return {
      pricing: "Free",
      inputCost: 0,
      outputCost: 0,
      ...(cost.cacheRead === undefined ? {} : { cacheCost: 0 }),
      priceCategory: "low",
    };
  }
  return {
    pricing: `In: $${formatPrice(cost.input)} · Out: $${formatPrice(cost.output)} /1M tokens`,
    inputCost: Math.round(cost.input * 100),
    outputCost: Math.round(cost.output * 100),
    ...(cost.cacheRead === undefined ? {} : { cacheCost: Math.round(cost.cacheRead * 100) }),
    priceCategory: costCategory(cost),
  };
}

export function costCategory(cost: Pick<ModelCost, "input" | "output">): ModelPricingFields["priceCategory"] {
  const weighted = cost.input * 3 + cost.output;
  if (weighted <= 2) return "low";
  if (weighted <= 25) return "medium";
  if (weighted <= 50) return "high";
  return "very_high";
}

function formatPrice(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
