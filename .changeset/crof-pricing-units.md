---
"crof-copilot-chat": patch
---

Fix model pricing units: CrofAI `/v1/models` reports rates per 1M tokens, so live pricing is no longer inflated one-thousand-fold in the model picker.