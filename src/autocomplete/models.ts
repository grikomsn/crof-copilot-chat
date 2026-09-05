/**
 * Vetted inline-completion model candidates, ordered cheap-and-fast first.
 *
 * Badges carry the live-measured (2026-09-06) latency and hidden-reasoning
 * results; unmeasured reasoning-capable models follow the measured ones, and
 * models with measured problems come last with warnings. The QuickPick command
 * renders this list and writes the selected id to
 * `crofCopilot.inlineSuggestionsModel`, so choices need no reload. Unknown
 * model ids stay reachable through the command's custom entry and the raw
 * setting.
 *
 * Pure and unit-tested.
 */

export interface InlineModelCandidate {
  readonly id: string;
  /** Short measured/compatibility badge, e.g. "★ recommended · measured 1.3s TTFB". */
  readonly badge: string;
  /** One-line rationale shown under the model id. */
  readonly detail: string;
}

export const INLINE_MODEL_CANDIDATES: readonly InlineModelCandidate[] = [
  {
    id: "glm-5.3-flash",
    badge: "★ recommended · measured 1.3s TTFB",
    detail: "Fastest measured-clean model: zero hidden reasoning at reasoning_effort none, and the flash tier keeps cost low.",
  },
  {
    id: "mimo-v2.5-pro",
    badge: "measured 1.4s TTFB",
    detail: "Zero hidden reasoning at reasoning_effort none with a correct completion.",
  },
  {
    id: "deepseek-v4-flash-0731",
    badge: "measured 1.5s TTFB",
    detail: "Zero hidden reasoning at reasoning_effort none with a correct completion.",
  },
  {
    id: "deepseek-v4-pro-0813",
    badge: "measured 1.6s TTFB",
    detail: "Zero hidden reasoning at reasoning_effort none with a correct completion.",
  },
  {
    id: "glm-5.2",
    badge: "measured 1.7s TTFB",
    detail: "Zero hidden reasoning at reasoning_effort none with a correct completion.",
  },
  {
    id: "gemma-4-31b-it",
    badge: "⚠ measured: slow first token",
    detail: "11s before the first content token at reasoning_effort none; not recommended.",
  },
  {
    id: "qwen3.8-27b",
    badge: "⚠ measured: wrong scaling",
    detail: "Divides by max only instead of min-max; not recommended for ghost text.",
  },
  {
    id: "deepseek-v4-flash-vision-exp",
    badge: "⚠ measured: wrong scaling",
    detail: "Divides by max only instead of min-max; not recommended.",
  },
  {
    id: "kimi-k3",
    badge: "⚠ measured: empty stream",
    detail: "Streamed no content in testing despite a fast time-to-first-byte.",
  },
  {
    id: "glm-5.3",
    badge: "⚠ measured: empty stream",
    detail: "Streamed no content in testing at reasoning_effort none.",
  },
  {
    id: "kimi-k3-eco",
    badge: "⚠ measured: empty stream",
    detail: "Streamed no content in testing despite a fast time-to-first-byte.",
  },
  {
    id: "kimi-k2.6",
    badge: "⚠ measured: slow first token",
    detail: "Multi-second delay before the first content token even at reasoning_effort none.",
  },
  {
    id: "kimi-k2.7-code",
    badge: "⚠ always-on thinking",
    detail: "Kimi K2.7 requires thinking enabled (Moonshot API constraint); cannot run without reasoning.",
  },
  {
    id: "greg-2-ultra",
    badge: "⚠ measured: ignores none",
    detail: "Burned 1000+ hidden reasoning characters despite reasoning_effort none.",
  },
  {
    id: "greg-2-super",
    badge: "⚠ measured: ignores none",
    detail: "Same behavior as greg-2-ultra; not recommended for ghost text.",
  },
  {
    id: "qwen3.5-9b",
    badge: "⚠ measured: poor quality",
    detail: "Completed with incorrect logic in testing.",
  },
];

export interface InlineModelChoice {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
}

/** Build QuickPick-shaped choices, pinning an unlisted current id to the top. */
export function inlineModelChoices(currentId: string): InlineModelChoice[] {
  const listed = INLINE_MODEL_CANDIDATES.map((candidate) => ({
    id: candidate.id,
    label: candidate.id === currentId ? `$(check) ${candidate.id}` : candidate.id,
    description: candidate.badge,
    detail: candidate.detail,
  }));
  const pinned = !INLINE_MODEL_CANDIDATES.some((candidate) => candidate.id === currentId)
    ? [{
      id: currentId,
      label: `$(check) ${currentId}`,
      description: "current value",
      detail: "Kept from your settings; not in the vetted list.",
    }]
    : [];
  return [...pinned, ...listed];
}
