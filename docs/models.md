# Models and pricing

## Live metadata

The extension discovers the catalog available to the configured CrofAI account
from `https://crof.ai/v1/models`. Live responses provide the context window,
maximum output length, reasoning-effort support, and per-model pricing used by
Copilot Chat. A bundled snapshot keeps model selection useful during transient
catalog failures or when no key is configured.

Live `/v1/models` metadata remains authoritative. Fields those responses omit
are enriched from the canonical `crof` provider in a six-hour models.dev
snapshot stored in VS Code `globalState`. Stale metadata is returned immediately
while refresh runs and remains available during models.dev outages.

The fallback snapshot was last updated on 2026-09-05:

| Model | Context | Max output | Images | Tools | Reasoning |
| --- | ---: | ---: | :---: | :---: | :---: |
| DeepSeek V4 Pro 0813 | 1M | 128K | No | Yes | Yes |
| DeepSeek V4 Flash 0731 | 1M | 128K | No | Yes | Yes |
| DeepSeek V4 Flash Vision (Experimental) | 1M | 128K | Yes | Yes | Yes |
| Kimi K3 | 1M | 256K | No | Yes | Yes |
| Kimi K3 Eco | 1M | 128K | No | Yes | Yes |
| Kimi K2.7 Code | 256K | 256K | No | Yes | Yes |
| Kimi K2.6 | 256K | 256K | No | Yes | Yes |
| GLM 5.3 | 1M | 128K | No | Yes | Yes |
| GLM 5.3 Flash | 1M | 128K | No | Yes | Yes |
| GLM 5.2 | 1M | 128K | No | Yes | Yes |
| Greg 2 Ultra | 224K | 224K | No | Yes | No |
| Greg 2 Super | 224K | 224K | No | Yes | No |
| MiMo V2.5 Pro | 1M | 128K | No | Yes | Yes |
| Gemma 4 31B IT | 256K | 256K | No | Yes | Yes |
| Qwen3.8 27B | 256K | 256K | No | Yes | Yes |
| Qwen3.5 9B | 256K | 256K | No | Yes | Yes |

Live catalog results remain authoritative when they differ from this snapshot.
DeepSeek V4 Pro, DeepSeek V4 Flash, DeepSeek V3.2, GLM 5.1, Greg 1 Mini,
Greg (Roleplay), Qwen3.6 27B, and Qwen3.5 397B-A17B are no longer returned by
the live CrofAI catalog and were removed from the fallback snapshot.

## Pricing

The model picker displays each model's live input, cached-input, and output
pricing from the CrofAI `/v1/models` response when available. When live pricing
is missing, the extension falls back to the official rates captured alongside
the fallback snapshot. See [CrofAI pricing](https://crof.ai/pricing).

## Context window size

Each model entry exposes a Context Window control in the Copilot Chat model
picker (`src/models/options.ts`). The options are Auto (the default), fixed
64K, 128K, and 200K tiers that fit below the model's registered input limit,
and Maximum. Auto and Maximum keep the default behavior.

A specific tier acts as a local upper limit: the selection is stored per model
by VS Code, never exceeds the model's registered input limit, and when the
converted messages exceed the selected tier the oldest conversation turns are
trimmed before the request is built (`src/provider/history-trim.ts`). The
first message, the current turn, and tool-call/result adjacency are always
preserved, and models without a fitting tier keep their picker unchanged.