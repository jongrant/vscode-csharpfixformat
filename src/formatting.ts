const beautify = require('./js-beautify').js_beautify;

export interface IFormatConfig {
    useTabs: boolean;
    tabSize: number;
    sortUsingsEnabled: boolean;
    sortUsingsOrder: string;
    sortUsingsSplitGroups: boolean;
    styleEnabled: boolean;
    styleNewLineMaxAmount: number;
    styleNewLineAtEnd: boolean;
    styleNewLineElseCatch: boolean;
    styleIndentPreprocessorIgnored: boolean;
    styleIndentRegionIgnored: boolean;
    styleIndentSwitchCaseIgnored: boolean;
    styleBracesOnSameLine: boolean;
    styleBracesAllowInlines: boolean;
    styleSpacesBeforeParenthesis: boolean;
    styleSpacesAfterParenthesis: boolean;
    styleSpacesBeforeIndexerBracket: boolean;
    styleSpacesBeforeBracket: boolean;
    styleSpacesAfterBracket: boolean;
    styleSpacesInsideEmptyParenthis: boolean;
    styleSpacesInsideEmptyBraces: boolean;
    styleSpacesInsideEmptyBrackets: boolean;
    styleSpacesRemoveAfterCommandBeforeParenthesis: string;
    styleOperatorsOnSameLine: boolean;
}

export interface IResult {
    source?: string;
    error?: string;
}

declare type Func<T, S> = (...args: S[]) => T;

const validCodePatterns: RegExp[] = [
    /(\/\*\s*?fixformat +ignore:start\s*?\*\/[\s\S]*?\/\*\s*?fixformat +ignore:end\s*?\*\/)/gm,
    /(\/\*(?:.|\n)*?\*\/)/gm,
    /(\/\/.*?$)/gm,
    /('(?:[^'\\]|\\.)*')/gm,
    /("(?:[^"\\]|\\.|"")*")/gm
];

const validCodePatternString = validCodePatterns.map<string>(r => r.source).join('|');

const replaceCode = (source: string, condition: RegExp, cb: Func<string, string>): string => {
    const flags = condition.flags.replace(/[gm]/g, '');
    const regexp = new RegExp(`${validCodePatternString}|(${condition.source})`, `gm${flags}`);
    return source.replace(regexp, (s: string, ...args: string[]) => {
        if (s[0] === '"' || s[0] === '\'' || (s[0] === '/' && (s[1] === '/' || s[1] === '*'))) {
            return s;
        }
        return cb(s, ...args.slice(validCodePatterns.length + 1));
    });
};

const GetNamespaceOrder = (ns: string, orderedNames: string[]): number => {
    for (let i = 0; i < orderedNames.length; i++) {
        const item = orderedNames[i];
        let nsTest = item.length < ns.length ? ns.substr(0, item.length) : ns;
        if (item === nsTest) {
            return orderedNames.length - i;
        }
    }
    return 0;
};

