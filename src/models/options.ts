export const REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;

export type ReasoningEffort = typeof REASONING_EFFORTS[number];
export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "high";

export function resolveReasoningEffort(
  requestConfiguration: Readonly<Record<string, unknown>> | undefined,
  workspaceDefault: unknown,
): ReasoningEffort {
  const requested = stringOption(requestConfiguration, "reasoningEffort")
    ?? stringOption(requestConfiguration, "thinkingEffort")
    ?? (typeof workspaceDefault === "string" ? workspaceDefault : undefined);
  return isReasoningEffort(requested) ? requested : DEFAULT_REASONING_EFFORT;
}

export function buildModelConfigurationSchema(defaultEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT): {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
} {
  return {
    type: "object",
    properties: {
      reasoningEffort: {
        type: "string",
        title: "Reasoning Effort",
        enum: [...REASONING_EFFORTS],
        enumItemLabels: ["None", "Low", "Medium", "High"],
        enumDescriptions: [
          "Disable model reasoning",
          "Use less reasoning for lower latency and cost",
          "Balance reasoning depth, latency, and cost",
          "Use deeper reasoning for complex tasks",
        ],
        default: defaultEffort,
        group: "navigation",
      },
    },
  };
}

export function applyReasoningEffort(
  body: Readonly<Record<string, unknown>>,
  effort: ReasoningEffort,
): Record<string, unknown> {
  return { ...body, reasoning_effort: effort };
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && REASONING_EFFORTS.includes(value as ReasoningEffort);
}

function stringOption(value: Readonly<Record<string, unknown>> | undefined, key: string): string | undefined {
  return typeof value?.[key] === "string" ? value[key] as string : undefined;
}
