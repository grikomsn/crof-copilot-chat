# Changelog

## 0.2.3

### Patch Changes

- 13e727c: Fix model pricing units: CrofAI `/v1/models` reports rates per 1M tokens, so live pricing is no longer inflated one-thousand-fold in the model picker.

## 0.2.2

### Patch Changes

- 989fa04: Resync the CrofAI model catalog and metadata to the live hosted-model list: add DeepSeek V4 Flash Vision (Experimental), align fallback names and pricing with the current `/v1/models` response, and drop models no longer served by CrofAI.

## 0.2.1

### Patch Changes

- e294450: Do not label connection tests with a reasoning effort when the selected CrofAI model does not support that control.

## 0.2.0

### Minor Changes

- e73445a: Add CrofAI credit and allowance status, capability-aware reasoning controls, durable catalog and usage state, decomposed provider helpers, and bounded pre-stream retries.

## 0.1.1

### Patch Changes

- 35cb867: Show CrofAI model pricing in the Copilot model picker using live catalog metadata with current official fallbacks.

## 0.1.0

- Add a native CrofAI provider for GitHub Copilot Chat.
- Support VS Code-managed API-key provider entries and a legacy Secret Storage workflow.
- Discover models and token limits from CrofAI's `/v1/models` endpoint.
- Stream text, reasoning, usage, and function-tool calls from `/v1/chat/completions`.
- Support CrofAI reasoning effort controls and advertised image-capable models.
- Add diagnostics, documentation, tests, CI, Changesets, and Marketplace packaging.
