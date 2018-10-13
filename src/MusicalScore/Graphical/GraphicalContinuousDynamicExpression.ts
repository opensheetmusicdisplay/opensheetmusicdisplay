import { GraphicalLine } from "./GraphicalLine";
import { StaffLine } from "./StaffLine";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { ContDynamicEnum, ContinuousDynamicExpression } from "../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { ISqueezable } from "./ISqueezable";
import * as log from "loglevel";

/**
 * This class prepares the graphical elements for a continuous expression. It calculates the wedges and
 * wrappings if they are split over system breaks.
 */
export class GraphicalContinuousDynamicExpression extends AbstractGraphicalExpression implements ISqueezable {
    /** True if expression is split over system borders */
    private isSplittedPart: boolean;
    /** True if this expression should not be removed if re-rendered */
    private notToBeRemoved: boolean;
    /** Holds the line objects that can be drawn via implementation */
    private lines: GraphicalLine[] = [];
    private startMeasure: GraphicalMeasure;
    private endMeasure: GraphicalMeasure;

    /**
     * Create a new instance of the GraphicalContinuousDynamicExpression
     * @param continuousDynamic The continuous dynamic instruction read via ExpressionReader
     * @param staffLine The staffline where the exoression is attached
     */
    constructor(continuousDynamic: ContinuousDynamicExpression, staffLine: StaffLine) {
        super(staffLine, continuousDynamic);

        this.isSplittedPart = false;
        this.notToBeRemoved = false;
    }

    //#region Getter / Setter

    /** The graphical measure where the parent continuous dynamic expression starts */
    public get StartMeasure(): GraphicalMeasure { return this.startMeasure; }
    public set StartMeasure(value: GraphicalMeasure) { this.startMeasure = value; }
    /** The graphical measure where the parent continuous dynamic expression ends */
    public get EndMeasure(): GraphicalMeasure { return this.endMeasure; }
    public set EndMeasure(value: GraphicalMeasure) { this.endMeasure = value; }
    /** The staff lin where the graphical dynamic expressions ends */
    public get EndStaffLine(): StaffLine { return this.endMeasure ? this.endMeasure.ParentStaffLine : undefined; }
    /**  Is true if this continuous expression is a wedge, that reaches over a system border and needs to be split into two. */
    public get IsSplittedPart(): boolean { return this.isSplittedPart; }
    public set IsSplittedPart(value: boolean) { this.isSplittedPart = value; }
    /**  Is true if the dynamic is not a symbol but a text instruction. E.g. "decrescendo" */
    public get IsVerbal(): boolean { return this.ContinuousDynamic.Label !== undefined && this.ContinuousDynamic.Label.length > 0; }
    /** True if this expression should not be removed if re-rendered */
    public get NotToBeRemoved(): boolean { return this.notToBeRemoved; }
    public set NotToBeRemoved(value: boolean) { this.notToBeRemoved = value; }
    /** Holds the line objects that can be drawn via implementation */
    public get Lines(): GraphicalLine[] { return this.lines; }

    public get ContinuousDynamic(): ContinuousDynamicExpression { return this.SourceExpression as ContinuousDynamicExpression; }
    //#endregion

    //#region Public methods

    public updateSkyBottomLine(): void {
        // update Sky-BottomLine
        const skyBottomLineCalculator: SkyBottomLineCalculator = this.parentStaffLine.SkyBottomLineCalculator;
        const left: number = this.IsVerbal ? this.label.PositionAndShape.RelativePosition.x + this.label.PositionAndShape.BorderMarginLeft : 0;
        const right: number = this.IsVerbal ? this.label.PositionAndShape.RelativePosition.x + this.label.PositionAndShape.BorderMarginRight : 0;
        if (!this.IsVerbal && this.lines.length < 2) {
            log.warn("Not enough lines for SkyBottomLine calculation");
        }
        switch (this.Placement) {
            case PlacementEnum.Above:
                if (!this.IsVerbal) {
                    skyBottomLineCalculator.updateSkyLineWithWedge(this.lines[0].Start, this.lines[0].End);
                } else {
                    const yValue: number = this.label.PositionAndShape.BorderMarginTop + this.label.PositionAndShape.RelativePosition.y;
                    skyBottomLineCalculator.updateSkyLineInRange(left, right, yValue);
                }
                break;
            case PlacementEnum.Below:
                if (!this.IsVerbal) {
                    skyBottomLineCalculator.updateBottomLineWithWedge(this.lines[1].Start, this.lines[1].End);
                } else {
                    const yValue: number = this.label.PositionAndShape.BorderMarginBottom + this.label.PositionAndShape.RelativePosition.y;
                    skyBottomLineCalculator.updateBottomLineInRange(left, right, yValue);
                }
                break;
            default:
                log.error("Placement for GraphicalContinuousDynamicExpression is unknown");
        }
    }

