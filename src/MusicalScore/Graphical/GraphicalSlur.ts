
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { StemDirectionType } from "../VoiceData/VoiceEntry";

export class GraphicalSlur extends GraphicalCurve {
    // private intersection: PointF2D;

    constructor(slur: Slur) {
        super();
        this.slur = slur;
    }

    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;

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

        const startX: number = startEndPoints.startX;
        const endX: number = startEndPoints.endX;
        let startY: number = startEndPoints.startY;
        let endY: number = startEndPoints.endY;
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
            } else {
                    // Slur continues to next StaffLine - must reach the end of current StaffLine
                    endUpperLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endUpperLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // SkyLinePointsList between firstStaffEntry startUpperRightPoint and lastStaffentry endUpperLeftPoint
            points = this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);

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
            let rotationMatrix: Matrix2D, transposeMatrix: Matrix2D;
            rotationMatrix = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            transposeMatrix = rotationMatrix.getTransposeMatrix();
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
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio);

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
            } else {
                // Slur continues to next StaffLine - must reach the end of current StaffLine
                endLowerLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endLowerLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // BottomLinePointsList between firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            points = this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);

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
            let rotationMatrix: Matrix2D, transposeMatrix: Matrix2D;
            rotationMatrix = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            transposeMatrix = rotationMatrix.getTransposeMatrix();
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
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio);
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
            } else {
                startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderBottom;
            }

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
            startX = staffLine.Measures[0].beginInstructionsWidth;
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
            } else {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
            }

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
        } else {
            endX = staffLine.PositionAndShape.Size.width;
        }

        // if GraphicalSlur breaks over System, then the end/start of the curve is at the corresponding height with the known start/end
        if (!slurStartNote && !slurEndNote) {
            startY = 0;
            endY = 0;
        }
        if (!slurStartNote) {
            startY = endY;
        }
        if (!slurEndNote) {
            endY = startY;
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

        // if any StaffEntry belongs to a Measure with multiple Voices, than
        // if Slur's Start- or End-Note belongs to a LinkedVoice Below else Above
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.parentMeasure.hasMultipleVoices()) {
                if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice ||
                    this.slur.EndNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
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
            slope = Math.max(slope, (points[i].y - y) / (points[i].x - x));
        }

        // in case all Points don't have a meaningful value or the slope between Start- and EndPoint is just bigger
        slope = Math.max(slope, Math.abs(end.y - y) / (end.x - x));
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
            slope = Math.min(slope, (y - points[i].y) / (x - points[i].x));
        }

        // in case no Point has a meaningful value or the slope between Start- and EndPoint is just smaller
        slope = Math.min(slope, (y - start.y) / (x - start.x));
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
                                   points: PointF2D[], heightWidthRatio: number): { startControlPoint: PointF2D, endControlPoint: PointF2D } {
        // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
        // and the X-distance from StartPoint to EndPoint
        // use this HeightWidthRatio to get a "normalized" Factor (based on tested parameters)
        // this Factor denotes the Length of the TangentLine of the Curve (a proportion of the X-distance from StartPoint to EndPoint)
        // finally from this Length and the calculated Angles we get the coordinates of the Control Points
        const factorStart: number = Math.min(0.5, Math.max(0.1, 1.7 * (startAngle / 80) * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));
        const factorEnd: number = Math.min(0.5, Math.max(0.1, 1.7 * (-endAngle / 80) * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));

        const startControlPoint: PointF2D = new PointF2D();
        startControlPoint.x = endX * factorStart * Math.cos(startAngle * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.y = endX * factorStart * Math.sin(startAngle * GraphicalSlur.degreesToRadiansFactor);

        const endControlPoint: PointF2D = new PointF2D();
        endControlPoint.x = endX - (endX * factorEnd * Math.cos(endAngle * GraphicalSlur.degreesToRadiansFactor));
        endControlPoint.y = -(endX * factorEnd * Math.sin(endAngle * GraphicalSlur.degreesToRadiansFactor));
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
