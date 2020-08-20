import { EOL } from 'os';
import * as formatting  from '../src/formatting';

const getFormatOptions = (): formatting.IFormatConfig => {
    return {
        sortUsingsEnabled: true,
        sortUsingsOrder: 'System',
        sortUsingsSplitGroups: true
    };
};

describe('Sorting', function(){
    it('Sorts short strings first', function() {
        const testInput =
            'using System.Text;' + EOL +
            'using System;' + EOL;
        const expected =
            'using System;' + EOL +
            'using System.Text;' + EOL;
        const actual = formatting.process(testInput, getFormatOptions());
        expect(actual.replace(/(\r\n|\n|\r)/gm, "").trim()).toBe(expected.replace(/(\r\n|\n|\r)/gm, "").trim());
    })
});
