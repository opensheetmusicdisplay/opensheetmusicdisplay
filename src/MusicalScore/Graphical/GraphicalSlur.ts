
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { BoundingBox } from "./BoundingBox";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { StemDirectionType } from "../VoiceData/VoiceEntry";
import { GraphicalLabel } from "./GraphicalLabel";
import { MusicSystem } from "./MusicSystem";
import { VexFlowGraphicalNote, unitInPixels } from "./VexFlow";
import Vex from "vexflow";
import VF = Vex.Flow;

/** An articulation of a slur's start or end note, relative to the staff line: its left and right, and its near and far edges
 *  as distances outward from the staff on the slur's side (see GraphicalSlur.getOutwardExtent()). */
interface ArticulationExtent {
    left: number;
    right: number;
    near: number;
    far: number;
    /** Whether it goes inside the slur also at the slur's start or end note (see GraphicalSlur.getYPastArticulations()). */
    inside: boolean;
}

/** An articulation that GraphicalSlur.getYPastArticulations() left outside the slur, at its start or end note. */
interface ArticulationOutside extends ArticulationExtent {
    isStart: boolean;
    /** The Vexflow articulation, moved beyond the slur by GraphicalSlur.placeArticulationsOutside(). */
    articulation: any;
    /** Its extent as Vexflow draws it now, e.g. after moving it. */
    measure: () => ArticulationExtent;
}

/** A label stacked on the articulations left outside a slur at its start or end note, a fingering or a measure number, which
 *  moves along with them (see GraphicalSlur.placeArticulationsOutside()). */
interface LabelOutside {
    box: BoundingBox;
    isStart: boolean;
    /** Its left and right, relative to the staffline (the box of a measure number is relative to the music system in x, see
     *  MusicSheetCalculator.calculateSingleMeasureNumberPlacement()). */
    left: number;
    right: number;
    /** Whether it is a fingering, not a measure number. */
    isFingering: boolean;
}

export class GraphicalSlur extends GraphicalCurve {
    // private intersection: PointF2D;

    constructor(slur: Slur, rules: EngravingRules) {
        super();
        this.slur = slur;
        this.rules = rules;
    }

    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;
    private rules: EngravingRules;
    public SVGElement: Node;
    /** While calculateCurve() calculates the curve again, past the fingerings of its start and end notes it ran into, and how far out
     *  the curve got before (see placePastEndFingerings()). */
    private fingeringsRunInto: {start: BoundingBox[], end: BoundingBox[], furthestOut: number};
    /** The far corners of the articulations of the start and end notes the slur clears, for clearObstacles(), see getYPastArticulations(). */
    private articulationCorners: PointF2D[] = [];
    /** The articulations of the start and end notes that getYPastArticulations() left outside the slur, from the note outward,
     *  see placeArticulationsOutside(). */
    private articulationsOutside: ArticulationOutside[] = [];
    /** The fingerings and measure numbers stacked on the articulations left outside the slur, see placeArticulationsOutside(). */
    private labelsOutside: LabelOutside[] = [];
    /** While calculateCurve() calculates the curve again with the slur past every articulation of its start or end note (or both),
     *  see retryPastArticulationsOutside(). */
    private clearingEveryArticulationAt: {start: boolean, end: boolean};

    /**
     * Compares the timespan of two Graphical Slurs
     * @param x
     * @param y
     */
    public static Compare (x: GraphicalSlur, y: GraphicalSlur ): number {
        if (x.staffEntries.length < 1) { // x.staffEntries[i] can return undefined in Beethoven Moonlight Sonata sample
            return -1;
        } else if (y.staffEntries.length < 1) {
            return 1;
        }
        const xTimestampSpan: Fraction = Fraction.minus(x.staffEntries[x.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        x.staffEntries[0].getAbsoluteTimestamp());
        const yTimestampSpan: Fraction = Fraction.minus(y.staffEntries[y.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        y.staffEntries[0].getAbsoluteTimestamp());

        if (xTimestampSpan.RealValue > yTimestampSpan.RealValue) {
            return 1;
        }

        if (yTimestampSpan.RealValue > xTimestampSpan.RealValue) {
            return -1;
        }

        return 0;
    }

    /**
     *
     * @param rules
     */
    public calculateCurve(rules: EngravingRules): void {

        // single GraphicalSlur means a single Curve, eg each GraphicalSlurObject is meant to be on the same StaffLine
        // a Slur can span more than one GraphicalSlurObjects
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // where the Slur (not the graphicalObject) starts and ends (could belong to another StaffLine)
        let slurStartNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
        if (!slurStartNote && this.graceStart) {
            slurStartNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
        }
        if (!slurStartNote) {
            slurStartNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
        }
        let slurEndNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
        if (!slurEndNote && this.graceEnd) {
            slurEndNote = endStaffEntry.findGraphicalNoteFromGraceNote(this.slur.EndNote);
        }

        const staffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        this.calculatePlacement(skyBottomLineCalculator, staffLine);

        // the Start- and End Reference Points for the Sky-BottomLine
        const startEndPoints: {startX: number, startY: number, endX: number, endY: number} =
            this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, rules, skyBottomLineCalculator);

        let startX: number = startEndPoints.startX;
        let endX: number = startEndPoints.endX;
        let startY: number = startEndPoints.startY;
        let endY: number = startEndPoints.endY;
        // from a note to the next one, in this staffline: nothing between them for the curve to clear (see placePastEndFingerings())
        const toNextNote: boolean = this.staffEntries.length === 2 && slurStartNote !== undefined && slurEndNote !== undefined;

        // Degenerate case: start and end point (nearly) coincide, e.g. for a zero-length slur from a malformed
        // file. The curve calculation below would divide 0 by 0 (start-end angle, tangent slopes) and produce
        // NaN control points, ending up as an invalid SVG path - use a collapsed (invisible) curve instead.
        if (Math.abs(endX - startX) < 0.0001 && Math.abs(endY - startY) < 0.0001) {
            this.bezierStartPt = new PointF2D(startX, startY);
            this.bezierStartControlPt = new PointF2D(startX, startY);
            this.bezierEndControlPt = new PointF2D(endX, endY);
            this.bezierEndPt = new PointF2D(endX, endY);
            return;
        }

        const minAngle: number = rules.SlurTangentMinAngle;
        const maxAngle: number = rules.SlurTangentMaxAngle;
        let points: PointF2D[];

        if (this.placement === PlacementEnum.Above) {
            startY -= rules.SlurNoteHeadYOffset;
            endY -= rules.SlurNoteHeadYOffset;
            const startUpperRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote) {
                    startUpperRight.x += this.staffEntries[0].PositionAndShape.BorderRight;
            } else  {
                    // continuing Slur from previous StaffLine - must start after last Instruction of first Measure
                    startUpperRight.x = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceStart) {
                startUpperRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }

            const endUpperLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote) {
                    endUpperLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else if (!this.slur.EndNote) {
                    endUpperLeft.x = this.getUnattachedEndX();
            } else {
                    // Slur continues to next StaffLine - must reach the end of current StaffLine
                    endUpperLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endUpperLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // above or beside the fingerings of the start and end notes the curve ran into, see retryPastEndFingerings()
            const start: PointF2D = this.placePastEndFingerings(slurStartNote, true, startX, startY, startUpperRight.x, endX,
                                                                this.fingeringsRunInto?.start, toNextNote);
            const end: PointF2D = this.placePastEndFingerings(slurEndNote, false, endX, endY, endUpperLeft.x, startX,
                                                              this.fingeringsRunInto?.end, toNextNote);
            if (start.x !== startX || end.x !== endX) { // the sky line points stay between the start and the end
                startUpperRight.x = Math.max(startUpperRight.x, start.x);
                endUpperLeft.x = Math.min(endUpperLeft.x, end.x);
            }
            [startX, startY, endX, endY] = [start.x, start.y, end.x, end.y];
            startUpperRight.y = startY;
            endUpperLeft.y = endY;

            // SkyLinePointsList between firstStaffEntry startUpperRightPoint and lastStaffentry endUpperLeftPoint
            points = this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);
            const obstacles: PointF2D[] = this.getObstacles(points, skyBottomLineCalculator) // without the point added if there is none
                .concat(this.articulationCorners);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endUpperLeft.x - startUpperRight.x) / 2 + startUpperRight.x,
                                                      (endUpperLeft.y - startUpperRight.y) / 2 + startUpperRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = (Math.atan((endY - startY) / (endX - startX)));

            // translate origin at Start (positiveY from Bottom to Top => change sign for Y)
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, -(endY - startY));

