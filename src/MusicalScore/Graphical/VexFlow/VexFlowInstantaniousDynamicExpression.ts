import { GraphicalInstantaniousDynamicExpression } from "../GraphicalInstantaniousDynamicExpression";
import { InstantaniousDynamicExpression, DynamicEnum } from "../../VoiceData/Expressions/InstantaniousDynamicExpression";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignment } from "../../../Common/Enums/TextAlignment";
import { EngravingRules } from "../EngravingRules";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";
import { StaffLine } from "../StaffLine";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { MusicSystem } from "../MusicSystem";

export class VexFlowInstantaniousDynamicExpression extends GraphicalInstantaniousDynamicExpression {
    private mInstantaniousDynamicExpression: InstantaniousDynamicExpression;
    private mLabel: GraphicalLabel;

    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffEntry: GraphicalStaffEntry) {
        super();
        this.mInstantaniousDynamicExpression = instantaniousDynamicExpression;
        this.mLabel = new GraphicalLabel(new Label(this.Expression),
                                         EngravingRules.Rules.ContinuousDynamicTextHeight,
                                         TextAlignment.LeftTop,
                                         staffEntry ? staffEntry.PositionAndShape : undefined);

        let offset: number = staffEntry ? staffEntry.parentMeasure.ParentStaffLine
                                     .SkyBottomLineCalculator.getBottomLineMaxInBoundingBox(staffEntry.parentMeasure.PositionAndShape) : 0;
        // TODO: this should not happen: Bug in sbc?
        offset = offset < 0 ? 0 : offset;
        this.mLabel.PositionAndShape.RelativePosition.y += offset;
        this.mLabel.Label.fontStyle = FontStyles.BoldItalic;
        this.mLabel.setLabelPositionAndShapeBorders();
    }

    public calculcateBottomLine(measure: GraphicalMeasure): void {
        const skyBottomLineCalculator: SkyBottomLineCalculator = measure.ParentStaffLine.SkyBottomLineCalculator;
        const staffLine: StaffLine = measure.ParentStaffLine;
        const musicSystem: MusicSystem = measure.parentMusicSystem;

        // calculate LabelBoundingBox and set PSI parent
        this.mLabel.setLabelPositionAndShapeBorders();
        this.mLabel.PositionAndShape.Parent = musicSystem.PositionAndShape;

        // calculate relative Position
        const relativeX: number = staffLine.PositionAndShape.RelativePosition.x +
        measure.PositionAndShape.RelativePosition.x - this.mLabel.PositionAndShape.BorderMarginLeft;
        let relativeY: number;

        // and the corresponding SkyLine indeces
        let start: number = relativeX;
        let end: number = relativeX - this.mLabel.PositionAndShape.BorderLeft + this.mLabel.PositionAndShape.BorderMarginRight;

          // take into account the InstrumentNameLabel's at the beginning of the first MusicSystem
        if (staffLine === musicSystem.StaffLines[0] && musicSystem === musicSystem.Parent.MusicSystems[0]) {
              start -= staffLine.PositionAndShape.RelativePosition.x;
              end -= staffLine.PositionAndShape.RelativePosition.x;
          }

          // get the minimum corresponding SkyLine value
        const bottomLineMaxValue: number = skyBottomLineCalculator.getBottomLineMaxInRange(start, end);
        relativeY = bottomLineMaxValue;
        // console.log(start, end, relativeY, this.mLabel.PositionAndShape.BorderMarginBottom)
        skyBottomLineCalculator.updateBottomLineInRange(start, end, relativeY + this.mLabel.PositionAndShape.BorderMarginBottom);
    }

    get Expression(): string {
        return DynamicEnum[this.mInstantaniousDynamicExpression.DynEnum];
    }

    get Label(): GraphicalLabel {
        return this.mLabel;
    }
}
