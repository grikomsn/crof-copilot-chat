---
"crof-copilot-chat": minor
---

Add experimental, opt-in inline code suggestions (ghost text) powered by the CrofAI gateway with `reasoning_effort: "none"`. Enable with `crofCopilot.inlineSuggestions` and choose the model (`inlineSuggestionsModel`, default `glm-5.3-flash`; live-measured 1343ms TTFB with zero hidden reasoning). Debounce, timeout, token budget, and context windows are configurable. The Copilot Chat prompt box is excluded unless separately enabled, and document context is never logged.