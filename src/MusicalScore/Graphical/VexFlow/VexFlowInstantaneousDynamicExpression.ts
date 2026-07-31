import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import {
    InstantaneousDynamicComponent,
    InstantaneousDynamicComponentType,
    InstantaneousDynamicExpression,
} from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { StaffLine } from "../StaffLine";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { TextDynamics } from "vexflow/core";
import {
    DORICO_NOTATION_FONT_FAMILY,
    getDoricoDefaultTextFontFamily,
} from "../DoricoTextFontRouting";

export class VexFlowInstantaneousDynamicExpression extends GraphicalInstantaneousDynamicExpression {
    constructor(instantaneousDynamicExpression: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(instantaneousDynamicExpression, staffLine, measure);

        const sourceLabel: Label = new Label(this.Expression);
        sourceLabel.textLines = [{
            runs: this.mInstantaneousDynamicExpression.Components.map(
                (component: InstantaneousDynamicComponent) => ({
                    text: component.type === InstantaneousDynamicComponentType.Standard
                        ? this.toSmuflGlyphs(component.text)
                        : component.text,
                    fontFamily: component.type === InstantaneousDynamicComponentType.Standard
                        ? DORICO_NOTATION_FONT_FAMILY
                        : getDoricoDefaultTextFontFamily(this.rules),
                }),
            ),
        }];
        this.label = new GraphicalLabel(sourceLabel,
                                        this.rules.InstantaneousDynamicTextHeight,
                                        TextAlignmentEnum.CenterCenter,
                                        this.rules,
                                        this.PositionAndShape);

        this.label.Label.fontStyle = FontStyles.Regular;
        this.label.setLabelPositionAndShapeBorders();
        this.PositionAndShape.calculateBoundingBox();
    }

    get InstantaneousDynamic(): InstantaneousDynamicExpression {
        return this.mInstantaneousDynamicExpression;
    }

    get Expression(): string {
        return this.mInstantaneousDynamicExpression.DisplayText;
    }

    private toSmuflGlyphs(text: string): string {
        return text.toLowerCase().split("").map((letter: string): string =>
            TextDynamics.GLYPHS[letter] ?? letter,
        ).join("");
    }
}
