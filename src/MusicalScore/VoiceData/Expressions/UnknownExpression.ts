import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {TextAlignmentAndPlacement} from "../../../Common/Enums/TextAlignment";

export class UnknownExpression extends AbstractExpression {
    constructor(label: string, placementEnum: PlacementEnum, textAlignment: TextAlignmentAndPlacement, staffNumber: number) {
        super();
        this.label = label;
        this.placement = placementEnum;
        this.staffNumber = staffNumber;
        if (textAlignment === undefined) {
            textAlignment = TextAlignmentAndPlacement.LeftBottom;
        }
        this.textAlignment = textAlignment;
    }
    private label: string;
    private placement: PlacementEnum;
    private textAlignment: TextAlignmentAndPlacement;
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
    public get TextAlignment(): TextAlignmentAndPlacement {
        return this.textAlignment;
    }
}
