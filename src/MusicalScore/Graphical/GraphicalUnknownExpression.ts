
import { StaffLine } from "./StaffLine";
import { GraphicalLabel } from "./GraphicalLabel";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";
import { PlacementEnum } from "../VoiceData/Expressions";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import log from "loglevel";

export class GraphicalUnknownExpression extends AbstractGraphicalExpression {
    constructor(staffLine: StaffLine, label: GraphicalLabel) {
        super(staffLine);
        this.label = label;
    }

    public updateSkyBottomLine(): void {
        // update Sky-BottomLine
        const skyBottomLineCalculator: SkyBottomLineCalculator = this.parentStaffLine.SkyBottomLineCalculator;
        const left: number = this.label.PositionAndShape.RelativePosition.x + this.label.PositionAndShape.BorderMarginLeft;
        const right: number = this.label.PositionAndShape.RelativePosition.x + this.label.PositionAndShape.BorderMarginRight;
        switch (this.Placement) {
            case PlacementEnum.Above:
                const yValueAbove: number = this.label.PositionAndShape.BorderMarginTop + this.label.PositionAndShape.RelativePosition.y;
                skyBottomLineCalculator.updateSkyLineInRange(left, right, yValueAbove);
                break;
            case PlacementEnum.Below:
                const yValueBelow: number = this.label.PositionAndShape.BorderMarginBottom + this.label.PositionAndShape.RelativePosition.y;
                skyBottomLineCalculator.updateBottomLineInRange(left, right, yValueBelow);
                break;
            default:
                log.error("Placement for GraphicalUnknownExpression is unknown");
        }
    }
}
