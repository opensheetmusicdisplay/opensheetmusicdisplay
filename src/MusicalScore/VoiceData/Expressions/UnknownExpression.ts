import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {TextAlignment} from "../../../Common/Enums/TextAlignment";

export class UnknownExpression extends AbstractExpression {
    //constructor(label: string, placementEnum: PlacementEnum, staffNumber: number) {
    //    this(label, placementEnum, OSMDTextAlignment.LeftBottom, staffNumber);
    //
    //}
    constructor(label: string, placementEnum: PlacementEnum, textAlignment: TextAlignment, staffNumber: number) {
        super();
        this.label = label;
        this.placement = placementEnum;
        this.staffNumber = staffNumber;
        if (textAlignment === undefined) {
            textAlignment = TextAlignment.LeftBottom;
        }
        this.textAlignment = textAlignment;
    }
    private label: string;
    private placement: PlacementEnum;
    private textAlignment: TextAlignment;
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
    public get TextAlignment(): TextAlignment {
        return this.textAlignment;
    }
}
