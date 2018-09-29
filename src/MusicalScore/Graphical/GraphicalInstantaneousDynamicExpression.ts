import { StaffLine } from "./StaffLine";
import { InstantaneousDynamicExpression } from "../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";

export abstract class GraphicalInstantaneousDynamicExpression extends AbstractGraphicalExpression {
    protected mInstantaneousDynamicExpression: InstantaneousDynamicExpression;
    protected mParentStaffLine: StaffLine;
    protected mMeasure: GraphicalMeasure;

    constructor(instantaneousDynamic: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(staffLine, instantaneousDynamic);
        this.mInstantaneousDynamicExpression = instantaneousDynamic;
        this.mMeasure = measure;
    }

    public updateSkyBottomLine(): void {
        // Not implemented
    }
}
