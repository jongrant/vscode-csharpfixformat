import * as vs from 'vscode';
import * as formatting from './formatting';

class FormatProvider implements vs.DocumentRangeFormattingEditProvider, vs.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(document: vs.TextDocument, position: vs.Position, ch: string, options: vs.FormattingOptions, token: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
        return this.processFormatting(document, options);
    }
    provideDocumentRangeFormattingEdits(document: vs.TextDocument, range: vs.Range, options: vs.FormattingOptions, token: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
        return this.processFormatting(document, options);
    }

    private processFormatting(document: vs.TextDocument, vscodeOptions: vs.FormattingOptions) {
        const cfg = vs.workspace.getConfiguration('csharpfixformat');
        const options: formatting.IFormatConfig = {
            useTabs: !vscodeOptions.insertSpaces,
            tabSize: vscodeOptions.tabSize,
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
        const result = formatting.process(document.getText(), options);
        const edits: vs.TextEdit[] = [];
        if (!result.error) {
            if (result.source) {
                const range = new vs.Range(new vs.Position(0, 0), document.lineAt(document.lineCount - 1).range.end);
                edits.push(new vs.TextEdit(range, result.source));
            }
        }
        else {
            vs.window.showWarningMessage(result.error);
        }
        return edits;
    }
}

export function activate(context: vs.ExtensionContext) {
    const omnisharp = vs.extensions.getExtension('ms-vscode.csharp');
    if (omnisharp) {
        const cfg = vs.workspace.getConfiguration('csharp');
        const keyName = 'format.enable';
        const omnisharpUpdated = cfg.has(keyName);
        if (omnisharpUpdated) {
            if (cfg.get<boolean>(keyName, true)) {
                vs.window.showWarningMessage('For properly code formatting, omnisharp format provider should be disabled: "csharp.format.enable=false"', 'Fix and reload')
                    .then((choice: string | undefined) => {
                        if (choice) {
                            cfg.update(keyName, false, vs.ConfigurationTarget.Global);
                            vs.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    });
            }
        } else {
            vs.window.showErrorMessage('Installed omnisharp version not supported (conflict of format providers) and should be updated to >= 1.13.');
        }
    }
    const formatProvider = new FormatProvider();
    context.subscriptions.push(vs.languages.registerDocumentRangeFormattingEditProvider('csharp', formatProvider));
    context.subscriptions.push(vs.languages.registerOnTypeFormattingEditProvider('csharp', formatProvider, '}', ';'));
}

export function deactivate() {
}