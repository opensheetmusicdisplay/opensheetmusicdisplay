
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { VexFlowGraphicalNote } from "./VexFlow";
import * as VF from "vexflow";
import { unitInPixels } from "./VexFlow/VexFlowMusicSheetDrawer";
import { GraphicalMeasure } from "./GraphicalMeasure";

export class GraphicalSlur extends GraphicalCurve {
    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;
    /** SVGElement set by VexFlowMusicSheetDrawer at draw time. */
    public SVGElement?: Node;
    /** Debug obstacle points (for visual regression skyline overlay). */
    public debugSkyPoints: PointF2D[] = [];
    /** Labels for each debug obstacle point. */
    public debugSkyCategories: string[] = [];

    constructor(slur: Slur, rules?: EngravingRules) {
        super();
        this.slur = slur;
    }

    public static Compare (x: GraphicalSlur, y: GraphicalSlur ): number {
        if (x.staffEntries.length < 1) {
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

    public calculateCurve(rules: EngravingRules): void {

        // single GraphicalSlur means a single Curve, eg each GraphicalSlurObject is meant to be on the same StaffLine
        // a Slur can span more than one GraphicalSlurObjects
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // where the Slur (not the graphicalObject) starts and ends (could belong to another StaffLine)
        let slurStartNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
        if (slurStartNote === undefined && this.graceStart) {
            slurStartNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
        }
        if (slurStartNote === undefined) {
            slurStartNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
        }
        let slurEndNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
        if (slurEndNote === undefined && this.graceEnd) {
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
        let start: PointF2D, end: PointF2D;
        let points: PointF2D[];

        if (this.placement === PlacementEnum.Above) {
            startY -= rules.SlurNoteHeadYOffset;
            endY -= rules.SlurNoteHeadYOffset;
            start = new PointF2D(startX, startY);
            end = new PointF2D(endX, endY);
            const startUpperRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote !== undefined) {
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
            if (slurEndNote !== undefined) {
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
            const skylineStart: PointF2D = new PointF2D(startX, startY);
            const skylineEnd: PointF2D = new PointF2D(endX, endY);
            points = this.calculateTopPoints(skylineStart, skylineEnd, staffLine, skyBottomLineCalculator);

            // For cross-staff slurs, merge the end staff's skyline so obstacles
            // on other staves (accidentals, stems) are included in clearance.
            if (this.slur && this.slur.isCrossed()) {
                const musicSystem: any = staffLine.ParentMusicSystem;
                if (musicSystem) {
                    const startRelY: number = staffLine.PositionAndShape.RelativePosition.y;
                    const sampUnit: number = skyBottomLineCalculator.SamplingUnit;
                    for (const otherSl of musicSystem.StaffLines) {
                        if (otherSl === staffLine) { continue; }
                        const otherSky: number[] = otherSl.SkyLine;
                        if (!otherSky || otherSky.length === 0) { continue; }
                        const yOffset: number = otherSl.PositionAndShape.RelativePosition.y - startRelY;
                        const otherSampUnit: number = otherSl.SkyBottomLineCalculator
                            ? otherSl.SkyBottomLineCalculator.SamplingUnit : sampUnit;
                        const sIdx: number = Math.max(0, Math.floor(startX * otherSampUnit));
                        const eIdx: number = Math.min(otherSky.length, Math.ceil(endX * otherSampUnit));
                        for (let si: number = sIdx; si < eIdx; si++) {
                            points.push(new PointF2D(si / otherSampUnit, otherSky[si] + yOffset));
                        }
                    }
                }
            }

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endX - startX) / 2 + startX,
                                                      (endY - startY) / 2 + startY);
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
            const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const leftLineD: number = start2.y - start2.x * leftLineSlope;
            const rightLineD: number = end2.y - end2.x * rightLineSlope;

            // calculate IntersectionPoint of the 2 Lines
                // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(leftLineSlope) - Math.abs(rightLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (rightLineD - leftLineD) / (leftLineSlope - rightLineSlope);
                intersectionPoint.y = leftLineSlope * intersectionPoint.x + leftLineD;
            }

            // calculate tangent Lines Angles
                // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            const leftAngle: number = minAngle;
            const rightAngle: number = -minAngle;
            // if the calculated Slopes (left and right) are equal, then Angles have fixed values
            if (!sameSlope) {
                this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
            }
            // calculate Curve's Control Points
            const controlPoints: {leftControlPoint: PointF2D, rightControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, leftAngle, rightAngle, transformedPoints);

            let leftControlPoint: PointF2D = controlPoints.leftControlPoint;
            let rightControlPoint: PointF2D = controlPoints.rightControlPoint;

            // transform ControlPoints to original Coordinate System
                // (rotate back and translate back)
            leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
            leftControlPoint.x += startX;
            leftControlPoint.y = -leftControlPoint.y + startY;
            rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
            rightControlPoint.x += startX;
            rightControlPoint.y = -rightControlPoint.y + startY;

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y = -this.intersection.y + startY;
            /* for DEBUG only */

            // Clamp control points: descending chords push left CP behind startX
            // via sinθ term in inverse rotation (cp_y > 0, sinθ < 0 → x shift < 0).
            if (leftControlPoint.x < start.x) {
                leftControlPoint.x = start.x;
            }
            if (rightControlPoint.x > end.x) {
                rightControlPoint.x = end.x;
            }

            // set private members
            this.bezierStartPt = start;
            this.bezierStartControlPt = leftControlPoint;
            this.bezierEndControlPt = rightControlPoint;
            this.bezierEndPt = end;

            // calculate CurvePoints
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
            start = new PointF2D(startX, startY);
            end = new PointF2D(endX, endY);

            // firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            const startLowerRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote !== undefined) {
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
            if (slurEndNote !== undefined) {
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
            const bottomStart: PointF2D = new PointF2D(startX, startY);
            const bottomEnd: PointF2D = new PointF2D(endX, endY);
            points = this.calculateBottomPoints(bottomStart, bottomEnd, staffLine, skyBottomLineCalculator);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endX - startX) / 2 + startX,
                                                      (endY - startY) / 2 + startY);
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
            const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const leftLineD: number = start2.y - start2.x * leftLineSlope;
            const rightLineD: number = end2.y - end2.x * rightLineSlope;

            // calculate IntersectionPoint of the 2 Lines
            // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(leftLineSlope) - Math.abs(rightLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (rightLineD - leftLineD) / (leftLineSlope - rightLineSlope);
                intersectionPoint.y = leftLineSlope * intersectionPoint.x + leftLineD;
            }

            // calculate tangent Lines Angles
            // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            const leftAngle: number = minAngle;
            const rightAngle: number = -minAngle;
            // if the calculated Slopes (left and right) are equal, then Angles have fixed values
            if (!sameSlope) {
                this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
            }

            // calculate Curve's Control Points
            const controlPoints: {leftControlPoint: PointF2D, rightControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, leftAngle, rightAngle, transformedPoints);
            let leftControlPoint: PointF2D = controlPoints.leftControlPoint;
            let rightControlPoint: PointF2D = controlPoints.rightControlPoint;

            // transform ControlPoints to original Coordinate System
            // (rotate back and translate back)
            leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
            leftControlPoint.x += startX;
            leftControlPoint.y += startY;
            rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
            rightControlPoint.x += startX;
            rightControlPoint.y += startY;

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y += startY;
            /* for DEBUG only */

            // Prevent backward control points (same as Above branch).
            if (leftControlPoint.x < start.x) {
                leftControlPoint.x = start.x;
            }
            if (rightControlPoint.x > end.x) {
                rightControlPoint.x = end.x;
            }

            // set private members
            this.bezierStartPt = start;
            this.bezierStartControlPt = leftControlPoint;
            this.bezierEndControlPt = rightControlPoint;
            this.bezierEndPt = end;

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

                // update left- and rightIndex for better accuracy
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

        if (slurStartNote !== undefined) {
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

            // if (first.NoteStem !== undefined && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     startX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     startY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, startX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurStartNote[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem !== undefined && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         startX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         startY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, startX);
            //     } else {
            //     }
            // }
        } else {
            startX = staffLine.Measures[0].beginInstructionsWidth;
        }

        if (slurEndNote !== undefined) {
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
        } else if (this.slur && this.slur.isCrossed()) {
            // Cross-staff: end note on different staff — use VF5 stave position.
            const endGN: GraphicalNote = rules.GNote(this.slur.EndNote);
            const vfNt: VF.StaveNote = (endGN as VexFlowGraphicalNote)?.vfnote?.[0] as VF.StaveNote;
            const vfSt: VF.Stave | undefined = vfNt?.getStave?.();
            if (vfNt && vfSt) {
                const endMeasure: GraphicalMeasure = endGN?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
                const endMeasRelX: number = endMeasure?.PositionAndShape?.RelativePosition?.x ?? 0;
                const staveOriginPx: number = vfSt.getX() - endMeasRelX * unitInPixels;
                const noteCenterPx: number = vfNt.getAbsoluteX() + vfNt.getGlyphWidth() / 2;
                endX = (noteCenterPx - staveOriginPx) / unitInPixels;
                const kps: any[] = vfNt.getKeyProps?.() ?? [];
                const topLine: number = kps.length > 0 ? Math.max(...kps.map((kp: any) => kp.line)) : 2;
                endY = 5 - topLine;
                // SlurNoteHeadYOffset applied in calculateCurve — not here.

                // Account for Y offset between start and end staves (cross-staff).
                // Use OSMD model abs Y (VF5 stave Y not yet set at draw time).
                const endStaffLine: StaffLine = endGN?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
                if (endStaffLine && endStaffLine !== staffLine) {
                    const yOffset: number = endStaffLine.PositionAndShape.AbsolutePosition.y
                        - staffLine.PositionAndShape.AbsolutePosition.y;
                    endY += yOffset;
                }
            } else {
                endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
            }
        } else {
            endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
        }

        // if GraphicalSlur breaks over System, then the end/start of the curve is at the corresponding height with the known start/end
        if (slurStartNote === undefined && slurEndNote === undefined) {
            startY = 0;
            endY = 0;
        }
        if (slurStartNote === undefined) {
            startY = endY;
        }
        if (slurEndNote === undefined && !(this.slur?.isCrossed())) {
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

        return {startX, startY, endX, endY};
    }

    /**
     * This method calculates the placement of the Curve.
     * @param skyBottomLineCalculator
     * @param staffLine
     */
    private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
        // old version: when lyrics are given place above:
        // if ( !this.slur.StartNote.ParentVoiceEntry.LyricsEntries.isEmpty || (this.slur.EndNote !== undefined
        //                                     && !this.slur.EndNote.ParentVoiceEntry.LyricsEntries.isEmpty) ) {
        //     this.placement = PlacementEnum.Above;
        //     return;

        // The default placement for slurs is above.
        if (this.placement !== PlacementEnum.Below) {
            this.placement = PlacementEnum.Above;
        }
    }

