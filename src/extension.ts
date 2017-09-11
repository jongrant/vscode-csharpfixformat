import * as vscode from 'vscode';
import * as formatting from './formatting';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('csharpfixformat.process', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const doc = editor.document;
            if (doc.languageId === 'csharp') {
                const cfg = vscode.workspace.getConfiguration('csharpfixformat');
                return editor.edit(edit => {
                    const options: formatting.IFormatConfig = {
                        tabSize: vscode.workspace.getConfiguration().get<number>('editor.tabSize', 4),
                        sortUsingsEnabled: cfg.get<boolean>('sort.usings.enabled', true),
                        sortUsingsSystemFirst: cfg.get<boolean>('sort.usings.systemFirst', true),
                        sortUsingsSplitGroups: cfg.get<boolean>('sort.usings.splitGroups', false),
                        styleEnabled: cfg.get<boolean>('style.enabled', true),
                        styleNewLineMaxAmount: cfg.get<number>('style.newline.maxAmount', 0),
                        styleIndentPreprocessorIgnored: cfg.get<boolean>('style.indent.preprocessorIgnored', true),
                        styleIndentRegionIgnored: cfg.get<boolean>('style.indent.regionIgnored', false),
                        styleBracesOnSameLine: cfg.get<boolean>('style.braces.onSameLine', true),
                        styleBracesAllowInlines: cfg.get<boolean>('style.braces.allowInlines', true),
                        styleSpacesBeforeParenthesis: cfg.get<boolean>('style.spaces.beforeParenthesis', true),
                        styleSpacesAfterParenthesis: cfg.get<boolean>('style.spaces.afterParenthesis', true),
                        styleSpacesBeforeIndexerBracket: cfg.get<boolean>('style.spaces.beforeIndexerBracket', true),
                        styleSpacesBeforeBracket: cfg.get<boolean>('style.spaces.beforeBracket', false),
                        styleSpacesAfterBracket: cfg.get<boolean>('style.spaces.afterBracket', true),
                        styleSpacesInsideEmptyParenthis: cfg.get<boolean>('style.spaces.insideEmptyParenthis', false),
                        styleSpacesInsideEmptyBraces: cfg.get<boolean>('style.spaces.insideEmptyBraces', true),
                        styleSpacesInsideEmptyBrackets: cfg.get<boolean>('style.spaces.insideEmptyBrackets', false)
                    };
                    const result = formatting.process(doc.getText(), options);
                    if (result.error) {
                        return vscode.window.showWarningMessage(result.error);
                    }
                    if (result.source) {
                        edit.replace(new vscode.Range(0, 0, doc.lineCount, 0), result.source);
                    }
                });
            }
        }
        vscode.window.showErrorMessage('CSharp file should be opened before command execution.');
    }));
}

export function deactivate() {
}