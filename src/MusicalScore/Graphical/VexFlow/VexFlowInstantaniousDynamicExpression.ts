import { GraphicalInstantaniousDynamicExpression } from "../GraphicalInstantaniousDynamicExpression";
import { InstantaniousDynamicExpression, DynamicEnum } from "../../VoiceData/Expressions/InstantaniousDynamicExpression";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignment } from "../../../Common/Enums/TextAlignment";
import { EngravingRules } from "../EngravingRules";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { StaffLine } from "../StaffLine";
import { GraphicalMeasure } from "../GraphicalMeasure";

export class VexFlowInstantaniousDynamicExpression extends GraphicalInstantaniousDynamicExpression {
    private mLabel: GraphicalLabel;

    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(instantaniousDynamicExpression, staffLine, measure);

        this.mLabel = new GraphicalLabel(new Label(this.Expression),
                                         EngravingRules.Rules.ContinuousDynamicTextHeight,
                                         TextAlignment.CenterTop,
                                         this.PositionAndShape);

        this.mLabel.Label.fontStyle = FontStyles.BoldItalic;
        this.mLabel.setLabelPositionAndShapeBorders();
        this.PositionAndShape.calculateBoundingBox();
    }

    get InstantaniousDynamic(): InstantaniousDynamicExpression {
        return this.mInstantaniousDynamicExpression;
    }

    get Expression(): string {
        return DynamicEnum[this.mInstantaniousDynamicExpression.DynEnum];
    }

    get Label(): GraphicalLabel {
        return this.mLabel;
    }
}
