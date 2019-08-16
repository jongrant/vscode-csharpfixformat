import * as vs from 'vscode';
import * as provider from './provider';

export function activate(context: vs.ExtensionContext): void {
    var command = vs.commands.registerTextEditorCommand("csharpsortusings.sortUsings", provider.getEdits);

    context.subscriptions.push(command);
}
