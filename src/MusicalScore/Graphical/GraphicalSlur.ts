
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
import { Fraction } from "../../Common/DataObjects/Fraction";
import { StemDirectionType } from "../VoiceData/VoiceEntry";
import { VexFlowGraphicalNote } from "./VexFlow";
import * as VF from "vexflow";
import { unitInPixels } from "./VexFlow/VexFlowMusicSheetDrawer";

/** Return staff-relative Y of notehead center from VF5 geometry.
 *  VF5 getYForNote(line) = stave.y + headroom*spacing + 5*spacing - line*spacing
 *  OSMD staff-relative origin is top staff line (Y=0, increasing downward).
 *  osmdY = (getYForNote(line) - topStaffLine) / unitInPixels = 5 - line */
function getVF5NoteheadStaffY(note: GraphicalNote): number {
    const vfgNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
    if (vfgNote.notehead) {
        return 5 - vfgNote.notehead().line;
    }
    return note.PositionAndShape?.RelativePosition?.y ?? 0;
}

/** Return staffLine-relative X from VF5's actual rendered position (in OSMD units).
 *  Falls back to OSMD model positions when VF stave is unavailable. */
function getVF5SlurX(note: GraphicalNote): number {
    const vfgNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
    const vfNote: VF.StaveNote = vfgNote.vfnote?.[0] as VF.StaveNote;
    const vfStave: VF.Stave | undefined = vfNote?.getStave?.();
    if (vfNote && vfStave) {
        const staveX: number = vfStave.getX();
        const measureRelX: number = note.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
        const staffLinePixelX: number = staveX - measureRelX * 10;
        const centerPx: number = vfNote.getAbsoluteX() + vfNote.getGlyphWidth() / 2;
        return (centerPx - staffLinePixelX) / 10;
    }
    return note.PositionAndShape.RelativePosition.x
         + note.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
         + note.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
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
                // When there are 3+ staff entries, BorderLeft on the last entry can
                // include predecessors in the same measure, narrowing the skyline query
                // so much that intermediate entries are missed. Use endX to bound the
                // query on the right so all intermediate entries are covered.
                if (this.staffEntries.length > 2) {
                    endUpperLeft.x = endX;
                } else {
                    endUpperLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
                }
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
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in SkyLine
                // and tangent Lines characteristica
            let startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            let endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Cap slope asymmetry: a single skyline point very close to start
            // or end can create arbitrarily large slopes that balloon the other
            // side after equalization. Limit ratio to 3:1.
            const leftAbs: number = Math.abs(startLineSlope);
            const rightAbs: number = Math.abs(endLineSlope);
            if (leftAbs > 3 * rightAbs) {
                startLineSlope = 3 * rightAbs * Math.sign(startLineSlope);
            } else if (rightAbs > 3 * leftAbs) {
                endLineSlope = 3 * leftAbs * Math.sign(endLineSlope);
            }

            // Equalize to the steeper side so real obstacles are cleared.
            const eqSlope: number = Math.max(startLineSlope, -endLineSlope);
            startLineSlope = eqSlope;
            endLineSlope = -eqSlope;

            const startYOffset: number = 0;
            const endYOffset: number = 0;

            // calculate tangent Lines Angles
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            const result: {startAngle: number, endAngle: number} =
                this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
            startAngle = result.startAngle;
            endAngle = result.endAngle;

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);

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

            // For cross-staff beams: ensure control points clear the highest
            // notehead in the beam's voice. The skyline above only covers the
            // start staff line. The slur itself may start and end on the same
            // staff but the voice's beam can still cross staves.
            if (slurStartNote && slurStartNote instanceof VexFlowGraphicalNote) {
                const startVN: any = (slurStartNote as VexFlowGraphicalNote).vfnote?.[0];
                const beamForNotes: any = startVN?.beam;
                if (beamForNotes && this.isBeamCrossStaff(beamForNotes, slurStartNote)) {
                    const beamNotes: any[] = beamForNotes.getNotes();
                    let voiceUpperY: number = Infinity;
                    let voiceLowerY: number = -Infinity;
                    for (const bn of beamNotes) {
                        const ns: any = bn.checkStave?.() || bn.stave;
                        if (!ns) { continue; }
                        const kps: any[] = bn.getKeyProps?.() || [];
                        for (const kp of kps) {
                            const noteYPx: number = ns.getYForNote(kp.line);
                            voiceUpperY = Math.min(voiceUpperY, noteYPx);
                            voiceLowerY = Math.max(voiceLowerY, noteYPx);
                        }
                    }
                    // Convert to staff-relative units (same frame as control points)
                    const staveYPx: number =
                        startStaffEntry.parentMeasure.ParentStaffLine
                            ?.PositionAndShape?.AbsolutePosition?.y ?? 0;
                    const voiceUpperRel: number =
                        voiceUpperY / unitInPixels - staveYPx;
                    const voiceLowerRel: number =
                        voiceLowerY / unitInPixels - staveYPx;
                    const margin: number = rules.SlurCrossStaffMinBow;
                    const maxMargin: number = rules.SlurCrossStaffMaxBow;
                    if (this.placement === PlacementEnum.Above) {
                        // Floor: cp must clear highest notehead in the voice
                        // Ceiling: cp shouldn't balloon to infinity
                        const floorY: number = voiceUpperRel - margin;
                        const ceilingY: number = voiceUpperRel - maxMargin;
                        if (startControlPoint.y > floorY) {
                            startControlPoint.y = floorY;
                        } else if (startControlPoint.y < ceilingY) {
                            startControlPoint.y = ceilingY;
                        }
                        if (endControlPoint.y > floorY) {
                            endControlPoint.y = floorY;
                        } else if (endControlPoint.y < ceilingY) {
                            endControlPoint.y = ceilingY;
                        }
                    } else if (this.placement === PlacementEnum.Below) {
                        const floorY: number = voiceLowerRel + margin;
                        const ceilingY: number = voiceLowerRel + maxMargin;
                        if (startControlPoint.y < floorY) {
                            startControlPoint.y = floorY;
                        } else if (startControlPoint.y > ceilingY) {
                            startControlPoint.y = ceilingY;
                        }
                        if (endControlPoint.y < floorY) {
                            endControlPoint.y = floorY;
                        } else if (endControlPoint.y > ceilingY) {
                            endControlPoint.y = ceilingY;
                        }
                    }
                }
            }

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
                if (this.staffEntries.length > 2) {
                    endLowerLeft.x = endX;
                } else {
                    endLowerLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
                }
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
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in BottomLine
            // and tangent Lines characteristica
            let startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            let endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);

            // Cap slope asymmetry: a single skyline point very close to start
            // or end can create arbitrarily large slopes that balloon the other
            // side after equalization. Limit ratio to 3:1.
            const leftAbsB: number = Math.abs(startLineSlope);
            const rightAbsB: number = Math.abs(endLineSlope);
            if (leftAbsB > 3 * rightAbsB) {
                startLineSlope = 3 * rightAbsB * Math.sign(startLineSlope);
            } else if (rightAbsB > 3 * leftAbsB) {
                endLineSlope = 3 * leftAbsB * Math.sign(endLineSlope);
            }

            // Equalize to the steeper side so real obstacles are cleared.
            const eqSlopeB: number = Math.max(startLineSlope, -endLineSlope);
            startLineSlope = eqSlopeB;
            endLineSlope = -eqSlopeB;

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            const startYOffset: number = 0;
            const endYOffset: number = 0;

            // calculate tangent Lines Angles
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            const result: {startAngle: number, endAngle: number} =
                this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
            startAngle = result.startAngle;
            endAngle = result.endAngle;

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
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

        // X: use the container-based positions from positionRelativeToBox (these are correct for X).
        // Y: use VF5 notehead geometry (getVF5NoteheadStaffY), because PositionAndShape on notes
        //     carries only a small centering offset, not the actual staff position.
        const startXPos: PointF2D = this.positionRelativeToBox(slurStartNote.PositionAndShape, systemBox);
        const endXPos: PointF2D = this.positionRelativeToBox(slurEndNote.PositionAndShape, systemBox);
        const staffLineOffset: PointF2D = startStaffLine.PositionAndShape.RelativePosition;
        const startX: number = startXPos.x - staffLineOffset.x;
        const endX: number = endXPos.x - staffLineOffset.x;

        // Compute notehead Y from VF5's actual rendered geometry.
        const startStaffAbsY: number = startStaffLine.PositionAndShape.AbsolutePosition.y;
        const endStaffAbsY: number = endStaffLine.PositionAndShape.AbsolutePosition.y;
        const startNoteY: number = this.vfNoteYRelative(slurStartNote, startStaffAbsY);
        // For end note: use its own staff line Y (endStaffAbsY) as the
        // forced stave position. Non-beamed cross-staff notes may still
        // have the wrong VF stave (voice's owner stave, not target stave).
        const endNoteY: number = this.vfNoteYRelative(slurEndNote, startStaffAbsY,
            endStaffAbsY);

        // The staff higher up on the page has the smaller y value.
        const endStaffAbove: boolean =
            endStaffLine.PositionAndShape.RelativePosition.y < startStaffLine.PositionAndShape.RelativePosition.y;

        this.placement = PlacementEnum.Above;

        const yGap: number = rules.SlurNoteHeadYOffset;

        // If start/end notes are in cross-staff beams, compute the beam Y in
        // staff-relative OSMD units so the slur anchor sits at the beam edge
        // rather than at the notehead (which may be far from the beam).
        const startBeamY: number | undefined = this.beamYForNote(slurStartNote, startStaffAbsY);
        const endBeamY: number | undefined = this.beamYForNote(slurEndNote, startStaffAbsY);

        const startY: number = startBeamY ?? (startNoteY - yGap);
        const endY: number = endBeamY ?? (endNoteY - yGap);

        // The curve bows out (vertically) from the line connecting the two notes.
        const dx: number = endX - startX;
        const dy: number = endY - startY;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        let bow: number = Math.max(rules.SlurCrossStaffMinBow,
                                   Math.min(rules.SlurCrossStaffMaxBow, distance * rules.SlurCrossStaffBowFactor));
        // For treble→bass: the chord descends steeply (dy > 0). Control point 1
        // sits at startY + dy*0.25 - bow; ensure bow > dy*0.3 so cp1 arcs above startY.
        if (!endStaffAbove && dy > 0) {
            bow = Math.max(bow, dy * 0.3 + 0.5);
        }
        const bowSign: number = -1;

        // Clamp bow to clear highest notehead in cross-staff beam.
        const gNote: any = slurStartNote as VexFlowGraphicalNote;
        const vfN: any = gNote.vfnote?.[0];
        const beamForNotes: any = vfN?.beam;
        if (beamForNotes && vfN) {
            const beamNotes: any[] = beamForNotes.getNotes();
            let voiceUpperY: number = Infinity;
            // Also check if the beam spans staves (has notes on an upper stave).
            let minStaveY0: number = Infinity;
            let maxStaveY0: number = -Infinity;
            for (const bn of beamNotes) {
                const ns: any = bn.checkStave?.() || bn.stave;
                if (!ns) { continue; }
                const stY0: number = ns.getYForLine(0);
                minStaveY0 = Math.min(minStaveY0, stY0);
                maxStaveY0 = Math.max(maxStaveY0, stY0);
                for (const kp of bn.getKeyProps?.() || []) {
                    const noteYPx: number = ns.getYForNote(kp.line);
                    const noteY: number = noteYPx / unitInPixels - startStaffAbsY;
                    voiceUpperY = Math.min(voiceUpperY, noteY);
                }
            }
            // Only apply if the beam has notes on an UPPER stave
            // (different stave Y0 → cross-staff beam with notes
            // that the start-staff skyline can't see).
            if (isFinite(voiceUpperY) &&
                isFinite(minStaveY0) && isFinite(maxStaveY0) &&
                Math.abs(maxStaveY0 - minStaveY0) > 50) {
                const margin: number = rules.SlurNoteHeadYOffset + 3.5; // ~40px
                const cp2MinBow: number = startY + dy * 0.75 - voiceUpperY + margin;
                const cp1MinBow: number = startY + dy * 0.25 - voiceUpperY + margin;
                bow = Math.max(bow, cp1MinBow, cp2MinBow);
            }
        }

        this.bezierStartPt = new PointF2D(startX, startY);
        this.bezierStartControlPt = new PointF2D(startX + dx * 0.25, startY + dy * 0.25 + bowSign * bow);
        this.bezierEndControlPt = new PointF2D(startX + dx * 0.75, startY + dy * 0.75 + bowSign * bow);
        this.bezierEndPt = new PointF2D(endX, endY);
        return true;
    }

    /**
     * Returns the notehead Y of `note` relative to the start staff line.
     * Uses VexFlow's stave.getYForNote() for the actual rendered position,
     * converted to OSMD units. Falls back to OSMD model positions.
     */
    private vfNoteYRelative(note: GraphicalNote, staffAbsY: number,
                             forceStaffAbsY?: number): number {
        const gNote: any = note as VexFlowGraphicalNote;
        const vfNote: any = gNote.vfnote?.[0];
        if (vfNote) {
            const stave: any = vfNote.checkStave?.() || vfNote.stave;
            const keyProps: any[] = vfNote.getKeyProps?.() || [];
            if (keyProps.length > 0) {
                let noteAbsPixels: number;
                if (forceStaffAbsY !== undefined) {
                    // Use explicit staff Y (e.g. for cross-staff notes whose
                    // VF stave wasn't reassigned by positionCrossStaffBeams).
                    // Formula: getYForNote(line) = stave.y + 50 - line*10
                    // with OSMD defaults (spaceAboveStaffLn=0, spacing=10).
                    noteAbsPixels = forceStaffAbsY * unitInPixels
                        + 50 - keyProps[0].line * unitInPixels;
                } else if (stave) {
                    noteAbsPixels = stave.getYForNote(keyProps[0].line);
                } else {
                    const fallbackY: number = note.PositionAndShape?.AbsolutePosition?.y ?? 0;
                    return fallbackY - staffAbsY;
                }
                const noteAbsUnits: number = noteAbsPixels / unitInPixels;
                return noteAbsUnits - staffAbsY;
            }
        }
        const absY: number = note.PositionAndShape?.AbsolutePosition?.y ?? 0;
        return absY - staffAbsY;
    }

    /**
     * If `note` belongs to a cross-staff beam, returns the beam Y in OSMD units
     * relative to the start staff line (same coordinate system as startNoteY/endNoteY).
     * The beam Y is the anchor point from positionCrossStaffBeams() — 35% from
     * the upper stave's bottom line toward the lower stave's top line.
     * Returns undefined if the note is not in a cross-staff beam.
     */
    private beamYForNote(note: GraphicalNote, startStaffLineY: number, relativeToOwnStave: boolean = false): number | undefined {
        const gNote: any = note;
        const vfNote: any = gNote.vfnote?.[0];
        if (!vfNote) { return undefined; }
        const beam: any = vfNote.beam;
        if (!beam) { return undefined; }
        const stave: any = vfNote.checkStave?.() || vfNote.stave;
        if (!stave) { return undefined; }

        // Only adjust when the beam is on the same side of the notehead as the slur.
        // For "Above" placement: UP-stem notes (beam above notehead) need to clear beam.
        // DOWN-stem notes (beam below notehead) — no conflict.
        const stemDir: number = vfNote.getStemDirection?.() ?? 0;
        if (this.placement === PlacementEnum.Above && stemDir !== 1) { return undefined; }
        if (this.placement === PlacementEnum.Below && stemDir !== -1) { return undefined; }

        const measure: any = gNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
        if (!measure) { return undefined; }

        // Find the sibling measure — the beam is in the OWNER's crossStaffBeamSiblings
        let ownerMeasure: any;
        let siblingMeasure: any;
        const col: any[] = measure.ParentMusicSystem?.GraphicalMeasures;
        if (col) {
            let colIdx: number = -1;
            for (let ci: number = 0; ci < col.length; ci++) {
                if (col[ci].indexOf(measure) >= 0) { colIdx = ci; break; }
            }
            if (colIdx >= 0) {
                for (const m of col[colIdx]) {
                    for (const [b, sib] of (m as any).crossStaffBeamSiblings ?? []) {
                        if (b === beam) { ownerMeasure = m; siblingMeasure = sib; break; }
                    }
                    if (siblingMeasure) { break; }
                }
            }
        }
        if (siblingMeasure) {
            // Cross-staff beam — find outermost noteheads in the voice
            // on each stave and compute beam Y from those, matching how
            // positionCrossStaffBeams uses the stave lines.
            const beamNotes: any[] = beam.getNotes();
            const ownerStave: any = ownerMeasure!.getVFStave();
            const sibStave: any = siblingMeasure.getVFStave();
            let upperExtremeY: number = Infinity;
            let lowerExtremeY: number = -Infinity;
            const ownerStaveY: number = ownerStave.getYForLine(0);
            const sibStaveY: number = sibStave.getYForLine(0);
            for (const bn of beamNotes) {
                const ns: any = bn.checkStave?.() || bn.stave;
                if (!ns) { continue; }
                const kps: any[] = bn.getKeyProps?.() || [];
                if (kps.length === 0) { continue; }
                const noteY: number = ns.getYForNote(kps[0].line);
                // Compare by stave Y position, not object identity
                // (setStave may reassign notes to differently-referenced staves)
                const noteStaveY: number = ns.getYForLine(0);
                const noteIsUpper: boolean = noteStaveY < ownerStaveY + (sibStaveY - ownerStaveY) * 0.5;
                if (noteIsUpper) {
                    upperExtremeY = Math.min(upperExtremeY, noteY);
                } else {
                    lowerExtremeY = Math.max(lowerExtremeY, noteY);
                }
            }
            let beamYPx: number;
            if (isFinite(upperExtremeY) && isFinite(lowerExtremeY)) {
                beamYPx = upperExtremeY +
                    (lowerExtremeY - upperExtremeY) * 0.35;
            } else {
                // Fallback: use stave lines
                const ownerY: number = ownerStave.getYForLine(0);
                const sibY: number = sibStave.getYForLine(0);
                const localBelow: boolean = ownerY > sibY;
                const upperStave: any = localBelow ? sibStave : ownerStave;
                const lowerStave: any = localBelow ? ownerStave : sibStave;
                const upperBottom: number = upperStave.getYForLine(4);
                const lowerTop: number = lowerStave.getYForLine(0);
                beamYPx = upperBottom + (lowerTop - upperBottom) * 0.35;
            }
            if (relativeToOwnStave && stave) {
                return (beamYPx - stave.getYForLine(0)) / unitInPixels;
            }
            return beamYPx / unitInPixels - startStaffLineY;
        }

        // Regular single-staff beam — use stem-tip Y (beam top for beamed notes).
        // The stem-direction check at the top of this method already ensures
        // the beam is on the correct side of the notehead for this slur's placement.
        const stemTipPx: number = vfNote.getStemExtents?.()?.topY ?? 0;
        if (relativeToOwnStave && stave && stemTipPx > 0) {
            return (stemTipPx - stave.getYForLine(0)) / unitInPixels;
        }
        if (stemTipPx > 0) {
            return stemTipPx / unitInPixels - startStaffLineY;
        }
        return undefined;
    }

    /**
     * Returns true if the beam is in any measure's crossStaffBeamSiblings
     * (authoritative — populated during fixCrossStaffBeams/fixCrossStaffTuplets).
     */
    private isBeamCrossStaff(beam: any, note?: GraphicalNote): boolean {
        // Search the note's measure column for crossStaffBeamSiblings
        const gNote: any = note as VexFlowGraphicalNote;
        const measure: any = gNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
        if (!measure) { return false; }
        const col: any[] = measure.ParentMusicSystem?.GraphicalMeasures;
        if (!col) { return false; }
        let colIdx: number = -1;
        for (let ci: number = 0; ci < col.length; ci++) {
            if (col[ci].indexOf(measure) >= 0) { colIdx = ci; break; }
        }
        if (colIdx < 0) { return false; }
        for (const m of col[colIdx]) {
            const siblings: any = (m as any).crossStaffBeamSiblings;
            if (!siblings) { continue; }
            for (const [b] of siblings) {
                if (b === beam) { return true; }
            }
        }
        return false;
    }

    /**
     * At draw time: if this slur's start note is in a cross-staff beam,
     * adjust bezier control points so the curve clears the highest notehead
     * in that beam. Called from drawSlurs for non-isCrossed slurs whose
     * voice crosses staves (curve was computed at layout time before VF
     * beams existed, so it didn't account for treble noteheads).
     */
    public clampToVoiceSkyline(rules: EngravingRules): void {
        if (!this.bezierStartPt || !this.bezierStartControlPt ||
            !this.bezierEndControlPt || !this.bezierEndPt) { return; }
        // Get the start note's VF note and its beam
        const gNote: any = this.staffEntries?.[0]
            ?.findGraphicalNoteFromNote?.(this.slur.StartNote);
        const vfN: any = gNote?.vfnote?.[0];
        const beam: any = vfN?.beam;
        if (!beam || !this.isBeamCrossStaff(beam, gNote)) { return; }

        // Find highest notehead Y in the beam (staff-relative)
        const staffLine: any = this.staffEntries?.[0]
            ?.parentMeasure?.ParentStaffLine;
        if (!staffLine) { return; }
        const startStaffAbsY: number =
            staffLine.PositionAndShape?.AbsolutePosition?.y ?? 0;
        let voiceUpperY: number = Infinity;
        for (const bn of beam.getNotes()) {
            const ns: any = bn.checkStave?.() || bn.stave;
            if (!ns) { continue; }
            for (const kp of bn.getKeyProps?.() || []) {
                const noteYPx: number = ns.getYForNote(kp.line);
                const noteY: number = noteYPx / unitInPixels - startStaffAbsY;
                voiceUpperY = Math.min(voiceUpperY, noteY);
            }
        }
        if (!isFinite(voiceUpperY)) { return; }

        const margin: number = rules.SlurNoteHeadYOffset;
        // cp1Y = startY + dy*0.25 - bow must be ≤ voiceUpperY - margin
        // For the pre-computed bezier, we can derive the effective bow
        // from the existing control point and adjust it.
        const startY: number = this.bezierStartPt.y;
        const dy: number = this.bezierEndPt.y - startY;
        const cp1Y: number = this.bezierStartControlPt.y;
        // cp1Y = startY + dy*0.25 - bow  →  bow = startY + dy*0.25 - cp1Y
        let bow: number = startY + dy * 0.25 - cp1Y;
        // Minimum bow to clear voiceUpperY
        const minBow: number = startY + dy * 0.25 - voiceUpperY + margin;
        if (minBow > bow) {
            bow = minBow;
            // Recompute control points
            this.bezierStartControlPt.y = startY + dy * 0.25 - bow;
            this.bezierEndControlPt.y = startY + dy * 0.75 - bow;
        }
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

        if (slurStartNote) {
            // must be relative to StaffLine — use VF5 actual rendered position
            startX = getVF5SlurX(slurStartNote);

            //const first: GraphicalNote = slurStartNote.parentVoiceEntry.notes[0];

            // Determine Start/End Point coordinates with the VoiceEntry of the Start/EndNote of the slur
            const slurStartVE: GraphicalVoiceEntry = slurStartNote.parentVoiceEntry;

            // Get extreme notehead staff Y from VF5 notehead geometry (line * 0.5).
            // PositionAndShape.RelativePosition.y on notes is a centering offset, NOT staff position.
            let extremeNoteStaffY: number = getVF5NoteheadStaffY(slurStartNote);

            if (slurStartVE.notes.length > 1) {
                if (this.placement === PlacementEnum.Above) {
                    for (const n of slurStartVE.notes) {
                        const ny: number = getVF5NoteheadStaffY(n);
                        if (ny < extremeNoteStaffY) { extremeNoteStaffY = ny; }
                    }
                } else {
                    for (const n of slurStartVE.notes) {
                        const ny: number = getVF5NoteheadStaffY(n);
                        if (ny > extremeNoteStaffY) { extremeNoteStaffY = ny; }
                    }
                }
            }

            const startStaffAbsY: number = staffLine.PositionAndShape.AbsolutePosition.y;
            const startBeamY: number | undefined =
                this.beamYForNote(slurStartNote, startStaffAbsY, true);

            if (this.placement === PlacementEnum.Above) {
                if (startBeamY !== undefined) {
                    startY = startBeamY;
                } else if (slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Down) {
                    startY = extremeNoteStaffY - 0.5; // notehead top (stem away from slur)
                } else {
                    startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderTop;
                }
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    startY = Math.min(startY, slurStartVE.parentStaffEntry.getSkylineMin());
                }
            } else {
                if (startBeamY !== undefined) {
                    startY = startBeamY;
                } else if (slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Up) {
                    startY = extremeNoteStaffY + 0.5; // notehead bottom (stem away from slur)
                } else {
                    // Below + DOWN: stem tip points TOWARD the slur →
                    // anchor at the stem tip (VF topY for this VF5 fork).
                    const svfN: any = (slurStartNote as VexFlowGraphicalNote)?.vfnote?.[0];
                    const sStave: any = svfN?.checkStave?.() || svfN?.stave;
                    if (svfN && sStave) {
                        startY = ((svfN.getStemExtents()?.topY ?? 0) - sStave.getYForLine(0)) / unitInPixels;
                    } else {
                        startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderBottom;
                    }
                }
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    startY = Math.max(startY, slurStartVE.parentStaffEntry.getBottomlineMax());
                }
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
            startX = 0;
        }

        if (slurEndNote) {
            endX = getVF5SlurX(slurEndNote);

            const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;

            // check for articulation -> shift end y (slur further outward)
            //   this should not be necessary for the start note, and for accents (>) it's even counter productive there
            //   TODO alternatively, we could fix the bounding box of the note to include the ornament, but that seems tricky
            let articulationPlacement: PlacementEnum; // whether there's an articulation and where
            for (const articulation of slurEndVE.parentVoiceEntry.Articulations) {
                articulationPlacement = articulation.placement;
                if (articulation.placement === PlacementEnum.NotYetDefined) {
                    for (const modifier of ((slurEndNote as VexFlowGraphicalNote).vfnote[0] as any).modifiers) {
                        if (modifier.getCategory() === VF.Articulation.CATEGORY) {
                            if (modifier.position === VF.Modifier.Position.ABOVE) {
                                articulation.placement = PlacementEnum.Above;
                                articulationPlacement = PlacementEnum.Above;
                            } else if (modifier.position === VF.Modifier.Position.BELOW) {
                                articulation.placement = PlacementEnum.Below;
                                articulationPlacement = PlacementEnum.Below;
                            }
                            break;
                        }
                    }
                }
            }
            // Get extreme notehead staff Y from VF5 notehead geometry (line * 0.5).
            let endExtremeNoteStaffY: number = getVF5NoteheadStaffY(slurEndNote);
            if (slurEndVE.notes.length > 1) {
                if (this.placement === PlacementEnum.Above) {
                    for (const n of slurEndVE.notes) {
                        const ny: number = getVF5NoteheadStaffY(n);
                        if (ny < endExtremeNoteStaffY) { endExtremeNoteStaffY = ny; }
                    }
                } else {
                    for (const n of slurEndVE.notes) {
                        const ny: number = getVF5NoteheadStaffY(n);
                        if (ny > endExtremeNoteStaffY) { endExtremeNoteStaffY = ny; }
                    }
                }
            }

            const endStaffAbsY: number = staffLine.PositionAndShape.AbsolutePosition.y;
            // Use VF-stave-relative Y (relativeToOwnStave=true) to match the start
            // note's beamYForNote convention. The start note already uses this.
            // Absolute pixel/10 (relativeToOwnStave=false) is incompatible with
            // drawSlur's abs.y which is in a different coordinate frame.
            const endBeamY: number | undefined =
                this.beamYForNote(slurEndNote, endStaffAbsY, true);
            // Fallback: use VF stem direction when OSMD model doesn't have it set
            const endVFStemDirForY: number =
                (slurEndNote as VexFlowGraphicalNote)?.vfnote?.[0]?.getStemDirection?.() ?? 0;

            if (this.placement === PlacementEnum.Above) {
                if (endBeamY !== undefined) {
                    endY = endBeamY;
                } else if (slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Down
                    || endVFStemDirForY < 0) {
                    endY = endExtremeNoteStaffY - 0.5; // notehead top (stem away from slur)
                } else {
                    endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderTop;
                }
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    endY = Math.min(endY, slurEndVE.parentStaffEntry.getSkylineMin());
                }
                if (articulationPlacement === PlacementEnum.Above) {
                    endY -= this.rules.SlurEndArticulationYOffset;
                }
            } else {
                if (endBeamY !== undefined) {
                    endY = endBeamY;
                } else if (slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Up
                    || endVFStemDirForY > 0) {
                    endY = endExtremeNoteStaffY + 0.5; // notehead bottom (stem away from slur)
                } else if (slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Down
                    || endVFStemDirForY < 0) {
                    // Below + DOWN: stem tip points TOWARD the slur →
                    // anchor at the stem tip (VF topY for this VF5 fork).
                    const evfN: any = (slurEndNote as VexFlowGraphicalNote)?.vfnote?.[0];
                    const eStave: any = evfN?.checkStave?.() || evfN?.stave;
                    if (evfN && eStave) {
                        endY = ((evfN.getStemExtents()?.topY ?? 0) - eStave.getYForLine(0)) / unitInPixels;
                    } else {
                        endY = endExtremeNoteStaffY + 0.5;
                    }
                } else {
                    endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
                }
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    endY = Math.max(endY, slurEndVE.parentStaffEntry.getBottomlineMax());
                }
                if (articulationPlacement === PlacementEnum.Below) {
                    endY += this.rules.SlurEndArticulationYOffset;
                }
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
            if (this.placement === PlacementEnum.Above) {
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

        // Cap slurs to within staff area. Use notehead-based positioning from
        // calculateStartAndEnd as the primary anchor; the cap only prevents
        // pathologic values (e.g., unset start/end). 4.0 = staff height, generous margin.
        if (this.placement === PlacementEnum.Above) {
            startY = Math.min(startY, 4.0);
            endY = Math.min(endY, 4.0);
        } else {
            startY = Math.max(startY, -4.0);
            endY = Math.max(endY, -4.0);
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
                                   points: PointF2D[], heightWidthRatio: number,
                                   startY: number, endY: number
    ): { startControlPoint: PointF2D, endControlPoint: PointF2D } {
        let heightFactor: number = this.rules.SlurHeightFactor;
        let widthFlattenFactor: number = 1;
        const cutoffAngle: number = this.rules.SlurHeightFlattenLongSlursCutoffAngle;
        const cutoffWidth: number = this.rules.SlurHeightFlattenLongSlursCutoffWidth;
        // console.log("width: " + endX);
        if (startAngle > cutoffAngle && endX > cutoffWidth) {
            // Steep and wide: full formula with angle-dependent multiplier.
            widthFlattenFactor += endX / 70 * this.rules.SlurHeightFlattenLongSlursFactorByWidth;
            widthFlattenFactor *= 1 + (startAngle / 30 * this.rules.SlurHeightFlattenLongSlursFactorByAngle);
            heightFactor /= widthFlattenFactor;
        } else if (endX > cutoffWidth * 2) {
            // Wide but not steep: stronger pure-width flattening.
            widthFlattenFactor += endX / 18 * this.rules.SlurHeightFlattenLongSlursFactorByWidth;
            heightFactor /= widthFlattenFactor;
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
