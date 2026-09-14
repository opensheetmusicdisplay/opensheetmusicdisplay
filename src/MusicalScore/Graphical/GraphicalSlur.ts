
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { Note } from "../VoiceData/Note";
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
import { SLUR_CLEARABLE_MIN_T, SLUR_CLEARABLE_MAX_T } from "./SlurQualityConstants";
import { solveSlurLift, SlurLiftResult } from "./Slur/SlurLiftSolver";
import { collectSlurObstacles, collectSlurObstaclesStaffRelative, CollectContext, SlurObstacle } from "./Slur/SlurObstacle";

export class GraphicalSlur extends GraphicalCurve {
    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    /** Staffline this slur's curve is drawn on. For system-break continuations the
     *  accumulated staffEntries start on a sibling staff (processed first), so the
     *  coordinate frame must come from the added staffline, not staffEntries[0]. */
    public anchorStaffLine?: StaffLine;
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

    private rules?: EngravingRules;

    constructor(slur: Slur, rules?: EngravingRules) {
        super();
        this.slur = slur;
        this.rules = rules;
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
        if (GraphicalSlur.useUnifiedSolver) {
            this.calculateCurveUnified(rules);
        } else {
            this.calculateCurveLegacy(rules);
        }
    }

    /**
     * Unified obstacle-avoidance solver (pixel-frame). Resolves endpoints via the
     * legacy calculateStartAndEnd, collects real notehead/stem obstacles in one
     * SVG-pixel frame, solves a constrained symmetric-cubic lift, then writes the
     * four bezier fields (staffline-local units) and updates the skyline.
     */
    /** Resolve the slur's start/end GraphicalNotes and its staff line. Shared by
     *  the unified solver and the layout-time skyline reservation. */
    private resolveSlurNotes(): {start: GraphicalNote, end: GraphicalNote, staffLine: StaffLine} {
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        let start: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
        if (start === undefined && this.graceStart) {
            start = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
        }
        if (start === undefined) {
            start = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
        }
        let end: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
        if (end === undefined && this.graceEnd) {
            end = endStaffEntry.findGraphicalNoteFromGraceNote(this.slur.EndNote);
        }
        return {start, end, staffLine: this.anchorStaffLine ?? startStaffEntry.parentMeasure.ParentStaffLine};
    }

    /**
     * Layout-time skyline reservation: run the obstacle-aware unified solve in a
     * staff-relative pixel frame (staff origin at 0), so the reserved skyline
     * band equals the final arc for same-staff content — and the inter-staff /
     * inter-system spacing (calculateSystemYLayout) grows to fit it. The final
     * curve is re-solved at draw time against the rendered positions.
     */
    public reserveSkyline(rules: EngravingRules): void {
        const {start: slurStartNote, end: slurEndNote, staffLine} = this.resolveSlurNotes();
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        this.calculatePlacement(skyBottomLineCalculator, staffLine);
        const ep: {startX: number, startY: number, endX: number, endY: number} =
            this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, rules, skyBottomLineCalculator, true);
        const isAbove: boolean = this.placement === PlacementEnum.Above;
        const yDir: number = isAbove ? -1 : 1;
        const startY: number = ep.startY + yDir * rules.SlurNoteHeadYOffset;
        const endY: number = ep.endY + yDir * rules.SlurNoteHeadYOffset;

        const excludeNotes: Set<VF.StemmableNote> = new Set<VF.StemmableNote>();
        const startVf: VF.StemmableNote = (slurStartNote as VexFlowGraphicalNote)?.vfnote?.[0];
        const endVf: VF.StemmableNote = (slurEndNote as VexFlowGraphicalNote)?.vfnote?.[0];
        if (startVf) { excludeNotes.add(startVf); }
        if (endVf) { excludeNotes.add(endVf); }

        const ctx: CollectContext = {
            staffLine,
            startXPx: ep.startX * unitInPixels, endXPx: ep.endX * unitInPixels,
            startYPx: startY * unitInPixels, endYPx: endY * unitInPixels,
            above: isAbove,
            excludeNotes,
            minT: GraphicalSlur.clearableMinT, maxT: GraphicalSlur.clearableMaxT,
            ownVoiceId: this.slur.StartNote?.ParentVoiceEntry?.ParentVoice?.VoiceId,
        };
        const obstacles: SlurObstacle[] = collectSlurObstaclesStaffRelative(ctx);