export const process = (content: string, options: IFormatConfig): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        try {
            if (options.styleEnabled) {
                let bracesStyle = options.styleBracesOnSameLine ? 'collapse' : 'expand';
                if (options.styleBracesAllowInlines) {
                    bracesStyle += ',preserve-inline';
                }
                const beautifyOptions = {
                    eol: '\n',
                    brace_style: bracesStyle,
                    indent_with_tabs: options.useTabs,
                    indent_size: options.tabSize,
                    preserve_newlines: true,
                    max_preserve_newlines: options.styleNewLineMaxAmount > 0 ? options.styleNewLineMaxAmount : 0,
                    jslint_happy: false,
                    space_after_anon_function: true,
                    space_in_empty_paren: true,
                    keep_array_indentation: false,
                    e4x: false,
                    operator_position: options.styleOperatorsOnSameLine ? 'before-newline' : 'after-newline',
                    switch_case_indent_ignored: options.styleIndentSwitchCaseIgnored
                };

                // fix mixed line-endings issue.
                content = content.replace(/\r\n/g, '\n');

                // masking preprocessor directives for beautifier - no builtin support for them.
                content = replaceCode(content, /#(?:define|undef|if|else|elif|endif|pragma|warning|error)/gm, s => `// __vscode_pp__${s}`);

                // masking region / endregion directives.
                content = replaceCode(content, /#(region|endregion)/gm, s => `// __vscode_pp_region__${s}`);

                // fix attributes indentation.
                content = replaceCode(content, /\}\s*?\n\s*?\[/gm, s => `}\n\n[`);

                content = beautify(content, beautifyOptions);

                // restore masked preprocessor directives.
                content = content.replace(/([ \t]*)\/\/ __vscode_pp__/gm, (s, s1) => {
                    return options.styleIndentPreprocessorIgnored ? '' : `${s1}`;
                });

                // restore masked region / endregion directives.
                content = content.replace(/([ \t]*)\/\/ __vscode_pp_region__/gm, (s, s1) => {
                    return options.styleIndentRegionIgnored ? '' : `${s1}`;
                });

                // fix number suffixes.
                content = replaceCode(content, /([^\w])([\d][\da-fx]*?) (f|d|u|l|m|ul|lu])([^\w])/gmi,
                    (s, s1, s2, s3, s4) => `${s1}${s2}${s3}${s4}`);

                // fix generics.
                content = replaceCode(content, /\w\s*?\<((?:[^<>\|\&\{\}\=;]|<([^>\|\&\{\}\=;]+>))*)>/gm, s => {
                    return s.replace(/\s+/gm, ' ').replace(/\s*?\<\s*/gm, '<').replace(/\s*?\>/gm, '>');
                });

                // fix enums.
                content = replaceCode(content, /(enum[^\{]+\{)((?:.*?\n)*?)(.*?\}$)/gm, (s, s1, s2, s3) => {
                    const indentMatch = /^[ \t]+/gm.exec(s2);
                    if (indentMatch == null || indentMatch.length === 0) {
                        return s;
                    }
                    const itemIndent = indentMatch![0];
                    return `${s1}${s2.replace(/^[ \t]+/gm, itemIndent)}${s3}`;
                });

                // fix nested fields initialization.
                content = replaceCode(content, /(=[^\{\};]*?)(\{[^;]*?)(^ *?\};)/gm, (s, s1, s2, s3) => {
                    if (/\s(?!@)(public|private|protected|internal|class|struct|interface)\s/gm.test(s2)) {
                        return s;
                    }
                    const indentMatch = /^[ \t]+/gm.exec(s2);
                    if (indentMatch == null || indentMatch.length === 0) {
                        return s;
                    }
                    const itemIndent = indentMatch![0];
                    return `${s1}${s2.replace(/^[ \t]+/gm, itemIndent)}${s3}`;
                });

                // fix string interpolators / escaped strings.
                content = replaceCode(content, /(\$ @|[\$|@]) (?=")/gm, (s, s1) => s1.replace(' ', ''));

                // fix colons.
                content = replaceCode(content, /([\w\)\]\>]): (\w)/gm, (s, s1, s2) => `${s1} : ${s2}`);

                // fix ">[\(\)\[\];,\.]" pairs.
                content = replaceCode(content, /\> ([\(\)\[\];,\.])/gm, (s, s1) => {
                    return `>${s1}`;
                });

                content = replaceCode(content, /( \>)\(/gm, (s, s1) => `${s1} (`);

                // fix opening parenthesis.
                if (options.styleSpacesBeforeParenthesis) {
                    content = replaceCode(content, /([\w\)\]\>])\(/gm, (s, s1) => `${s1} (`);
                }

                // fix opening bracket.
                if (options.styleSpacesBeforeBracket) {
                    content = replaceCode(content, /([\w\)\]\>])\[/gm, (s, s1) => `${s1} [`);
                }

                // fix closing parenthesis.
                if (options.styleSpacesAfterParenthesis) {
                    content = replaceCode(content, /\)([\w\(\[])/gm, (s, s1) => `) ${s1}`);
                } else {
                    // "void Test () {" case.
                    content = replaceCode(content, /\) ([^\{])/gm, (s, s1) => `)${s1}`);
                }

                // fix closing bracket.
                if (options.styleSpacesAfterBracket) {
                    content = replaceCode(content, /\]([\w])/gm, (s, s1) => `] ${s1}`);
                }

                if (options.styleSpacesInsideEmptyParenthis) {
                    content = replaceCode(content, /\(\)/gm, s => '( )');
                }

                if (options.styleSpacesInsideEmptyBraces) {
                    content = replaceCode(content, /\{\}/gm, s => '{ }');
                }

                if (options.styleSpacesInsideEmptyBrackets) {
                    content = replaceCode(content, /\[\]/gm, s => '[ ]');
                }

                if (options.styleSpacesBeforeIndexerBracket) {
                    content = replaceCode(content, /this\[/gm, s => 'this [');
                }

                // fix operator overloading.
                const spaceBefore = options.styleSpacesBeforeParenthesis ? ' ' : '';
                content = replaceCode(content, /operator ?([^ \(]+) ?\(/gm, (s, s1) => `operator ${s1}${spaceBefore}(`);

                // fix named parameters. [^\?;,"]+(, \?\w+?: [^\?;:,"]+?)*
                content = replaceCode(content, /\(\w+ : [^\?;,:\n]+(, \w+ : [^\?;,:\n]+)*/gm, s => s.replace(/ :/g, ':'));

                // fix nullable members access.
                content = replaceCode(content, / \? ([\.;])/gm, (s, s1) => `?${s1}`);

                // fix do { xxx } while (yyy) with "styleBracesOnSameLine"=false.
                if (!options.styleBracesOnSameLine) {
                    content = replaceCode(content, /(^[ \t]*?)do \{/gm, (s, s1) => `${s1}do\n${s1}{`);
                }

                if (options.styleSpacesRemoveAfterCommandBeforeParenthesis) {
                    const removeRegex = new RegExp(`(${options.styleSpacesRemoveAfterCommandBeforeParenthesis.replace(/ /g, '|')}) \\(`, 'gm');
                    content = replaceCode(content, removeRegex, (s, s1) => `${s1}(`);
                }

                // put else / catch expression force on new line with "styleNewLineElseCatch"=true.
                if (options.styleNewLineElseCatch) {
                    content = replaceCode(content, /(^[ \t]*?)\} (else|catch)/gm, (s, s1, s2) => `${s1}}\n${s1}${s2}`);
                }
            }

            if (options.sortUsingsEnabled) {
                const trimSemiColon = /^\s+|;\s*$/;
                content = replaceCode(content, /(\s*using\s+[.\w]+;)+/gm, rawBlock => {
                    const items = rawBlock.split('\n').filter((l) => l && l.trim().length > 0);
                    items.sort((a: string, b: string) => {
                        let res = 0;
                        // because we keep lines with indentation and semicolons.
                        a = a.replace(trimSemiColon, '');
                        b = b.replace(trimSemiColon, '');
                        if (options.sortUsingsOrder) {
                            const ns = options.sortUsingsOrder.split(' ');
                            res -= GetNamespaceOrder(a.substr(6), ns);
                            res += GetNamespaceOrder(b.substr(6), ns);
                            if (res !== 0) {
                                return res;
                            }
                        }
                        for (let i = 0; i < a.length; i++) {
                            const lhs = a[i].toLowerCase();
                            const rhs = b[i] ? b[i].toLowerCase() : b[i];
                            if (lhs !== rhs) {
                                res = lhs < rhs ? -1 : 1;
                                break;
                            }
                            if (lhs !== a[i]) { res++; }
                            if (rhs !== b[i]) { res--; }
                            if (res !== 0) {
                                break;
                            }
                        }
                        return res === 0 && b.length > a.length ? -1 : res;
                    });
                    if (options.sortUsingsSplitGroups) {
                        let i = items.length - 1;
                        const baseNS = /\s*using\s+(\w+).*/;
                        let lastNS = items[i--].replace(baseNS, '$1');
                        let nextNS: string;
                        for (; i >= 0; i--) {
                            nextNS = items[i].replace(baseNS, '$1');
                            if (nextNS !== lastNS) {
                                lastNS = nextNS;
                                items.splice(i + 1, 0, '');
                            }
                        }
                    }
                    for (let i = 1; i >= 0; i--) {
                        if (rawBlock[i] === '\n') {
                            items.unshift('');
                        }
                    }
                    return items.join('\n');
                });
            }
            if (options.styleNewLineAtEnd) {
                if (content) {
                    content += '\n';
                }
            }
            resolve(content);
        } catch (ex) {
            reject(`internal error (please, report to extension owner): ${ex.message}`);
        }
    });
};