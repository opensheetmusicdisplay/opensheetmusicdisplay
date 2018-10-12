
import { StaffLine } from "./StaffLine";
import { AbstractTempoExpression } from "../VoiceData/Expressions/AbstractTempoExpression";
import { GraphicalLabel } from "./GraphicalLabel";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";

export class GraphicalInstantaneousTempoExpression extends AbstractGraphicalExpression {

    constructor(tempoExpresssion: AbstractTempoExpression, label: GraphicalLabel) {
        super((label.PositionAndShape.Parent.DataObject as StaffLine), tempoExpresssion);
        this.label = label;
    }

    public get GraphicalLabel(): GraphicalLabel {
        return this.label;
    }

    public updateSkyBottomLine(): void {
        // Not implemented
    }
}
