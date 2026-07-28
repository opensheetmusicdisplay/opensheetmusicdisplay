
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
    /** Minimum cp_y from cross-staff merged-obstacle clearance. */
    private mergedClearanceCpY: number = -Infinity;

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
        let points: PointF2D[];
        let localPointCount: number = 0;

        const isAbove: boolean = this.placement === PlacementEnum.Above;
        const yDir: number = isAbove ? -1 : 1; // flip Y for Above (skyline negative, transform negates)
        const rotDir: number = isAbove ? 1 : -1; // rotation sign
        startY += yDir * rules.SlurNoteHeadYOffset;
        endY += yDir * rules.SlurNoteHeadYOffset;
        const slurStart: PointF2D = new PointF2D(startX, startY);
        const slurEnd: PointF2D = new PointF2D(endX, endY);

        // Collect sky (Above) or bottom (Below) line points
        if (isAbove) {
            points = this.calculateTopPoints(new PointF2D(startX, startY), new PointF2D(endX, endY), staffLine, skyBottomLineCalculator);
            // Track how many points come from the local staff vs merged staves.
            // Only local points feed the maxY override; merged points still shape angles.
            localPointCount = points.length;
            // For cross-staff slurs, merge other staves' skylines into obstacle set
            if (this.slur && this.slur.isCrossed()) {
                const musicSystem: any = staffLine.ParentMusicSystem;
                if (musicSystem) {
                    const startRelY: number = staffLine.PositionAndShape.RelativePosition.y;
                    const sampUnit: number = skyBottomLineCalculator.SamplingUnit;
                    // Only merge from staves of the same instrument (e.g., Piano RH↔LH).
                    // Skip unrelated staves (e.g., vocal staff above piano).
                    const myInstrument: any = staffLine.Measures.length > 0 ? (staffLine.Measures[0] as any).parentStaff?.ParentInstrument : undefined;
                    for (const otherSl of musicSystem.StaffLines) {
                        if (otherSl === staffLine) { continue; }
                        if (myInstrument) {
                            const otherInst: any = otherSl.Measures.length > 0 ? (otherSl.Measures[0] as any).parentStaff?.ParentInstrument : undefined;
                            if (otherInst !== myInstrument) { continue; }
                        }
                        const otherSky: number[] = otherSl.SkyLine;
                        if (!otherSky || otherSky.length === 0) { continue; }
                        const yOffset: number = otherSl.PositionAndShape.RelativePosition.y - startRelY;
                        const otherSampUnit: number = otherSl.SkyBottomLineCalculator
                            ? otherSl.SkyBottomLineCalculator.SamplingUnit : sampUnit;
                        const sIdx: number = Math.max(0, Math.floor(startX * otherSampUnit));
                        const eIdx: number = Math.min(otherSky.length, Math.ceil(endX * otherSampUnit));
                        const chordSpan: number = endX - startX;
                        for (let si: number = sIdx; si < eIdx; si++) {
                            // Interpolate yOffset linearly from 0 at startX to full at endX.
                            // The chord line itself transitions between staves, so points
                            // near startNote should not be shifted by the full staff gap.
                            const x: number = si / otherSampUnit;
                            const t: number = chordSpan > 0 ? (x - startX) / chordSpan : 0;
                            const interpYOffset: number = yOffset * Math.max(0, Math.min(1, t));
                            points.push(new PointF2D(x, otherSky[si] + interpYOffset));
                        }
                    }
                }
            }
            this.debugSkyPoints = points.map((p: PointF2D) => new PointF2D(p.x, p.y));
            this.debugSkyCategories = points.map((_) => "skyline");
        } else {
            points = this.calculateBottomPoints(new PointF2D(startX, startY), new PointF2D(endX, endY), staffLine, skyBottomLineCalculator);
            localPointCount = points.length;
        }

        if (points.length === 0) {
            points.push(new PointF2D((endX - startX) / 2 + startX, (endY - startY) / 2 + startY));
        }

        // Rotate so chord line becomes horizontal
        const startEndLineAngleRadians: number = Math.atan((endY - startY) / (endX - startX));
        const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(rotDir * startEndLineAngleRadians);
        const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();

        const start2: PointF2D = new PointF2D(0, 0);
        let end2: PointF2D = new PointF2D(endX - startX, yDir * (endY - startY));
        end2 = rotationMatrix.vectorMultiplication(end2);

        // Transform points: translate then rotate, with Y sign per placement
        const transformedPoints: PointF2D[] = [];
        for (const pt of points) {
            transformedPoints.push(rotationMatrix.vectorMultiplication(new PointF2D(pt.x - startX, yDir * (pt.y - startY))));
        }

        // Per-point clearance: compute required cp_y so the bezier at each
        // obstacle's original-space chord fraction (t_orig) exceeds the
        // obstacle's transformed-space Y. Uses t_orig (projected onto chord
        // line) instead of transformed t — the rotation shifts X for high-Y
        // points, making them appear near-end in transformed space.
        // For cross-staff slurs, applies to merged points only + staff-gap
        // fallback. For all slurs, replaces the old maxY override which was
        // mathematically wrong (cp_y=obstacle_Y gives bezier height < obstacle_Y).
        this.mergedClearanceCpY = -Infinity;
        if (isAbove) {
            const chordDx: number = endX - startX;
            const chordDy: number = endY - startY;
            const chordLenSq: number = chordDx * chordDx + chordDy * chordDy;
            const minT: number = 0.15;
            const maxT: number = 0.85;
            const maxMult: number = 1.5;
            const startI: number = this.slur?.isCrossed() ? localPointCount : 0;
            for (let i: number = startI; i < points.length; i++) {
                const orig: PointF2D = points[i];
                const dx: number = orig.x - startX;
                const dy: number = orig.y - startY;
                const tOrig: number = (dx * chordDx + dy * chordDy) / chordLenSq;
                if (tOrig < minT || tOrig > maxT) { continue; }
                const trans: PointF2D = transformedPoints[i];
                if (trans.y <= 0) { continue; }
                const needed: number = Math.min(
                    trans.y / (3 * tOrig * (1 - tOrig)),
                    trans.y * maxMult,
                );
                if (needed > this.mergedClearanceCpY) {
                    this.mergedClearanceCpY = needed;
                }
            }
            // Staff-gap fallback for cross-staff slurs: if no merged obstacle
            // detected above chord, apply a minimum lift based on staff gap.
            if (this.slur?.isCrossed()) {
                const staffGap: number = Math.abs(chordDy);
                const gapMinCpY: number = staffGap * 0.7;
                if (this.mergedClearanceCpY < gapMinCpY) {
                    this.mergedClearanceCpY = gapMinCpY;
                }
            }
        }

        // Tangent slopes
        const leftLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
        const rightLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
        const leftLineD: number = start2.y - start2.x * leftLineSlope;
        const rightLineD: number = end2.y - end2.x * rightLineSlope;

        // Intersection point
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

        // Angles — original code uses minAngle only. calculateAngles was a
        // no-op (JS passes by value), so slopes never influenced the angle.
        // Restored no-op; merged points shape the curve via per-point clearance.
        const leftAngle: number = minAngle;
        const rightAngle: number = -minAngle;
        if (!sameSlope) {
            this.calculateAngles(leftAngle, rightAngle, leftLineSlope, rightLineSlope, maxAngle);
        }

        // Control points
        const controlPoints: {leftControlPoint: PointF2D, rightControlPoint: PointF2D} =
            this.calculateControlPoints(end2.x, leftAngle, rightAngle, transformedPoints, localPointCount);

        // Back-transform to original coordinates
        let leftControlPoint: PointF2D = controlPoints.leftControlPoint;
        let rightControlPoint: PointF2D = controlPoints.rightControlPoint;
        leftControlPoint = transposeMatrix.vectorMultiplication(leftControlPoint);
        leftControlPoint.x += startX;
        leftControlPoint.y = yDir * leftControlPoint.y + startY;
        rightControlPoint = transposeMatrix.vectorMultiplication(rightControlPoint);
        rightControlPoint.x += startX;
        rightControlPoint.y = yDir * rightControlPoint.y + startY;

        // Clamp to prevent backward CPs.
        // When left CP is pushed left of start by the back-rotation, spread it right
        // proportionally to bow depth to avoid a purely vertical initial tangent.
        if (leftControlPoint.x < slurStart.x) {
            const span: number = slurEnd.x - slurStart.x;
            const bow: number = Math.abs(leftControlPoint.y - slurStart.y);
            if (bow > span * 0.5) {
                // Spread left CP right: higher bow → more horizontal spread
                const excess: number = bow - span * 0.5;
                leftControlPoint.x = slurStart.x + Math.min(span * 0.4, excess * 0.5);
            } else {
                leftControlPoint.x = slurStart.x;
            }
        }
        if (rightControlPoint.x > slurEnd.x) { rightControlPoint.x = slurEnd.x; }

        // Set bezier
        this.bezierStartPt = slurStart;
        this.bezierStartControlPt = leftControlPoint;
        this.bezierEndControlPt = rightControlPoint;
        this.bezierEndPt = slurEnd;

        // Update sky/bottom line with final curve
        const line: number[] = isAbove ? staffLine.SkyLine : staffLine.BottomLine;
        const length: number = line.length;
        const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
        const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
        const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
        const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
        const lineOp: (a: number, b: number) => number = isAbove ? Math.min : Math.max;
        for (let i: number = startIndex; i < endIndex; i++) {
            const diff: number = i / samplingUnit - this.bezierStartPt.x;
            const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);
            let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
            if (index >= startIndex) {
                line[index] = lineOp(line[index], curvePoint.y);
            }
            index++;
            if (index < length) {
                line[index] = lineOp(line[index], curvePoint.y);
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
     * This method calculates the two Control Points for the Slur Curve.
     * @param endX
     * @param leftAngle
     * @param rightAngle
     * @param points
     * @param localPointCount number of leading points from the local staff
     *   (remaining points come from cross-staff merge); only these feed maxY.
     */
    private calculateControlPoints(endX: number,
                                            leftAngle: number,
                                            rightAngle: number,
                                            points: PointF2D[],
                                            localPointCount: number = points.length): {leftControlPoint: PointF2D, rightControlPoint: PointF2D} {

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

        // Lift CPs above obstacles. mergedClearanceCpY is pre-computed in
        // calculateCurve per-point with original t (accounts for bezier fraction).
        if (this.placement === PlacementEnum.Above && this.mergedClearanceCpY > leftCp.y) {
            leftCp.y = this.mergedClearanceCpY;
            rightCp.y = this.mergedClearanceCpY;
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
    private calculateAngles(
        leftAngle: number, rightAngle: number, leftLineSlope: number,
        rightLineSlope: number, maxAngle: number,
    ): void {
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
