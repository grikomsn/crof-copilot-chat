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

Prompts and API keys are never intentionally written to the output channel.

## Troubleshooting

- **No CrofAI models in the picker:** enable **CrofAI** under **Manage Models**, then refresh models.
- **The API key is rejected:** create a fresh key in the CrofAI dashboard and configure it again.
- **A request times out:** increase `crofCopilot.requestTimeoutSeconds`.
- **An image is rejected:** select a CrofAI model whose live metadata advertises image input.
- **Need a diagnostic snapshot:** run **CrofAI: Show Diagnostics**. The report never includes the key.

The last successful model catalog and account-usage snapshot are kept in VS Code global state for restart resilience. Inference retries only pre-stream network failures and HTTP 502/503/504 responses, at most twice, and honors bounded `Retry-After` delays.
