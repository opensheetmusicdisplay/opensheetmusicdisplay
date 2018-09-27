export class AbstractExpression {
    //constructor() {
    //
    //}
    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean {
        for (let idx: number = 0, len: number = stringList.length; idx < len; ++idx) {
            const s: string = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim()) {
                return true;
            }
        }
        return false;
    }

    public static PlacementEnumFromString(placementString: string): PlacementEnum {
        switch (placementString.toLowerCase()) {
            case "above":
                return PlacementEnum.Above;
            case "below":
                return PlacementEnum.Below;
            default:
            case "left":
                return PlacementEnum.Left;
            case "right":
                return PlacementEnum.Right;
        }
    }
}

export enum PlacementEnum {
    Above = 0,
    Below = 1,
    Left = 2,
    Right = 3,
    NotYetDefined = 4
}