    /**
     * Calculate Slur Top SkyLine Points between two Points.
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateTopPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        const length: number = staffLine.SkyLine.length;
        const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(start.x, length);
        const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, length);
        if (startIndex < endIndex) {
            for (let i: number = startIndex; i < endIndex; i++) {
                const pointX: number = i / skyBottomLineCalculator.SamplingUnit;
                const skyValue: number = staffLine.SkyLine[i];
                points.push(new PointF2D(pointX, skyValue));
            }
        }
        return points;
    }

    /**
     * Calculate Slur Bottom BottomLine Points between two Points.
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        const length: number = staffLine.BottomLine.length;
        const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(start.x, length);
        const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, length);
        if (startIndex < endIndex) {
            for (let i: number = startIndex; i < endIndex; i++) {
                const pointX: number = i / skyBottomLineCalculator.SamplingUnit;
                const bottomValue: number = staffLine.BottomLine[i];
                points.push(new PointF2D(pointX, bottomValue));
            }
        }
        return points;
    }

    /**
     * This method calculates the maximum Slope of the Line from Startpoint to a Point P (here to all Points in the skyLine).
     * It is used to calculate the startAngle of the Curve.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxLeftSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        // slope of Line from Start- to endpoint max + constraint that the Curve must be under the StartSkyLine- and under the EndSkyLinePoint
        let maxLeftSlope: number = (end.y - start.y) / (end.x - start.x);
        for (const point2 of points) {
            const slope: number = (point2.y - start.y) / (point2.x - start.x);
            if (slope > maxLeftSlope) {
                maxLeftSlope = slope;
            }
        }
        return maxLeftSlope;
    }

    /**
     * This method calculates the maximum Slope of the Line from Endpoint to a Point P (here to all Points in the skyLine).
     * It is used to calculate the endAngle of the Curve.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxRightSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        // slope of Line from End- to Startpoint max + constraint that the Curve must be under the StartSkyLine- and under the EndSkyLinePoint
        let maxRightSlope: number = (start.y - end.y) / (start.x - end.x); // = (end.y - start.y) / (end.x - start.x)
        for (const point2 of points) {
            const slope: number = (point2.y - end.y) / (point2.x - end.x);
            if (slope > maxRightSlope) {
                maxRightSlope = slope;
            }
        }
        return maxRightSlope;
    }

    /**
     * This method calculates and returns a list of translated and rotated Points.
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListAbove(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (const point of points) {
            const transformedPoint: PointF2D = rotationMatrix.vectorMultiplication(new PointF2D(point.x - startX, -(point.y - startY)));
            transformedPoints.push(transformedPoint);
        }
        return transformedPoints;
    }

    /**
     * This method calculates and returns a list of translated and rotated Points.
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListBelow(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (const point of points) {
            const transformedPoint: PointF2D = rotationMatrix.vectorMultiplication(new PointF2D(point.x - startX, point.y - startY));
            transformedPoints.push(transformedPoint);
        }
        return transformedPoints;
    }

    /**
     * This method calculates the two Control Points for the Slur Curve.
     * @param endX
     * @param leftAngle
     * @param rightAngle
     * @param points
     */
    private calculateControlPoints(endX: number,
                                            leftAngle: number,
                                            rightAngle: number,
                                            points: PointF2D[]): {leftControlPoint: PointF2D, rightControlPoint: PointF2D} {

        // Some test values:
        // let k: number = 0.4; // (k > 0) -> lower values = flatter curve near endpoints; higher values... "fatter" curve near endpoints
        const k: number = GraphicalSlur.k;
        // let d: number = 0.4; // (d > 0) -> greater values = more influence of slopes (Wider Curve)
        const d: number = GraphicalSlur.d;

        const leftCp: PointF2D = new PointF2D(0, 0);
        const rightCp: PointF2D = new PointF2D(endX, 0);

        const cp_x: number = k * endX;

        // only to avoid NaN (divided by 0)
        if (leftAngle === 0) {
            leftCp.y = 0;
        } else {
            const cp_y: number = cp_x * Math.tan(leftAngle * GraphicalSlur.degreesToRadiansFactor) * d;
            leftCp.y = cp_y;
        }
        if (rightAngle === 0) {
            rightCp.y = 0;
        } else {
            const cp_y: number = cp_x * Math.tan(-rightAngle * GraphicalSlur.degreesToRadiansFactor) * d;
            rightCp.y = cp_y;
        }

        // For above slurs, the control point Y values are the highest points of the skyline
        // plus clearance to ensure the bezier curve clears obstacles (skyline = obstacle top edge).
        // Only apply when there IS a skyline obstacle above the default curve (maxY > cp_y).
        // Cap relative to angle-based cp_y to prevent ballooning on long flat chords.
        // For each skyline point at X ratio r (0..1 of chord), compute the cubic bezier
        // parameter t where B_x(t) = r*endX, then the Y factor f = 3t(1-t). The bezier
        // Y at that t is f * (cp_left*(1-t) + cp_right*t). For symmetric CPs this peaks
        // at t=0.5 with f=0.75; near edges f is smaller so cp_y must be higher.
        const skylineClearance: number = 1.5; // OSMD units (~15px VF5)
        let overrideFired: boolean = false;
        if (this.placement === PlacementEnum.Above) {
            if (points.length > 0) {
                const angleCpY: number = leftCp.y;
                // Compute required cp_y for each skyline point based on its X position.
                // Cubic bezier X: r = B_x(t) = 3t² - 2t³ for t ∈ [0,1].
                // Inverse: solve 2t³ - 3t² + r = 0 via triple-angle substitution.
                // For r ≤ 0.5: t = 0.5 - sin(asin(1-2r)/3)
                // For r > 0.5: t = 0.5 + sin(asin(2r-1)/3)
                // Y factor f = 3t(1-t), required cp_y = pt.y / f.
                let maxRequiredLeft: number = 0;
                let maxRequiredRight: number = 0;
                for (const pt of points) {
                    const r: number = Math.max(0.001, Math.min(0.999, pt.x / endX));
                    const asinArg: number = r <= 0.5 ? 1 - 2 * r : 2 * r - 1;
                    const t: number = r <= 0.5
                        ? 0.5 - Math.sin(Math.asin(asinArg) / 3)
                        : 0.5 + Math.sin(Math.asin(asinArg) / 3);
                    const f: number = 3 * t * (1 - t);
                    const requiredCpY: number = pt.y / Math.max(f, 0.01);
                    if (pt.x <= endX * 0.5) {
                        maxRequiredLeft = Math.max(maxRequiredLeft, requiredCpY);
                    } else {
                        maxRequiredRight = Math.max(maxRequiredRight, requiredCpY);
                    }
                }
                if (maxRequiredLeft === 0) { maxRequiredLeft = maxRequiredRight; }
                if (maxRequiredRight === 0) { maxRequiredRight = maxRequiredLeft; }
                const globalRequired: number = Math.max(maxRequiredLeft, maxRequiredRight);
                const ratio: number = globalRequired / Math.max(angleCpY, 0.001);
                const capMultiplier: number =
                    ratio > 5 ? 2.5 :
                    ratio > 3 ? 3 :
                    angleCpY > 3 ? 1.6 : 4;
                const maxCpY: number = angleCpY * capMultiplier;
                const effectiveClearance: number = globalRequired > 5 ? 0.3 : skylineClearance;
                if (maxRequiredLeft > angleCpY) {
                    overrideFired = true;
                    leftCp.y = Math.min(maxRequiredLeft + effectiveClearance, maxCpY);
                }
                if (maxRequiredRight > rightCp.y) {
                    rightCp.y = Math.min(maxRequiredRight + effectiveClearance, maxCpY);
                }
            }
            if (!overrideFired) {
                const minCpY: number = endX * (0.15 / 0.75); // 15% chord at bezier peak
                if (leftCp.y < minCpY) {
                    leftCp.y = minCpY;
                }
                if (rightCp.y < minCpY) {
                    rightCp.y = minCpY;
                }
            }
        }

        return {leftControlPoint: leftCp, rightControlPoint: rightCp};
    }

