import { GraphicalInstantaniousDynamicExpression } from "../GraphicalInstantaniousDynamicExpression";
import { InstantaniousDynamicExpression, DynamicEnum } from "../../VoiceData/Expressions/InstantaniousDynamicExpression";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignment } from "../../../Common/Enums/TextAlignment";
import { EngravingRules } from "../EngravingRules";
import { FontStyles } from "../../../Common/Enums/FontStyles";

export class VexFlowInstantaniousDynamicExpression extends GraphicalInstantaniousDynamicExpression {
    private mInstantaniousDynamicExpression: InstantaniousDynamicExpression;
    private mLabel: GraphicalLabel;

    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffEntry: GraphicalStaffEntry) {
        super();
        this.mInstantaniousDynamicExpression = instantaniousDynamicExpression;
        this.mLabel = new GraphicalLabel(new Label(this.Expression),
                                         EngravingRules.Rules.ContinuousDynamicTextHeight,
                                         TextAlignment.LeftTop,
                                         staffEntry.PositionAndShape);
        // FIXME: Add offset when skyline available
        // const offset: number = staffEntry.parentMeasure.ParentStaffLine.SkyBottomCalculator ...
        const offset: number = 5.5;
        this.mLabel.PositionAndShape.RelativePosition.y += offset;
        this.mLabel.Label.fontStyle = FontStyles.BoldItalic;
    }

    get Expression(): string {
        return DynamicEnum[this.mInstantaniousDynamicExpression.DynEnum];
    }

    get Label(): GraphicalLabel {
        return this.mLabel;
    }
}
