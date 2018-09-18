import { BoundingBox } from "./BoundingBox";
import { GraphicalLine } from "./GraphicalLine";
import { StaffLine } from "./StaffLine";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { EngravingRules } from "./EngravingRules";
import { ContDynamicEnum, ContinuousDynamicExpression } from "../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";

/**
 * This class prepares the graphical elements for a continuous expression. It calculates the wedges and
 * wrappings if they are split over system breaks.
 */
export abstract class GraphicalContinuousDynamicExpression extends AbstractGraphicalExpression {
    /** Internal cache of read expression */
    private mContinuousDynamic: ContinuousDynamicExpression;
    /** True if expression is split over system borders */
    private mIsSplittedPart: boolean;
    /** True if this expression should not be removed if re-rendered */
    private mNotToBeRemoved: boolean;
    /** Holds the line objects that can be drawn via implementation */
    private mLines: GraphicalLine[] = [];
    private mStartMeasure: GraphicalMeasure;
    private mEndMeasure: GraphicalMeasure;
    protected mRules: EngravingRules = EngravingRules.Rules;

    /**
     * Create a new instance of the GraphicalContinuousDynamicExpression
     * @param continuousDynamic The continuous dynamic instruction read via ExpressionReader
     * @param staffLine The staffline where the exoression is attached
     */
    constructor(continuousDynamic: ContinuousDynamicExpression, staffLine: StaffLine) {
        super(staffLine);

        this.mContinuousDynamic = continuousDynamic;
        this.mIsSplittedPart = false;
        this.mNotToBeRemoved = false;
    }

    //#region Getter / Setter

    /** The graphical measure where the parent continuous dynamic expression starts */
    public get StartMeasure(): GraphicalMeasure { return this.mStartMeasure; }
    public set StartMeasure(value: GraphicalMeasure) { this.mStartMeasure = value; }
    /** The graphical measure where the parent continuous dynamic expression ends */
    public get EndMeasure(): GraphicalMeasure { return this.mEndMeasure; }
    public set EndMeasure(value: GraphicalMeasure) { this.mEndMeasure = value; }
    /**  Is true if this continuous expression is a wedge, that reaches over a system border and needs to be split into two. */
    public get IsSplittedPart(): boolean { return this.mIsSplittedPart; }
    public set IsSplittedPart(value: boolean) { this.mIsSplittedPart = value; }
    /**  Is true if the dynamic is not a symbol but a text instruction. E.g. "decrescendo" */
    public get IsVerbal(): boolean { return this.ContinuousDynamic.Label !== undefined && this.ContinuousDynamic.Label.length > 0; }
    /** True if this expression should not be removed if re-rendered */
    public get NotToBeRemoved(): boolean { return this.mNotToBeRemoved; }
    public set NotToBeRemoved(value: boolean) { this.mNotToBeRemoved = value; }
    /** Holds the line objects that can be drawn via implementation */
    public get Lines(): GraphicalLine[] { return this.mLines; }

    public get ContinuousDynamic(): ContinuousDynamicExpression { return this.mContinuousDynamic; }
    //#endregion

    //#region Public methods

    /**
     * Calculate crescendo lines for (full).
     * @param startX left most starting point
     * @param endX right mist ending point
     * @param y y placement
     * @param wedgeOpeningLength length of the opening
     * @param wedgeLineWidth line width of the wedge
     */
    public createCrescendoLines(startX: number, endX: number, y: number,
                                wedgeOpeningLength: number = this.mRules.WedgeOpeningLength, wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
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
                                         wedgeMeasureEndOpeningLength: number = this.mRules.WedgeMeasureEndOpeningLength,
                                         wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
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
    public createSecondHalfCresendoLines(startX: number, endX: number, y: number,
                                         wedgeMeasureBeginOpeningLength: number = this.mRules.WedgeMeasureBeginOpeningLength,
                                         wedgeOpeningLength: number = this.mRules.WedgeOpeningLength,
                                         wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
        const upperLineStart: PointF2D = new PointF2D(startX, y - wedgeMeasureBeginOpeningLength / 2);
        const lowerLineStart: PointF2D = new PointF2D(startX, y + wedgeMeasureBeginOpeningLength / 2);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeOpeningLength / 2);
        this.addDoubleLines(upperLineStart, lowerLineStart, upperLineEnd, lowerLineEnd, wedgeLineWidth);
    }

