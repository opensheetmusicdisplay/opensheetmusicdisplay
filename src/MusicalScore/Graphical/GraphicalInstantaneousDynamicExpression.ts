import { StaffLine } from "./StaffLine";
import { InstantaneousDynamicExpression } from "../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { log } from "../../Common/Logging";

export class GraphicalInstantaneousDynamicExpression extends AbstractGraphicalExpression {
    protected mInstantaneousDynamicExpression: InstantaneousDynamicExpression;
    protected mMeasure: GraphicalMeasure;
    /** Whether words of the same time are drawn on this dynamic's line, before or after it
     *  (see MusicSheetCalculator.placeWordsBesideSameTimeDynamic()). */
    public HasWordsBeside: boolean = false;

    constructor(instantaneousDynamic: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(staffLine, instantaneousDynamic, measure.parentSourceMeasure);
        this.mInstantaneousDynamicExpression = instantaneousDynamic;
        this.mMeasure = measure;
    }

    public get InstantaneousDynamic(): InstantaneousDynamicExpression {
        return this.mInstantaneousDynamicExpression;
    }

    public updateSkyBottomLine(): void {
        const skyBottomLineCalculator: SkyBottomLineCalculator = this.parentStaffLine.SkyBottomLineCalculator;
        const left: number = this.PositionAndShape.RelativePosition.x + this.PositionAndShape.BorderMarginLeft;
        const right: number = this.PositionAndShape.RelativePosition.x + this.PositionAndShape.BorderMarginRight;
        let yValue: number = 0;
        switch (this.Placement) {
            case PlacementEnum.Above:
                yValue = this.PositionAndShape.RelativePosition.y + this.PositionAndShape.BorderMarginTop;
                skyBottomLineCalculator.updateSkyLineWithLabel(left, right, yValue);
                break;
            case PlacementEnum.Below:
                yValue = this.PositionAndShape.RelativePosition.y + this.PositionAndShape.BorderMarginBottom;
                skyBottomLineCalculator.updateBottomLineWithLabel(left, right, yValue);
                break;
            default:
                log.error("Placement for GraphicalInstantaneousDynamicExpression is unknown");
        }
    }
}
