import assert from "node:assert/strict";
import test from "node:test";
import { API_BASE, CROF_ENDPOINTS, extensionUserAgent, crofHeaders } from "./protocol";

test("keeps CrofAI endpoints and request identity centralized", () => {
  assert.equal(CROF_ENDPOINTS.models, `${API_BASE}/models`);
  assert.equal(CROF_ENDPOINTS.chat, `${API_BASE}/chat/completions`);
  assert.equal(extensionUserAgent("1.2.3", "1.125.0"), "crof-copilot-chat/1.2.3 VSCode/1.125.0");
  assert.deepEqual(crofHeaders("secret", "application/json", "agent"), {
    Authorization: "Bearer secret",
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "agent",
  });
});
