import * as vscode from "vscode";
import { CrofAIAuth } from "./auth/auth";
import { registerCommands } from "./commands/commands";
import { messageOf } from "./errors";
import { CrofAIProvider } from "./provider";
import { extensionUserAgent } from "./transport/protocol";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CrofAI");
  const auth = new CrofAIAuth(context.secrets);
  const provider = new CrofAIProvider(
    auth,
    output,
    extensionUserAgent(context.extension.packageJSON.version, vscode.version),
  );

  context.subscriptions.push(
    output,
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("crofCopilot.reasoningEffort")
        || event.affectsConfiguration("crofCopilot.catalogCacheMinutes")) {
        provider.fireDidChange();
      }
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
  });
}
