import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_MODELS,
  enrichModelMetadata,
  formatModelName,
  formatTokenLimit,
  getModelMetadata,
  isCrofAIChatModel,
  orderModelMetadata,
  orderModels,
  resolveMaxOutputTokens,
} from "./catalog";

test("accepts CrofAI chat model IDs and excludes non-chat families", () => {
  assert.equal(isCrofAIChatModel("deepseek-v4-pro-0813"), true);
  assert.equal(isCrofAIChatModel("kimi-k2.7-code"), true);
  assert.equal(isCrofAIChatModel("multilingual-e5-large-instruct"), true);
  assert.equal(isCrofAIChatModel("text-embedding-3-large"), false);
  assert.equal(isCrofAIChatModel("image/generator"), false);
});

test("orders documented fallback models before other discovered models", () => {
  assert.deepEqual(orderModels(["future-chat", "glm-5.2", "DEEPSEEK-V4-PRO-0813", "deepseek-v4-pro-0813"]), [
    FALLBACK_MODELS[0],
    FALLBACK_MODELS[9],
    "future-chat",
  ]);
});

test("formats model IDs for the VS Code picker", () => {
  assert.equal(formatModelName("deepseek-v4-pro-0813"), "DeepSeek V4 Pro 0813");
  assert.equal(formatModelName("glm-5.2"), "GLM 5.2");
  assert.equal(formatModelName("deepseek-v4-flash-vision-exp"), "DeepSeek V4 Flash Vision (Experimental)");
  assert.equal(formatModelName("qwen3.8-27b"), "Qwen3.8 27B");
});

test("provides documented fallback limits", () => {
  assert.deepEqual(getModelMetadata("glm-5.2"), {
    id: "glm-5.2",
    name: "GLM 5.2",
    version: "unknown",
    contextLength: 1_000_000,
    maxOutputTokens: 131_072,
    imageInput: false,
    toolCalling: true,
    reasoningEffort: true,
    cost: { input: 0.3, cacheRead: 0.05, output: 1.05 },
  });
  assert.deepEqual(getModelMetadata("deepseek-v4-flash-vision-exp"), {
    id: "deepseek-v4-flash-vision-exp",
    name: "DeepSeek V4 Flash Vision (Experimental)",
    version: "unknown",
    contextLength: 1_000_000,
    maxOutputTokens: 131_072,
    imageInput: true,
    toolCalling: true,
    reasoningEffort: true,
    cost: { input: 0.08, cacheRead: 0.007, output: 0.2 },
  });
  assert.equal(formatTokenLimit(1_000_000), "1M");
  assert.equal(formatTokenLimit(262_144), "256K");
});

test("uses exactly the discovered catalog and advertised metadata", () => {
  assert.deepEqual(
    orderModelMetadata([
      {
        id: "custom-vision",
        name: "CrofAI: Custom Vision",
        context_length: 500_000,
        max_completion_tokens: 64_000,
        input_modalities: ["text", "image"],
      },
      { id: "CUSTOM-VISION", context_length: 1_000_000 },
      { id: "text-embedding-3-large", context_length: 1_000_000 },
    ]),
    [
      {
        id: "custom-vision",
        name: "Custom Vision",
        version: "unknown",
        contextLength: 500_000,
        maxOutputTokens: 64_000,
        imageInput: true,
        toolCalling: true,
        reasoningEffort: false,
        cost: undefined,
      },
    ],
  );
});

test("uses live capability flags and official reasoning fallbacks", () => {
  const [live] = orderModelMetadata([
    {
      id: "glm-5.2",
      tool_calling: false,
      reasoning_effort: false,
      created: 1_700_000_000,
    },
  ]);
  assert.equal(live.toolCalling, false);
  assert.equal(live.reasoningEffort, false);
  assert.equal(live.releaseDate, "2023-11-14");
  assert.equal(getModelMetadata("deepseek-v4-flash-vision-exp").reasoningEffort, true);
  assert.equal(getModelMetadata("kimi-k2.7-code").reasoningEffort, true);
  assert.equal(getModelMetadata("greg-2-ultra").reasoningEffort, false);
});

test("fills descriptive and capability metadata from the Crof models.dev snapshot", () => {
  const enriched = enrichModelMetadata(getModelMetadata("deepseek-v4-pro-0813"), {
    id: "deepseek-v4-pro-0813",
    description: "General coding model",
    imageInput: true,
    toolCalling: true,
    releaseDate: "2025-12-01",
  });
  assert.equal(enriched.description, "General coding model");
  assert.equal(enriched.imageInput, true);
  assert.equal(enriched.releaseDate, "2025-12-01");
});

test("prefers live model pricing and falls back to CrofAI's official table", () => {
  const [live] = orderModelMetadata([
    {
      id: "deepseek-v4-flash-vision-exp",
      pricing: {
        prompt: "1",
        cache_prompt: "0.2",
        completion: "2",
      },
    },
  ]);
  assert.deepEqual(live.cost, { input: 1, cacheRead: 0.2, output: 2 });

  const [fallback] = orderModelMetadata([{ id: "glm-5.2" }]);
  assert.deepEqual(fallback.cost, {
    input: 0.3,
    cacheRead: 0.05,
    output: 1.05,
  });
});

test("uses the official display name when CrofAI reuses a colliding raw name", () => {
  const [live] = orderModelMetadata([
    {
      id: "deepseek-v4-flash-vision-exp",
      name: "DeepSeek: DeepSeek V4 Flash 0731",
      context_length: 1_000_000,
      max_completion_tokens: 131_072,
      reasoning_effort: true,
    },
  ]);
  assert.equal(live.id, "deepseek-v4-flash-vision-exp");
  assert.equal(live.name, "DeepSeek V4 Flash Vision (Experimental)");
  assert.equal(live.reasoningEffort, true);
  assert.equal(live.imageInput, true);
});

test("falls back only when discovery returns no chat models", () => {
  assert.deepEqual(
    orderModelMetadata([]).map(({ id }) => id),
    [...FALLBACK_MODELS],
  );
});

test("uses the selected catalog limit for default and explicit output settings", () => {
  assert.equal(resolveMaxOutputTokens(0, 65_536), 65_536);
  assert.equal(resolveMaxOutputTokens(100_000, 65_536), 65_536);
  assert.equal(resolveMaxOutputTokens(32_000, 65_536), 32_000);
});
