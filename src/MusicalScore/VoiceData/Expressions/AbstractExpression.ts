export class AbstractExpression {
    protected placement: PlacementEnum;

    constructor(placement: PlacementEnum) {
        this.placement = placement;
    }

    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean {
        for (let idx: number = 0, len: number = stringList.length; idx < len; ++idx) {
            const s: string = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim()) {
                return true;
            }
        }
        return false;
    }

    /** Placement of the expression */
    public get Placement(): PlacementEnum { return this.placement; }

    public static PlacementEnumFromString(placementString: string): PlacementEnum {
        switch (placementString.toLowerCase()) {
            case "above":
                return PlacementEnum.Above;
            case "below":
                return PlacementEnum.Below;
            case "left":
                return PlacementEnum.Left;
            case "right":
                return PlacementEnum.Right;
            case "auto":
            default:
                return PlacementEnum.NotYetDefined;
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
