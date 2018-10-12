import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { ContinuousDynamicExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { StaffLine } from "../StaffLine";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { FontStyles } from "../../../Common/Enums/FontStyles";

/**
 * This class extends the GraphicalContinuousDynamicExpression and creates all necessary methods for drawing
 */
export class VexFlowContinuousDynamicExpression extends GraphicalContinuousDynamicExpression {
    constructor(continuousDynamic: ContinuousDynamicExpression, staffLine: StaffLine, textHeight?: number) {
        super(continuousDynamic, staffLine);
        if (this.IsVerbal) {
            this.label = new GraphicalLabel(new Label(continuousDynamic.Label),
                                            textHeight ? textHeight : this.rules.ContinuousDynamicTextHeight,
                                            TextAlignmentEnum.LeftCenter,
                                            this.PositionAndShape);

            this.label.Label.fontStyle = FontStyles.Italic;
            this.label.setLabelPositionAndShapeBorders();
            this.PositionAndShape.calculateBoundingBox();
        }
    }
}
