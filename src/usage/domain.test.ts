import assert from "node:assert/strict";
import test from "node:test";
import {
  accountUsageFromPayload,
  formatUsageRows,
  formatUsageStatusBar,
  recordRequestUsage,
  toProviderUsagePayload,
} from "./domain";

test("normalizes CrofAI OpenAI-compatible usage for VS Code", () => {
  assert.deepEqual(
    toProviderUsagePayload({
      prompt_tokens: 140,
      completion_tokens: 2,
      total_tokens: 142,
      prompt_tokens_details: { cached_tokens: 64 },
      completion_tokens_details: { reasoning_tokens: 1 },
    }),
    {
      prompt_tokens: 140,
      completion_tokens: 2,
      total_tokens: 142,
      prompt_tokens_details: { cached_tokens: 64 },
      completion_tokens_details: { reasoning_tokens: 1 },
    },
  );
});

test("parses account credits and nullable daily allowance", () => {
  assert.deepEqual(accountUsageFromPayload({ credits: 12.3456, usable_requests: 450 }), {
    credits: 12.3456,
    usableRequests: 450,
  });
  assert.deepEqual(accountUsageFromPayload({ credits: "2.5", usable_requests: null }), {
    credits: 2.5,
    usableRequests: null,
  });
  assert.equal(accountUsageFromPayload({ plan: "free" }), undefined);
});

test("tracks local request activity alongside the account balance", () => {
  const snapshot = recordRequestUsage(
    { account: { credits: 3, usableRequests: null } },
    { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10, cost: 0.001 },
    "deepseek-v4-pro-0813",
    123,
  );
  assert.equal(snapshot.tracked?.requests, 1);
  assert.equal(snapshot.tracked?.totalTokens, 10);
  assert.equal(snapshot.tracked?.cost, 0.001);
  assert.equal(formatUsageStatusBar(snapshot), "$(credit-card) Crof $3");
  assert.equal(formatUsageRows(snapshot)[0]?.label, "Credit balance");
});

test("accepts alternate token names and derives totals", () => {
  assert.deepEqual(toProviderUsagePayload({ input_tokens: 8, output_tokens: 3 }), {
    prompt_tokens: 8,
    completion_tokens: 3,
    total_tokens: 11,
  });
});
