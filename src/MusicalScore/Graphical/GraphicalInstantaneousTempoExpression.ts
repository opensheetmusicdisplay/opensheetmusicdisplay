import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
import { AbstractTempoExpression } from "../VoiceData/Expressions/AbstractTempoExpression";
import { GraphicalLabel } from "./GraphicalLabel";

export class GraphicalInstantaneousTempoExpression extends GraphicalObject {
    protected mTempoExpresssion: AbstractTempoExpression;
    protected mParentStaffLine: StaffLine;
    protected mLabel: GraphicalLabel;

    constructor(tempoExpresssion: AbstractTempoExpression, label: GraphicalLabel) {
        super();
        // this.boundingBox = new BoundingBox(this, staffLine.PositionAndShape);
        this.mTempoExpresssion = tempoExpresssion;
        this.mLabel = label;
    }

    public get InstantaneousTempoExpression(): AbstractTempoExpression {
        return this.mTempoExpresssion;
    }

    public get GraphicalLabel(): GraphicalLabel {
        return this.mLabel;
    }
}
