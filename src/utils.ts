import * as fs from 'fs';
import * as path from 'path';

export const findFiles = (dir: string, mask: RegExp): string[] => {
    const results: string[] = [];
    for (const file of fs.readdirSync(dir)) {
        const stats = fs.lstatSync(path.join(dir, file));
        if (stats.isDirectory()) {
            results.push(...findFiles(path.join(dir, file), mask));
        } else {
            if (mask.test(file)) {
                results.push(path.join(dir, file));
            }
        }
    }
    return results;
};