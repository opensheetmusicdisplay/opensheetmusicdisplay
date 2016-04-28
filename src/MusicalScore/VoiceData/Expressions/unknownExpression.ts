import {PlacementEnum, AbstractExpression} from "./abstractExpression";
import {OSMDTextAlignment} from "../../../Common/Enums/osmdTextAlignment";
export class UnknownExpression extends AbstractExpression {
    constructor(label: string, placementEnum: PlacementEnum, staffNumber: number) {
        this(label, placementEnum, OSMDTextAlignment.LeftBottom, staffNumber);

    }
    constructor(label: string, placementEnum: PlacementEnum, textAlignment: OSMDTextAlignment, staffNumber: number) {
        this.label = label;
        this.placement = placementEnum;
        this.staffNumber = staffNumber;
        this.textAlignment = textAlignment;
    }
    private label: string;
    private placement: PlacementEnum;
    private textAlignment: OSMDTextAlignment;
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
    public get TextAlignment(): OSMDTextAlignment {
        return this.textAlignment;
    }
}