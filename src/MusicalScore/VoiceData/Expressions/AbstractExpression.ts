export class AbstractExpression {
    //constructor() {
    //
    //}
    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean {
        for (let idx: number = 0, len: number = stringList.length; idx < len; ++idx) {
            let s: string = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim()) {
                return true;
            }
        }
        return false;
    }
}

export enum PlacementEnum {
    Above = 0,
    Below = 1,
    NotYetDefined = 2
}
