export class AbstractExpression {
    constructor() {

    }
    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean {
        for (var idx: number = 0, len = stringList.length; idx < len; ++idx) {
            var s: string = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim())
                return true;
        }
        return false;
    }
}

export enum PlacementEnum {
    Above = 0,
    Below = 1,
    NotYetDefined = 2
}