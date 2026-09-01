import * as vscode from "vscode";
import { CrofAIAuth } from "./auth/auth";
import { registerCommands } from "./commands/commands";
import { messageOf } from "./errors";
import { CrofAIProvider } from "./provider";
import { extensionUserAgent } from "./transport/protocol";
import { renderUsageStatus, updateUsageStatusVisibility } from "./usage/presentation";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CrofAI");
  const auth = new CrofAIAuth(context.secrets);
  const provider = new CrofAIProvider(
    auth,
    output,
    extensionUserAgent(context.extension.packageJSON.version, vscode.version),
    context.globalState,
  );
  const usageStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 92);
  usageStatus.name = "CrofAI account balance";
  usageStatus.command = "crofCopilot.showUsage";
  renderUsageStatus(usageStatus, provider.getUsageSnapshot());
  updateUsageStatusVisibility(usageStatus);

  context.subscriptions.push(
    output,
    usageStatus,
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("crofCopilot.reasoningEffort") ||
        event.affectsConfiguration("crofCopilot.catalogCacheMinutes")
      ) {
        provider.fireDidChange();
      }
      if (event.affectsConfiguration("crofCopilot.showUsageStatusBar")) updateUsageStatusVisibility(usageStatus);
    }),
    provider.onDidChangeUsage(({ credentialRef, usage }) => {
      if (credentialRef === provider.getActiveCredentialRef()) renderUsageStatus(usageStatus, usage);
    }),
    vscode.lm.registerLanguageModelChatProvider("crof", provider),
    ...registerCommands(auth, provider, output),
  );

  output.appendLine(
    `[activate] CrofAI for Copilot Chat ${context.extension.packageJSON.version} on VS Code ${vscode.version}`,
  );
  void auth.hasApiKey().then((configured) => {
    if (!configured) return;
    void provider.refreshModels().catch((error) => {
      output.appendLine(`[models] initial refresh failed: ${messageOf(error)}`);
    });
    void provider.refreshUsage().catch((error) => {
      output.appendLine(`[usage] initial refresh failed: ${messageOf(error)}`);
    });
  });
}