    /**
     * Calculate crescendo lines for (full).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeOpeningLength length of the opening
     * @param wedgeLineWidth line width of the wedge
     */
    public createCrescendoLines(startX: number, endX: number, y: number,
                                wedgeOpeningLength: number = this.rules.WedgeOpeningLength, wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const lineStart: PointF2D = new PointF2D(startX, y);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeOpeningLength / 2);
        this.addWedgeLines(lineStart, upperLineEnd, lowerLineEnd, wedgeLineWidth);
    }

    /**
     * Calculate crescendo lines for system break (first part).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeMeasureEndOpeningLength length of opening at measure end
     * @param wedgeOpeningLength length of the opening
     * @param wedgeLineWidth line width of the wedge
     */
    public createFirstHalfCrescendoLines(startX: number, endX: number, y: number,
                                         wedgeMeasureEndOpeningLength: number = this.rules.WedgeMeasureEndOpeningLength,
                                         wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const lineStart: PointF2D = new PointF2D(startX, y);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeMeasureEndOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeMeasureEndOpeningLength / 2);
        this.addWedgeLines(lineStart, upperLineEnd, lowerLineEnd, wedgeLineWidth);
    }


    /**
     * Calculate crescendo lines for system break (second part).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeMeasureBeginOpeningLength length of opening at measure start
     * @param wedgeOpeningLength length of the opening
     * @param wedgeLineWidth line width of the wedge
     */
    public createSecondHalfCrescendoLines(startX: number, endX: number, y: number,
                                          wedgeMeasureBeginOpeningLength: number = this.rules.WedgeMeasureBeginOpeningLength,
                                          wedgeOpeningLength: number = this.rules.WedgeOpeningLength,
                                          wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const upperLineStart: PointF2D = new PointF2D(startX, y - wedgeMeasureBeginOpeningLength / 2);
        const lowerLineStart: PointF2D = new PointF2D(startX, y + wedgeMeasureBeginOpeningLength / 2);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeOpeningLength / 2);
        this.addDoubleLines(upperLineStart, upperLineEnd, lowerLineStart, lowerLineEnd, wedgeLineWidth);
    }

    /**
     * This method recalculates the Crescendo Lines (for all cases).
     * @param startX left most starting point
     * @param endX right most ending point
     * @param y y placement
     */
    public recalculateCrescendoLines(startX: number, endX: number, y: number): void {
        const isSecondHalfSplit: boolean = Math.abs(this.lines[0].Start.y - this.lines[1].Start.y) > 0.0001;
        this.lines.clear();

        if (isSecondHalfSplit) {
            this.createSecondHalfCrescendoLines(startX, endX, y);
        } else if (this.isSplittedPart) {
            this.createFirstHalfCrescendoLines(startX, endX, y);
        } else {
            this.createCrescendoLines(startX, endX, y);
        }
    }

    /**
     * Calculate diminuendo lines for system break (full).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeOpeningLength length of the opening
     * @param wedgeLineWidth line width of the wedge
     */
    public createDiminuendoLines(startX: number, endX: number, y: number,
                                 wedgeOpeningLength: number = this.rules.WedgeOpeningLength, wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const upperWedgeStart: PointF2D = new PointF2D(startX, y - wedgeOpeningLength / 2);
        const lowerWedgeStart: PointF2D = new PointF2D(startX, y + wedgeOpeningLength / 2);
        const wedgeEnd: PointF2D = new PointF2D(endX, y);
        this.addWedgeLines(wedgeEnd, upperWedgeStart, lowerWedgeStart, wedgeLineWidth);
    }

    /**
     * Calculate diminuendo lines for system break (first part).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeOpeningLength length of the opening
     * @param wedgeMeasureEndOpeningLength length of opening at measure end
     * @param wedgeLineWidth line width of the wedge
     */
    public createFirstHalfDiminuendoLines(startX: number, endX: number, y: number,
                                          wedgeOpeningLength: number = this.rules.WedgeOpeningLength,
                                          wedgeMeasureEndOpeningLength: number = this.rules.WedgeMeasureEndOpeningLength,
                                          wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const upperLineStart: PointF2D = new PointF2D(startX, y - wedgeOpeningLength / 2);
        const lowerLineStart: PointF2D = new PointF2D(startX, y + wedgeOpeningLength / 2);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeMeasureEndOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeMeasureEndOpeningLength / 2);
        this.addDoubleLines(upperLineStart, upperLineEnd, lowerLineStart, lowerLineEnd, wedgeLineWidth);
    }

    /**
     * Calculate diminuendo lines for system break (second part).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeMeasureBeginOpeningLength length of opening at measure start
     * @param wedgeLineWidth line width of the wedge
     */
    public createSecondHalfDiminuendoLines(startX: number, endX: number, y: number,
                                           wedgeMeasureBeginOpeningLength: number = this.rules.WedgeMeasureBeginOpeningLength,
                                           wedgeLineWidth: number = this.rules.WedgeLineWidth): void {
        const upperLineStart: PointF2D = new PointF2D(startX, y - wedgeMeasureBeginOpeningLength / 2);
        const lowerLineStart: PointF2D = new PointF2D(startX, y + wedgeMeasureBeginOpeningLength / 2);
        const lineEnd: PointF2D = new PointF2D(endX, y);
        this.addWedgeLines(lineEnd, upperLineStart, lowerLineStart, wedgeLineWidth);
    }

    /**
     * This method recalculates the diminuendo lines (for all cases).
     * @param startX left most starting point
     * @param endX right most ending point
     * @param y y placement
     */
    public recalculateDiminuendoLines(startX: number, endX: number, yPosition: number): void {
        const isFirstHalfSplit: boolean = Math.abs(this.lines[0].End.y - this.lines[1].End.y) > 0.0001;
        this.lines.clear();
        if (isFirstHalfSplit) {
            this.createFirstHalfDiminuendoLines(startX, endX, yPosition);
        } else if (this.isSplittedPart) {
            this.createSecondHalfDiminuendoLines(startX, endX, yPosition);
        } else {
            this.createDiminuendoLines(startX, endX, yPosition);
        }
    }

    /**
     * Calculate the BoundingBox (as a box around the Wedge).
     */
    public calcPsi(): void {
        if (this.IsVerbal) {
            this.PositionAndShape.calculateBoundingBox();
            return;
        }
        this.PositionAndShape.RelativePosition = this.lines[0].Start;
        this.PositionAndShape.BorderMarginTop = this.lines[0].End.y - this.lines[0].Start.y;
        this.PositionAndShape.BorderMarginBottom = this.lines[1].End.y - this.lines[1].Start.y;

        if (this.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo) {
            this.PositionAndShape.BorderMarginLeft = 0;
            this.PositionAndShape.BorderMarginRight = this.lines[0].End.x - this.lines[0].Start.x;
        } else {
            this.PositionAndShape.BorderMarginLeft = this.lines[0].End.x - this.lines[0].Start.x;
            this.PositionAndShape.BorderMarginRight = 0;
        }
    }

    /**
     * Clear Lines
     */
    public cleanUp(): void {
        this.lines.clear();
    }

    /**
     * Shift wedge in y position
     * @param shift Number to shift
     */
    public shiftYPosition(shift: number): void {
        if (this.IsVerbal) {
            this.PositionAndShape.RelativePosition.y += shift;
            this.PositionAndShape.calculateBoundingBox();
        } else {
            this.lines[0].Start.y += shift;
            this.lines[0].End.y += shift;
            this.lines[1].End.y += shift;
        }
    }

    public squeeze(value: number): void {
        // Verbal expressions are not squeezable and squeezing below the width is also not possible
        if (this.IsVerbal) {
            return;
        }
        const width: number = Math.abs(this.lines[0].End.x - this.lines[0].Start.x);
        if (width < Math.abs(value)) {
            return;
        }
        if (this.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo) {
            if (value > 0) {
                this.lines[0].Start.x += value;
            } else {
                this.lines[0].End.x += value;
                this.lines[1].End.x += value;
            }
        } else {
            if (value < 0) {
                this.lines[0].Start.x += value;
            } else {
                this.lines[0].End.x += value;
                this.lines[1].End.x += value;
            }
        }
        this.calcPsi();
    }

    //#endregion

    //#region Private methods

    /**
     * Create lines from points and add them to the memory
     * @param wedgePoint start of the expression
     * @param upperWedgeEnd end of the upper line
     * @param lowerWedgeEnd end of lower line
     * @param wedgeLineWidth line width
     */
    private addWedgeLines(wedgePoint: PointF2D, upperWedgeEnd: PointF2D, lowerWedgeEnd: PointF2D, wedgeLineWidth: number): void {
        const upperLine: GraphicalLine = new GraphicalLine(wedgePoint, upperWedgeEnd, wedgeLineWidth);
        const lowerLine: GraphicalLine = new GraphicalLine(wedgePoint, lowerWedgeEnd, wedgeLineWidth);

        this.lines.push(upperLine);
        this.lines.push(lowerLine);
    }

    /**
     * Create top and bottom lines for continuing wedges
     * @param upperLineStart start of the upper line
     * @param upperLineEnd end of the upper line
     * @param lowerLineStart start of the lower line
     * @param lowerLineEnd end of lower line
     * @param wedgeLineWidth line width
     */
    private addDoubleLines(upperLineStart: PointF2D, upperLineEnd: PointF2D, lowerLineStart: PointF2D, lowerLineEnd: PointF2D, wedgeLineWidth: number): void {
        const upperLine: GraphicalLine = new GraphicalLine(upperLineStart, upperLineEnd, wedgeLineWidth);
        const lowerLine: GraphicalLine = new GraphicalLine(lowerLineStart, lowerLineEnd, wedgeLineWidth);

        this.lines.push(upperLine);
        this.lines.push(lowerLine);
    }

    //#endregion
}
