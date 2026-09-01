import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REASONING_EFFORT,
  REASONING_EFFORTS,
  applyReasoningEffort,
  buildModelConfigurationSchema,
  resolveReasoningEffort,
} from "./options";

test("exposes CrofAI reasoning efforts in the model picker", () => {
  const schema = buildModelConfigurationSchema("medium");
  assert.deepEqual(schema.properties.reasoningEffort.enum, REASONING_EFFORTS);
  assert.deepEqual(schema.properties.reasoningEffort.enumItemLabels, ["None", "Low", "Medium", "High"]);
  assert.equal(schema.properties.reasoningEffort.default, "medium");
  assert.equal(schema.properties.reasoningEffort.group, "navigation");
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