    /**
     * This method recalculates the Crescendo Lines (for all cases).
     * @param startX left most starting point
     * @param endX right most ending point
     * @param y y placement
     */
    public recalculateCrescendoLines(startX: number, endX: number, y: number): void {
        const isSecondHalfSplit: boolean = Math.abs(this.Lines[0].Start.y - this.Lines[1].Start.y) > 0.0001;
        this.Lines.clear();

        if (isSecondHalfSplit) {
            this.createSecondHalfCresendoLines(startX, endX, y);
        } else if (this.IsSplittedPart) {
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
                                 wedgeOpeningLength: number = this.mRules.WedgeOpeningLength, wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
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
                                          wedgeOpeningLength: number = this.mRules.WedgeOpeningLength,
                                          wedgeMeasureEndOpeningLength: number = this.mRules.WedgeMeasureEndOpeningLength,
                                          wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
        const upperLineStart: PointF2D = new PointF2D(startX, y - wedgeOpeningLength / 2);
        const lowerLineStart: PointF2D = new PointF2D(startX, y + wedgeOpeningLength / 2);
        const upperLineEnd: PointF2D = new PointF2D(endX, y - wedgeMeasureEndOpeningLength / 2);
        const lowerLineEnd: PointF2D = new PointF2D(endX, y + wedgeMeasureEndOpeningLength / 2);
        this.addDoubleLines(upperLineStart, lowerLineStart, upperLineEnd, lowerLineEnd, wedgeLineWidth);
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
                                           wedgeMeasureBeginOpeningLength: number = this.mRules.WedgeMeasureBeginOpeningLength,
                                           wedgeLineWidth: number = this.mRules.WedgeLineWidth): void {
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
        const isFirstHalfSplit: boolean = Math.abs(this.Lines[0].End.y - this.Lines[1].End.y) > 0.0001;
        this.Lines.clear();
        if (isFirstHalfSplit) {
            this.createFirstHalfDiminuendoLines(startX, endX, yPosition);
        } else if (this.IsSplittedPart) {
            this.createSecondHalfDiminuendoLines(startX, endX, yPosition);
        } else {
            this.createDiminuendoLines(startX, endX, yPosition);
        }
    }

    /**
     * Calculate the BoundingBox (as a box around the Wedge).
     * @param parent Parent of the wedge
     */
    public calcPsi(parent: BoundingBox): void {
        let height: number = 0;

        if (this.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo) {
            this.PositionAndShape.BorderTop = this.Lines[0].End.y - this.Lines[0].Start.y;
            this.PositionAndShape.BorderBottom = this.Lines[1].End.y - this.Lines[1].Start.y;
            height = this.Lines[0].Start.y;
        } else {
            this.PositionAndShape.BorderTop = this.Lines[0].Start.y - this.Lines[0].End.y;
            this.PositionAndShape.BorderBottom = this.Lines[1].Start.y - this.Lines[1].End.y;
            height = this.Lines[0].End.y;
        }

        this.PositionAndShape.BorderLeft = 0;
        this.PositionAndShape.BorderRight = this.Lines[0].End.x - this.Lines[0].Start.x;

        this.PositionAndShape.BorderMarginTop = this.PositionAndShape.BorderTop;
        this.PositionAndShape.BorderMarginBottom = this.PositionAndShape.BorderBottom;
        this.PositionAndShape.BorderMarginLeft = this.PositionAndShape.BorderLeft;
        this.PositionAndShape.BorderMarginRight = this.PositionAndShape.BorderRight;

        this.PositionAndShape.RelativePosition = new PointF2D(this.Lines[0].Start.x, height);
    }

    /**
     * Clear Lines and remove BoundingBox from Parent.
     */
    public cleanUp(): void {
        this.Lines.clear();
        // if (this.PositionAndShape) {
        //     this.PositionAndShape.Parent.remove(this.PositionAndShape);
        // }
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

        this.Lines.push(upperLine);
        this.Lines.push(lowerLine);
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

        this.Lines.push(upperLine);
        this.Lines.push(lowerLine);
    }

    //#endregion
}
