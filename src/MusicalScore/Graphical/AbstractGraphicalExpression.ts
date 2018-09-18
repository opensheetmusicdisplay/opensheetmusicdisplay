import { GraphicalObject } from "./GraphicalObject";
import { GraphicalLabel } from "./GraphicalLabel";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";

export abstract class AbstractGraphicalExpression extends GraphicalObject {
    protected mLabel: GraphicalLabel;
    protected mParentStaffLine: StaffLine;

    constructor(parentStaffline: StaffLine) {
        super();
        this.boundingBox = new BoundingBox(this, parentStaffline.PositionAndShape);
        this.mParentStaffLine = parentStaffline;
        this.mParentStaffLine.AbstractExpressions.push(this);
    }

    /** Graphical label of the expression if available */
    get Label(): GraphicalLabel { return this.mLabel; }
    /** Staffline where the expression is attached to */
    public get ParentStaffLine(): StaffLine { return this.mParentStaffLine; }
}
