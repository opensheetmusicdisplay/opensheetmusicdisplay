import { StaffLine } from "./StaffLine";
import { InstantaneousDynamicExpression } from "../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import * as log from "loglevel";

export class GraphicalInstantaneousDynamicExpression extends AbstractGraphicalExpression {
    protected mInstantaneousDynamicExpression: InstantaneousDynamicExpression;
    protected mMeasure: GraphicalMeasure;

    constructor(instantaneousDynamic: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(staffLine, instantaneousDynamic);
        this.mInstantaneousDynamicExpression = instantaneousDynamic;
        this.mMeasure = measure;
    }

    public updateSkyBottomLine(): void {
        const skyBottomLineCalculator: SkyBottomLineCalculator = this.parentStaffLine.SkyBottomLineCalculator;
        const left: number = this.PositionAndShape.RelativePosition.x + this.PositionAndShape.BorderMarginLeft;
        const right: number = this.PositionAndShape.RelativePosition.x + this.PositionAndShape.BorderMarginRight;
        let yValue: number = 0;
        switch (this.Placement) {
            case PlacementEnum.Above:
                yValue = this.PositionAndShape.RelativePosition.y + this.PositionAndShape.BorderMarginTop;
                skyBottomLineCalculator.updateSkyLineInRange(left, right, yValue);
                break;
            case PlacementEnum.Below:
                yValue = this.PositionAndShape.RelativePosition.y + this.PositionAndShape.BorderMarginBottom;
                skyBottomLineCalculator.updateBottomLineInRange(left, right, yValue);
                break;
            default:
                log.error("Placement for GraphicalInstantaneousDynamicExpression is unknown");
        }
    }
}
