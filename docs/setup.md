# Setup and usage

## Requirements

- Visual Studio Code 1.125 or newer
- GitHub Copilot Chat installed and signed in
- A CrofAI API key

A paid Copilot plan is not required for a bring-your-own-key language model provider.

## Install and connect

1. Install **CrofAI for GitHub Copilot Chat**.
2. Create a key in the [CrofAI dashboard](https://crof.ai/dashboard).
3. In Copilot Chat, open the model picker, select **Manage Models**, add a **CrofAI** provider entry, and enter the key.
4. Select an available CrofAI model.

Provider-entry discovery uses `https://crof.ai/v1/models`. Models added to or removed from your CrofAI account are reflected automatically after the catalog cache expires or **CrofAI: Refresh Models** runs.

## Commands

| Command | Purpose |
| --- | --- |
| **CrofAI: Manage Connection** | Test, refresh, replace or remove the legacy key, show logs, or open diagnostics |
| **CrofAI: Configure API Key** | Validate and securely save a legacy command-managed API key |
| **CrofAI: Remove API Key** | Delete the legacy key from VS Code Secret Storage |
| **CrofAI: Refresh Models** | Fetch the current model list |
| **CrofAI: Show Credits and Usage** | Refresh account credits and daily allowance, then show local request activity |
| **CrofAI: Test Inference** | Send a small live inference request |
| **CrofAI: Open API Keys** | Open the CrofAI dashboard |
| **CrofAI: Show Diagnostics** | Show the endpoint, credential state, and registered models |

## Settings

| Setting | Default | Purpose |
| --- | ---: | --- |
| `crofCopilot.reasoningEffort` | `high` | Default CrofAI reasoning effort (`none`, `low`, `medium`, or `high`) |
| `crofCopilot.maxOutputTokens` | `0` | Output limit; `0` uses the selected model's advertised maximum |
| `crofCopilot.requestTimeoutSeconds` | `600` | Total inference timeout in seconds |
| `crofCopilot.streamIdleTimeoutSeconds` | `120` | Maximum time without streamed data |
| `crofCopilot.catalogCacheMinutes` | `5` | How long the live model catalog is cached |
| `crofCopilot.showUsageStatusBar` | `true` | Show credits or daily allowance for the active CrofAI entry |
| `crofCopilot.debugLogging` | `false` | Log request, stream, usage, and discovery metadata |
| `crofCopilot.inlineSuggestions` | `false` | Experimental ghost-text inline completions while typing |
| `crofCopilot.inlineSuggestionsModel` | `glm-5.3-flash` | Model used for inline completions at `reasoning_effort: none` |
| `crofCopilot.inlineSuggestionsChatInput` | `false` | Also offer suggestions inside the Copilot Chat prompt box |
| `crofCopilot.inlineSuggestionsDebounceMs` | `300` | Debounce between typing and a completion request |
| `crofCopilot.inlineSuggestionsTimeoutMs` | `3000` | Per-request completion timeout |
| `crofCopilot.inlineSuggestionsMaxTokens` | `128` | Tokens generated per suggestion |
| `crofCopilot.inlineSuggestionsPrefixLines` | `10` | Document lines sent before the cursor |
| `crofCopilot.inlineSuggestionsSuffixChars` | `300` | Document characters sent after the cursor |

Prompts and API keys are never intentionally written to the output channel.

## Inline suggestions

Inline code suggestions are experimental and off by default. When enabled, each suggestion sends a bounded fill-in-the-middle prompt (10 lines before the cursor, 300 characters after, both configurable) with FIM delimiter tokens and `reasoning_effort: "none"` to the fixed `/chat/completions` endpoint. The live benchmark measured `glm-5.3-flash` at 1343ms TTFB with zero hidden reasoning; `kimi-k2.6` shows a multi-second delay before its first content token even at `none`, `greg-2-super` ignores the setting and reasons anyway (1168 hidden chars), `kimi-k3-eco` streams empty responses, and `qwen3.5-9b` completes poorly — all are documented as not recommended. Hidden reasoning deltas are discarded engine-side, and the Copilot Chat prompt box is excluded unless `crofCopilot.inlineSuggestionsChatInput` is enabled.

**CrofAI: Set Inline Suggestions Model** (also in the Manage menu) lists compatible models ordered cheap-and-fast first, each with a measured badge (for example "★ recommended · measured 1.3s TTFB") or a warning for models measured unusable (empty streams, slow first tokens, ignored `none`, or poor quality). A "Use a custom model id…" entry keeps any hosted model reachable. The command only writes settings, so changes apply on the next keystroke without a reload.

## Troubleshooting

- **No CrofAI models in the picker:** enable **CrofAI** under **Manage Models**, then refresh models.
- **The API key is rejected:** create a fresh key in the CrofAI dashboard and configure it again.
- **A request times out:** increase `crofCopilot.requestTimeoutSeconds`.
- **An image is rejected:** select a CrofAI model whose live metadata advertises image input.
- **Need a diagnostic snapshot:** run **CrofAI: Show Diagnostics**. The report never includes the key.

The last successful model catalog and account-usage snapshot are kept in VS Code global state for restart resilience. Inference retries only pre-stream network failures and HTTP 502/503/504 responses, at most twice, and honors bounded `Retry-After` delays.
