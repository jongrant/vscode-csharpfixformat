import * as vs from 'vscode';
import * as formatting from './formatting';

const COMMAND_ID = "csharpsortusings.sortUsings";

const getFormatOptions = (): formatting.IFormatConfig => {
    const cfg = vs.workspace.getConfiguration('csharpsortusings');

    return {
        sortUsingsEnabled: cfg.get<boolean>('sort.usings.enabled', true),
        sortUsingsOrder: cfg.get<string>('sort.usings.order', 'System'),
        sortUsingsSplitGroups: cfg.get<boolean>('sort.usings.splitGroups', true)
    };
};

export function getEdits(editor: vs.TextEditor, edit: vs.TextEditorEdit) {
    try {
        const result = formatting.process(editor.document.getText(), getFormatOptions());

        if (result) {
            const range = new vs.Range(new vs.Position(0, 0), editor.document.lineAt(editor.document.lineCount - 1).range.end);
            edit.replace(range, result);
        }
    }
    catch (ex) {
        vs.window.showWarningMessage(ex);
    }
};
