import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {TextAlignmentEnum} from "../../../Common/Enums/TextAlignment";

export class UnknownExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, textAlignment: TextAlignmentEnum, staffNumber: number) {
        super(placement);
        this.label = label;
        this.staffNumber = staffNumber;
        if (textAlignment === undefined) {
            textAlignment = TextAlignmentEnum.LeftBottom;
        }
        this.textAlignment = textAlignment;
    }
    private label: string;
    private textAlignment: TextAlignmentEnum;
    private staffNumber: number;

    public get Label(): string {
        return this.label;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get TextAlignment(): TextAlignmentEnum {
        return this.textAlignment;
    }
}
