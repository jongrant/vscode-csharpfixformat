const beautify = require('./js-beautify').js_beautify;

export interface IFormatConfig {
    tabSize: number;
    sortUsingsEnabled: boolean;
    sortUsingsSystemFirst: boolean;
    sortUsingsSplitGroups: boolean;
    styleEnabled: boolean;
    styleNewLineMaxAmount: number;
    styleIndentPreprocessorIgnored: boolean;
    styleIndentRegionIgnored: boolean;
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

export const process = (content: string, options: IFormatConfig): IResult => {
    try {
        if (options.styleEnabled) {
            let bracesStyle = options.styleBracesOnSameLine ? 'collapse' : 'expand';
            if (options.styleBracesAllowInlines) {
                bracesStyle += ',preserve-inline';
            }
            const beautifyOptions = {
                brace_style: bracesStyle,
                indent_size: options.tabSize,
                preserve_newlines: true,
                max_preserve_newlines: options.styleNewLineMaxAmount > 0 ? options.styleNewLineMaxAmount : 0,
                jslint_happy: false,
                space_after_anon_function: true,
                space_in_empty_paren: true,
                keep_array_indentation: false,
                e4x: false
            };

            // masking preprocessor directives for beautifier - no builtin support for them.
            content = replaceCode(content, /#(?:define|if|else|endif|pragma)/gm, s => `// __vscode_pp__${s}`);

            // masking region / endregion directives.
            content = replaceCode(content, /#(region|endregion)/gm, s => `// __vscode_pp_region__${s}`);

            // masking content of escaped strings.
            content = content.replace(/(?:[^"\\])"(?:[^"\\]|\\.|"")*"/gm, s => {
                return s.replace(/([^\\])""/g, '$1__vscode_pp_dq__');
            });

            content = beautify(content, beautifyOptions);

            // restore masked preprocessor directives.
            content = content.replace(/( *)\/\/ __vscode_pp__/gm, (s: string, s1: string) => {
                return options.styleIndentPreprocessorIgnored ? '' : `${s1}`;
            });

            // restore masked region / endregion directives.
            content = content.replace(/( *)\/\/ __vscode_pp_region__/gm, (s: string, s1: string) => {
                return options.styleIndentRegionIgnored ? '' : `${s1}`;
            });

            // restore masked content of escaped strings.
            content = content.replace(/__vscode_pp_dq__/gm, '""');

            // fix number suffixes.
            content = replaceCode(content, /(\d) (f|d|u|l|m|ul|lu])([^\w])/gmi, (s, s1, s2, s3) => `${s1}${s2}${s3}`);

            // fix nullables.
            content = replaceCode(content, /(\w+) \?(\s*)([\.,\w][^\n]*)/gm, (s, s1, s2, s3) => {
                if (s3[0] === '.' || s3[0] === ',') {
                    return `${s1}?${s3}`;
                }
                if (s3.indexOf(':') !== -1) {
                    return s;
                }
                return `${s1}?${s2}${s3}`;
            });

            // fix generics.
            content = replaceCode(content, /\w\s*?\<((?:[^<>\|\&\{\}\=;]|<([^>\|\&\{\}\=;]+>))*)>/gm, s => {
                return s.replace(/\s+/gm, ' ').replace(/\s*?\<\s*/gm, '<').replace(/\s*?\>/gm, '>');
            });

            // fix enums.
            content = replaceCode(content, /(enum[^\{]+\{)((?:.*?\n)*?)(.*?\}$)/gm, (s, s1, s2, s3) => {
                const indentMatch = /^ +/gm.exec(s2);
                if (indentMatch == null || indentMatch.length === 0) {
                    return s;
                }
                const itemIndent = indentMatch![0];
                const d2 = s2.replace(/^ +/gm, itemIndent);
                return `${s1}${s2.replace(/^ +/gm, itemIndent)}${s3}`;
            });

            // fix string interpolators / escaped strings.
            content = replaceCode(content, /(\$ @|[\$|@]) (?=")/gm, (s, s1) => s1.replace(' ', ''));

            // fix colons.
            content = replaceCode(content, /([\w\)\]\>]): (\w)/gm, (s, s1, s2) => `${s1} : ${s2}`);

            // fix ">[\(\)\[\];,\.]" pairs.
            content = replaceCode(content, /\> ([\(\)\[\];,\.])/gm, (s, s1) => {
                return `>${s1}`;
            });

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
                content = replaceCode(content, /\)([\w])/gm, (s, s1) => `) ${s1}`);
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
                    if (options.sortUsingsSystemFirst) {
                        if (a.indexOf('System') === 6) { res--; }
                        if (b.indexOf('System') === 6) { res++; }
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
        return { source: content };
    } catch (ex) {
        console.warn(ex);
        return { error: `internal error (please, report to extension owner): ${ex.message}` };
    }
};