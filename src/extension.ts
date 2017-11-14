import * as vs from 'vscode';
import * as formatting from './formatting';
import * as glob from 'glob';
import * as fs from 'fs';

class FormatProvider implements vs.DocumentRangeFormattingEditProvider, vs.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(document: vs.TextDocument, position: vs.Position, ch: string, options: vs.FormattingOptions, token: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
        return this.processFormatting(document, options);
    }
    provideDocumentRangeFormattingEdits(document: vs.TextDocument, range: vs.Range, options: vs.FormattingOptions, token: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
        return this.processFormatting(document, options);
    }

    private processFormatting(document: vs.TextDocument, options: vs.FormattingOptions) {
        const result = formatting.process(document.getText(), getFormatOptions(options));
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

const formatFolder = async (path: vs.Uri) => {
    return new Promise((resolve, reject) => {
        glob(`${path.fsPath}/**/*.cs`, (err, matches) => {
            if (matches.length > 0) {
                const formatOptions = getFormatOptions();
                for (const fn of matches) {
                    try {
                        const source = fs.readFileSync(fn, 'utf8');
                        const result = formatting.process(source, formatOptions);
                        if (result.error) { throw new Error(result.error); }
                        fs.writeFileSync(fn, result.source, 'utf8');
                    } catch (ex) {
                        return reject(new Error(`${fn} => ${ex}`));
                    }
                }
                resolve();
            }
        });
    });
};

const getFormatOptions = (options?: vs.FormattingOptions): formatting.IFormatConfig => {
    if (!options) {
        const sysCfg = vs.workspace.getConfiguration('editor');
        options = {
            insertSpaces: sysCfg.get<boolean>('insertSpaces', true),
            tabSize: sysCfg.get<number>('tabSize', 4),
        };
    }
    const cfg = vs.workspace.getConfiguration('csharpfixformat');
    return {
        useTabs: !options.insertSpaces,
        tabSize: options.tabSize,
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
};

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
    context.subscriptions.push(vs.commands.registerCommand('csharpfixformat.formatFolder', async (item: vs.Uri) => {
        if (item) {
            const choice = await vs.window.showWarningMessage('[C#FixFormat] Folder formatting operation cant be undone.', 'Continue');
            if (choice) {
                try {
                    await formatFolder(item);
                    vs.window.showInformationMessage('[C#FixFormat] Folder formatting completed successfully.');
                } catch (ex) {
                    vs.window.showWarningMessage(`[C#FixFormat] Folder formatting error: ${ex}`);
                }
            }
        } else {
            vs.window.showInformationMessage('[C#FixFormat] Use folder context menu (explorer window) for command processing.');
        }
    }));
}

export function deactivate() {
}