            // and Rotate at new Origin startEndLineAngle degrees
                // clockwise/counterclockwise Rotation
                // after Rotation end2.Y must be 0
                // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in SkyLine
                // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
                // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;

                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            }*/



            // calculate tangent Lines Angles
                // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
            this.clearObstacles(controlPoints.startControlPoint, controlPoints.endControlPoint, end2.x,
                                this.calculateTranslatedAndRotatedPointListAbove(obstacles, startX, startY, rotationMatrix),
                                this.getFingeringCorners().map(corners =>
                                    this.calculateTranslatedAndRotatedPointListAbove(corners, startX, startY, rotationMatrix)));

            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
                // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y = -startControlPoint.y + startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y = -endControlPoint.y + startY;
            // middleControlPoint.x = (startControlPoint.x + endControlPoint.x) / 2;
            // middleControlPoint.y = (startControlPoint.y + endControlPoint.y) / 2 + 1.0;

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y = -this.intersection.y + startY;
            /* for DEBUG only */

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY - startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y - startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y - endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY - endYOffset);

            const passedClose: {start: boolean, end: boolean} = this.keepPassedArticulationsInside();
            if (this.retryPastArticulationsOutside(rules, passedClose) ||
                this.retryPastEndFingerings(rules, slurStartNote, slurEndNote, startUpperRight.x, endUpperLeft.x)) {
                return;
            }
            this.placeArticulationsOutside(staffLine);

            // calculate slur Curvepoints and update Skyline
            const length: number = staffLine.SkyLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update left- and rightIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update SkyLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
            }
        } else {
            startY += rules.SlurNoteHeadYOffset;
            endY += rules.SlurNoteHeadYOffset;

            // firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            const startLowerRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote) {
                startLowerRight.x += this.staffEntries[0].PositionAndShape.BorderRight;
            } else {
                // continuing Slur from previous StaffLine - must start after last Instruction of first Measure
                startLowerRight.x = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceStart) {
                startLowerRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            const endLowerLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote) {
                endLowerLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else if (!this.slur.EndNote) {
                endLowerLeft.x = this.getUnattachedEndX();
            } else {
                // Slur continues to next StaffLine - must reach the end of current StaffLine
                endLowerLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endLowerLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // below or beside the fingerings of the start and end notes the curve ran into, see retryPastEndFingerings()
            const start: PointF2D = this.placePastEndFingerings(slurStartNote, true, startX, startY, startLowerRight.x, endX,
                                                                this.fingeringsRunInto?.start, toNextNote);
            const end: PointF2D = this.placePastEndFingerings(slurEndNote, false, endX, endY, endLowerLeft.x, startX,
                                                              this.fingeringsRunInto?.end, toNextNote);
            if (start.x !== startX || end.x !== endX) { // the sky line points stay between the start and the end
                startLowerRight.x = Math.max(startLowerRight.x, start.x);
                endLowerLeft.x = Math.min(endLowerLeft.x, end.x);
            }
            [startX, startY, endX, endY] = [start.x, start.y, end.x, end.y];
            startLowerRight.y = startY;
            endLowerLeft.y = endY;

            // BottomLinePointsList between firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            points = this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);
            // without the point added if there is none, nor the bare staff, which calculateBottomPoints() keeps
            const obstacles: PointF2D[] = this.getObstacles(points.filter(point => point.y !== staffLine.BottomLineOffset),
                                                            skyBottomLineCalculator).concat(this.articulationCorners);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endLowerLeft.x - startLowerRight.x) / 2 + startLowerRight.x,
                                                      (endLowerLeft.y - startLowerRight.y) / 2 + startLowerRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = Math.atan((endY - startY) / (endX - startX));
            // translate origin at Start
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, endY - startY);

            // and Rotate at new Origin startEndLineAngle degrees
            // clockwise/counterclockwise Rotation
            // after Rotation end2.Y must be 0
            // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in BottomLine
            // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
            // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;
                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            } */

            // calculate tangent Lines Angles
            // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
            this.clearObstacles(controlPoints.startControlPoint, controlPoints.endControlPoint, end2.x,
                                this.calculateTranslatedAndRotatedPointListBelow(obstacles, startX, startY, rotationMatrix),
                                this.getFingeringCorners().map(corners =>
                                    this.calculateTranslatedAndRotatedPointListBelow(corners, startX, startY, rotationMatrix)));
            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
            // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y += startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y += startY;

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY + startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y + startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y + endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY + endYOffset);

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y += startY;
            /* for DEBUG only */

            const passedClose: {start: boolean, end: boolean} = this.keepPassedArticulationsInside();
            if (this.retryPastArticulationsOutside(rules, passedClose) ||
                this.retryPastEndFingerings(rules, slurStartNote, slurEndNote, startLowerRight.x, endLowerLeft.x)) {
                return;
            }
            this.placeArticulationsOutside(staffLine);

            // calculate CurvePoints
            const length: number = staffLine.BottomLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update start- and endIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update BottomLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
            }
        }
    }


    /**
     * Calculates the bezier curve for a slur that crosses between two staves (e.g. left hand to right hand),
     * where the start and end notes lie on different stafflines that are stacked vertically within the same
     * MusicSystem. Unlike [[calculateCurve]], this runs at draw time, because it needs the final vertical
     * positions of both stafflines, which aren't fixed until the system Y-layout (after calculateSlurs()).
     *
     * The resulting bezier points are stored relative to the start note's staffline, so the regular drawSlur()
     * (which adds that staffline's absolute position) renders them at the correct absolute location.
     * @returns true if the curve was calculated and can be drawn, false otherwise (e.g. missing notes, or the
     * two staves are not in the same MusicSystem - a cross-staff plus cross-system slur is not supported).
     */
    public calculateCurveCrossStaff(rules: EngravingRules): boolean {
        const slurStartNote: GraphicalNote = rules.GNote(this.slur.StartNote);
        const slurEndNote: GraphicalNote = rules.GNote(this.slur.EndNote);
        if (!slurStartNote || !slurEndNote) {
            return false;
        }
        const startStaffLine: StaffLine = slurStartNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        const endStaffLine: StaffLine = slurEndNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        if (!startStaffLine || !endStaffLine) {
            return false;
        }
        // Only handle staves stacked within the same MusicSystem (the regular cross-staff case).
        if (startStaffLine.ParentMusicSystem !== endStaffLine.ParentMusicSystem) {
            return false;
        }
        const systemBox: BoundingBox = startStaffLine.ParentMusicSystem.PositionAndShape;

        // notehead positions of both notes, relative to the common MusicSystem
        const startPos: PointF2D = this.positionRelativeToBox(slurStartNote.PositionAndShape, systemBox);
        const endPos: PointF2D = this.positionRelativeToBox(slurEndNote.PositionAndShape, systemBox);

        // Express everything relative to the start note's staffline, since drawSlur() adds that staffline's
        // absolute position to the bezier points.
        const staffLineOffset: PointF2D = startStaffLine.PositionAndShape.RelativePosition;
        const startX: number = startPos.x - staffLineOffset.x;
        const endX: number = endPos.x - staffLineOffset.x;
        const startNoteY: number = startPos.y - staffLineOffset.y;
        const endNoteY: number = endPos.y - staffLineOffset.y;

        // The staff higher up on the page has the smaller y value.
        const endStaffAbove: boolean =
            endStaffLine.PositionAndShape.RelativePosition.y < startStaffLine.PositionAndShape.RelativePosition.y;

        const noteHeadHalfHeight: number = 0.5;
        const yGap: number = rules.SlurNoteHeadYOffset; // gap between notehead and slur tip
        let startY: number;
        let endY: number;
        if (endStaffAbove) {
            // slur leaves the lower (start) note upwards and reaches the higher (end) note from below
            startY = startNoteY - noteHeadHalfHeight - yGap;
            endY = endNoteY + noteHeadHalfHeight + yGap;
            this.placement = PlacementEnum.Above;
        } else {
            startY = startNoteY + noteHeadHalfHeight + yGap;
            endY = endNoteY - noteHeadHalfHeight - yGap;
            this.placement = PlacementEnum.Below;
        }

        // The curve bows out (vertically) from the line connecting the two notes.
        const dx: number = endX - startX;
        const dy: number = endY - startY;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const bow: number = Math.max(rules.SlurCrossStaffMinBow,
                                     Math.min(rules.SlurCrossStaffMaxBow, distance * rules.SlurCrossStaffBowFactor));
        const bowSign: number = this.placement === PlacementEnum.Above ? -1 : 1; // -1 = upwards (smaller y)

        this.bezierStartPt = new PointF2D(startX, startY);
        this.bezierStartControlPt = new PointF2D(startX + dx * 0.25, startY + dy * 0.25 + bowSign * bow);
        this.bezierEndControlPt = new PointF2D(startX + dx * 0.75, startY + dy * 0.75 + bowSign * bow);
        this.bezierEndPt = new PointF2D(endX, endY);
        return true;
    }

    /**
     * Sums the relative positions from box up to (but not including) the given ancestor box, giving box's
     * position in the ancestor's coordinate system.
     */
    private positionRelativeToBox(box: BoundingBox, ancestor: BoundingBox): PointF2D {
        let x: number = 0;
        let y: number = 0;
        let current: BoundingBox = box;
        while (current && current !== ancestor) {
            x += current.RelativePosition.x;
            y += current.RelativePosition.y;
            current = current.Parent;
        }
        return new PointF2D(x, y);
    }

    /**
     * This method calculates the Start and End Positions of the Slur Curve.
     * @param slurStartNote
     * @param slurEndNote
     * @param staffLine
     * @param startX
     * @param startY
     * @param endX
     * @param endY
     * @param rules
     * @param skyBottomLineCalculator
     */
    private calculateStartAndEnd(   slurStartNote: GraphicalNote,
                                    slurEndNote: GraphicalNote,
                                    staffLine: StaffLine,
                                    rules: EngravingRules,
                                    skyBottomLineCalculator: SkyBottomLineCalculator): {startX: number, startY: number, endX: number, endY: number} {
        let startX: number = 0;
        let startY: number = 0;
        let endX: number = 0;
        let endY: number = 0;
        this.articulationCorners = [];
        this.articulationsOutside = [];
        this.labelsOutside = [];

        if (slurStartNote) {
            // must be relative to StaffLine
            startX = slurStartNote.PositionAndShape.RelativePosition.x + slurStartNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                                            + slurStartNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            // If Slur starts on a Gracenote
            if (this.graceStart) {
                startX += slurStartNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            //const first: GraphicalNote = slurStartNote.parentVoiceEntry.notes[0];

            // Determine Start/End Point coordinates with the VoiceEntry of the Start/EndNote of the slur
            const slurStartVE: GraphicalVoiceEntry = slurStartNote.parentVoiceEntry;

            if (this.placement === PlacementEnum.Above) {
                startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderTop;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    startY = Math.min(endY, slurStartVE.parentStaffEntry.getSkylineMin());
                }
            } else {
                startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderBottom;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    startY = Math.max(endY, slurStartVE.parentStaffEntry.getBottomlineMax());
                }
            }
            startY = this.getYPastArticulations(slurStartNote, true, startX, startY);

            // If the stem points towards the starting point of the slur, shift the slur by a small amount to start (approximately) at the x-position
            // of the notehead. Note: an exact calculation using the position of the note is too complicate for the payoff
            if ( slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Down && this.placement === PlacementEnum.Below ) {
                startX -= 0.5;
            }
            if (slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Up && this.placement === PlacementEnum.Above) {
                startX += 0.5;
            }
            // if (first.NoteStem && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     startX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     startY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, startX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurStartNote[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         startX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         startY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, startX);
            //     } else {
            //     }
            // }
        } else {
            startX = 0;
        }

        if (slurEndNote) {
            endX = slurEndNote.PositionAndShape.RelativePosition.x + slurEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + slurEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            // If Slur ends in a Gracenote
            if (this.graceEnd) {
                endX += slurEndNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
            if (this.placement === PlacementEnum.Above) {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderTop;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    endY = Math.min(endY, slurEndVE.parentStaffEntry.getSkylineMin());
                }
            } else {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    endY = Math.max(endY, slurEndVE.parentStaffEntry.getBottomlineMax());
                }
            }
            endY = this.getYPastArticulations(slurEndNote, false, endX, endY);

            // If the stem points towards the endpoint of the slur, shift the slur by a small amount to start (approximately) at the x-position
            // of the notehead. Note: an exact calculation using the position of the note is too complicate for the payoff
            if ( slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Down && this.placement === PlacementEnum.Below ) {
                endX -= 0.5;
            }
            if (slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Up && this.placement === PlacementEnum.Above) {
                endX += 0.5;
            }
            // const first: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[0];
            // if (first.NoteStem && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     endX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     endY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, endX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         endX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         endY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, endX);
            //     } else {
            //         if (this.placement === PlacementEnum.Above) {
            //             const highestNote: GraphicalNote = last;
            //             endY = highestNote.PositionAndShape.RelativePosition.y;
            //             if (highestNote.NoteHead) {
            //                 endY += highestNote.NoteHead.PositionAndShape.BorderMarginTop;
            //             } else { endY += highestNote.PositionAndShape.BorderTop; }
            //         } else {
            //             const lowestNote: GraphicalNote = first;
            //             endY = lowestNote.parentVoiceEntry
            //             lowestNote.PositionAndShape.RelativePosition.y;
            //             if (lowestNote.NoteHead) {
            //                 endY += lowestNote.NoteHead.PositionAndShape.BorderMarginBottom;
            //             } else { endY += lowestNote.PositionAndShape.BorderBottom; }
            //         }
            //     }
            // }
        } else if (!this.slur.EndNote) {
            endX = this.getUnattachedEndX();
        } else {
            endX = staffLine.PositionAndShape.Size.width;
        }

        // if GraphicalSlur breaks over System, then the end/start of the curve is at the corresponding height with the known start/end
        if (!slurStartNote && !slurEndNote) {
            startY = -1.5;
            endY = -1.5;
        }
        if (!slurStartNote) {
            if (this.placement === PlacementEnum.Above) {
                startY = endY - 1;
            } else {
                startY = endY + 1;
            }
        }
        if (!slurEndNote) {
            if (!this.slur.EndNote) {
                endY = startY; // a short slur to the barline, like Sibelius draws one without end note (see Slur.HasUnattachedEnd)
            } else if (this.placement === PlacementEnum.Above) {
                endY = startY - 1;
            } else {
                endY = startY + 1;
            }
        }

        // if two slurs start/end at the same GraphicalNote, then the second gets an offset
        if (this.slur.startNoteHasMoreStartingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                startY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { startY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }
        if (this.slur.endNoteHasMoreEndingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                endY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { endY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }

        if (this.placement === PlacementEnum.Above) {
            startY = Math.min(startY, 1.5);
            endY = Math.min(endY, 1.5);
        } else {
            startY = Math.max(startY, staffLine.StaffHeight - 1.5);
            endY = Math.max(endY, staffLine.StaffHeight - 1.5);
        }

        return {startX, startY, endX, endY};
    }

    /**
     * The y that the slur keeps its distance (SlurNoteHeadYOffset) from at its start or end note: beyond the note's articulations
     * on the slur's side that go between the note and the slur. Only staccato dots and wedges and tenuto lines do (Behind Bars
     * p. 121): another mark, e.g. an accent or a fermata, and the ones beyond it go outside the slur, which stays closer to the
     * note (p. 122), and placeArticulationsOutside() moves them beyond it, with the fingerings stacked on them. Unless that takes
     * them too far from the note: then the slur goes past them too (see retryPastArticulationsOutside()).
     * The marks are taken where Vexflow draws them, e.g. the staccato of a note on a line in the next stave space.
     * The corners of the marks the slur clears go to articulationCorners, for clearObstacles() to keep the curve that far from them
     * over their width too: e.g. the end of a slur above a stem-up note is at the stem, right of a staccato at the stem end, and a
     * short slur rising to it ran over the dot lower than its end.
     * @param note the slur's start or end note
     * @param isStart whether it is the start note
     * @param headX the x of the center of the note head, relative to the staff line
     * @param y the border of the note's voice entry on the slur's side, relative to the staff line
     * @returns y, or the outer edge of the outermost of the marks inside the slur
     */
    private getYPastArticulations(note: GraphicalNote, isStart: boolean, headX: number, y: number): number {
        const vfnote: any = (note as VexFlowGraphicalNote).vfnote?.[0];
        const stave: any = vfnote?.getStave?.();
        if (!stave) {
            return y;
        }
        const above: boolean = this.placement === PlacementEnum.Above;
        const outward: number = above ? -1 : 1;
        const position: number = above ? VF.Modifier.Position.ABOVE : VF.Modifier.Position.BELOW;
        const staveTopY: number = stave.getYForLine(0); // relative to the staff line, like the notes (see VexFlowMeasure.correctNotePositions())
        const marks: ArticulationOutside[] = vfnote.getModifiers()
            // (a breath mark is after the note)
            .filter((modifier: any) => modifier.getCategory() === VF.Articulation.CATEGORY && modifier.getPosition() === position &&
                modifier.type !== "abr")
            .map((articulation: any): ArticulationOutside => {
                const measure: () => ArticulationExtent = () => {
                    const extent: {left: number, right: number, top: number, bottom: number} = articulation.getExtent();
                    const [top, bottom] = [(extent.top - staveTopY) / unitInPixels, (extent.bottom - staveTopY) / unitInPixels];
                    return {
                        left: headX + extent.left / unitInPixels,
                        right: headX + extent.right / unitInPixels,
                        near: above ? -bottom : top, // as distances outward, see getOutwardExtent()
                        far: above ? -top : bottom,
                        inside: GraphicalSlur.articulationsInsideSlur.includes(articulation.type),
                    };
                };
                return {...measure(), isStart, articulation, measure};
            });
        marks.sort((a: ArticulationExtent, b: ArticulationExtent): number => a.near - b.near); // from the note outward
        // a fermata goes outside even when the other marks don't (Behind Bars pp. 188-189, see retryPastArticulationsOutside()), but
        //   none of a grace note's do, which VexFlowMusicSheetCalculator.calculateMeasureXLayout() doesn't reset for each render,
        //   nor those under an ornament, e.g. a trill, which Vexflow stacks on them and doesn't move along (see Ornament.format())
        const clearEvery: boolean = isStart ? this.clearingEveryArticulationAt?.start : this.clearingEveryArticulationAt?.end;
        const keepInside: boolean = note.sourceNote.IsGraceNote || vfnote.getModifiers().some((modifier: any) =>
            modifier.getCategory() === VF.Ornament.CATEGORY && modifier.getPosition() === position);
        let distance: number = y * outward; // how far out the start or end is
        for (const [index, mark] of marks.entries()) {
            if (!mark.inside && !keepInside && (!clearEvery || GraphicalSlur.isFermata(mark))) {
                const outside: ArticulationOutside[] = marks.slice(index);
                this.articulationsOutside.push(...outside);
                this.addLabelsOutside(note, isStart, outside);
                break;
            }
            distance = Math.max(distance, mark.far);
            this.articulationCorners.push(new PointF2D(mark.left, mark.far * outward), new PointF2D(mark.right, mark.far * outward));
        }
        return distance * outward;
    }

    /**
     * Adds the labels stacked on the articulations left outside the slur at its start or end note to labelsOutside, to move along
     * with them: over them and beyond them, the fingerings of the note's staff entry (MusicSheetCalculator.calculateFingerings()
     * places them after the articulations) and, above the first staffline of the system, a measure number
     * (MusicSheetCalculator.calculateMeasureNumberPlacement(), before the fingerings).
     * @param outside the articulations left outside the slur, from the note outward
     */
    private addLabelsOutside(note: GraphicalNote, isStart: boolean, outside: ArticulationOutside[]): void {
        const staffLine: StaffLine = note.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine;
        const labels: LabelOutside[] = (note.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? []).map((fingering: GraphicalLabel) => {
            const box: BoundingBox = fingering.PositionAndShape; // relative to the staffline
            return {box, isStart, left: box.RelativePosition.x + box.BorderLeft, right: box.RelativePosition.x + box.BorderRight,
                    isFingering: true};
        });
        const system: MusicSystem = staffLine?.ParentMusicSystem;
        if (this.placement === PlacementEnum.Above && staffLine === system?.StaffLines[0]) {
            for (const measureNumber of system.MeasureNumberLabels) {
                const box: BoundingBox = measureNumber.PositionAndShape;
                const x: number = box.RelativePosition.x - staffLine.PositionAndShape.RelativePosition.x;
                labels.push({box, isStart, left: x + box.BorderLeft, right: x + box.BorderRight, isFingering: false});
            }
        }
        const left: number = Math.min(...outside.map((mark: ArticulationOutside) => mark.left));
        const right: number = Math.max(...outside.map((mark: ArticulationOutside) => mark.right));
        for (const label of labels) {
            if (label.right > left && label.left < right && this.getOutwardExtent(label.box)[0] >= outside[0].near) {
                this.labelsOutside.push(label);
            }
        }
    }

    /** Whether the articulation is a fermata, which goes outside a slur at its start or end also when the other marks don't
     *  (see getYPastArticulations()). */
    private static isFermata(mark: ArticulationOutside): boolean {
        return mark.articulation.type.startsWith("a@"); // above or below
    }

    /**
     * Keeps the articulations left outside the slur at its start or end (see getYPastArticulations()) that the curve passes
     * beyond inside it after all, as they are not in its way: e.g. a slur below a note high above the staff starts below the
     * staff (calculateStartAndEnd()), and an accent under the note is between them. From the note outward, up to the first one
     * the curve runs into or passes under. The labels stacked on them then don't move either (see placeArticulationsOutside()).
     * @returns For the start and the end, whether the curve passes one of those closer than SlurNoteHeadYOffset, the distance it
     *          keeps from the marks inside it, less a little (see retryPastArticulationsOutside()).
     */
    private keepPassedArticulationsInside(): {start: boolean, end: boolean} {
        const passedClose: {start: boolean, end: boolean} = {start: false, end: false};
        for (const isStart of [true, false]) {
            const marks: ArticulationOutside[] = this.articulationsOutside.filter((mark: ArticulationOutside) => mark.isStart === isStart);
            let passed: number = 0;
            for (const mark of marks) {
                const beyond: number = this.getDistanceBeyond(mark.left, mark.right, mark.far);
                if (beyond < 0) {
                    break;
                }
                if (beyond < this.rules.SlurNoteHeadYOffset - 0.1) {
                    passedClose[isStart ? "start" : "end"] = true;
                }
                passed++;
            }
            if (passed === 0) {
                continue;
            }
            this.articulationsOutside = this.articulationsOutside.filter((mark: ArticulationOutside) => !marks.slice(0, passed).includes(mark));
            if (passed === marks.length) {
                this.labelsOutside = this.labelsOutside.filter((label: LabelOutside) => label.isStart !== isStart);
            }
        }
        return passedClose;
    }

    /** How far the curve passes beyond a box from left to right (relative to the staffline) whose far edge is far out (see
     *  getOutwardExtent()), at the closest over its width: negative if it runs into it or passes under it, Infinity if it doesn't
     *  reach over it. */
    private getDistanceBeyond(left: number, right: number, far: number): number {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        let beyond: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 200; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 200 ? this.calculateCurvePointAtIndex(i / 200) : this.bezierEndPt;
            if (point.x >= left && point.x <= right) {
                beyond = Math.min(beyond, point.y * outward - far);
            }
        }
        return beyond;
    }

    /**
     * Calculates the curve again if placeArticulationsOutside() would move the articulations left outside the slur at its start
     * or end too far from their note, this time with the slur past every articulation of that note but a fermata: if the slur
     * leaves the note so steeply that it gets more than articulationOutsideSlurMaxRise further out over them than at its tip, e.g.
     * a short slur rising to a high note (Behind Bars p. 122: accents at the ends of a slur go inside it when they would otherwise
     * be too far from the note to be immediately apparent; a pause goes outside, pp. 188-189). Or if the curve passes too close
     * beyond one it keeps inside (see keepPassedArticulationsInside()). Before retryPastEndFingerings(), whose fingerings are then
     * those of the new curve.
     * @param passedClose For the start and the end, whether the curve passes too close beyond an articulation it keeps inside.
     * @returns Whether the curve was calculated again (and added to the sky or bottom line), so there is nothing left to do.
     */
    private retryPastArticulationsOutside(rules: EngravingRules, passedClose: {start: boolean, end: boolean}): boolean {
        if (this.clearingEveryArticulationAt || this.fingeringsRunInto) {
            return false; // this is the second calculation
        }
        const tooFar: (isStart: boolean) => boolean = (isStart: boolean) =>
            this.getShiftOutside(isStart) > 0 && this.getRiseOutside(isStart) > GraphicalSlur.articulationOutsideSlurMaxRise;
        const retry: {start: boolean, end: boolean} = {start: passedClose.start || tooFar(true), end: passedClose.end || tooFar(false)};
        if (!retry.start && !retry.end) {
            return false;
        }
        this.clearingEveryArticulationAt = retry;
        try {
            this.calculateCurve(rules);
        } finally {
            this.clearingEveryArticulationAt = undefined;
        }
        return true;
    }

    /**
     * Moves the articulations of the start and end notes that getYPastArticulations() left outside the slur beyond it, where it
     * would run into them or pass closer to them than articulationOutsideSlurDistance, with the labels stacked on them, and adds
     * them to the sky or bottom line. Behind Bars p. 122: accents at the beginning and end of a slur go outside it, so that the
     * slur can remain closer to the note heads; pp. 188-189: so does a pause. Each mark stays at least as far from the one under
     * it as Vexflow put it.
     * The marks move by their y_shift, which VexFlowMusicSheetCalculator.calculateMeasureXLayout() resets for every render.
     * A measure number is added to the sky line after the slurs (MusicSheetCalculator.calculateMeasureNumberSkyline()).
     */
    private placeArticulationsOutside(staffLine: StaffLine): void {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        for (const isStart of [true, false]) {
            const shift: number = this.getShiftOutside(isStart);
            if (shift <= 0) {
                continue;
            }
            let moved: number = 0; // the most a mark moved
            let under: {far: number, newFar: number}; // the far edge of the mark under the next one, before and after moving it
            for (const mark of this.articulationsOutside.filter((outside: ArticulationOutside) => outside.isStart === isStart)) {
                const near: number = under ? Math.max(mark.near + shift, under.newFar + mark.near - under.far) : mark.near + shift;
                let extent: ArticulationExtent = mark.measure();
                // Vexflow snaps it to a half stave space, never back, but up to half a space out: a smaller shift can leave it where it
                //   is, e.g. 0.15 for an accent just above the staff
                for (let i: number = 0; i < 8 && extent.near < near - 0.001; i++) {
                    const step: number = Math.max(near - extent.near, 0.1);
                    mark.articulation.setYShift((mark.articulation.y_shift ?? 0) + step * outward * unitInPixels);
                    extent = mark.measure();
                }
                moved = Math.max(moved, extent.near - mark.near);
                under = {far: mark.far, newFar: extent.far};
                this.addToSkyBottomLine(staffLine, extent.left, extent.right, extent.far);
            }
            for (const label of this.labelsOutside.filter((outside: LabelOutside) => outside.isStart === isStart)) {
                label.box.RelativePosition.y += moved * outward;
                if (label.isFingering) {
                    this.addToSkyBottomLine(staffLine, label.left, label.right, this.getOutwardExtent(label.box)[1]);
                }
            }
        }
    }

    /** How far the articulations left outside the slur at its start or end (see getYPastArticulations()), and the labels stacked
     *  on them, have to move out to keep articulationOutsideSlurDistance from the slur as drawn, over their width (0 if they do). */
    private getShiftOutside(isStart: boolean): number {
        const boxes: {left: number, right: number, near: number}[] =
            this.articulationsOutside.filter((mark: ArticulationOutside) => mark.isStart === isStart);
        for (const label of this.labelsOutside.filter((outside: LabelOutside) => outside.isStart === isStart)) {
            boxes.push({left: label.left, right: label.right, near: this.getOutwardExtent(label.box)[0]});
        }
        let shift: number = 0;
        if (boxes.length > 0) {
            for (const point of this.getOuterEdge()) {
                for (const box of boxes) {
                    if (point.x >= box.left && point.x <= box.right) {
                        shift = Math.max(shift, point.distance + GraphicalSlur.articulationOutsideSlurDistance - box.near);
                    }
                }
            }
        }
        return shift;
    }

    /** How much further out the slur's outer edge gets over the articulations left outside it at its start or end, but fermatas,
     *  than at its tip (0 if there are none): see retryPastArticulationsOutside(). */
    private getRiseOutside(isStart: boolean): number {
        const marks: ArticulationOutside[] = this.articulationsOutside.filter((mark: ArticulationOutside) =>
            mark.isStart === isStart && !GraphicalSlur.isFermata(mark));
        const edge: {x: number, distance: number}[] = this.getOuterEdge();
        const tip: {x: number, distance: number} = isStart ? edge[0] : edge[edge.length - 1];
        let rise: number = 0;
        for (const point of edge) {
            if (marks.some((mark: ArticulationOutside) => point.x >= mark.left && point.x <= mark.right)) {
                rise = Math.max(rise, point.distance - tip.distance);
            }
        }
        return rise;
    }

    /** Points along the outer edge of the slur as VexFlowMusicSheetDrawer.drawSlur() draws it, the curve with its ends 0.05 and its
     *  control points 0.3 further out: their x, relative to the staffline, and how far out they are (see getOutwardExtent()). */
    private getOuterEdge(): {x: number, distance: number}[] {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        const [p0, p1, p2, p3] = [this.bezierStartPt, this.bezierStartControlPt, this.bezierEndControlPt, this.bezierEndPt];
        const points: {x: number, distance: number}[] = [];
        for (let i: number = 0; i <= 200; i++) {
            const t: number = i / 200;
            const [b0, b1, b2, b3] = [(1 - t) * (1 - t) * (1 - t), 3 * (1 - t) * (1 - t) * t, 3 * (1 - t) * t * t, t * t * t];
            points.push({
                x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
                distance: (b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y) * outward + 0.05 * (b0 + b3) + 0.3 * (b1 + b2),
            });
        }
        return points;
    }

    /** Adds a box from left to right (relative to the staffline) whose far edge is far out (see getOutwardExtent()) to the sky or
     *  bottom line, like calculateCurve() the curve. */
    private addToSkyBottomLine(staffLine: StaffLine, left: number, right: number, far: number): void {
        const above: boolean = this.placement === PlacementEnum.Above;
        const line: number[] = above ? staffLine.SkyLine : staffLine.BottomLine;
        const samplingUnit: number = staffLine.SkyBottomLineCalculator.SamplingUnit;
        for (let i: number = Math.max(0, Math.floor(left * samplingUnit)); i < Math.min(line.length, Math.ceil(right * samplingUnit)); i++) {
            line[i] = above ? Math.min(line[i], -far) : Math.max(line[i], far);
        }
    }

    /** Vexflow's types of the articulations that go inside a slur also at its start and end note (see getYPastArticulations()):
     *  staccato, staccatissimo (wedge), tenuto. */
    private static readonly articulationsInsideSlur: string[] = ["a.", "av", "a-"];
    /** How far an articulation outside a slur at its start or end stays from it (see placeArticulationsOutside()). */
    private static readonly articulationOutsideSlurDistance: number = 0.3;
    /** How much further out than at its tip a slur may get over the articulations outside it at its start or end: if it leaves the
     *  note more steeply, they go inside it (see retryPastArticulationsOutside()). Over an accent, a slur leaving the note gently
     *  rises up to about 0.45. */
    private static readonly articulationOutsideSlurMaxRise: number = 0.6;

    /** Where a slur without end note ends (see Slur.HasUnattachedEnd), relative to the staffline: at the barline of its
     *  measure, before the end instructions like a repeat sign or a clef change at the measure end.
     *  If that's too close to the start note to look like a slur (e.g. before a repeat sign), it reaches a bit past the note,
     *  over the repeat dots, but not up to the barline.
     */
    private getUnattachedEndX(): number {
        const endMeasure: GraphicalMeasure = this.staffEntries[this.staffEntries.length - 1].parentMeasure;
        const measureEndX: number = endMeasure.PositionAndShape.RelativePosition.x + endMeasure.PositionAndShape.Size.width;
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const minEndX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
            startStaffEntry.PositionAndShape.RelativePosition.x + startStaffEntry.PositionAndShape.BorderRight + 0.8;
        return Math.max(measureEndX - (endMeasure.endInstructionsWidth ?? 0), Math.min(minEndX, measureEndX - 0.5));
    }

    /**
     * This method calculates the placement of the Curve.
     * @param skyBottomLineCalculator
     * @param staffLine
     */
    private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
        // old version: when lyrics are given place above:
        // if ( !this.slur.StartNote.ParentVoiceEntry.LyricsEntries.isEmpty || (this.slur.EndNote
        //                                     && !this.slur.EndNote.ParentVoiceEntry.LyricsEntries.isEmpty) ) {
        //     this.placement = PlacementEnum.Above;
        //     return;
        // }

        if (this.rules.SlurPlacementFromXML && this.slur.PlacementXml !== PlacementEnum.NotYetDefined) {
            this.placement = this.slur.PlacementXml;
            return;
        }

        // if any StaffEntry belongs to a Measure with multiple Voices, than
        // if Slur's Start- or End-Note belongs to a LinkedVoice Below else Above
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.parentMeasure.hasMultipleVoices()) {
                if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice ||
                    this.slur.EndNote?.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    this.placement = PlacementEnum.Below;
                } else { this.placement = PlacementEnum.Above; }
                return;
            }
        }

        // when lyrics are given place above:
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.LyricsEntries.length > 0) {
                this.placement = PlacementEnum.Above;
                return;
            }
        }
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // single Voice, opposite to StemDirection
        // here should only be one voiceEntry, so we can take graphicalVoiceEntries[0]:
        const startStemDirection: StemDirectionType = startStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        const endStemDirection: StemDirectionType = endStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        if (startStemDirection  ===
            endStemDirection) {
            this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Below : PlacementEnum.Above;
            if (this.rules.SlurPlacementAtStems) {
                this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Above : PlacementEnum.Below;
            }
        } else {
            // Placement at the side with the minimum border
            let sX: number = startStaffEntry.PositionAndShape.BorderLeft + startStaffEntry.PositionAndShape.RelativePosition.x
                        + startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            let eX: number = endStaffEntry.PositionAndShape.BorderRight + endStaffEntry.PositionAndShape.RelativePosition.x
                        + endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            if (this.graceStart) {
                sX += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            if (this.graceEnd) {
                eX += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // get SkyBottomLine borders
            const minAbove: number = skyBottomLineCalculator.getSkyLineMinInRange(sX, eX) * -1;
            const maxBelow: number = skyBottomLineCalculator.getBottomLineMaxInRange(sX, eX) - staffLine.StaffHeight;

            if (maxBelow > minAbove) {
                this.placement = PlacementEnum.Above;
            } else { this.placement = PlacementEnum.Below; }
        }
    }

    /**
     * Calculates the curve again if it runs into a fingering of its start or end note, with its start or end past those or beside them
     * (see placePastEndFingerings()), e.g. one right above the last note. calculateTopPoints() and calculateBottomPoints() leave
     * the start and end staff entries out: the tangents to something right above the start or end would be vertical.
     * Only the part of those staff entries the curve passes over counts, from the start or end to the entry's edge
     * towards the other end: not e.g. the fingering left of the stem a slur above a note with its stem up starts at.
     * @param startEntryX The edge of the start note's staff entry towards the end, relative to the staffline.
     * @param endEntryX The edge of the end note's staff entry towards the start.
     * @returns Whether the curve was calculated again (and added to the sky or bottom line), so there is nothing left to do.
     */
    private retryPastEndFingerings(rules: EngravingRules, startNote: GraphicalNote, endNote: GraphicalNote,
                                   startEntryX: number, endEntryX: number): boolean {
        if (this.fingeringsRunInto) {
            return false; // this is the second calculation
        }
        const start: BoundingBox[] = this.getFingeringsRunInto(startNote, this.bezierStartPt.x, startEntryX);
        const end: BoundingBox[] = this.getFingeringsRunInto(endNote, endEntryX, this.bezierEndPt.x);
        if (start.length === 0 && end.length === 0) {
            return false;
        }
        this.fingeringsRunInto = {start, end, furthestOut: this.getFurthestOut()};
        try {
            this.calculateCurve(rules);
        } finally {
            this.fingeringsRunInto = undefined;
        }
        return true;
    }

    /** The fingerings of the note's staff entry that the curve passes closer than SlurNoteHeadYOffset to, or through, from fromX
     *  to toX (relative to the staffline). */
    private getFingeringsRunInto(note: GraphicalNote, fromX: number, toX: number): BoundingBox[] {
        const runInto: BoundingBox[] = [];
        for (const fingering of note?.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? []) {
            const box: BoundingBox = fingering.PositionAndShape; // relative to the staffline, see calculateFingerings()
            if (this.isFingeringOutside(box)) {
                continue;
            }
            const [near, far] = this.getOutwardExtent(box);
            if (this.runsInto(box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight, near, far, fromX, toX,
                              this.rules.SlurNoteHeadYOffset)) {
                runInto.push(box);
            }
        }
        return runInto;
    }

    /** Whether the fingering is stacked on articulations left outside the slur, which it moves along with, beyond the slur (see
     *  placeArticulationsOutside()): the slur doesn't go past it. */
    private isFingeringOutside(box: BoundingBox): boolean {
        return this.labelsOutside.some((outside: LabelOutside) => outside.box === box);
    }

    /** Whether the curve passes closer than margin to, or through, a box from left to right whose outward extent (see
     *  getOutwardExtent()) is near to far, from fromX to toX (relative to the staffline). */
    private runsInto(left: number, right: number, near: number, far: number, fromX: number, toX: number, margin: number): boolean {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        for (let i: number = 0; i <= 100; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 100 ? this.calculateCurvePointAtIndex(i / 100) : this.bezierEndPt;
            if (point.x >= Math.max(fromX, left) && point.x <= Math.min(toX, right) &&
                point.y * outward > near - margin && point.y * outward < far + margin) {
                return true;
            }
        }
        return false;
    }

    /** How far out the curve gets (see getOutwardExtent()), at its furthest point. */
    private getFurthestOut(): number {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        let furthest: number = Number.NEGATIVE_INFINITY;
        for (let i: number = 0; i <= 100; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 100 ? this.calculateCurvePointAtIndex(i / 100) : this.bezierEndPt;
            furthest = Math.max(furthest, point.y * outward);
        }
        return furthest;
    }

    /** The near and far edges of the box from the staff on the slur's side, as distances outward (up for a slur above). */
    private getOutwardExtent(box: BoundingBox): number[] {
        const top: number = box.RelativePosition.y + box.BorderTop;
        const bottom: number = box.RelativePosition.y + box.BorderBottom;
        return this.placement === PlacementEnum.Above ? [-bottom, -top] : [top, bottom];
    }

    /**
     * Where the start or end goes if the curve ran into fingerings of its note (see retryPastEndFingerings()): past them
     * (clearEndFingerings()), or beside them, on the note head's side (on the stem's side, it starts at the stem's tip, where a beam
     * can be): left of their column at the end, right of it at the start. Beside them for a slur from a note to the next one that
     * would then climb by more than half its width, which keeps such a short slur close to its notes, below the fingerings, e.g. from
     * one chord of 16ths to the next. And for a slur whose start or end would be further out past them than the curve got without
     * them, unless it passes over fingerings of the notes between anyway: the slur would only fall from there, lopsided, e.g. from
     * the fingering on the staccato of the first of four chords with staccatos (isc's comment on PR #1828).
     * @param x The start's or end's x.
     * @param y The start's or end's y.
     * @param entryX The edge of the note's staff entry towards the other end, relative to the staffline.
     * @param otherX The other end's x.
     * @param runInto The fingerings of the note's staff entry the curve ran into, see retryPastEndFingerings().
     * @param toNextNote Whether the slur goes from a note to the next one, both in this staffline.
     */
    private placePastEndFingerings(note: GraphicalNote, isStart: boolean, x: number, y: number, entryX: number, otherX: number,
                                   runInto: BoundingBox[], toNextNote: boolean): PointF2D {
        if (!runInto?.length) {
            return new PointF2D(x, y);
        }
        const pastY: number = isStart ? this.clearEndFingerings(note, x, entryX, y, runInto) :
            this.clearEndFingerings(note, entryX, x, y, runInto);
        const stem: StemDirectionType = note.parentVoiceEntry.parentVoiceEntry.StemDirection;
        const headSide: boolean = this.placement === PlacementEnum.Above ? stem !== StemDirectionType.Up : stem !== StemDirectionType.Down;
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        // the edge of the staff on the slur's side, as a distance outward
        const staffEdge: number = this.placement === PlacementEnum.Above ? 0 : note.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine.StaffHeight;
        const overMiddleFingerings: boolean = this.staffEntries.slice(1, -1).some((staffEntry: GraphicalStaffEntry) =>
            (staffEntry.FingeringEntries ?? []).some((fingering: GraphicalLabel) => this.getOutwardExtent(fingering.PositionAndShape)[1] > staffEdge));
        const lopsided: boolean = pastY * outward > this.fingeringsRunInto.furthestOut && !overMiddleFingerings;
        if (headSide && (toNextNote && Math.abs(pastY - y) > Math.abs(otherX - x) / 2 || lopsided)) {
            const gap: number = 0.3; // from the fingerings, a little less than the distance from the notes, as there is space in a text box
            const besideX: number = isStart ? Math.max(...runInto.map(box => box.RelativePosition.x + box.BorderRight)) + gap :
                Math.min(...runInto.map(box => box.RelativePosition.x + box.BorderLeft)) - gap;
            // not far from the note, and still a slur
            if (Math.abs(besideX - x) <= 1.2 && (isStart ? otherX - besideX : besideX - otherX) >= 1.5) {
                return new PointF2D(besideX, y);
            }
        }
        return new PointF2D(x, pastY);
    }

    /**
     * Moves the start or the end of the slur away from the staff (up for a slur above, down for one below) past the given
     * fingerings of its note, which the curve ran into, and any stacked on them, keeping the distance from them it keeps from
     * its note (SlurNoteHeadYOffset).
     * @param note The slur's start or end note, if it is in this staffline.
     * @param fromX The left end of the part of the note's staff entry the curve passes over, relative to the staffline.
     * @param toX Its right end.
     * @param y The start's or end's y.
     * @param runInto The fingerings of the note's staff entry the curve ran into, see retryPastEndFingerings().
     * @returns The y of the start or end past the fingerings.
     */
    private clearEndFingerings(note: GraphicalNote, fromX: number, toX: number, y: number, runInto: BoundingBox[]): number {
        if (!runInto?.length) {
            return y;
        }
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        const margin: number = this.rules.SlurNoteHeadYOffset;
        // the fingerings over that part, nearest to the note first
        const boxes: BoundingBox[] = (note.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? [])
            .map(fingering => fingering.PositionAndShape)
            .filter(box => box.RelativePosition.x + box.BorderRight > fromX && box.RelativePosition.x + box.BorderLeft < toX &&
                !this.isFingeringOutside(box))
            .sort((a, b) => this.getOutwardExtent(a)[0] - this.getOutwardExtent(b)[0]);
        let distance: number = y * outward; // how far out the start or end is
        for (const box of boxes) {
            const [near, far] = this.getOutwardExtent(box);
            if (runInto.includes(box) || near < distance + margin && far > distance - margin) {
                distance = Math.max(distance, far + margin);
            }
        }
        return distance * outward;
    }

    /** The points of the sky or bottom line for clearObstacles(): each sample at both its edges, since what it holds can be
     *  anywhere along it, e.g. the edge of a fingering under a slur rising steeply from its start. */
    private getObstacles(points: PointF2D[], skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const halfSample: number = 0.5 / skyBottomLineCalculator.SamplingUnit;
        const obstacles: PointF2D[] = [];
        for (const point of points) {
            obstacles.push(new PointF2D(point.x - halfSample, point.y), new PointF2D(point.x + halfSample, point.y));
        }
        return obstacles;
    }

    /**
     * Raises the control points where the curve passes closer than SlurNoteHeadYOffset to an obstacle, e.g. the fingering of
     * the note next to the start. The tangents only keep the lines from the start and end through the control points above the
     * obstacles, and the curve runs below those lines, the more so near the start and end.
     * Coordinates as in calculateControlPoints(): the start at the origin, the end on the x-axis, the obstacles above it.
     * Raising a control point doesn't move the curve sideways: the curve's height at an x grows linearly with the control
     * points' heights. But it raises the whole curve, by much for an obstacle next to the start or end, where the control point
     * has only a small share in the curve. So if that would make the curve more than 0.5 higher, the tangents get steeper first
     * (steepenTangents()), which brings the curve up near its ends without raising its top.
     * Only the obstacles under the tangents count: the curve can reach them, running between them and its tangents.
     * The sky or bottom line doesn't say what is under its points: if the curve, raised, runs further into a fingering it passed
     * under or beside, it stays as it was (e.g. under a fingering on the stem of another voice, in the middle of a short slur).
     * The fingerings of the start and end notes are retryPastEndFingerings()'s.
     * @param endX The end point's x.
     * @param obstacles The sky- or bottom line points between the start and end staff entries.
     * @param fingerings The corners of the fingerings of the notes between the start and end, see getFingeringCorners().
     */
    private clearObstacles(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number, obstacles: PointF2D[],
                           fingerings: PointF2D[][]): void {
        const [startControlX, endControlX, startControlY, endControlY] = [startControlPoint.x, endControlPoint.x, startControlPoint.y,
                                                                          endControlPoint.y];
        const depths: number[] = fingerings.map(corners => this.getDepthIn(startControlPoint, endControlPoint, endX, corners));
        // the tangents' slopes: calculateAngles() puts them above the obstacles, except where it limits them to SlurTangentMaxAngle
        const startSlope: number = startControlPoint.y / startControlPoint.x;
        const endSlope: number = endControlPoint.y / (endX - endControlPoint.x);
        // out of the curve's reach, e.g. stems hanging over the slur from a beam above
        const reachable: PointF2D[] = obstacles.filter(obstacle => obstacle.x > 0 && obstacle.x < endX &&
            obstacle.y <= obstacle.x * startSlope && obstacle.y <= (endX - obstacle.x) * endSlope);
        let misses: {t: number, height: number, obstacle: PointF2D}[] = this.getMisses(startControlPoint, endControlPoint, endX, reachable);
        let raised: {startY: number, endY: number} = this.getRaisedControlPoints(startControlPoint, endControlPoint, endX, misses);
        const raise: number = this.getCurveTop(raised.startY, raised.endY).height -
            this.getCurveTop(startControlPoint.y, endControlPoint.y).height;
        if (raise > 0.5) {
            this.steepenTangents(startControlPoint, endControlPoint, endX, misses);
            misses = this.getMisses(startControlPoint, endControlPoint, endX, reachable);
            raised = this.getRaisedControlPoints(startControlPoint, endControlPoint, endX, misses);
        }
        startControlPoint.y = raised.startY;
        endControlPoint.y = raised.endY;
        // (give or take the sampling of getDepthIn())
        if (fingerings.some((corners, i) => this.getDepthIn(startControlPoint, endControlPoint, endX, corners) > depths[i] + 0.05)) {
            [startControlPoint.x, endControlPoint.x, startControlPoint.y, endControlPoint.y] = [startControlX, endControlX, startControlY,
                                                                                                endControlY];
        }
    }

    /** The corners of the fingerings of the notes between the start and end, relative to the staffline (see calculateFingerings()). */
    private getFingeringCorners(): PointF2D[][] {
        const fingerings: PointF2D[][] = [];
        for (const staffEntry of this.staffEntries.slice(1, -1)) {
            for (const fingering of staffEntry.FingeringEntries ?? []) {
                const box: BoundingBox = fingering.PositionAndShape;
                const [left, right] = [box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight];
                const [top, bottom] = [box.RelativePosition.y + box.BorderTop, box.RelativePosition.y + box.BorderBottom];
                fingerings.push([new PointF2D(left, top), new PointF2D(right, top), new PointF2D(left, bottom), new PointF2D(right, bottom)]);
            }
        }
        return fingerings;
    }

    /** How far the curve runs into the box with these corners, from its nearest edge (0 if it doesn't; coordinates as in clearObstacles()). */
    private getDepthIn(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number, corners: PointF2D[]): number {
        const xs: number[] = corners.map(corner => corner.x);
        const ys: number[] = corners.map(corner => corner.y);
        const [left, right, low, high] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        let depth: number = 0;
        for (let i: number = 1; i < 100; i++) {
            const t: number = i / 100;
            const x: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.x + 3 * (1 - t) * t * t * endControlPoint.x + t * t * t * endX;
            const y: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.y + 3 * (1 - t) * t * t * endControlPoint.y;
            if (x > left && x < right) {
                depth = Math.max(depth, Math.min(y - low, high - y));
            }
        }
        return depth;
    }

    /** Where the curve passes closer than SlurNoteHeadYOffset to the obstacles, and by how much (coordinates as in clearObstacles()). */
    private getMisses(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                      obstacles: PointF2D[]): {t: number, height: number, obstacle: PointF2D}[] {
        const misses: {t: number, height: number, obstacle: PointF2D}[] = [];
        for (const obstacle of obstacles) {
            // the curve's x grows with t, since 0 <= startControlPoint.x <= endControlPoint.x <= endX: bisect
            let tMin: number = 0;
            let tMax: number = 1;
            for (let i: number = 0; i < 30; i++) {
                const tMid: number = (tMin + tMax) / 2;
                const x: number = 3 * (1 - tMid) * (1 - tMid) * tMid * startControlPoint.x + 3 * (1 - tMid) * tMid * tMid * endControlPoint.x
                    + tMid * tMid * tMid * endX;
                if (x < obstacle.x) {
                    tMin = tMid;
                } else {
                    tMax = tMid;
                }
            }
            const t: number = (tMin + tMax) / 2;
            const curveY: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.y + 3 * (1 - t) * t * t * endControlPoint.y;
            const miss: number = obstacle.y + this.rules.SlurNoteHeadYOffset - curveY;
            if (miss > 0) {
                misses.push({t, height: miss, obstacle});
            }
        }
        return misses;
    }

    /**
     * The heights of the control points at which the curve clears the misses, as low as possible: a miss in the first half of
     * the curve raises the start control point, one in the second half the end one, by as much as the miss that needs the most,
     * after what the start control point already gave. Not past the steepest tangent allowed (calculateAngles()): what is right
     * next to an end is out of the curve's reach. Coordinates as in clearObstacles().
     */
    private getRaisedControlPoints(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                                   misses: {t: number, height: number}[]): {startY: number, endY: number} {
        let startRaise: number = 0;
        for (const miss of misses) {
            if (miss.t <= 0.5) {
                startRaise = Math.max(startRaise, miss.height / (3 * (1 - miss.t) * (1 - miss.t) * miss.t));
            }
        }
        let endRaise: number = 0;
        for (const miss of misses) {
            if (miss.t > 0.5) {
                const remaining: number = miss.height - 3 * (1 - miss.t) * (1 - miss.t) * miss.t * startRaise;
                endRaise = Math.max(endRaise, remaining / (3 * (1 - miss.t) * miss.t * miss.t));
            }
        }
        const maxSlope: number = Math.tan(this.rules.SlurTangentMaxAngle * GraphicalSlur.degreesToRadiansFactor);
        return {
            startY: Math.max(startControlPoint.y, Math.min(startControlPoint.y + startRaise, startControlPoint.x * maxSlope)),
            endY: Math.max(endControlPoint.y, Math.min(endControlPoint.y + endRaise, (endX - endControlPoint.x) * maxSlope)),
        };
    }

    /**
     * Moves the start control point towards the start and the end one towards the end, as far as the curve needs to clear the
     * misses before and after its top, but to no steeper tangents than SlurTangentMaxAngle - 10, leaving room to raise them.
     * The curve's height at t only depends on the control points' heights, so the curve then reaches the height it needs sooner
     * after the start (or later before the end), without its top getting higher. Coordinates as in clearObstacles().
     */
    private steepenTangents(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                            misses: {t: number, height: number, obstacle: PointF2D}[]): void {
        const b1: (t: number) => number = t => 3 * (1 - t) * (1 - t) * t; // the control points' weights in the curve
        const b2: (t: number) => number = t => 3 * (1 - t) * t * t;
        const heightAt: (t: number) => number = t => b1(t) * startControlPoint.y + b2(t) * endControlPoint.y;
        const top: {t: number, height: number} = this.getCurveTop(startControlPoint.y, endControlPoint.y);
        let startControlX: number = startControlPoint.x;
        let endControlX: number = endControlPoint.x;
        for (const miss of misses) {
            const height: number = miss.obstacle.y + this.rules.SlurNoteHeadYOffset;
            if (height >= top.height) {
                continue; // only raising the curve clears it
            }
            // where the curve reaches that height on the obstacle's side of the top: the curve rises from t = from to t = to
            let from: number = miss.t <= top.t ? 0 : 1;
            let to: number = top.t;
            for (let i: number = 0; i < 30; i++) {
                const mid: number = (from + to) / 2;
                if (heightAt(mid) < height) {
                    from = mid;
                } else {
                    to = mid;
                }
            }
            const t: number = to;
            // there, the curve's x must not be past the obstacle's (before the top) or before it (after the top)
            if (miss.t <= top.t) {
                startControlX = Math.min(startControlX, (miss.obstacle.x - b2(t) * endControlPoint.x - t * t * t * endX) / b1(t));
            } else {
                endControlX = Math.max(endControlX, (miss.obstacle.x - b1(t) * startControlPoint.x - t * t * t * endX) / b2(t));
            }
        }
        const steepestSlope: number = Math.tan((this.rules.SlurTangentMaxAngle - 10) * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.x = Math.min(startControlPoint.x, Math.max(startControlX, startControlPoint.y / steepestSlope, 0));
        endControlPoint.x = Math.max(endControlPoint.x, Math.min(endControlX, endX - endControlPoint.y / steepestSlope, endX));
    }

    /** The highest point of the curve (its t and its height), with the control points at the heights startY and endY
     *  (coordinates as in clearObstacles()). */
    private getCurveTop(startY: number, endY: number): {t: number, height: number} {
        const top: {t: number, height: number} = {t: 0.5, height: 0};
        for (let i: number = 1; i < 100; i++) {
            const t: number = i / 100;
            const height: number = 3 * (1 - t) * (1 - t) * t * startY + 3 * (1 - t) * t * t * endY;
            if (height > top.height) {
                top.t = t;
                top.height = height;
            }
        }
        return top;
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case above).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateTopPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.SkyLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.SkyLine.length);

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.SkyLine.length) {
            endIndex = staffLine.SkyLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const skylineValue: number = staffLine.SkyLine[i];
            // ignore default value (= 0) which is upper border of staffline
            if (skylineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, skylineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case below).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];

        // get BottomLine indices
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.BottomLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.BottomLine.length);
        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const bottomLineValue: number = staffLine.BottomLine[i];

            // ignore default value (= 4) which is lower border of staffline
            if (bottomLineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, bottomLineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the maximum slope between StartPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxLeftSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = -Number.MAX_VALUE;
        const x: number = start.x;
        const y: number = start.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (points[i].y - y) / (points[i].x - x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the start point (0/0)
                slope = Math.max(slope, pointSlope);
            }
        }

        // in case all Points don't have a meaningful value or the slope between Start- and EndPoint is just bigger
        const startEndSlope: number = Math.abs(end.y - y) / (end.x - x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.max(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.min(slope, 5.6713);

        return slope;
    }

    /**
     * This method calculates the maximum slope between EndPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxRightSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = Number.MAX_VALUE;
        const x: number = end.x;
        const y: number = end.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (y - points[i].y) / (x - points[i].x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the end point (0/0)
                slope = Math.min(slope, pointSlope);
            }
        }

        // in case no Point has a meaningful value or the slope between Start- and EndPoint is just smaller
        const startEndSlope: number = (y - start.y) / (x - start.x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.min(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.max(slope, -5.6713);

        return slope;
    }

    /**
     * This method returns the maximum (meaningful) points.Y.
     * @param points
     */
    private getPointListMaxY(points: PointF2D[]): number {
        let max: number = -Number.MAX_VALUE;

        for (let idx: number = 0, len: number = points.length; idx < len; ++idx) {
            const point: PointF2D = points[idx];
            if (Math.abs(point.y - (-Number.MAX_VALUE)) < 0.0001 || Math.abs(point.y - Number.MAX_VALUE) < 0.0001) {
                continue;
            }
            max = Math.max(max, point.y);
        }

        return max;
    }

    /**
     * This method calculates the translated and rotated PointsList (case above).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListAbove(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }

            let point: PointF2D = new PointF2D(points[i].x - startX, -(points[i].y - startY));
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the translated and rotated PointsList (case below).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListBelow(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            let point: PointF2D = new PointF2D(points[i].x - startX, points[i].y - startY);
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
     * and the X-distance from StartPoint to EndPoint.
     * @param endX
     * @param points
     */
    private calculateHeightWidthRatio(endX: number, points: PointF2D[]): number {
        if (points.length === 0) {
            return 0;
        }

        // in case of negative points
        const max: number = Math.max(0, this.getPointListMaxY(points));

        return max / endX;
    }

    /**
     * This method calculates the 2 ControlPoints of the SlurCurve.
     * @param endX
     * @param startAngle
     * @param endAngle
     * @param points
     */
    private calculateControlPoints(endX: number, startAngle: number, endAngle: number,
                                   points: PointF2D[], heightWidthRatio: number,
                                   startY: number, endY: number
    ): { startControlPoint: PointF2D, endControlPoint: PointF2D } {
        let heightFactor: number = this.rules.SlurHeightFactor;
        let widthFlattenFactor: number = 1;
        const cutoffAngle: number = this.rules.SlurHeightFlattenLongSlursCutoffAngle;
        const cutoffWidth: number = this.rules.SlurHeightFlattenLongSlursCutoffWidth;
        // console.log("width: " + endX);
        if (startAngle > cutoffAngle && endX > cutoffWidth) { // steep and wide slurs
            // console.log("steep angle: " + startAngle);
            widthFlattenFactor += endX / 70 * this.rules.SlurHeightFlattenLongSlursFactorByWidth; // double flattening for width = 70, factorByWidth = 1
            widthFlattenFactor *= 1 + (startAngle / 30 * this.rules.SlurHeightFlattenLongSlursFactorByAngle); // flatten more for higher angles.
            // TODO use sin or cos instead of startAngle directly
            heightFactor /= widthFlattenFactor; // flatten long slurs more
        }
        // TODO also offer a widthFlattenFactor for smaller slurs?

        // debug:
        // const measureNumber: number = this.staffEntries[0].parentMeasure.MeasureNumber; // debug
        // if (measureNumber === 10) {
        //     console.log("endX: " + endX);
        //     console.log("widthFlattenFactor: " + widthFlattenFactor);
        //     console.log("heightFactor: " + heightFactor);
        //     console.log("startAngle: " + startAngle);
        //     console.log("heightWidthRatio: " + heightWidthRatio);
        // }

        // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
        // and the X-distance from StartPoint to EndPoint
        // use this HeightWidthRatio to get a "normalized" Factor (based on tested parameters)
        // this Factor denotes the Length of the TangentLine of the Curve (a proportion of the X-distance from StartPoint to EndPoint)
        // finally from this Length and the calculated Angles we get the coordinates of the Control Points
        const factorStart: number = Math.min(0.5, Math.max(0.1, 1.7 * startAngle / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));
        const factorEnd: number = Math.min(0.5, Math.max(0.1, 1.7 * (-endAngle) / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));

        const startControlPoint: PointF2D = new PointF2D();
        startControlPoint.x = endX * factorStart * Math.cos(startAngle * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.y = endX * factorStart * Math.sin(startAngle * GraphicalSlur.degreesToRadiansFactor);

        const endControlPoint: PointF2D = new PointF2D();
        endControlPoint.x = endX - (endX * factorEnd * Math.cos(endAngle * GraphicalSlur.degreesToRadiansFactor));
        endControlPoint.y = -(endX * factorEnd * Math.sin(endAngle * GraphicalSlur.degreesToRadiansFactor));
        // Flatten long/steep slurs so they don't arc far higher than the notes/objects they actually span
        // (issue #1466). The cubic bezier's apex (its highest point above the start-end line) is determined by the
        // control point heights; cap it to a small margin above the highest spanned object, keeping the start/end
        // angles (so the slur still leaves the notes at the same steep angle, but flattens quickly after).
        if (this.rules.SlurFlattenToObstacle) {
            const requiredHeight: number = Math.max(0, this.getPointListMaxY(points)); // highest object above the start-end line
            // graceful minimum arc so slurs over flat passages aren't flattened into near-straight lines.
            // Grows with sqrt(width) (not linearly) so that WIDE slurs stay proportionally flat instead of
            // ballooning: a linear floor let e.g. a system-spanning slur over flat notes arc ~8 units high.
            const minArc: number = Math.min(this.rules.SlurFlattenMaxMinArcHeight, this.rules.SlurFlattenMinArcWidthFactor * Math.sqrt(endX));
            const targetApex: number = Math.max(requiredHeight + this.rules.SlurFlattenToObstacleMargin, minArc);
            let apex: number = 0;
            // the bezier's y at parameter t only depends on the control points' y (start/end points are on the x-axis here)
            for (let t: number = 0.1; t <= 0.9; t += 0.1) {
                const mt: number = 1 - t;
                apex = Math.max(apex, 3 * mt * mt * t * startControlPoint.y + 3 * mt * t * t * endControlPoint.y);
            }
            if (apex > targetApex && apex > 0.0001) {
                const scale: number = targetApex / apex; // apex scales linearly with the control point heights
                startControlPoint.x *= scale;
                startControlPoint.y *= scale;
                endControlPoint.x = endX - (endX - endControlPoint.x) * scale;
                endControlPoint.y *= scale;
            }
        }
        //Soften the slur in a "brute-force" way
        let controlPointYDiff: number = startControlPoint.y - endControlPoint.y;
        while (this.rules.SlurMaximumYControlPointDistance &&
               Math.abs(controlPointYDiff) > this.rules.SlurMaximumYControlPointDistance) {
            if (controlPointYDiff < 0) {
                startControlPoint.y += 1;
                endControlPoint.y -= 1;
            } else {
                startControlPoint.y -= 1;
                endControlPoint.y += 1;
            }
            controlPointYDiff = startControlPoint.y - endControlPoint.y;
        }
        return {startControlPoint: startControlPoint, endControlPoint: endControlPoint};
    }

    /**
     * This method calculates the angles for the Curve's Tangent Lines.
     * @param leftAngle
     * @param rightAngle
     * @param startLineSlope
     * @param endLineSlope
     * @param maxAngle
     */
    private calculateAngles(minAngle: number, startLineSlope: number, endLineSlope: number, maxAngle: number):
    {startAngle: number, endAngle: number} {
        // calculate Angles from the calculated Slopes, adding also a given angle
        const angle: number = 20;

        let calculatedStartAngle: number = Math.atan(startLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (startLineSlope > 0) {
            calculatedStartAngle += angle;
        } else {
            calculatedStartAngle -= angle;
        }

        let calculatedEndAngle: number = Math.atan(endLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (endLineSlope < 0) {
            calculatedEndAngle -= angle;
        } else {
            calculatedEndAngle += angle;
        }

        // +/- 80 is the max/min allowed Angle
        const leftAngle: number = Math.min(Math.max(minAngle, calculatedStartAngle), maxAngle);
        const rightAngle: number = Math.max(Math.min(-minAngle, calculatedEndAngle), -maxAngle);
        return {"startAngle": leftAngle, "endAngle": rightAngle};
    }

    private static degreesToRadiansFactor: number = Math.PI / 180;
}
