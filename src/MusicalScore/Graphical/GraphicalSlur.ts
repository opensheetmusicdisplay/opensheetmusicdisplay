
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { VexFlowStaffEntry } from "./VexFlow/VexFlowStaffEntry";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";

export class Graphicalslur extends GraphicalCurve {
    private intersection: PointF2D;
    constructor(slur: Slur) {
        super();
        this.slur = slur;
    }
    public slur: Slur;
    public staffEntries: VexFlowStaffEntry[];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;
    public calculateSingleGraphicalslur(rules: EngravingRules): void {
        const startStaffEntry: VexFlowStaffEntry = this.staffEntries[0];
        const endStaffEntry: VexFlowStaffEntry = this.staffEntries[this.staffEntries.length - 1];
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
        const startX: number = 0;
        const endX: number = 0;
        let startY: number = 0;
        let endY: number = 0;
        const minAngle: number = rules.SlurTangentMinAngle;
        const maxAngle: number = rules.SlurTangentMaxAngle;
        let start: PointF2D, end: PointF2D;
        let points: PointF2D[];
        this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, startX, startY, endX, endY, rules, skyBottomLineCalculator);
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
                    startUpperRight.x = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }
            if (this.graceStart) {
                startUpperRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            const endUpperLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote !== undefined) {
                    endUpperLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else {
                    endUpperLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }
            if (this.graceEnd) {
                endUpperLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }
            points = this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);
            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endUpperLeft.x - startUpperRight.x) / 2 + startUpperRight.x,
                                                      (endUpperLeft.y - startUpperRight.y) / 2 + startUpperRight.y);
                points.push(pointF);
            }
            const startEndLineAngleRadians: number = <number>(Math.atan((endY - startY) / (endX - startX)));
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, -(endY - startY));
            let rotationMatrix: Matrix2D, transposeMatrix: Matrix2D;
            rotationMatrix = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            transposeMatrix = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);
            const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const leftLineD: number = start2.y - start2.x * leftLineSlope;
            const rightLineD: number = end2.y - end2.x * rightLineSlope;
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
            const leftAngle: number = minAngle;
            const rightAngle: number = -minAngle;
            if (!sameSlope) {
                this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
            }
            let leftControlPoint: PointF2D = new PointF2D();
            let rightControlPoint: PointF2D = new PointF2D();
            this.calculateControlPoints(leftControlPoint, rightControlPoint, end2.x, leftAngle, rightAngle, transformedPoints);
            leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
            leftControlPoint.x += startX;
            leftControlPoint.y = -leftControlPoint.y + startY;
            rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
            rightControlPoint.x += startX;
            rightControlPoint.y = -rightControlPoint.y + startY;
            this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            this.intersection.x += startX;
            this.intersection.y = -this.intersection.y + startY;
            this.bezierStartPt = start;
            this.bezierStartControlPt = leftControlPoint;
            this.bezierEndControlPt = rightControlPoint;
            this.bezierEndPt = end;
            const length: number = staffLine.SkyLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
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
            const startLowerRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote !== undefined) {
                startLowerRight.x += this.staffEntries[0].PositionAndShape.BorderRight;
            } else {
                startLowerRight.x = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }
            if (this.graceStart) {
                startLowerRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            const endLowerLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote !== undefined) {
                endLowerLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else {
                endLowerLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }
            if (this.graceEnd) {
                endLowerLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }
            points = this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);
            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endLowerLeft.x - startLowerRight.x) / 2 + startLowerRight.x,
                                                      (endLowerLeft.y - startLowerRight.y) / 2 + startLowerRight.y);
                points.push(pointF);
            }
            const startEndLineAngleRadians: number = <number>(Math.atan((endY - startY) / (endX - startX)));
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, endY - startY);
            let rotationMatrix: Matrix2D, transposeMatrix: Matrix2D;
            rotationMatrix = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            transposeMatrix = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);
            const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const leftLineD: number = start2.y - start2.x * leftLineSlope;
            const rightLineD: number = end2.y - end2.x * rightLineSlope;
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
            const leftAngle: number = minAngle;
            const rightAngle: number = -minAngle;
            if (!sameSlope) {
                this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
            }
            let leftControlPoint: PointF2D = new PointF2D();
            let rightControlPoint: PointF2D = new PointF2D();
            this.calculateControlPoints(leftControlPoint, rightControlPoint, end2.x, leftAngle, rightAngle, transformedPoints);
            leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
            leftControlPoint.x += startX;
            leftControlPoint.y += startY;
            rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
            rightControlPoint.x += startX;
            rightControlPoint.y += startY;
            this.bezierStartPt = start;
            this.bezierStartControlPt = leftControlPoint;
            this.bezierEndControlPt = rightControlPoint;
            this.bezierEndPt = end;
            this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            this.intersection.x += startX;
            this.intersection.y += startY;
            const length: number = staffLine.BottomLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
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
    private calculateStartAndEnd(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote, staffLine: StaffLine,
                                 startX: number, startY: number, endX: number, endY: number,
                                 rules: EngravingRules, skyBottomLineCalculator: SkyBottomLineCalculator): void {
        if (slurStartNote !== undefined) {
            startX = slurStartNote.PositionAndShape.RelativePosition.x + slurStartNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                                            + slurStartNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (this.graceStart) {
                startX += slurStartNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }
            //const first: GraphicalNote = slurStartNote.parentVoiceEntry.notes[0];
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
            startX = (<GraphicalMeasure>staffLine.Measures[0]).FirstInstructionStaffEntry.PositionAndShape.BorderRight;
        }

        if (slurEndNote !== undefined) {
            endX = slurEndNote.PositionAndShape.RelativePosition.x + slurEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + slurEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (this.graceEnd) {
                endX += slurEndNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
            if (this.placement === PlacementEnum.Above) {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderTop;
            } else {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
            }

            // const first: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[0];
            // if (first.NoteStem !== undefined && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     endX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     endY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, endX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem !== undefined && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         endX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         endY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, endX);
            //     } else {
            //         if (this.placement === PlacementEnum.Above) {
            //             const highestNote: GraphicalNote = last;
            //             endY = highestNote.PositionAndShape.RelativePosition.y;
            //             if (highestNote.NoteHead !== undefined) {
            //                 endY += highestNote.NoteHead.PositionAndShape.BorderMarginTop;
            //             } else { endY += highestNote.PositionAndShape.BorderTop; }
            //         } else {
            //             const lowestNote: GraphicalNote = first;
            //             endY = lowestNote.parentVoiceEntry
            //             lowestNote.PositionAndShape.RelativePosition.y;
            //             if (lowestNote.NoteHead !== undefined) {
            //                 endY += lowestNote.NoteHead.PositionAndShape.BorderMarginBottom;
            //             } else { endY += lowestNote.PositionAndShape.BorderBottom; }
            //         }
            //     }
            // }
        } else {
            endX = staffLine.PositionAndShape.Size.width;
        }

        if (slurStartNote === undefined && slurEndNote === undefined) {
            startY = 0;
            endY = 0;
        }
        if (slurStartNote === undefined) {
            startY = endY;
        }
        if (slurEndNote === undefined) {
            endY = startY;
        }
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
    }
    private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
        // old version: when lyrics are given place above:
        // if ( !this.slur.StartNote.ParentVoiceEntry.LyricsEntries.isEmpty || (this.slur.EndNote !== undefined
        //                                     && !this.slur.EndNote.ParentVoiceEntry.LyricsEntries.isEmpty) ) {
        //     this.placement = PlacementEnum.Above;
        //     return;
        // }

        // when lyrics are given place above:
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.LyricsEntries.length > 0) {
                this.placement = PlacementEnum.Above;
                return;
            }
        }
        const startStaffEntry: VexFlowStaffEntry = this.staffEntries[0];
        const endStaffEntry: VexFlowStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // if any StaffEntry belongs to a Measure with multiple Voices, than
        // if Slur's StartNote belongs to a LinkedVoice Below else Above
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.parentMeasure.hasMultipleVoices()) {
                if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    this.placement = PlacementEnum.Below;
                } else { this.placement = PlacementEnum.Above; }
                return;
            }
        }

        // Deactivated: single Voice, opposite to StemDirection
        // if (startStaffEntry.hasStem() && endStaffEntry.hasStem() && startStaffEntry.getStemDirection() === endStaffEntry.getStemDirection()) {
        //     this.placement = (startStaffEntry.getStemDirection() === StemDirectionType.Up) ? PlacementEnum.Below : PlacementEnum.Above;
        // } else {
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
        let minAbove: number = skyBottomLineCalculator.getSkyLineMinInRange(sX, eX);
        let maxBelow: number = skyBottomLineCalculator.getBottomLineMaxInRange(sX, eX);
        const notesMinY: number = Math.min(startStaffEntry.PositionAndShape.BorderTop,
                                           endStaffEntry.PositionAndShape.BorderTop);
        const notesMaxY: number = Math.max(startStaffEntry.PositionAndShape.BorderBottom,
                                           endStaffEntry.PositionAndShape.BorderBottom);
        minAbove = notesMinY - minAbove;
        maxBelow = maxBelow - notesMaxY;
        if (Math.abs(maxBelow) > Math.abs(minAbove)) {
            this.placement = PlacementEnum.Above;
        } else { this.placement = PlacementEnum.Below; }
        //}
    }
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
            const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, staffLine.SkyLine[i]);
            points.push(point);
        }
        return points;
    }
    private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.BottomLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.BottomLine.length);
        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length - 1;
        }
        for (let i: number = startIndex; i < endIndex; i++) {
            const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, staffLine.BottomLine[i]);
            points.push(point);
        }
        return points;
    }
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
        slope = Math.max(slope, Math.abs(end.y - y) / (end.x - x));
        return slope;
    }
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
        slope = Math.min(slope, (y - start.y) / (x - start.x));
        return slope;
    }
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
    private calculateFactor(heightWidthRatio: number): number {
        return Graphicalslur.k * heightWidthRatio + Graphicalslur.d;
    }
    private calculateHeightWidthRatio(endX: number, points: PointF2D[]): number {
        if (points.length === 0) {
            return 0;
        }
        const max: number = Math.max(0, this.getPointListMaxY(points));
        return max / endX;
    }
    private calculateControlPoints(leftControlPoint: PointF2D, rightControlPoint: PointF2D, endX: number,
                                   leftAngle: number, rightAngle: number, points: PointF2D[]): void {
        const heightWidthRatio: number = this.calculateHeightWidthRatio(endX, points);
        const factor: number = this.calculateFactor(heightWidthRatio);
        const leftLength: number = endX * factor;
        leftControlPoint.x = <number>(leftLength * Math.cos(leftAngle * Graphicalslur.degreesToRadiansFactor));
        leftControlPoint.y = <number>(leftLength * Math.sin(leftAngle * Graphicalslur.degreesToRadiansFactor));
        const rightLength: number = endX * factor;
        rightControlPoint.x = endX - <number>(rightLength * Math.cos(rightAngle * Graphicalslur.degreesToRadiansFactor));
        rightControlPoint.y = -<number>(rightLength * Math.sin(rightAngle * Graphicalslur.degreesToRadiansFactor));
    }
    private calculateAngles(leftAngle: number, rightAngle: number, leftLineSlope: number, rightLineSlope: number, maxAngle: number): void {
        const angle: number = 20;
        let calculatedLeftAngle: number = <number>(Math.atan(leftLineSlope) / Graphicalslur.degreesToRadiansFactor);
        if (leftLineSlope > 0) {
            calculatedLeftAngle += angle;
        } else { calculatedLeftAngle -= angle; }
        let calculatedRightAngle: number = <number>(Math.atan(rightLineSlope) / Graphicalslur.degreesToRadiansFactor);
        if (rightLineSlope < 0) {
            calculatedRightAngle -= angle;
        } else { calculatedRightAngle += angle; }
        leftAngle = Math.min(Math.max(leftAngle, calculatedLeftAngle), maxAngle);
        rightAngle = Math.max(Math.min(rightAngle, calculatedRightAngle), -maxAngle);
    }
    private static degreesToRadiansFactor: number = <number>(Math.PI / 180);
    private static k: number = 0.9;
    private static d: number = 0.2;
}
