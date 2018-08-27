import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
import { InstantaneousDynamicExpression } from "../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { BoundingBox } from "./BoundingBox";

export class GraphicalInstantaneousDynamicExpression extends GraphicalObject {
    protected mInstantaneousDynamicExpression: InstantaneousDynamicExpression;
    protected mParentStaffLine: StaffLine;
    protected mMeasure: GraphicalMeasure;

    constructor(instantaneousDynamic: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super();
        this.boundingBox = new BoundingBox(this, staffLine.PositionAndShape);
        this.mInstantaneousDynamicExpression = instantaneousDynamic;
        this.mParentStaffLine = staffLine;
        this.mMeasure = measure;
    }
}
