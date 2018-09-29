import { GraphicalObject } from "./GraphicalObject";
import { GraphicalLabel } from "./GraphicalLabel";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";
import { AbstractExpression, PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";

export abstract class AbstractGraphicalExpression extends GraphicalObject {
    protected mLabel: GraphicalLabel;
    protected mParentStaffLine: StaffLine;
    /** Internal cache of read expression */
    protected mExpression: AbstractExpression;
    /** EngravingRules for positioning */
    protected mRules: EngravingRules = EngravingRules.Rules;

    constructor(parentStaffline: StaffLine, expression: AbstractExpression) {
        super();
        this.mExpression = expression;
        this.boundingBox = new BoundingBox(this, parentStaffline.PositionAndShape);
        this.mParentStaffLine = parentStaffline;
        this.mParentStaffLine.AbstractExpressions.push(this);
    }

    /** Graphical label of the expression if available */
    get Label(): GraphicalLabel { return this.mLabel; }
    /** Staffline where the expression is attached to */
    public get ParentStaffLine(): StaffLine { return this.mParentStaffLine; }
    public get BaseExpression(): AbstractExpression { return this.mExpression; }
    public get Placement(): PlacementEnum { return this.mExpression.Placement; }

    //#region Static methods
    public abstract updateSkyBottomLine(): void;
    //#endregion
}
