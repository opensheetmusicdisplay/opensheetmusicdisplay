import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
import { InstantaniousDynamicExpression } from "../VoiceData/Expressions/InstantaniousDynamicExpression";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { BoundingBox } from "./BoundingBox";

export class GraphicalInstantaniousDynamicExpression extends GraphicalObject {
    protected mInstantaniousDynamicExpression: InstantaniousDynamicExpression;
    protected mParentStaffLine: StaffLine;
    protected mMeasure: GraphicalMeasure;

    constructor(instantaniousDynamic: InstantaniousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super();
        this.boundingBox = new BoundingBox(this, staffLine.PositionAndShape);
        this.mInstantaniousDynamicExpression = instantaniousDynamic;
        this.mParentStaffLine = staffLine;
        this.mMeasure = measure;
    }
}
