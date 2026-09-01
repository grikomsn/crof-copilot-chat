import * as vscode from "vscode";
import { formatUsageStatusBar, formatUsageTooltip, type CrofUsageSnapshot } from "./domain";

export function renderUsageStatus(item: vscode.StatusBarItem, snapshot: CrofUsageSnapshot): void {
  item.text = formatUsageStatusBar(snapshot);
  item.tooltip = formatUsageTooltip(snapshot);
}

export function updateUsageStatusVisibility(item: vscode.StatusBarItem): void {
  if (vscode.workspace.getConfiguration("crofCopilot").get("showUsageStatusBar", true)) item.show();
  else item.hide();
}