        const result: SlurLiftResult = solveSlurLift(
            new PointF2D(ep.startX * unitInPixels, startY * unitInPixels),
            new PointF2D(ep.endX * unitInPixels, endY * unitInPixels),
            obstacles,
            {
                minT: GraphicalSlur.clearableMinT, maxT: GraphicalSlur.clearableMaxT,
                k: GraphicalSlur.k, d: GraphicalSlur.d,
                tangentAngleDeg: rules.SlurTangentMinAngle,
                marginPx: GraphicalSlur.injectClearanceMargin * unitInPixels,
                slackPx: GraphicalSlur.antiBalloonSlack * unitInPixels,
                maxBowRatio: GraphicalSlur.maxBowRatio,
                maxCpPx: GraphicalSlur.maxBowCpY * unitInPixels,
                hardMaxCpPx: GraphicalSlur.hardMaxBowCpY * unitInPixels,
                above: isAbove,
            },
        );
        this.bezierStartPt = new PointF2D(ep.startX, startY);
        this.bezierEndPt = new PointF2D(ep.endX, endY);
        this.bezierStartControlPt = new PointF2D(result.c1.x / unitInPixels, result.c1.y / unitInPixels);
        this.bezierEndControlPt = new PointF2D(result.c2.x / unitInPixels, result.c2.y / unitInPixels);
        this.updateSkyBottomLine(staffLine, skyBottomLineCalculator);
    }

    private calculateCurveUnified(rules: EngravingRules): void {
        const {start: slurStartNote, end: slurEndNote, staffLine} = this.resolveSlurNotes();

        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        this.calculatePlacement(skyBottomLineCalculator, staffLine);

        const startEndPoints: {startX: number, startY: number, endX: number, endY: number} =
            this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, rules, skyBottomLineCalculator);

        const isAbove: boolean = this.placement === PlacementEnum.Above;
        const yDir: number = isAbove ? -1 : 1;
        const startX: number = startEndPoints.startX;
        const endX: number = startEndPoints.endX;
        const startY: number = startEndPoints.startY + yDir * rules.SlurNoteHeadYOffset;
        const endY: number = startEndPoints.endY + yDir * rules.SlurNoteHeadYOffset;

        // ── Convert endpoints to the rendered SVG-pixel frame (same frame as the
        //    reporter/drawer: (local + abs) * unitInPixels). ─────────────────────
        const abs: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        const startXPx: number = (startX + abs.x) * unitInPixels;
        const startYPx: number = (startY + abs.y) * unitInPixels;
        const endXPx: number = (endX + abs.x) * unitInPixels;
        const endYPx: number = (endY + abs.y) * unitInPixels;

        // ── Own endpoint VF notes are excluded from the obstacle set. ────────────
        const excludeNotes: Set<VF.StemmableNote> = new Set<VF.StemmableNote>();
        const startVf: VF.StemmableNote = (slurStartNote as VexFlowGraphicalNote)?.vfnote?.[0];
        const endVf: VF.StemmableNote = (slurEndNote as VexFlowGraphicalNote)?.vfnote?.[0];
        if (startVf) { excludeNotes.add(startVf); }
        if (endVf) { excludeNotes.add(endVf); }

        const endGN: GraphicalNote = rules.GNote(this.slur.EndNote);
        const endSL: StaffLine | undefined = endGN?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        const ctx: CollectContext = {
            staffLine, startXPx, endXPx, startYPx, endYPx,
            above: isAbove,
            excludeNotes,
            minT: GraphicalSlur.clearableMinT, maxT: GraphicalSlur.clearableMaxT,
            ownVoiceId: this.slur.StartNote?.ParentVoiceEntry?.ParentVoice?.VoiceId,
            crossSystemFirstHalf: !!(endSL && endSL.ParentMusicSystem !== staffLine.ParentMusicSystem),
        };
        const obstacles: SlurObstacle[] = collectSlurObstacles(ctx);

        // ── Solve the constrained lift in the pixel frame. ──────────────────────
        const result: SlurLiftResult = solveSlurLift(
            new PointF2D(startXPx, startYPx), new PointF2D(endXPx, endYPx),
            obstacles,
            {
                minT: GraphicalSlur.clearableMinT, maxT: GraphicalSlur.clearableMaxT,
                k: GraphicalSlur.k, d: GraphicalSlur.d,
                tangentAngleDeg: (endSL && endSL.ParentMusicSystem !== staffLine.ParentMusicSystem && !isAbove) ? 10 : rules.SlurTangentMinAngle,
                marginPx: GraphicalSlur.injectClearanceMargin * unitInPixels,
                slackPx: GraphicalSlur.antiBalloonSlack * unitInPixels,
                maxBowRatio: GraphicalSlur.maxBowRatio,
                maxCpPx: GraphicalSlur.maxBowCpY * unitInPixels,
                hardMaxCpPx: GraphicalSlur.hardMaxBowCpY * unitInPixels,
                above: isAbove,
            },
        );

        // ── Convert control points back to staffline-local units. ───────────────
        const toLocal: (pPx: PointF2D) => PointF2D = (pPx: PointF2D): PointF2D =>
            new PointF2D(pPx.x / unitInPixels - abs.x, pPx.y / unitInPixels - abs.y);
        this.bezierStartPt = new PointF2D(startX, startY);
        this.bezierEndPt = new PointF2D(endX, endY);
        this.bezierStartControlPt = toLocal(result.c1);
        this.bezierEndControlPt = toLocal(result.c2);

        // ── Debug overlay points in staffline-local units. ──────────────────────
        this.debugSkyPoints = obstacles.map((o) => toLocal(new PointF2D(o.xPx, o.yPx)));
        this.debugSkyCategories = obstacles.map(
            (o) => o.trusted ? o.kind : `${o.kind}-untrusted`);

        this.updateSkyBottomLine(staffLine, skyBottomLineCalculator);
    }

    /** Feed the final bezier into the staff sky/bottom line (shared by both paths). */
    private updateSkyBottomLine(staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): void {
        const isAbove: boolean = this.placement === PlacementEnum.Above;
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

    private calculateCurveLegacy(rules: EngravingRules): void {

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
        const myInstrument: any = staffLine.Measures.length > 0 ? (staffLine.Measures[0] as any).parentStaff?.ParentInstrument : undefined;
        if (isAbove) {
            points = this.calculateTopPoints(new PointF2D(startX, startY), new PointF2D(endX, endY), staffLine, skyBottomLineCalculator);
            // Track how many points come from the local staff vs merged staves.
            // Only local points feed the maxY override; merged points still shape angles.
            localPointCount = points.length;
            // For cross-staff slurs only, merge other staves' skylines into obstacle set.
            // Merge skyline from sibling staves so bezier clears adjacent staff.
            // Non-cross slurs must NOT get sibling staff obstacles — they're in a
            // different Y space and would falsely inflate clearance.
            if (this.slur?.isCrossed() && staffLine.ParentMusicSystem) {
                const musicSystem: any = staffLine.ParentMusicSystem;
                if (musicSystem) {
                    const startRelY: number = staffLine.PositionAndShape.RelativePosition.y;
                    const sampUnit: number = skyBottomLineCalculator.SamplingUnit;
                    // Only merge from staves of the same instrument (e.g., Piano RH↔LH).
                    // Skip unrelated staves (e.g., vocal staff above piano).
                    for (const otherSl of musicSystem.StaffLines) {
                        if (otherSl === staffLine) { continue; }
                        if (myInstrument) {
                            const otherInst: any = otherSl.Measures.length > 0 ? (otherSl.Measures[0] as any).parentStaff?.ParentInstrument : undefined;
                            if (otherInst !== myInstrument) { continue; }
                        }
                        const otherSky: number[] = otherSl.SkyLine;
                        if (!otherSky || otherSky.length === 0) { continue; }
                        // Staff Y layout is finalized BEFORE calculateSlurs (see
                        // MusicSheetCalculator), so RelativePosition.y is the final
                        // content-aware staff gap — matches the rendered layout.
                        const yOffset: number = otherSl.PositionAndShape.RelativePosition.y - startRelY;
                        const otherSampUnit: number = otherSl.SkyBottomLineCalculator
                            ? otherSl.SkyBottomLineCalculator.SamplingUnit : sampUnit;
                        const sIdx: number = Math.max(0, Math.floor(startX * otherSampUnit));
                        const eIdx: number = Math.min(otherSky.length, Math.ceil(endX * otherSampUnit));
                        for (let si: number = sIdx; si < eIdx; si++) {
                            const x: number = si / otherSampUnit;
                            // Use full yOffset for ALL points — sibling staff skyline is in
                            // that staff's coordinate system, so shift by the full staff gap.
                            points.push(new PointF2D(x, otherSky[si] + yOffset));
                        }
                    }
                }
            }
            this.debugSkyPoints = points.map((p: PointF2D) => new PointF2D(p.x, p.y));
            this.debugSkyCategories = points.map((_) => "skyline");

            // Inject notehead/stem obstacle points from ALL notes in all measures
            // overlapping the slur's X range (not just same-voice staffEntries).
            // Pixel-based skyline misses noteheads far above the staff (ledger lines)
            // and notes in other voices on the same staff.
            // Iterate all staffLines in the system so other-staff notes (treble
            // noteheads above a bass-staff chord on ledger lines) are included.
            const isCrossStaffInj: boolean = !!this.slur?.isCrossed();
            // Inject from all system staves so the bezier can clear noteheads
            // above the chord even from the sibling staff (e.g. treble noteheads
            // above a bass-staff chord on ledger lines).
            // Cap the vertical distance so obstacles far above the chord (another
            // staff / another system) don't balloon the slur.
            const injMaxDist: number = isCrossStaffInj ? Infinity : GraphicalSlur.injectMaxDistNonCross; // 2 staff heights
            const musicSysInj: any = staffLine.ParentMusicSystem;
            // Non-cross slurs stay on one staff: inject from the local staff only.
            // Sibling-staff noteheads live in a different Y band (shifted by the full
            // staff gap), so treating them as obstacles inflates clearance and balloons
            // the slur. Only cross-staff slurs clear obstacles from sibling staves.
            const injStaffLines: StaffLine[] = (isCrossStaffInj && musicSysInj)
                ? musicSysInj.StaffLines : [staffLine];
            const currentStaffRelY: number = staffLine.PositionAndShape.RelativePosition.y;
            for (const injSl of injStaffLines) {
                // Staff Y layout is finalized BEFORE calculateSlurs, so the
                // RelativePosition difference is the final content-aware staff gap.
                const staffYOffset: number = injSl.PositionAndShape.RelativePosition.y - currentStaffRelY;
                // Skip unrelated instrument staves
                if (isCrossStaffInj && myInstrument) {
                    const otherInst: any = injSl.Measures.length > 0
                        ? (injSl.Measures[0] as any).parentStaff?.ParentInstrument : undefined;
                    if (otherInst !== myInstrument) { continue; }
                }
                for (const gm of injSl.Measures) {
                    const mRelX: number = gm.PositionAndShape?.RelativePosition?.x ?? 0;
                    const mRelY: number = gm.PositionAndShape?.RelativePosition?.y ?? 0;
                    for (const gse of gm.staffEntries) {
                        if (!gse.graphicalVoiceEntries) { continue; }
                        for (const gve2 of gse.graphicalVoiceEntries as any[]) {
                            const gvex2: number = gve2.PositionAndShape?.RelativePosition?.x;
                            if (gvex2 === undefined || gvex2 === null) { continue; }
                            const entryRelX2: number = gse.PositionAndShape?.RelativePosition?.x ?? 0;
                            const noteX2: number = gvex2 + entryRelX2 + mRelX;
                            if (noteX2 < Math.min(startX, endX) || noteX2 > Math.max(startX, endX)) { continue; }
                            // Match the clearance t-range: obstacles near the slur's endpoints
                            // can't be cleared by bowing (bezier is nearly flat there), so
                            // don't inject/mark them as relevant obstacles.
                            const injT: number = (noteX2 - startX) / (endX - startX);
                            if (injT < GraphicalSlur.clearableMinT || injT > GraphicalSlur.clearableMaxT) { continue; }
                            // Use OSMD model Y, converted to the current staff's space via
                            // the final computed staff gap (matches rendered SVG).
                            const gveRelY2: number = gve2.PositionAndShape?.RelativePosition?.y ?? 0;
                            const entryRelY2: number = gse.PositionAndShape?.RelativePosition?.y ?? 0;
                            const borderTop2: number = (gve2.PositionAndShape as any)?.BorderTop ?? 0;
                            const borderBottom2: number = (gve2.PositionAndShape as any)?.BorderBottom ?? 0;
                            const topY2: number = gveRelY2 + entryRelY2 + mRelY + staffYOffset + (isAbove ? borderTop2 : 0);
                            const bottomY2: number = gveRelY2 + entryRelY2 + mRelY + staffYOffset + (!isAbove ? -borderBottom2 : 0);
                            const clearanceMargin: number = GraphicalSlur.injectClearanceMargin;
                            // Inject notehead top/bottom
                            if (isAbove && topY2 < startY + clearanceMargin
                                && startY - topY2 < injMaxDist) {
                                points.push(new PointF2D(noteX2, topY2));
                                this.debugSkyPoints.push(new PointF2D(noteX2, topY2));
                                this.debugSkyCategories.push("injected");
                            }
                            if (!isAbove && bottomY2 > startY - clearanceMargin
                                && bottomY2 - startY < injMaxDist) {
                                points.push(new PointF2D(noteX2, bottomY2));
                                this.debugSkyPoints.push(new PointF2D(noteX2, bottomY2));
                                this.debugSkyCategories.push("injected");
                            }
                        }
                    }
                }
            }
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
        const chordDx: number = endX - startX;
        const chordDy: number = endY - startY;
        const chordLenSq: number = chordDx * chordDx + chordDy * chordDy;
        const minT: number = GraphicalSlur.clearableMinT;
        const maxT: number = GraphicalSlur.clearableMaxT;
        if (isAbove) {
            const startI: number = this.slur?.isCrossed() ? localPointCount : 0;
            for (let i: number = startI; i < points.length; i++) {
                const orig: PointF2D = points[i];
                const dx: number = orig.x - startX;
                const dy: number = orig.y - startY;
                const tOrig: number = (dx * chordDx + dy * chordDy) / chordLenSq;
                if (tOrig < minT || tOrig > maxT) { continue; }
                const trans: PointF2D = transformedPoints[i];
                if (trans.y <= 0) { continue; }
                // Exact bezier height formula: B(t) = 3*t*(1-t) * cpY
                // To clear obstacle at height trans.y above chord, solve for cpY:
                //   cpY = trans.y / (3 * t * (1-t))
                const needed: number = trans.y / (3 * tOrig * (1 - tOrig));
                if (needed > this.mergedClearanceCpY) {
                    this.mergedClearanceCpY = needed;
                }
            }
        } else {
            // Below placement: clear obstacles below chord (bottom line).
            // Same per-point formula as above, but negated (cpY goes below chord).
            this.mergedClearanceCpY = Infinity;
            for (let i: number = 0; i < points.length; i++) {
                const orig: PointF2D = points[i];
                const dx: number = orig.x - startX;
                const dy: number = orig.y - startY;
                const tOrig: number = (dx * chordDx + dy * chordDy) / chordLenSq;
                if (tOrig < minT || tOrig > maxT) { continue; }
                const trans: PointF2D = transformedPoints[i];
                if (trans.y <= 0) { continue; }
                const needed: number = trans.y / (3 * tOrig * (1 - tOrig));
                const neededBelow: number = -needed;
                if (neededBelow < this.mergedClearanceCpY) {
                    this.mergedClearanceCpY = neededBelow;
                }
            }
        }

        // S7 tangent angles: minAngle sets the natural baseline cp_y in
        // calculateControlPoints. The slope-based intersection + calculateAngles
        // adjustment was a pass-by-value no-op (never influenced the angle) —
        // removed. On the study corpus mergedClearanceCpY always overrides the
        // angle cp_y, so SlurTangentMinAngle has no measurable effect.
        const leftAngle: number = minAngle;
        const rightAngle: number = -minAngle;

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
    /** Last staff entry on the given staff line — the system-break point. Cross-staff
     *  slurs mix entries of both staves, so scan backwards for the entry that belongs
     *  to THIS staff line (no sibling-staff Y offset applies at the break). */
    private lastStaffEntryOnStaffLine(staffLine: StaffLine): GraphicalStaffEntry | undefined {
        for (let ei: number = this.staffEntries.length - 1; ei >= 0; ei--) {
            if (this.staffEntries[ei].parentMeasure.ParentStaffLine === staffLine) {
                return this.staffEntries[ei];
            }
        }
        return undefined;
    }

    /**
     * Horizontal offset (in staffline-relative units) moving a slur endpoint from
     * the notehead to the stem. Returns 0 unless the stem points toward the slur
     * (up-stem under an above-slur, down-stem under a below-slur): only then does
     * the endpoint attach at the stem tip. The offset is note-internal geometry
     * (getStemX and the endpoint X live in the same pixel frame), so it is
     * identical at layout time (skyline reservation) and at draw time (final curve).
     */
    private static stemAttachmentXOffset(
        vfNote: VF.StemmableNote | undefined,
        endpointX: number,
        staffLineAbsX: number,
        above: boolean
    ): number {
        if (!vfNote || !vfNote.hasStem?.()) {
            return 0;
        }
        const dir: number = vfNote.getStemDirection();
        if (!((above && dir === 1) || (!above && dir === -1))) {
            return 0;
        }
        const u: number = unitInPixels;
        const endpointXPx: number = endpointX * u + staffLineAbsX * u;
        return (vfNote.getStemX() - endpointXPx) / u;
    }

    private calculateStartAndEnd(   slurStartNote: GraphicalNote,
                                    slurEndNote: GraphicalNote,
                                    staffLine: StaffLine,
                                    rules: EngravingRules,
                                    skyBottomLineCalculator: SkyBottomLineCalculator,
                                    atLayoutTime: boolean = false): {startX: number, startY: number, endX: number, endY: number} {
        let startX: number = 0;
        let startY: number = 0;
        let endX: number = 0;
        let endY: number = 0;
        // True when endY came from the system-break point (last entry on this staff);
        // the "end at start height" fallback below must not override it.
        let breakPointYSet: boolean = false;

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

            // Stem-side attachment: when the stem points toward the slur, the slur
            // attaches at the stem tip — for up-stems that is to the RIGHT of the
            // notehead, for down-stems to the LEFT. Without this the endpoint Y sits
            // at the stem tip while X stays at the notehead, so the slur hovers
            // beside the stem instead of on its tip.
            startX += GraphicalSlur.stemAttachmentXOffset(
                (slurStartNote as VexFlowGraphicalNote)?.vfnote?.[0],
                startX,
                staffLine.PositionAndShape.AbsolutePosition.x,
                this.placement === PlacementEnum.Above
            );

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

        if (!(this.slur && this.slur.isCrossed()) && slurEndNote !== undefined) {
            endX = slurEndNote.PositionAndShape.RelativePosition.x + slurEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + slurEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            // If Slur ends in a Gracenote
            if (this.graceEnd) {
                endX += slurEndNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // Stem-side attachment (see start note above).
            endX += GraphicalSlur.stemAttachmentXOffset(
                (slurEndNote as VexFlowGraphicalNote)?.vfnote?.[0],
                endX,
                staffLine.PositionAndShape.AbsolutePosition.x,
                this.placement === PlacementEnum.Above
            );

            const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
            if (this.placement === PlacementEnum.Above) {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderTop;
            } else {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
            }
        } else if (this.slur && this.slur.isCrossed()) {
            // Cross-staff: end note on a different staff. If it is also in a different
            // SYSTEM, this is the first half of a system-break split — the curve stops
            // at the system break (this staff's last staff entry), not at the far end
            // note (whose frame belongs to the next system).
            const endGN: GraphicalNote = rules.GNote(this.slur.EndNote);
            const endStaffLine: StaffLine = endGN?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
            if (endStaffLine && endStaffLine.ParentMusicSystem !== staffLine.ParentMusicSystem) {
                const breakEntry: GraphicalStaffEntry | undefined = this.lastStaffEntryOnStaffLine(staffLine);
                // A slur starting on the LAST note of the system has no entry after it
                // to serve as the break point — fall back to the system edge.
                if (breakEntry && breakEntry !== this.staffEntries[0]) {
                    endX = breakEntry.PositionAndShape.RelativePosition.x
                        + breakEntry.parentMeasure.PositionAndShape.RelativePosition.x;
                    // First half of a system-break split: end at the same stave-relative
                    // height as the second half — the slur's end note's VF5 stave line
                    // converted into the continuation staff's frame (`5 - topLine` +
                    // staff offset, same computation the continuation half uses for its
                    // endpoint), so both halves continue at a consistent level across
                    // the break. Layout-time reservation keeps the natural bow.
                    if (!atLayoutTime) {
                        const vfNt: VF.StaveNote = (endGN as VexFlowGraphicalNote)?.vfnote?.[0] as VF.StaveNote;
                        const endSL: StaffLine | undefined =
                            endGN?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
                        if (vfNt && endSL) {
                            const kps: any[] = vfNt.getKeyProps?.() ?? [];
                            if (kps.length > 0) {
                                const topLine: number = Math.max(...kps.map((kp: any) => kp.line));
                                // Continuation staffline in the end note's system (same
                                // staff as this first half) — the height reference the
                                // second half is drawn on.
                                let contAbsY: number | undefined;
                                for (const sl of endSL.ParentMusicSystem?.StaffLines ?? []) {
                                    if (sl.ParentStaff === staffLine.ParentStaff) {
                                        contAbsY = sl.PositionAndShape.AbsolutePosition.y;
                                        break;
                                    }
                                }
                                if (contAbsY !== undefined) {
                                    // The offset is meant to be the distance between two
                                    // STAVES inside the end note's system (a few units:
                                    // treble vs bass). When the reference staffline
                                    // resolves to a different system the difference is the
                                    // whole inter-system distance instead, and the endpoint
                                    // lands thousands of units away — the bezier control
                                    // points then sit far below the sheet and the slur
                                    // balloons down over the systems beneath it (measured:
                                    // a 1530px tall, 161px wide curve, 43% of the sheet).
                                    // Clamp to a plausible staff offset; beyond that the
                                    // reference is wrong, not the music.
                                    const rawOffset: number =
                                        endSL.PositionAndShape.AbsolutePosition.y - contAbsY;
                                    const maxOffset: number = GraphicalSlur.maxCrossSystemStaffOffset;
                                    const offset: number = Math.abs(rawOffset) > maxOffset
                                        ? Math.sign(rawOffset) * maxOffset
                                        : rawOffset;
                                    endY = (5 - topLine) + offset;
                                } else {
                                    endY = startY;
                                }
                            } else {
                                endY = startY;
                            }
                        } else {
                            endY = startY;
                        }
                    } else {
                        endY = startY;
                    }
                    breakPointYSet = true;
                } else {
                    endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
                }
            } else {
                // Same-system cross-staff: end note is on the sibling staff — use VF5 stave position.
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
                    if (endStaffLine && endStaffLine !== staffLine) {
                        const yOffset: number = endStaffLine.PositionAndShape.AbsolutePosition.y
                            - staffLine.PositionAndShape.AbsolutePosition.y;
                        endY += yOffset;
                    }
                } else {
                    endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
                }
            }
        } else {
            // Same-staff slur whose end note is not in this staffline's entries — it
            // may be in a different SYSTEM. Then this is the first half of a system-break
            // split: stop at the very end of this system's last measure, at a height in
            // the inter-system gap where the second half continues. Otherwise fall back
            // to the system edge.
            const endGN2: GraphicalNote = rules.GNote(this.slur.EndNote);
            const endSL2: StaffLine = endGN2?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
            if (endSL2 && endSL2.ParentMusicSystem !== staffLine.ParentMusicSystem) {
                // The system break IS the very end of this system's last measure.
                endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
                // At layout time the next system's Y is not final yet — reserve only
                // the natural-bow envelope (the slur's own height). At draw time the
                // systems are positioned: a below-placement slur drops its endpoint
                // into the vertical middle of the gap between the systems, where the
                // second half continues. Above-placement keeps the slur height.
                if (!atLayoutTime && this.placement === PlacementEnum.Below) {
                    // Below-placement first half of a system-break split: end at the
                    // same stave-relative height as the second half (the slur's end
                    // note in the next system), so both halves continue at a
                    // consistent level across the system break — not deep into the
                    // inter-system gap (that visually detaches the two halves).
                    const endVE2: GraphicalVoiceEntry | undefined = endGN2?.parentVoiceEntry;
                    if (endVE2) {
                        endY = endVE2.PositionAndShape.RelativePosition.y
                            + endVE2.PositionAndShape.BorderBottom;
                    } else {
                        endY = startY;
                    }
                } else {
                    endY = startY;
                }
                breakPointYSet = true;
            } else {
                endX = Math.max(staffLine.PositionAndShape.Size.width, 0);
            }
        }

        // if GraphicalSlur breaks over System, then the end/start of the curve is at the corresponding height with the known start/end
        if (slurStartNote === undefined && slurEndNote === undefined) {
            startY = 0;
            endY = 0;
        }
        if (slurStartNote === undefined) {
            startY = endY;
        }
        if (slurEndNote === undefined && !(this.slur?.isCrossed()) && !breakPointYSet) {
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
        // Respect the XML placement when requested (SlurPlacementFromXML defaults
        // to true): a slur written "below" stays below, "above" stays above. This
        // is what makes flips (a rewritten placement attribute) take effect. Only
        // within-staff slurs: a cross-staff slur's "below" is a MuseScore export
        // artifact (source slurs span the inter-staff gap regardless), and its
        // arc-over design is what the solver is tuned for.
        if (this.rules?.SlurPlacementFromXML && !this.slur.isCrossed()) {
            if (this.slur.PlacementXml === PlacementEnum.Below) {
                this.placement = PlacementEnum.Below;
                return;
            }
            if (this.slur.PlacementXml === PlacementEnum.Above) {
                this.placement = PlacementEnum.Above;
                return;
            }
            // No XML direction: auto-place. In a polyphonic measure the slur must
            // arc away from its companion voice: a slur on a linked (secondary)
            // voice arcs below, one on the main voice arcs above. Without this,
            // a low chord's slur looks "above-able" on its own line while the
            // upper voice occupies that space (D4→F#4 under A4/C5).
            if (this.isInMultiVoiceMeasure()) {
                this.placement = this.isInLinkedVoice()
                    ? PlacementEnum.Below
                    : PlacementEnum.Above;
                return;
            }
            // Prefer above; flip below when the notes sit so high that an above
            // arc would not fit within the staff.
            this.placement = this.calculateAutoPlacement(staffLine);
            return;
        }

        // The default placement for slurs is above.
        if (this.placement !== PlacementEnum.Below) {
            this.placement = PlacementEnum.Above;
        }
    }

    /** Whether any staff entry the slur touches sits in a measure with more than
     *  one voice (polyphonic). Mirrors the VF1 placement rule: in polyphonic
     *  music the slur arcs away from the companion voice. */
    private isInMultiVoiceMeasure(): boolean {
        for (const se of this.staffEntries) {
            if (se.parentMeasure.hasMultipleVoices()) {
                return true;
            }
        }
        return false;
    }

    /** Whether the slur's start or end note lives in a LinkedVoice — the
     *  secondary voice a polyphonic staff gets for its non-first <voice>.
     *  Such slurs arc below; the main voice's slurs arc above. */
    private isInLinkedVoice(): boolean {
        const inLinked: (note: Note | undefined) => boolean = (note: Note | undefined): boolean =>
            note?.ParentVoiceEntry?.ParentVoice instanceof LinkedVoice;
        return inLinked(this.slur.StartNote) || inLinked(this.slur.EndNote);
    }

    /** Minimum room above the slur's chord (staff units, top line = 0) for an
     *  auto-placed above slur. Below that, auto-placement flips the slur below. */
    public static autoPlaceMinAboveSpace: number = 2.0;

    /** Auto placement for slurs without an XML direction: prefer above, but flip
     *  below when the chord sits high enough that an above arc would not fit.
     *  Uses the VF note's line: a 5-line staff spans vfLine 1 (bottom) to 5 (top),
     *  so room above the chord = 5 - highest vfLine of the start/end chord. */
    private calculateAutoPlacement(_staffLine: StaffLine): PlacementEnum {
        const {start, end} = this.resolveSlurNotes();
        let highestLine: number = -Infinity;
        const consider: (note: GraphicalNote | undefined) => void = (note: GraphicalNote | undefined): void => {
            const vf: VF.StemmableNote | undefined = (note as VexFlowGraphicalNote)?.vfnote?.[0];
            if (vf) { highestLine = Math.max(highestLine, vf.getLineNumber()); }
        };
        consider(start);
        consider(end);
        if (!isFinite(highestLine)) { return PlacementEnum.Above; }
        const roomAbove: number = 5 - highestLine;
        return roomAbove < GraphicalSlur.autoPlaceMinAboveSpace ? PlacementEnum.Below : PlacementEnum.Above;
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
        } else if (this.placement === PlacementEnum.Below && this.mergedClearanceCpY < leftCp.y) {
            leftCp.y = this.mergedClearanceCpY;
            rightCp.y = this.mergedClearanceCpY;
        }

        return {leftControlPoint: leftCp, rightControlPoint: rightCp};
    }

    private static degreesToRadiansFactor: number = Math.PI / 180;

    // ── Slur control screws (Stellschrauben) ────────────────────────────────
    // Each is a named lever with a documented measured effect (screw→effect
    // study, 4-score corpus). Defaults are the tuned baseline. Tests/sweeps
    // override these statics to measure one screw at a time.
    /** S5: bow slope amplitude — horizontal reach of control points (k>0,
     *  higher = fatter curve near endpoints). Range 0.5–1.3.
     *  Measured: weak — collisions/balloons unchanged; k>0.9 raises
     *  leakOverlaps (28→32 at k=1.3) and mean bow ratio. */
    public static k: number = 0.9;
    /** S6: bow slope damping — vertical influence of endpoint tangents.
     *  Range 0.05–0.4.
     *  Measured: weak — higher d improves mean clearance (-59→-53.6 px at
     *  d=0.4) but raises leakOverlaps (26→34) and fattens bows. */
    public static d: number = 0.2;
    /** S1: clearable t-window — obstacles outside [minT,maxT] are ignored.
     *  Wider = bows over more near-endpoint obstacles (taller); narrower =
     *  flatter but may graze.
     *  Measured: the only strong screw. Narrowing [0.25,0.75]→[0.32,0.68]
     *  cuts balloons 64→55 and mean bow ratio 0.385→0.261 with real
     *  collisions (all-obstacle oracle) unchanged ~48; but mean clearance
     *  worsens (-57→-67 px) as near-end obstacles are ignored. Balanced
     *  optimum: [0.32,0.68] (cost 108 vs 126 baseline). */
    public static clearableMinT: number = SLUR_CLEARABLE_MIN_T;
    public static clearableMaxT: number = SLUR_CLEARABLE_MAX_T;
    /** S2: max vertical obstacle distance (non-cross slurs; cross-staff uses
     *  Infinity). Tighter cap = fewer far-above obstacles = flatter.
     *  Measured: no effect on corpus (non-cross-only; corpus dominated by
     *  cross-staff slurs). */
    public static injectMaxDistNonCross: number = 8;
    /** S3: obstacle clearance margin — extra space above a notehead top
     *  before it counts as an obstacle.
     *  Measured: no effect on corpus (0–3.0 identical; no injected obstacle
     *  sits within the margin band). */
    public static injectClearanceMargin: number = 0.8;
    /** Master switch: unified pixel-frame solver (true) vs legacy skyline algo
     *  (false). Kept for A/B measurement via the sweep harness. */
    public static useUnifiedSolver: boolean = true;
    /** Anti-balloon slack (OSMD units): the solver's CP perpendicular height may
     *  exceed the tallest in-window obstacle by at most (margin + slack). Bounds
     *  cross-staff bows to the obstacle band instead of the amplified clearance
     *  requirement. */
    public static antiBalloonSlack: number = 1.5;
    /** Absolute bow ceiling as a fraction of chord length; trims natural-bow
     *  excess on long slurs (only above the clearance requirement). */
    public static maxBowRatio: number = 0.5;
    /** Absolute bow ceiling (OSMD units): the CP perpendicular height never
     *  exceeds this regardless of chord length. The natural bow is proportional
     *  to the chord (k·tan·d ≈ 0.104·span), so a page-width slur (single-line
     *  layout, long same-system phrase) would otherwise balloon to a
     *  fixed-fraction depth. Yields to obstacle clearance, so notes are never
     *  clipped — trims only cosmetic excess. */
    public static maxBowCpY: number = 6.0;
    /** Cross-system slur halves take their endpoint from the staff offset inside
     *  the end note's system. If that reference resolves to another system the
     *  raw difference is the inter-system distance and the slur balloons far
     *  below the sheet, so the offset is clamped to this many OSMD units — more
     *  than any real staff separation, far less than a system gap. */
    public static maxCrossSystemStaffOffset: number = 30.0;
    /** Absolute ceiling on the slur bow that yields to no clearance requirement.
     *  Generous enough that ordinary obstacle avoidance is untouched, small
     *  enough that a divergent requirement cannot balloon the curve over the
     *  systems below it. */
    public static hardMaxBowCpY: number = 5.5;

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
