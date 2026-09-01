import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_MODELS,
  formatModelName,
  formatTokenLimit,
  getModelMetadata,
  isCrofAIChatModel,
  orderModelMetadata,
  orderModels,
  resolveMaxOutputTokens,
} from "./catalog";

test("accepts CrofAI chat model IDs and excludes non-chat families", () => {
  assert.equal(isCrofAIChatModel("deepseek-v3.2"), true);
  assert.equal(isCrofAIChatModel("kimi-k2.7-code"), true);
  assert.equal(isCrofAIChatModel("multilingual-e5-large-instruct"), true);
  assert.equal(isCrofAIChatModel("text-embedding-3-large"), false);
  assert.equal(isCrofAIChatModel("image/generator"), false);
});

test("orders documented fallback models before other discovered models", () => {
  assert.deepEqual(orderModels(["future-chat", "glm-5.2", "DEEPSEEK-V3.2", "deepseek-v3.2"]), [
    FALLBACK_MODELS[0],
    FALLBACK_MODELS[2],
    "future-chat",
  ]);
});

test("formats model IDs for the VS Code picker", () => {
  assert.equal(formatModelName("deepseek-v3.2"), "Deepseek V3.2");
  assert.equal(formatModelName("glm-5.2"), "GLM 5.2");
  assert.equal(formatModelName("qwen3.8-27b"), "Qwen3.8 27b");
});

test("provides documented fallback limits", () => {
  assert.deepEqual(getModelMetadata("glm-5.2"), {
    id: "glm-5.2",
    name: "GLM 5.2",
    version: "unknown",
    contextLength: 1_000_000,
    maxOutputTokens: 131_072,
    imageInput: false,
  });
  assert.equal(formatTokenLimit(1_000_000), "1M");
  assert.equal(formatTokenLimit(262_144), "256K");
});

test("uses exactly the discovered catalog and advertised metadata", () => {
  assert.deepEqual(orderModelMetadata([
    { id: "custom-vision", name: "CrofAI: Custom Vision", context_length: 500_000, max_completion_tokens: 64_000, input_modalities: ["text", "image"] },
    { id: "CUSTOM-VISION", context_length: 1_000_000 },
    { id: "text-embedding-3-large", context_length: 1_000_000 },
  ]), [{
    id: "custom-vision",
    name: "Custom Vision",
    version: "unknown",
    contextLength: 500_000,
    maxOutputTokens: 64_000,
    imageInput: true,
  }]);
});

test("falls back only when discovery returns no chat models", () => {
  assert.deepEqual(orderModelMetadata([]).map(({ id }) => id), [...FALLBACK_MODELS]);
});

test("uses the selected catalog limit for default and explicit output settings", () => {
  assert.equal(resolveMaxOutputTokens(0, 65_536), 65_536);
  assert.equal(resolveMaxOutputTokens(100_000, 65_536), 65_536);
  assert.equal(resolveMaxOutputTokens(32_000, 65_536), 32_000);
});
