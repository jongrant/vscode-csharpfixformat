export interface IFormatConfig {
    sortUsingsEnabled: boolean;
    sortUsingsOrder: string;
    sortUsingsSplitGroups: boolean;
}

export interface IResult {
    source?: string;
    error?: string;
}

declare type Func<T, S> = (...args: S[]) => T;

const replaceCode = (source: string, condition: RegExp, cb: Func<string, string>): string => {
    const flags = condition.flags.replace(/[gm]/g, '');
    const regexp = new RegExp(condition.source, `gm${flags}`);
    return source.replace(regexp, (s: string, ...args: string[]) => {
        if (s[0] === '"' || s[0] === '\'' || (s[0] === '/' && (s[1] === '/' || s[1] === '*'))) {
            return s;
        }
        return cb(s, ...args.slice(1));
    });
};

const getNamespaceOrder = (ns: string, orderedNames: string[]): number => {
    for (let i = 0; i < orderedNames.length; i++) {
        const item = orderedNames[i];
        let nsTest = item.length < ns.length ? ns.substr(0, item.length) : ns;
        if (item === nsTest) {
            return orderedNames.length - i;
        }
    }
    return 0;
};

export const process = (content: string, options: IFormatConfig): string => {
    try {
        const trimSemiColon = /^\s+|;\s*$/;

        content = replaceCode(content, /(^\s*using\s+[\w\s.=]+;\s*$)+/gm, rawBlock => {
            var items = rawBlock.split(/[\r\n]+/).filter(l => l && l.trim().length > 0);

            // separate out the type definitions
            var defs = items.filter(l => l.indexOf('=') != -1);
            items = items.filter(l => l.indexOf('=') == -1);

            items.sort((a: string, b: string) => {
                let res = 0;
                
                // because we keep lines with indentation and semicolons.
                a = a.replace(trimSemiColon, '');
                b = b.replace(trimSemiColon, '');

                if (options.sortUsingsOrder) {
                    const ns = options.sortUsingsOrder.split(' ');
                    res -= getNamespaceOrder(a.substr(6), ns);
                    res += getNamespaceOrder(b.substr(6), ns);
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
            
            // build a result
            var result = '';
            if (items.length > 0) result += items.join('\n') + '\n\n';
            if (defs.length > 0) result += defs.join('\n') + '\n\n';
            return result;
        });
        
        return content;
    }
    catch (ex) {
        throw `internal error (please, report to extension owner): ${ex.message}`;
    }
};