    /**
     * This method reads the current minAngle and maxAngle and calculates the actual Angles for the Curve's Control Points.
     * @param leftAngle
     * @param rightAngle
     * @param leftLineSlope
     * @param rightLineSlope
     * @param maxAngle
     */
    private calculateAngles(leftAngle: number, rightAngle: number, leftLineSlope: number, rightLineSlope: number, maxAngle: number): void {

        // original version with calculated angles:
        const calculatedLeftAngle: number = Math.atan(leftLineSlope) * 180 / Math.PI * 0.75;
        const calculatedRightAngle: number = Math.atan(rightLineSlope) * 180 / Math.PI * 0.75;

        leftAngle = Math.min(Math.max(leftAngle, calculatedLeftAngle), maxAngle);
        rightAngle = Math.max(Math.min(rightAngle, calculatedRightAngle), -maxAngle);
    }

    private static degreesToRadiansFactor: number = Math.PI / 180;
    private static k: number = 0.9;
    private static d: number = 0.2;

    // ── Stubs for VexFlowMusicSheetDrawer ──────────────────────────────────────

    /** Replaced by original calculateCurve — cross-staff slurs use same code path. */
    public calculateCurveCrossStaff(rules: EngravingRules): boolean {
        this.calculateCurve(rules);
        return true;
    }

    /** No-op: original algorithm doesn't need post-hoc beam clamping. */
    public clampToVoiceSkyline(_rules: EngravingRules): void { /* no-op */ }

    /** No-op: original algorithm doesn't need visual cross-staff adjustment. */
    public adjustForVisualCrossStaff(_rules: EngravingRules): void { /* no-op */ }
}
