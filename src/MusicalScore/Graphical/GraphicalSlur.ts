
// import { PointF2D } from "../../Common/DataObjects/PointF2D";
// import { VexFlowStaffEntry } from "./VexFlow/VexFlowStaffEntry";
// import { GraphicalNote } from "./GraphicalNote";
// import { GraphicalCurve } from "./GraphicalCurve";
// import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/slur";
// import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
// import { EngravingRules } from "./EngravingRules";
// import { StaffLine } from "./StaffLine";
// import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
// import { GraphicalStaffEntry } from "./GraphicalStaffEntry";

// export class Graphicalslur extends GraphicalCurve {
//     private intersection: PointF2D;
//     constructor(slur: Slur) {
//         super();
//         this.slur = slur;
//     }
//     public slur: Slur;
//     public staffEntries: VexFlowStaffEntry[];
//     public placement: PlacementEnum;
//     public graceStart: boolean;
//     public graceEnd: boolean;
//     public calculateSingleGraphicalslur(rules: EngravingRules): void {
//         const startStaffEntry: VexFlowStaffEntry = this.staffEntries[0];
//         const endStaffEntry: VexFlowStaffEntry = this.staffEntries[this.staffEntries.length - 1];
//         let slurStartNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
//         if (slurStartNote === undefined && this.graceStart) {
//             slurStartNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
//         }
//         if (slurStartNote === undefined) {
//             slurStartNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
//         }
//         let slurEndNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
//         if (slurEndNote === undefined && this.graceEnd) {
//             slurEndNote = endStaffEntry.findGraphicalNoteFromGraceNote(this.slur.EndNote);
//         }
//        if (slurEndNote === undefined) {
//             slurEndNote = endStaffEntry.findEndTieGraphicalNoteFromNoteWithEndingSlur(this.slur.EndNote);
//         }
//         const staffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;
//         const skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(rules);
//         this.calculatePlacement(skyBottomLineCalculator, staffLine);
//         const startX: number = 0, endX: number = 0;
//         let startY:number = 0, endY: number = 0;
//         const minAngle: number = rules.SlurTangentMinAngle;
//         const maxAngle: number = rules.SlurTangentMaxAngle;
//         let start: PointF2D, end: PointF2D;
//         let points: PointF2D[];
//         this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, startX, startY, endX, endY, rules, skyBottomLineCalculator);
//         if (this.placement === PlacementEnum.Above) {
//             startY -= rules.SlurNoteHeadYOffset;
//             endY -= rules.SlurNoteHeadYOffset;
//             start = new PointF2D(startX, startY);
//             end = new PointF2D(endX, endY);
//             const startUpperRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
//                 + this.staffEntries[0].PositionAndShape.RelativePosition.x, startY);
//             if (slurStartNote !== undefined) {
//                     const gse: GraphicalStaffEntry = slurStartNote.parentVoiceEntry.parentStaffEntry;
//                     if (gse.hasDots() || (<GraphicalStaffEntry> gse).GraceStaffEntriesAfter.Count > 0) {
//                             startUpperRight.x += 0.5;
//                     } else  {
//                             startUpperRight.x += this.staffEntries[0].PositionAndShape.BorderMarginRight;
//                     }
//             } else  {
//                     startUpperRight.x = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
//             }
//             if (this.graceStart) {
//                 startUpperRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
//             }
//             const endUpperLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1]).ParentMeasure.PositionAndShape.RelativePosition.x
//                 + this.staffEntries[this.staffEntries.length - 1]).PositionAndShape.RelativePosition.x,
//                                                         endY);
//             if (slurEndNote !== undefined) {
//                     if ((<VexFlowStaffEntry>slurEndNote.parentVoiceEntry.parentStaffEntry).hasAccidental() ||
//                         slurEndNote.parentVoiceEntry.parentStaffEntry.GraceStaffEntriesBefore.length > 0) {
//                         endUpperLeft.x -= 0.5;
//                     } else {
//                         endUpperLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderMarginLeft;
//                     }
//             } else {
//                     endUpperLeft.x = this.staffEntries[this.staffEntries.length - 1]).ParentMeasure.PositionAndShape.RelativePosition.x
//                     + this.staffEntries[this.staffEntries.length - 1]).ParentMeasure.PositionAndShape.Size.Width;
//             }
//             if (this.graceEnd) {
//                 endUpperLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
//             }
//             points = this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);
//             if (points.length === 0) {
//                 const pointF: PointF2D = new PointF2D((endUpperLeft.x - startUpperRight.x) / 2 + startUpperRight.x,
//                                                       (endUpperLeft.y - startUpperRight.y) / 2 + startUpperRight.y);
//                 points.push(pointF);
//             }
//             const startEndLineAngleRadians: number = <number>(Math.atan((endY - startY) / (endX - startX)));
//             const startEndLineAngleDegrees: number = startEndLineAngleRadians / Graphicalslur.degreesToRadiansFactor;
//             const start2: PointF2D = new PointF2D(0, 0);
//             let end2: PointF2D = new PointF2D(endX - startX, -(endY - startY));
//             let rotationMatrix: Matrix_2D, transposeMatrix;
//             rotationMatrix = Matrix_2D.getRotationMatrix(startEndLineAngleRadians);
//             transposeMatrix = rotationMatrix.getTransposeMatrix();
//             end2 = rotationMatrix.vectorMultiplication(end2);
//             const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);
//             const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
//             const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
//             const leftLineD: number = start2.y - start2.x * leftLineSlope;
//             const rightLineD: number = end2.y - end2.x * rightLineSlope;
//             const intersectionPoint: PointF2D = new PointF2D();
//             let sameSlope: boolean = false;
//             if (Math.abs(Math.abs(leftLineSlope) - Math.abs(rightLineSlope)) < 0.0001) {
//                 intersectionPoint.x = end2.x / 2;
//                 intersectionPoint.y = 0;
//                 sameSlope = true;
//             } else {
//                 intersectionPoint.x = (rightLineD - leftLineD) / (leftLineSlope - rightLineSlope);
//                 intersectionPoint.y = leftLineSlope * intersectionPoint.x + leftLineD;
//             }
//             const leftAngle: number = minAngle;
//             const rightAngle: number = -minAngle;
//             if (!sameSlope) {
//                 this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
//             }
//             let leftControlPoint: PointF2D = new PointF2D();
//             let rightControlPoint: PointF2D = new PointF2D();
//             calculateControlPoints(leftControlPoint, rightControlPoint, end2.x, leftAngle, rightAngle, transformedPoints);
//             leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
//             leftControlPoint.x += startX;
//             leftControlPoint.y = -leftControlPoint.y + startY;
//             rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
//             rightControlPoint.x += startX;
//             rightControlPoint.y = -rightControlPoint.y + startY;
//             this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
//             this.intersection.x += startX;
//             this.intersection.y = -this.intersection.y + startY;
//             this.BezierStartPt = start;
//             this.BezierStartControlPt = leftControlPoint;
//             this.BezierEndControlPt = rightControlPoint;
//             this.BezierEndPt = end;
//             let length: number = staffLine.SkyLine.Length;
//             let startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.BezierStartPt.x, length);
//             let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.BezierEndPt.x, length);
//             let distance: number = this.BezierEndPt.x - this.BezierStartPt.x;
//             let samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
//             for (let i: number = startIndex; i < endIndex; i++) {
//                 let diff: number = i / samplingUnit - this.BezierStartPt.x;
//                 let curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.Abs(diff) / distance);
//                 let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
//                 if (index >= startIndex)
//                     staffLine.SkyLine[index] = Math.Min(staffLine.SkyLine[index], curvePoint.y);
//                 index++;
//                 if (index < length)
//                     staffLine.SkyLine[index] = Math.Min(staffLine.SkyLine[index], curvePoint.y);
//             }
//         }
//         else {
//             startY += rules.slurNoteHeadYOffset;
//             endY += rules.slurNoteHeadYOffset;
//             start = new PointF2D(startX, startY);
//             end = new PointF2D(endX, endY);
//             let startLowerRight: PointF2D = new PointF2D(this.StaffEntries[0].ParentMeasure.PositionAndShape.RelativePosition.x
//   + this.StaffEntries[0].PositionAndShape.RelativePosition.x, startY);
//             if (slurStartNote !== undefined) {
//                 if ((<VexFlowStaffEntry>slurStartNote.ParentStaffEntry).hasDots())
//                     startLowerRight.x += 0.5f;
//  else startLowerRight.x += this.StaffEntries[0].PositionAndShape.BorderMarginRight;
//             }
//             else {
//                 startLowerRight.x = this.StaffEntries[0].ParentMeasure.beginInstructionsWidth;
//             }
//             if (this.graceStart)
//                 startLowerRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
//             let endLowerLeft: PointF2D = new PointF2D(this.StaffEntries.Last().ParentMeasure.PositionAndShape.RelativePosition.x
//+ this.StaffEntries.Last().PositionAndShape.RelativePosition.x, endY);
//             if (slurEndNote !== undefined) {
//                 if ((<VexFlowStaffEntry>slurEndNote.ParentStaffEntry).hasAccidental() || slurEndNote.ParentStaffEntry.GraceStaffEntriesBefore.Count > 0)
//                     endLowerLeft.x -= 0.5f;
//  else endLowerLeft.x += this.StaffEntries.Last().PositionAndShape.BorderMarginLeft;
//             }
//             else {
//                 endLowerLeft.x = this.StaffEntries.Last().ParentMeasure.PositionAndShape.RelativePosition.x
//+ this.StaffEntries.Last().ParentMeasure.PositionAndShape.Size.Width;
//             }
//             if (this.graceEnd)
//                 endLowerLeft.x += endStaffEntry.StaffEntryParent.PositionAndShape.RelativePosition.x;
//             points = this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);
//             if (points.Count === 0) {
//                 let pointF: PointF2D = new PointF2D((endLowerLeft.x - startLowerRight.x) / 2 + startLowerRight.x,
//                     (endLowerLeft.y - startLowerRight.y) / 2 + startLowerRight.y);
//                 points.Add(pointF);
//             }
//             let startEndLineAngleRadians: number = <number>(Math.Atan((endY - startY) / (endX - startX)));
//             let startEndLineAngleDegrees: number = startEndLineAngleRadians / Graphicalslur.degreesToRadiansFactor;
//             let start2: PointF2D = new PointF2D(0, 0);
//             let end2: PointF2D = new PointF2D(endX - startX, endY - startY);
//             let rotationMatrix: Matrix_2D, transposeMatrix;
//             rotationMatrix = Matrix_2D.getRotationMatrix(-startEndLineAngleRadians);
//             transposeMatrix = rotationMatrix.getTransposeMatrix();
//             end2 = rotationMatrix.vectorMultiplication(end2);
//             let transformedPoints: List<PointF2D> = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);
//             let leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
//             let rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
//             let leftLineD: number = start2.y - start2.x * leftLineSlope;
//             let rightLineD: number = end2.y - end2.x * rightLineSlope;
//             let intersectionPoint: PointF2D = new PointF2D();
//             let sameSlope: boolean = false;
//             if (Math.Abs(Math.Abs(leftLineSlope) - Math.Abs(rightLineSlope)) < 0.0001f)
//             {
//                 intersectionPoint.x = end2.x / 2;
//                 intersectionPoint.y = 0;
//                 sameSlope = true;
//             }
//  else {
//                 intersectionPoint.x = (rightLineD - leftLineD) / (leftLineSlope - rightLineSlope);
//                 intersectionPoint.y = leftLineSlope * intersectionPoint.x + leftLineD;
//             }
//             let leftAngle: number = minAngle;
//             let rightAngle: number = -minAngle;
//             if (!sameSlope)
//                 this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
//             let leftControlPoint: PointF2D = new PointF2D();
//             let rightControlPoint: PointF2D = new PointF2D();
//             calculateControlPoints(leftControlPoint, rightControlPoint, end2.x, leftAngle, rightAngle, transformedPoints);
//             leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
//             leftControlPoint.x += startX;
//             leftControlPoint.y += startY;
//             rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
//             rightControlPoint.x += startX;
//             rightControlPoint.y += startY;
//             this.BezierStartPt = start;
//             this.BezierStartControlPt = leftControlPoint;
//             this.BezierEndControlPt = rightControlPoint;
//             this.BezierEndPt = end;
//             this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
//             this.intersection.x += startX;
//             this.intersection.y += startY;
//             let length: number = staffLine.BottomLine.Length;
//             let startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.BezierStartPt.x, length);
//             let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.BezierEndPt.x, length);
//             let distance: number = this.BezierEndPt.x - this.BezierStartPt.x;
//             let samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
//             for (let i: number = startIndex; i < endIndex; i++) {
//                 let diff: number = i / samplingUnit - this.BezierStartPt.x;
//                 let curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.Abs(diff) / distance);
//                 let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
//                 if (index >= startIndex)
//                     staffLine.BottomLine[index] = Math.Max(staffLine.BottomLine[index], curvePoint.y);
//                 index++;
//                 if (index < length)
//                     staffLine.BottomLine[index] = Math.Max(staffLine.BottomLine[index], curvePoint.y);
//             }
//         }
//    }
//     private calculateStartAndEnd(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote, staffLine: StaffLine,
//         startX: number, startY: number, endX: number, endY: number,
//         rules: EngravingRules, skyBottomLineCalculator: SkyBottomLineCalculator): void {
//         if (slurStartNote !== undefined) {
//             startX = slurStartNote.PositionAndShape.RelativePosition.x + slurStartNote.ParentStaffEntry.PositionAndShape.RelativePosition.x
// + slurStartNote.ParentStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.x;
//             if (this.graceStart)
//                 startX += slurStartNote.ParentStaffEntry.StaffEntryParent.PositionAndShape.RelativePosition.x;
//             let first: PsGraphicalNote = <PsGraphicalNote>slurStartNote.ParentList.First();
//             if (first.NoteStem !== undefined && first.NoteStem.Direction === StemEnum.StemUp && this.Placement === PlacementEnum.Above) {
//                 startX += first.NoteStem.PositionAndShape.RelativePosition.x;
//                 startY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, startX);
//             }
//             else {
//                 let last: PsGraphicalNote = <PsGraphicalNote>slurStartNote.ParentList.Last();
//                 if (last.NoteStem !== undefined && last.NoteStem.Direction === StemEnum.StemDown && this.Placement === PlacementEnum.Below) {
//                     startX += last.NoteStem.PositionAndShape.RelativePosition.x;
//                     startY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, startX);
//                 }
//                 else {
//                     if (this.Placement === PlacementEnum.Above) {
//                         let gn: PsGraphicalNote = last;
//                         startY = gn.PositionAndShape.RelativePosition.y;
//                         if (gn.NoteHead !== undefined)
//                             startY += gn.NoteHead.PositionAndShape.BorderMarginTop;
//                         else {
//                             startY += gn.PositionAndShape.BorderMarginTop;
//                         }
//                     }
//                     else {
//                         let gn: PsGraphicalNote = first;
//                         startY = gn.PositionAndShape.RelativePosition.y;
//                         if (gn.NoteHead !== undefined)
//                             startY += gn.NoteHead.PositionAndShape.BorderMarginBottom;
//                         else {
//                             startY += gn.PositionAndShape.BorderMarginBottom;
//                         }
//                     }
//                 }
//             }
//         }
//         else startX = (<PsGraphicalMeasure>staffLine.Measures[0]).firstInstructionStaffEntry.PositionAndShape.BorderMarginRight;
//         if (slurEndNote !== undefined) {
//             endX = slurEndNote.PositionAndShape.RelativePosition.x + slurEndNote.ParentStaffEntry.PositionAndShape.RelativePosition.x
// + slurEndNote.ParentStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.x;
//             if (this.graceEnd)
//                 endX += slurEndNote.ParentStaffEntry.StaffEntryParent.PositionAndShape.RelativePosition.x;
//             let first: PsGraphicalNote = <PsGraphicalNote>slurEndNote.ParentList.First();
//             if (first.NoteStem !== undefined && first.NoteStem.Direction === StemEnum.StemUp && this.Placement === PlacementEnum.Above) {
//                 endX += first.NoteStem.PositionAndShape.RelativePosition.x;
//                 endY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, endX);
//             }
//             else {
//                 let last: PsGraphicalNote = <PsGraphicalNote>slurEndNote.ParentList.Last();
//                 if (last.NoteStem !== undefined && last.NoteStem.Direction === StemEnum.StemDown && this.Placement === PlacementEnum.Below) {
//                     endX += last.NoteStem.PositionAndShape.RelativePosition.x;
//                     endY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, endX);
//                 }
//                 else {
//                     if (this.Placement === PlacementEnum.Above) {
//                         let highestNote: PsGraphicalNote = last;
//                         endY = highestNote.PositionAndShape.RelativePosition.y;
//                         if (highestNote.NoteHead !== undefined)
//                             endY += highestNote.NoteHead.PositionAndShape.BorderMarginTop;
//                         else endY += highestNote.PositionAndShape.BorderTop;
//                     }
//                     else {
//                         let lowestNote: PsGraphicalNote = first;
//                         endY = lowestNote.PositionAndShape.RelativePosition.y;
//                         if (lowestNote.NoteHead !== undefined)
//                             endY += lowestNote.NoteHead.PositionAndShape.BorderMarginBottom;
//                         else endY += lowestNote.PositionAndShape.BorderBottom;
//                     }
//                 }
//             }
//         }
//         else endX = staffLine.PositionAndShape.Size.Width;
//         if (slurStartNote === undefined && slurEndNote === undefined) {
//             startY = 0;
//             endY = 0;
//         }
//         if (slurStartNote === undefined)
//             startY = endY;
//         if (slurEndNote === undefined)
//             endY = startY;
//         if (this.slur.startNoteHasMoreStartingslurs() && this.slur.isslurLonger()) {
//             if (this.Placement === PlacementEnum.Above)
//                 startY -= rules.slursStartingAtSameStaffEntryYOffset;
//             else startY += rules.slursStartingAtSameStaffEntryYOffset;
//         }
//         if (this.slur.endNoteHasMoreEndingslurs() && this.slur.isslurLonger()) {
//             if (this.Placement === PlacementEnum.Above)
//                 endY -= rules.slursStartingAtSameStaffEntryYOffset;
//             else endY += rules.slursStartingAtSameStaffEntryYOffset;
//         }
//     }
//     private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
//         if (this.slur.StartNote.ParentVoiceEntry.LyricsEntries.Count > 0 || this.slur.EndNote !== undefined
// && this.slur.EndNote.ParentVoiceEntry.LyricsEntries.Count > 0) {
//             this.Placement = PlacementEnum.Above;
//             return
//         }
//         let startStaffEntry: VexFlowStaffEntry = this.StaffEntries[0];
//         let endStaffEntry: VexFlowStaffEntry = this.StaffEntries[this.StaffEntries.Count - 1];
//         for (let idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
//             let graphicalStaffEntry: VexFlowStaffEntry = this.StaffEntries[idx];
//             if (graphicalStaffEntry.ParentMeasure.hasMultipleVoices()) {
//                 if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice)
//                     this.Placement = PlacementEnum.Below;
//                 else this.Placement = PlacementEnum.Above;
//                 return
//             }
//         }
//         if (startStaffEntry.hasStem() && endStaffEntry.hasStem() && startStaffEntry.getStemDirection() === endStaffEntry.getStemDirection())
//             this.Placement = (startStaffEntry.getStemDirection() === StemEnum.StemUp) ? PlacementEnum.Below : PlacementEnum.Above;
//         else {
//             for (let idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
//                 let graphicalStaffEntry: VexFlowStaffEntry = this.StaffEntries[idx];
//                 if (graphicalStaffEntry.LyricsEntries.Count > 0) {
//                     this.Placement = PlacementEnum.Above;
//                     return
//                 }
//             }
//             let sX: number = startStaffEntry.PositionAndShape.BorderMarginLeft + startStaffEntry.PositionAndShape.RelativePosition.x
// + startStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.x;
//             let eX: number = endStaffEntry.PositionAndShape.BorderMarginRight + endStaffEntry.PositionAndShape.RelativePosition.x
// + endStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.x;
//             if (this.graceStart)
//                 sX += endStaffEntry.PositionAndShape.RelativePosition.x;
//             if (this.graceEnd)
//                 eX += endStaffEntry.StaffEntryParent.PositionAndShape.RelativePosition.x;
//             let minAbove: number = skyBottomLineCalculator.getSkyLineMinInRange(staffLine, sX, eX);
//             let maxBelow: number = skyBottomLineCalculator.getBottomLineMaxInRange(staffLine, sX, eX);
//             let notesMinY: number = Math.Min(startStaffEntry.findGraphicalNotesMinY(),
//                 endStaffEntry.findGraphicalNotesMinY());
//             let notesMaxY: number = Math.Max(startStaffEntry.findGraphicalNotesMaxY(),
//                 endStaffEntry.findGraphicalNotesMaxY());
//             minAbove = notesMinY - minAbove;
//             maxBelow = maxBelow - notesMaxY;
//             if (Math.Abs(maxBelow) > Math.Abs(minAbove))
//                 this.Placement = PlacementEnum.Above;
//             else this.Placement = PlacementEnum.Below;
//         }
//     }
//     private calculateTopPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): List<PointF2D> {
//         let points: List<PointF2D> = new List<PointF2D>();
//         let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.SkyLine.Length);
//         let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.SkyLine.Length);
//         if (startIndex < 0)
//             startIndex = 0;
//         if (endIndex >= staffLine.SkyLine.Length)
//             endIndex = staffLine.SkyLine.Length - 1;
//         for (let i: number = startIndex; i < endIndex; i++) {
//             let pointF_2D: PointF2D = new PointF2D((0.5f + i) / skyBottomLineCalculator.SamplingUnit, staffLine.SkyLine[i]);
//             points.Add(pointF_2D);
//         }
//         return points;
//     }
//     private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): List<PointF2D> {
//         let points: List<PointF2D> = new List<PointF2D>();
//         let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.BottomLine.Length);
//         let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.BottomLine.Length);
//         if (startIndex < 0)
//             startIndex = 0;
//         if (endIndex >= staffLine.BottomLine.Length)
//             endIndex = staffLine.BottomLine.Length - 1;
//         for (let i: number = startIndex; i < endIndex; i++) {
//             let pointF_2D: PointF2D = new PointF2D((0.5f + i) / skyBottomLineCalculator.SamplingUnit, staffLine.BottomLine[i]);
//             points.Add(pointF_2D);
//         }
//         return points;
//     }
//     private calculateMaxLeftSlope(points: List<PointF2D>, start: PointF2D, end: PointF2D): number {
//         let slope: number = number.MinValue;
//         let x: number = start.x;
//         let y: number = start.y;
//         for (let i: number = 0; i < points.Count; i++) {
//             if (Math.Abs(points[i].y - number.MaxValue) < 0.0001f || Math.Abs(points[i].y - number.MinValue) < 0.0001f)
//             continue;
//             slope = Math.Max(slope, (points[i].y - y) / (points[i].x - x));
//         }
//         slope = Math.Max(slope, Math.Abs(end.y - y) / (end.x - x));
//         return slope;
//     }
//     private calculateMaxRightSlope(points: List<PointF2D>, start: PointF2D, end: PointF2D): number {
//         let slope: number = number.MaxValue;
//         let x: number = end.x;
//         let y: number = end.y;
//         for (let i: number = 0; i < points.Count; i++) {
//             if (Math.Abs(points[i].y - number.MaxValue) < 0.0001f || Math.Abs(points[i].y - number.MinValue) < 0.0001f)
//             continue;
//             slope = Math.Min(slope, (y - points[i].y) / (x - points[i].x));
//         }
//         slope = Math.Min(slope, (y - start.y) / (x - start.x));
//         return slope;
//     }
//     private getPointListMaxY(points: List<PointF2D>): number {
//         let max: number = number.MinValue;
//         for (let idx: number = 0, len = points.Count; idx < len; ++idx) {
//             let pointF_2D: PointF2D = points[idx];
//             if (Math.Abs(pointF_2D.y - number.MinValue) < 0.0001f || Math.Abs(pointF_2D.y - number.MaxValue) < 0.0001f)
//             continue;
//             max = Math.Max(max, pointF_2D.y);
//         }
//         return max;
//     }
//     private calculateTranslatedAndRotatedPointListAbove(points: List<PointF2D>, startX: number, startY: number, rotationMatrix: Matrix_2D): List<PointF2D> {
//         let transformedPoints: List<PointF2D> = new List<PointF2D>();
//         for (let i: number = 0; i < points.Count; i++) {
//             if (Math.Abs(points[i].y - number.MaxValue) < 0.0001f || Math.Abs(points[i].y - number.MinValue) < 0.0001f)
//             continue;
//             let point: PointF2D = new PointF2D(points[i].x - startX, -(points[i].y - startY));
//             point = rotationMatrix.vectorMultiplication(point);
//             transformedPoints.Add(point);
//         }
//         return transformedPoints;
//     }
//     private calculateTranslatedAndRotatedPointListBelow(points: List<PointF2D>, startX: number, startY: number, rotationMatrix: Matrix_2D): List<PointF2D> {
//         let transformedPoints: List<PointF2D> = new List<PointF2D>();
//         for (let i: number = 0; i < points.Count; i++) {
//             if (Math.Abs(points[i].y - number.MaxValue) < 0.0001f || Math.Abs(points[i].y - number.MinValue) < 0.0001f)
//             continue;
//             let point: PointF2D = new PointF2D(points[i].x - startX, points[i].y - startY);
//             point = rotationMatrix.vectorMultiplication(point);
//             transformedPoints.Add(point);
//         }
//         return transformedPoints;
//     }
//     private calculateFactor(heightWidthRatio: number): number {
//         return Graphicalslur.k * heightWidthRatio + Graphicalslur.d;
//     }
//     private calculateHeightWidthRatio(endX: number, points: List<PointF2D>): number {
//         if (points.Count === 0)
//             return 0;
//         let max: number = Math.Max(0, this.getPointListMaxY(points));
//         return max / endX;
//     }
//     private calculateControlPoints(leftControlPoint: PointF2D, rightControlPoint: PointF2D, endX: number,
//         leftAngle: number, rightAngle: number, points: List<PointF2D>): void {
//         let heightWidthRatio: number = this.calculateHeightWidthRatio(endX, points);
//         let factor: number = this.calculateFactor(heightWidthRatio);
//         let leftLength: number = endX * factor;
//         leftControlPoint.x = <number>(leftLength * Math.Cos(leftAngle * Graphicalslur.degreesToRadiansFactor));
//         leftControlPoint.y = <number>(leftLength * Math.Sin(leftAngle * Graphicalslur.degreesToRadiansFactor));
//         let rightLength: number = endX * factor;
//         rightControlPoint.x = endX - <number>(rightLength * Math.Cos(rightAngle * Graphicalslur.degreesToRadiansFactor));
//         rightControlPoint.y = -<number>(rightLength * Math.Sin(rightAngle * Graphicalslur.degreesToRadiansFactor));
//     }
//     private calculateAngles(leftAngle: number, rightAngle: number, leftLineSlope: number, rightLineSlope: number, maxAngle: number): void {
//         let angle: number = 20;
//         let calculatedLeftAngle: number = <number>(Math.Atan(leftLineSlope) / Graphicalslur.degreesToRadiansFactor);
//         if (leftLineSlope > 0)
//             calculatedLeftAngle += angle;
//         else calculatedLeftAngle -= angle;
//         let calculatedRightAngle: number = <number>(Math.Atan(rightLineSlope) / Graphicalslur.degreesToRadiansFactor);
//         if (rightLineSlope < 0)
//             calculatedRightAngle -= angle;
//         else calculatedRightAngle += angle;
//         leftAngle = Math.Min(Math.Max(leftAngle, calculatedLeftAngle), maxAngle);
//         rightAngle = Math.Max(Math.Min(rightAngle, calculatedRightAngle), -maxAngle);
//     }
//     private static degreesToRadiansFactor: number = <number>(Math.PI / 180);
//     private static k: number = 0.9f;
//     private static d: number = 0.2f;
//}
