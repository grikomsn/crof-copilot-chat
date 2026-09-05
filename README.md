<p align="center">
  <img src="https://raw.githubusercontent.com/grikomsn/crof-copilot-chat/main/assets/cover.jpg" alt="CrofAI and GitHub Copilot" width="960">
</p>

<h1 align="center">CrofAI for GitHub Copilot Chat</h1>

<p align="center">Use CrofAI models directly from the GitHub Copilot Chat model picker in Visual Studio Code.</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=grikomsn.crof-copilot-chat"><img src="https://img.shields.io/visual-studio-marketplace/v/grikomsn.crof-copilot-chat?style=flat-square&logo=visualstudiocode&label=Marketplace" alt="Visual Studio Marketplace version"></a>
  <a href="https://github.com/grikomsn/crof-copilot-chat/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/grikomsn/crof-copilot-chat/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
  <a href="https://github.com/grikomsn/crof-copilot-chat/blob/main/LICENSE"><img src="https://img.shields.io/github/license/grikomsn/crof-copilot-chat?style=flat-square" alt="MIT license"></a>
</p>

This extension is a native VS Code `LanguageModelChatProvider`. It validates a user-supplied CrofAI API key, discovers the models available to that key, and streams OpenAI-compatible chat completions directly from `https://crof.ai/v1` into Copilot Chat.

## Highlights

- Direct CrofAI integration without a local proxy
- API keys managed by VS Code Secret Storage or provider configuration
- Multiple isolated CrofAI API-key entries in Manage Language Models
- Current input, cached-input, and output pricing in the model picker
- Refreshable CrofAI credit balance, daily request allowance, and locally tracked token activity
- Live `/models` discovery with context and output limits from CrofAI metadata
- Streaming text, `reasoning_content`, token usage, and function-tool calls
- CrofAI reasoning effort controls only on models that advertise support
- Image input for models that advertise image capability
- Agent mode function-tool calls

## Quick start

1. Install the extension. You need VS Code 1.125 or newer and GitHub Copilot Chat.
2. Create an API key in the [CrofAI dashboard](https://crof.ai/dashboard).
3. Open Copilot Chat, select **Manage Models**, add a **CrofAI** provider entry, and enter the key.
4. Choose any model returned by your CrofAI account.

To use more than one account or key, add another **CrofAI** entry. Each entry keeps its own credential and model list. The legacy **CrofAI: Configure API Key** command remains available for command-driven workflows.

For models that support configurable reasoning, choose **None**, **Low**, **Medium**, or **High** from the reasoning control in Copilot Chat. A per-request selection overrides `crofCopilot.reasoningEffort`.

## Documentation

- [Setup, settings, and troubleshooting](docs/setup.md)
- [Models and pricing](docs/models.md)
- [API key and security model](docs/security.md)
- [Development and releases](docs/development.md)

## Related projects

- [Grok for GitHub Copilot Chat](https://github.com/grikomsn/grok-copilot-chat)
- [Codex Bridge for Copilot Chat](https://github.com/grikomsn/openai-oauth-copilot-chat)
- [Ollama Cloud for GitHub Copilot Chat](https://github.com/grikomsn/ollama-cloud-copilot-chat)
- [OpenCode for GitHub Copilot Chat](https://github.com/grikomsn/opencode-copilot-chat)
- [Poolside for GitHub Copilot Chat](https://github.com/grikomsn/poolside-copilot-chat)

Unofficial project; not affiliated with CrofAI, GitHub, or Microsoft. CrofAI usage limits and charges still apply. Licensed under [MIT](LICENSE).
