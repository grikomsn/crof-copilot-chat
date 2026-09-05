---
"crof-copilot-chat": minor
---

Add experimental, opt-in inline code suggestions (ghost text) powered by the CrofAI gateway with `reasoning_effort: "none"`. Enable with `crofCopilot.inlineSuggestions` and choose the model (`inlineSuggestionsModel`, default `glm-5.3-flash`; live-measured 1343ms TTFB with zero hidden reasoning). A new **CrofAI: Set Inline Suggestions Model** command (also in the Manage menu) lists compatible models ordered cheap-and-fast first with measured badges and warnings for models measured unusable; a custom model id remains enterable. Debounce, timeout, token budget, and context windows are configurable. The Copilot Chat prompt box is excluded unless separately enabled, and document context is never logged.
