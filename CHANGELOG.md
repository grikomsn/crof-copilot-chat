# Changelog

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
