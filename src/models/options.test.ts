import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REASONING_EFFORT,
  REASONING_EFFORTS,
  applyReasoningEffort,
  buildModelConfigurationSchema,
  contextSizeOptions,
  resolveContextCap,
  resolveContextSize,
  resolveReasoningEffort,
} from "./options";

test("exposes CrofAI reasoning efforts in the model picker", () => {
  const schema = buildModelConfigurationSchema("medium");
  assert.deepEqual(schema?.properties.reasoningEffort.enum, REASONING_EFFORTS);
  assert.deepEqual(schema?.properties.reasoningEffort.enumItemLabels, ["None", "Low", "Medium", "High"]);
  assert.equal(schema?.properties.reasoningEffort.default, "medium");
  assert.equal(schema?.properties.reasoningEffort.group, "navigation");
});

test("per-request effort overrides the workspace default", () => {
  assert.equal(resolveReasoningEffort({ reasoningEffort: "low" }, "high"), "low");
  assert.equal(resolveReasoningEffort({ thinkingEffort: "medium" }, "high"), "medium");
  assert.equal(resolveReasoningEffort(undefined, "none"), "none");
});

test("unsupported effort safely falls back to high", () => {
  assert.equal(resolveReasoningEffort({ reasoningEffort: "max" }, "none"), DEFAULT_REASONING_EFFORT);
  assert.equal(resolveReasoningEffort(undefined, "invalid"), DEFAULT_REASONING_EFFORT);
});

test("sends CrofAI's documented reasoning_effort parameter", () => {
  assert.deepEqual(applyReasoningEffort({ model: "glm-5.2" }, "none"), {
    model: "glm-5.2",
    reasoning_effort: "none",
  });
  assert.deepEqual(applyReasoningEffort({ model: "glm-5.2" }, "high"), {
    model: "glm-5.2",
    reasoning_effort: "high",
  });
});

test("offers context tiers below the registered input limit", () => {
  assert.deepEqual(contextSizeOptions(1_048_576)?.map((option) => option.value), [0, 65_536, 131_072, 200_000, 1_048_576]);
  assert.deepEqual(contextSizeOptions(1_048_576)?.map((option) => option.label), ["Auto", "64K", "128K", "200K", "Maximum"]);
  assert.equal(contextSizeOptions(65_536), undefined);
  assert.equal(contextSizeOptions(32_000), undefined);
});

test("resolves the effective context cap from the selected tier", () => {
  assert.equal(resolveContextCap(131_072, 1_048_576), 131_072);
  assert.equal(resolveContextCap(1_500_000, 1_048_576), undefined);
  assert.equal(resolveContextCap(0, 1_048_576), undefined);
  assert.equal(resolveContextCap(65_536, 65_536), undefined);
});

test("reads the context size from picker configuration", () => {
  assert.equal(resolveContextSize({ contextSize: 131_072 }), 131_072);
  assert.equal(resolveContextSize({ contextSize: 0 }), 0);
  assert.equal(resolveContextSize({ contextSize: "131072" }), 0);
  assert.equal(resolveContextSize(undefined), 0);
});

test("exposes the Context Window control with and without reasoning controls", () => {
  const combined = buildModelConfigurationSchema("medium", contextSizeOptions(1_048_576));
  assert.deepEqual(combined?.properties.reasoningEffort.enum, REASONING_EFFORTS);
  assert.deepEqual(combined?.properties.contextSize.enum, [0, 65_536, 131_072, 200_000, 1_048_576]);
  assert.equal(combined?.properties.contextSize.default, 0);
  assert.equal(combined?.properties.contextSize.group, "navigation");

  const contextOnly = buildModelConfigurationSchema(undefined, contextSizeOptions(1_048_576));
  assert.equal("reasoningEffort" in (contextOnly?.properties ?? {}), false);
  assert.deepEqual(contextOnly?.properties.contextSize.enum, [0, 65_536, 131_072, 200_000, 1_048_576]);
  assert.equal(buildModelConfigurationSchema(undefined, undefined), undefined);
});
