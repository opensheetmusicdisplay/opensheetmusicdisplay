import { GraphicalObject } from "./GraphicalObject";
import { GraphicalLabel } from "./GraphicalLabel";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";
import { AbstractExpression, PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { SourceMeasure } from "../VoiceData";

export abstract class AbstractGraphicalExpression extends GraphicalObject {
    protected label: GraphicalLabel;
    protected parentStaffLine: StaffLine;
    /** Internal cache of read expression */
    protected expression: AbstractExpression;
    /** EngravingRules for positioning */
    protected rules: EngravingRules;
    protected parentMeasure: SourceMeasure;

    constructor(parentStaffline: StaffLine, expression: AbstractExpression, measure: SourceMeasure) {
        super();
        this.expression = expression;
        this.parentMeasure = measure; // could be undefined!
        this.boundingBox = new BoundingBox(this, parentStaffline.PositionAndShape);
        this.parentStaffLine = parentStaffline;
        this.parentStaffLine.AbstractExpressions.push(this);
        this.rules = parentStaffline.ParentMusicSystem.rules;
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
