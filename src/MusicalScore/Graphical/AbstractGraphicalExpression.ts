import { GraphicalObject } from "./GraphicalObject";
import { GraphicalLabel } from "./GraphicalLabel";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";
import { AbstractExpression, PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";

export abstract class AbstractGraphicalExpression extends GraphicalObject {
    protected label: GraphicalLabel;
    protected parentStaffLine: StaffLine;
    /** Internal cache of read expression */
    protected expression: AbstractExpression;
    /** EngravingRules for positioning */
    protected rules: EngravingRules = EngravingRules.Rules;

    constructor(parentStaffline: StaffLine, expression: AbstractExpression) {
        super();
        this.expression = expression;
        this.boundingBox = new BoundingBox(this, parentStaffline.PositionAndShape);
        this.parentStaffLine = parentStaffline;
        this.parentStaffLine.AbstractExpressions.push(this);
    }

    /** Graphical label of the expression if available */
    get Label(): GraphicalLabel { return this.label; }
    /** Staffline where the expression is attached to */
    public get ParentStaffLine(): StaffLine { return this.parentStaffLine; }
    public get SourceExpression(): AbstractExpression { return this.expression; }
    public get Placement(): PlacementEnum { return this.expression.Placement; }

    //#region abstract methods
    public abstract updateSkyBottomLine(): void;
    //#endregion
}
