
import { StaffLine } from "./StaffLine";
import { AbstractTempoExpression } from "../VoiceData/Expressions/AbstractTempoExpression";
import { GraphicalLabel } from "./GraphicalLabel";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";

export class GraphicalInstantaneousTempoExpression extends AbstractGraphicalExpression {
    protected mTempoExpresssion: AbstractTempoExpression;

    constructor(tempoExpresssion: AbstractTempoExpression, label: GraphicalLabel) {
        super((label.PositionAndShape.Parent.DataObject as StaffLine), tempoExpresssion);
        this.mTempoExpresssion = tempoExpresssion;
        this.mLabel = label;
    }

    public get InstantaneousTempoExpression(): AbstractTempoExpression {
        return this.mTempoExpresssion;
    }

    public get GraphicalLabel(): GraphicalLabel {
        return this.mLabel;
    }

    public updateSkyBottomLine(): void {
        // Not implemented
    }
}
