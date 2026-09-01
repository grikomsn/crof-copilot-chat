export const API_BASE = "https://crof.ai/v1";

export const CROF_ENDPOINTS = {
  models: `${API_BASE}/models`,
  chat: `${API_BASE}/chat/completions`,
  usage: "https://crof.ai/usage_api/",
} as const;

export function extensionUserAgent(version: string, vscodeVersion: string): string {
  return `crof-copilot-chat/${version} VSCode/${vscodeVersion}`;
}

export function crofHeaders(apiKey: string, accept: string, userAgent: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: accept,
    "User-Agent": userAgent,
  };
}
