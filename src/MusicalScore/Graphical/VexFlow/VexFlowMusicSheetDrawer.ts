import * as VF from "vexflow";
import { MusicSheetDrawer } from "../MusicSheetDrawer";
import { RectangleF2D } from "../../../Common/DataObjects/RectangleF2D";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalLabel } from "../GraphicalLabel";
import { VexFlowTextMeasurer } from "./VexFlowTextMeasurer";
import { MusicSystem } from "../MusicSystem";
import { GraphicalObject } from "../GraphicalObject";
import { GraphicalLayers } from "../DrawingEnums";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowBackend } from "./VexFlowBackend";
import { VexFlowOctaveShift } from "./VexFlowOctaveShift";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlowInstantaneousDynamicExpression";
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowInstrumentBrace } from "./VexFlowInstrumentBrace";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { StaffLine } from "../StaffLine";
import { GraphicalSlur } from "../GraphicalSlur";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { GraphicalInstantaneousTempoExpression } from "../GraphicalInstantaneousTempoExpression";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import log from "loglevel";
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { DrawingParameters } from "../DrawingParameters";
import { GraphicalMusicPage } from "../GraphicalMusicPage";
import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
import { GraphicalUnknownExpression } from "../GraphicalUnknownExpression";
import { VexFlowPedal } from "./VexFlowPedal";
import { GraphicalGlissando } from "../GraphicalGlissando";
import { VexFlowGlissando } from "./VexFlowGlissando";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { SvgVexFlowBackend } from "./SvgVexFlowBackend";
import { VexFlowVibratoBracket } from "./VexFlowVibratoBracket";
import { Note } from "../../VoiceData/Note";
import { TremoloBetweenNotes } from "../../VoiceData/Note";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";

/**
 * This is a global constant which denotes the height in pixels of the space between two lines of the stave
 * (when zoom = 1.0)
 * @type number
 */
export const unitInPixels: number = 10;

export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private backend: VexFlowBackend;
    private backends: VexFlowBackend[] = [];
    private zoom: number = 1.0;
    private pageIdx: number = 0; // this is a bad solution, should use MusicPage.PageNumber instead.

    constructor(drawingParameters: DrawingParameters = new DrawingParameters()) {
        super(new VexFlowTextMeasurer(drawingParameters.Rules), drawingParameters);
    }

    public get Backends(): VexFlowBackend[] {
        return this.backends;
    }

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        // vexflow 3.x: change default font
        if (this.rules.DefaultVexFlowNoteFont === "gonville") {
            VF.VexFlow.setFonts("Gonville", "Bravura");
        } // else keep new vexflow default Bravura (more cursive, bold).

        // sizing defaults in Vexflow
        (VF.VexFlow as any).STAVE_LINE_THICKNESS = this.rules.StaffLineWidth * unitInPixels;
        (VF.VexFlow as any).STEM_WIDTH = this.rules.StemWidth * unitInPixels;
        // sets scale/size of notes/rest notes:
        VF.VexFlow.NOTATION_FONT_SCALE = this.rules.VexFlowDefaultNotationFontScale; // default 39
        // VF5: no direct tab font scale equivalent; VF.VexFlow.TABLATURE_FONT_SCALE could be used

        this.pageIdx = 0;
        for (const graphicalMusicPage of graphicalMusicSheet.MusicPages) {
            if (graphicalMusicPage.PageNumber > this.rules.MaxPageToDrawNumber) {
                break;
            }
            const backend: VexFlowBackend = this.backends[this.pageIdx];
            backend.graphicalMusicPage = graphicalMusicPage;
            backend.scale(this.zoom);
            //backend.resize(graphicalMusicSheet.ParentMusicSheet.pageWidth * unitInPixels * this.zoom,
            //               EngravingRules.Rules.PageHeight * unitInPixels * this.zoom);
            this.pageIdx += 1;
        }

        this.pageIdx = 0;
        this.backend = this.backends[0];
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawPage(page: GraphicalMusicPage): void {
        if (!page) {
            return;
        }
        this.backend = this.backends[page.PageNumber - 1]; // TODO we may need to set this in a couple of other places. this.pageIdx is a bad solution
        super.drawPage(page);
        this.pageIdx += 1;
    }

    public clear(): void {
        for (const backend of this.backends) {
            backend.clear();
        }
    }

    public setZoom(zoom: number): void {
        this.zoom = zoom;
    }

    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    public calculatePixelDistance(unitDistance: number): number {
        return unitDistance * unitInPixels;
    }

    protected drawStaffLine(staffLine: StaffLine): void {
        const ctx: VF.RenderContext = this.backend.getContext();
        const stafflineNode: Node = ctx.openGroup();
        if (stafflineNode) {
            (stafflineNode as SVGGElement).classList.add("staffline");
            if (staffLine.ParentStaff) {
                (stafflineNode as SVGGElement).id =
                    `${staffLine.ParentStaff.ParentInstrument?.Name}${staffLine.ParentStaff.ParentInstrument?.Id}-${staffLine.ParentStaff?.Id}`;
            }
        }
        super.drawStaffLine(staffLine);
        const absolutePos: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        if (this.rules.RenderSlurs) {
            this.drawSlurs(staffLine as VexFlowStaffLine, absolutePos);
        }
        if (this.rules.RenderGlissandi) {
            this.drawGlissandi(staffLine as VexFlowStaffLine, absolutePos);
        }
        ctx.closeGroup();
    }

    private drawSlurs(vfstaffLine: VexFlowStaffLine, absolutePos: PointF2D): void {
        for (const graphicalSlur of vfstaffLine.GraphicalSlurs) {
            if (graphicalSlur.slur.isCrossed()) {
                if (!this.rules.RenderSlursAcrossStaves) {
                    continue; // cross-staff slurs disabled (supplementary to RenderSlurs)
                }
                // A cross-staff slur spans two stafflines, so its curve is calculated here (at draw time, when
                // both stafflines have their final positions) rather than in calculateSlurs(). It is attached
                // to the start note's staffline, so absolutePos already refers to that staffline.
                if (!graphicalSlur.calculateCurveCrossStaff(this.rules)) {
                    continue; // couldn't be calculated (e.g. notes in different systems)
                }
            }
            this.drawSlur(graphicalSlur, absolutePos);
        }
    }

    private drawGlissandi(vfStaffLine: VexFlowStaffLine, absolutePos: PointF2D): void {
        for (const gGliss of vfStaffLine.GraphicalGlissandi) {
            this.drawGlissando(gGliss, absolutePos);
        }
    }

    private drawGlissando(gGliss: GraphicalGlissando, abs: PointF2D): void {
        if (!gGliss.StaffLine.ParentStaff.isTab) {
            gGliss.calculateLine(this.rules);
        }
        if (gGliss.Line) {
            const newStart: PointF2D = new PointF2D(gGliss.Line.Start.x + abs.x, gGliss.Line.Start.y);
            const newEnd: PointF2D = new PointF2D(gGliss.Line.End.x + abs.x, gGliss.Line.End.y);
            // note that we do not add abs.y, because GraphicalGlissando.calculateLine() uses AbsolutePosition for y,
            //   because unfortunately RelativePosition seems imprecise.
            gGliss.Line.SVGElement = this.drawLine(newStart, newEnd, gGliss.Color, gGliss.Width);
        } else {
            const vfTie: VF.StaveTie = (gGliss as VexFlowGlissando).vfTie;
            if (vfTie) {
                const context: VF.RenderContext = this.backend.getContext();
                vfTie.setContext(context);
                vfTie.draw();
            }
        }
    }

    private drawSlur(graphicalSlur: GraphicalSlur, abs: PointF2D): void {
        const curvePointsInPixels: PointF2D[] = [];
        // 1) create inner or original curve:
        const p1: PointF2D = new PointF2D(graphicalSlur.bezierStartPt.x + abs.x, graphicalSlur.bezierStartPt.y + abs.y);
        const p2: PointF2D = new PointF2D(graphicalSlur.bezierStartControlPt.x + abs.x, graphicalSlur.bezierStartControlPt.y + abs.y);
        const p3: PointF2D = new PointF2D(graphicalSlur.bezierEndControlPt.x + abs.x, graphicalSlur.bezierEndControlPt.y + abs.y);
        const p4: PointF2D = new PointF2D(graphicalSlur.bezierEndPt.x + abs.x, graphicalSlur.bezierEndPt.y + abs.y);

        // Adjust slur start/end Y to clear cross-staff beams.
        // During layout (calculateCurve), cross-staff beam positions aren't known yet;
        // they are only set at draw time by positionCrossStaffBeams(). The pre-computed
        // bezier Y may sit at notehead level while the beam extends far above/below it.
        // Adjust both the endpoint and its control point together so the curve doesn't dip.
        this.adjustSlurForBeam(graphicalSlur, p1, p2, true);
        this.adjustSlurForBeam(graphicalSlur, p4, p3, false);

        // put screen transformed points into array
        curvePointsInPixels.push(this.applyScreenTransformation(p1));
        curvePointsInPixels.push(this.applyScreenTransformation(p2));
        curvePointsInPixels.push(this.applyScreenTransformation(p3));
        curvePointsInPixels.push(this.applyScreenTransformation(p4));
        //DEBUG: Render control points
        /*
        for (const point of curvePointsInPixels) {
            const pointRect: RectangleF2D = new RectangleF2D(point.x - 2, point.y - 2, 4, 4);
            this.backend.renderRectangle(pointRect, 3, "#000000", 1);
        }*/

        // 2) create second outer curve to create a thickness for the curve:
        if (graphicalSlur.placement === PlacementEnum.Above) {
            p1.y -= 0.05;
            p2.y -= 0.3;
            p3.y -= 0.3;
            p4.y -= 0.05;
        } else {
            p1.y += 0.05;
            p2.y += 0.3;
            p3.y += 0.3;
            p4.y += 0.05;
        }

        // put screen transformed points into array
        curvePointsInPixels.push(this.applyScreenTransformation(p1));
        curvePointsInPixels.push(this.applyScreenTransformation(p2));
        curvePointsInPixels.push(this.applyScreenTransformation(p3));
        curvePointsInPixels.push(this.applyScreenTransformation(p4));
        const startNote: VexFlowGraphicalNote = this.rules.GNote(graphicalSlur.slur.StartNote) as VexFlowGraphicalNote;
        graphicalSlur.SVGElement = this.backend.renderCurve(curvePointsInPixels, true, startNote);
    }

    /**
     * If the slur start/end note belongs to a cross-staff beam, lift the slur's anchor point
     * and its control point so the curve clears the beam rather than dipping into it.
     *
     * `anchor` and `control` are the bezier endpoint and its adjacent control point
     * in absolute SVG pixels (both will be mutated by the same delta).
     * `isStart` selects whether to look at the slur's StartNote or EndNote.
     *
     * Because slurs are drawn per-staffline (all slurs after all measures on one staffline),
     * a beam owned by a later-drawn staffline may not have its draw-time flatBeamOffset set yet.
     * We therefore compute the beam Y from the layout-time AbsolutePosition of the two staves
     * involved — the same formula that positionCrossStaffBeams() will later use.
     */
    private adjustSlurForBeam(
        graphicalSlur: GraphicalSlur, anchor: PointF2D, control: PointF2D, isStart: boolean
    ): void {
        const osmdNote: Note = isStart ? graphicalSlur.slur.StartNote : graphicalSlur.slur.EndNote;
        if (!osmdNote) { return; }
        const gNote: VexFlowGraphicalNote = this.rules.GNote(osmdNote) as VexFlowGraphicalNote;
        if (!gNote?.vfnote?.[0]) { return; }
        const vfNote: any = gNote.vfnote[0];

        // Determine whether this note is in a cross-staff beam, and if so, which
        // two staves the beam spans. The beam's draw-time flatBeamOffset may not be
        // set yet (different staffline draw order), so we compute it from layout positions.
        const beamInfo: { beamY: number } | undefined = this.getCrossStaffBeamInfo(gNote, vfNote);
        if (!beamInfo) { return; }

        const beamY: number = beamInfo.beamY;
        const noteStemDir: number = vfNote.getStemDirection();

        // The beam sits between the two staves. The note's stem points toward the beam.
        // For UP stem: beam is above notehead → slur must be above beam top (beamY).
        // For DOWN stem: beam is below notehead → slur must be below beam bottom (beamY).
        // Only adjust if the anchor is on the wrong side of the beam.
        const gap: number = 4;
        let targetY: number | undefined;
        if (noteStemDir === VF.Stem.UP && anchor.y > beamY - gap) {
            targetY = beamY - gap;
        } else if (noteStemDir === VF.Stem.DOWN && anchor.y < beamY + gap) {
            targetY = beamY + gap;
        }
        if (targetY === undefined) { return; }

        const delta: number = targetY - anchor.y;
        anchor.y += delta;
        control.y += delta;
    }

    /**
     * Returns { beamY } for the cross-staff beam that `vfNote` belongs to,
     * or undefined if the note is not in a cross-staff beam. Uses draw-time
     * flatBeamOffset when available; otherwise computes from layout positions
     * (needed when the slur's staffline draws before the beam owner's staffline).
     */
    private getCrossStaffBeamInfo(gNote: VexFlowGraphicalNote, vfNote: any): { beamY: number } | undefined {
        const beam: any = vfNote.beam;
        if (!beam) { return undefined; }

        // If the beam already has a draw-time flatBeamOffset, use it directly.
        if (beam.renderOptions?.flatBeams && beam.renderOptions.flatBeamOffset) {
            const firstNote: any = beam.getNotes()[0];
            if (firstNote) {
                const fx: number = firstNote.getStemX();
                const nx: number = vfNote.getStemX();
                const slope: number = beam.slope ?? 0;
                return { beamY: beam.renderOptions.flatBeamOffset + slope * (nx - fx) };
            }
        }

        // Draw-time flatBeamOffset not yet set (beam owner's staffline hasn't drawn).
        // Compute beam Y from layout AbsolutePositions — same formula as positionCrossStaffBeams().
        const thisMeasure: VexFlowMeasure =
            gNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure as VexFlowMeasure;
        if (!thisMeasure) { return undefined; }

        // Look up the sibling measure. The beam is in the OWNER's crossStaffBeamSiblings,
        // which may be a different measure in the same column.
        let ownerMeasure: VexFlowMeasure | undefined;
        let siblingMeasure: VexFlowMeasure | undefined;
        const col: any[] = thisMeasure.ParentMusicSystem?.GraphicalMeasures;
        if (col) {
            let colIdx: number = -1;
            for (let ci: number = 0; ci < col.length; ci++) {
                if (col[ci].indexOf(thisMeasure as any) >= 0) { colIdx = ci; break; }
            }
            if (colIdx >= 0) {
                for (const m of col[colIdx]) {
                    const vm: VexFlowMeasure = m as VexFlowMeasure;
                    for (const [b, sib] of (vm as any).crossStaffBeamSiblings ?? []) {
                        if (b === beam) { ownerMeasure = vm; siblingMeasure = sib; break; }
                    }
                    if (siblingMeasure) { break; }
                }
            }
        }
        if (!siblingMeasure) { return undefined; }

        // Compute beam Y from the two measures' AbsolutePositions.
        const absPos: PointF2D = ownerMeasure!.PositionAndShape.AbsolutePosition;
        const sibPos: PointF2D = siblingMeasure.PositionAndShape.AbsolutePosition;
        const localY: number = absPos.y * unitInPixels;
        const siblingY: number = sibPos.y * unitInPixels;
        const localIsBelow: boolean = localY > siblingY;
        const upperY: number = localIsBelow ? siblingY : localY;
        const lowerY: number = localIsBelow ? localY : siblingY;

        // Stave line spacing — get from either VF stave.
        const vfStave: any = thisMeasure.getVFStave();
        const spacing: number = vfStave?.getSpacingBetweenLines?.() ?? 10;
        const upperBottom: number = upperY + 4 * spacing;
        const lowerTop: number = lowerY;
        return { beamY: upperBottom + (lowerTop - upperBottom) * 0.35 };
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * unitInPixels,
            measure.PositionAndShape.AbsolutePosition.y * unitInPixels
        );
        try {
            measure.draw(this.backend.getContext());
            // Vexflow errors can happen here. If we don't catch errors, rendering will stop after this measure.
        } catch (ex) {
            log.warn("VexFlowMusicSheetDrawer.drawMeasure", ex);
        }

        let newBuzzRollId: number = 0;
        // Draw the StaffEntries
        for (const staffEntry of measure.staffEntries) {
            this.drawStaffEntry(staffEntry);
            newBuzzRollId = this.drawBuzzRolls(staffEntry, newBuzzRollId);
        }
        this.drawTremolosBetweenNotes(measure);
    }

    protected drawBuzzRolls(staffEntry: GraphicalStaffEntry, newBuzzRollId): number {
        for (const gve of staffEntry.graphicalVoiceEntries) {
            for (const note of gve.notes) {
                if (note.sourceNote.TremoloInfo?.tremoloUnmeasured) {
                    const thickness: number = this.rules.TremoloBuzzRollThickness;
                    const baseLength: number = 0.9;
                    const baseHeight: number = 0.5;

                    const vfNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
                    let stemTip: PointF2D;
                    let stemHeight: number;
                    const directionSign: number = vfNote.vfnote[0].getStemDirection(); // 1 or -1
                    let stemElement: HTMLElement;
                    if (this.backend instanceof SvgVexFlowBackend) {
                        stemElement = vfNote.getStemSVG();
                    }
                    const hasBbox: boolean = (stemElement as any)?.getBbox !== undefined;
                    if (hasBbox) {
                        const rect: SVGRect = (stemElement as any).getBBox();
                        stemTip = new PointF2D(rect.x / 10, rect.y / 10);
                        stemHeight = rect.height / 10;
                    } else {
                        stemHeight = vfNote.vfnote[0].getStemLength() / 10;
                        stemTip = new PointF2D(
                            (vfNote.vfnote[0].getStem() as any).xBegin / 10,
                            (vfNote.vfnote[0].getStem() as any).yTop / 10,
                        );
                        if (directionSign === 1) {
                            stemTip.y -= stemHeight;
                        }
                    }

                    let startHeight: number = stemTip.y + stemHeight / 3;
                    if (vfNote.vfnote[0].getBeamCount() > 1) {
                        startHeight = stemTip.y + (stemHeight / 2);
                        if (directionSign === -1) {
                            startHeight -= (baseHeight + 0.2);
                        }
                    }

                    const buzzStartX: number = stemTip.x - 0.5;
                    const buzzStartY: number = startHeight;
                    const pathPoints: PointF2D[] = [];
                    const movements: PointF2D[] = [
                        new PointF2D(0, -thickness),
                        new PointF2D(baseLength-thickness, 0),
                        new PointF2D(-baseLength+thickness,-baseHeight),
                        new PointF2D(0, -thickness),
                        new PointF2D(baseLength, 0),
                        new PointF2D(0, thickness),
                        new PointF2D(-baseLength+thickness, 0),
                        new PointF2D(baseLength-thickness, baseHeight),
                        new PointF2D(0, thickness),
                        new PointF2D(-baseLength, 0)
                    ];
                    let currentPoint: PointF2D = new PointF2D(buzzStartX, buzzStartY);
                    pathPoints.push(currentPoint);
                    for (const movement of movements) {
                        currentPoint = pathPoints.last();
                        pathPoints.push(new PointF2D(currentPoint.x + movement.x, currentPoint.y - movement.y));
                    }
                    this.DrawPath(pathPoints, vfNote.ParentMusicPage, true, `buzzRoll${newBuzzRollId}`);
                    newBuzzRollId++;
                }
            }
        }
        return newBuzzRollId;
    }

    /** Draws the strokes ("tremolo beams") of tremolos between two notes in this measure,
     *  e.g. two alternating half notes with 3 strokes between them, often seen in orchestral string parts.
     *  (Vexflow doesn't support these tremolos, so we draw them ourselves here.)
     *  Also updates the SkyLine/BottomLine where the strokes exceed it.
     */
    protected drawTremolosBetweenNotes(measure: VexFlowMeasure): void {
        if (measure.isTabMeasure) {
            return;
        }
        let strokeId: number = 0;
        for (const staffEntry of measure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                for (const gNote of gve.notes) {
                    const tremolo: TremoloBetweenNotes = gNote.sourceNote.TremoloInfo?.tremoloBetweenNotes;
                    if (!tremolo || tremolo.stopNote !== gNote.sourceNote || !(tremolo.strokes > 0)) {
                        continue;
                        // only draw when reaching the stop note (second note): at this point, both notes have been drawn
                        //   and have their final positions, even if the start note is in a previously drawn measure.
                    }
                    try {
                        strokeId = this.drawTremoloBetweenTwoNotes(tremolo, gNote as VexFlowGraphicalNote, measure, strokeId);
                    } catch (ex) {
                        log.warn("VexFlowMusicSheetDrawer.drawTremolosBetweenNotes", ex);
                    }
                }
            }
        }
    }

    /** Draws the strokes between the two notes of a TremoloBetweenNotes (see drawTremolosBetweenNotes). */
    private drawTremoloBetweenTwoNotes(tremolo: TremoloBetweenNotes, stopGNote: VexFlowGraphicalNote,
                                       measure: VexFlowMeasure, strokeId: number): number {
        if (tremolo.startNote.isRest() || tremolo.stopNote.isRest()) {
            return strokeId; // a tremolo between a note and a rest is invalid
        }
        const startGNote: VexFlowGraphicalNote = this.rules.GNote(tremolo.startNote) as VexFlowGraphicalNote;
        if (!startGNote?.vfnote || !stopGNote.vfnote) {
            return strokeId; // e.g. note not rendered (multiple rest measure)
        }
        const staffLine: StaffLine = measure.ParentStaffLine;
        if (startGNote.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine !== staffLine) {
            log.debug("VexFlowMusicSheetDrawer.drawTremoloBetweenTwoNotes: start and stop note are not in the same staffline " +
                "(e.g. tremolo across a system break), not drawing tremolo strokes.");
            return strokeId;
        }
        const vfStartNote: VF.StemmableNote = startGNote.vfnote[0];
        const vfStopNote: VF.StemmableNote = stopGNote.vfnote[0];
        if (vfStartNote.getAttribute("type") === "GhostNote" || vfStopNote.getAttribute("type") === "GhostNote") {
            return strokeId; // invisible notes (print-object="no")
        }

        // stroke dimensions (in units):
        const strokeThickness: number = this.rules.TremoloBetweenNotesStrokeThickness;
        const strokePeriod: number = strokeThickness + this.rules.TremoloBetweenNotesStrokeGap;
        const totalStrokesHeight: number = tremolo.strokes * strokeThickness + (tremolo.strokes - 1) * this.rules.TremoloBetweenNotesStrokeGap;
        const yPadding: number = this.rules.TremoloBetweenNotesYPadding;

        // calculate the anchor points of the line on which the strokes are centered (in pixels):
        let startXPx: number;
        let stopXPx: number;
        let startYPx: number;
        let stopYPx: number;
        // allowed y range for the stroke group center at each note (in units), so that the strokes
        //   keep their distance from the noteheads and don't exceed the stem tips (used for stemmed notes):
        let startCenterMinY: number = -Infinity;
        let startCenterMaxY: number = Infinity;
        let stopCenterMinY: number = -Infinity;
        let stopCenterMaxY: number = Infinity;
        const startNoteHasStem: boolean = (vfStartNote as any).hasStem?.() && !!vfStartNote.getStem();
        const stopNoteHasStem: boolean = (vfStopNote as any).hasStem?.() && !!vfStopNote.getStem();
        if (startNoteHasStem && stopNoteHasStem && vfStartNote.getStemDirection() === vfStopNote.getStemDirection()) {
            // anchor the strokes between the stems, in the middle of the "free" stem region between (inner) notehead and stem tip
            const direction: number = vfStartNote.getStemDirection(); // 1: up, -1: down
            startXPx = vfStartNote.getStemX();
            stopXPx = vfStopNote.getStemX();
            const startYs: number[] = vfStartNote.getYs();
            const stopYs: number[] = vfStopNote.getYs();
            // y of the notehead the free stem region begins at (for chords, the notehead closest to the stem tip):
            const startInnerNoteheadY: number = direction === 1 ? Math.min(...startYs) : Math.max(...startYs);
            const stopInnerNoteheadY: number = direction === 1 ? Math.min(...stopYs) : Math.max(...stopYs);
            // measure the free stem region from the notehead's outer edge (~0.5 units from its center),
            //   so that the strokes get equal visual clearance from notehead and stem tip:
            const noteheadEdgeOffsetPx: number = direction * 0.5 * unitInPixels;
            const startTipY: number = vfStartNote.getStemExtents().topY / unitInPixels;
            const stopTipY: number = vfStopNote.getStemExtents().topY / unitInPixels;
            const startNoteheadEdgeY: number = (startInnerNoteheadY - noteheadEdgeOffsetPx) / unitInPixels;
            const stopNoteheadEdgeY: number = (stopInnerNoteheadY - noteheadEdgeOffsetPx) / unitInPixels;
            startYPx = (startTipY + startNoteheadEdgeY) / 2 * unitInPixels;
            stopYPx = (stopTipY + stopNoteheadEdgeY) / 2 * unitInPixels;
            if (direction === 1) { // stems up: tips above the noteheads (lower y)
                startCenterMinY = startTipY + totalStrokesHeight / 2; // group must not exceed the stem tip
                startCenterMaxY = startNoteheadEdgeY - yPadding - totalStrokesHeight / 2; // group must keep its distance from the notehead
                stopCenterMinY = stopTipY + totalStrokesHeight / 2;
                stopCenterMaxY = stopNoteheadEdgeY - yPadding - totalStrokesHeight / 2;
            } else { // stems down: tips below the noteheads
                startCenterMinY = startNoteheadEdgeY + yPadding + totalStrokesHeight / 2;
                startCenterMaxY = startTipY - totalStrokesHeight / 2;
                stopCenterMinY = stopNoteheadEdgeY + yPadding + totalStrokesHeight / 2;
                stopCenterMaxY = stopTipY - totalStrokesHeight / 2;
            }
        } else {
            // stemless notes (e.g. whole notes) or opposite stem directions: anchor the strokes between the noteheads
            const startBoundingBox: VF.BoundingBox = vfStartNote.getBoundingBox();
            const stopBoundingBox: VF.BoundingBox = vfStopNote.getBoundingBox();
            startXPx = startBoundingBox.getX() + startBoundingBox.getW();
            stopXPx = stopBoundingBox.getX(); // starts at the leftmost modifier, so the strokes also avoid e.g. accidentals
            const startNoteheadBounds: {y_top: number, y_bottom: number} = (vfStartNote as any).getNoteHeadBounds();
            const stopNoteheadBounds: {y_top: number, y_bottom: number} = (vfStopNote as any).getNoteHeadBounds();
            startYPx = (startNoteheadBounds.y_top + startNoteheadBounds.y_bottom) / 2;
            stopYPx = (stopNoteheadBounds.y_top + stopNoteheadBounds.y_bottom) / 2;
        }

        // horizontal start/end of the strokes (in units), centered between the stems (or noteheads):
        const leftX: number = startXPx / unitInPixels;
        const rightX: number = stopXPx / unitInPixels;
        const availableSpace: number = rightX - leftX;
        let strokeLength: number = Math.min(
            availableSpace - 2 * this.rules.TremoloBetweenNotesXPadding,
            availableSpace * this.rules.TremoloBetweenNotesMaxLengthFactor);
        const minimumStrokeLength: number = 1.0;
        strokeLength = Math.max(strokeLength, Math.min(minimumStrokeLength, availableSpace - 0.2)); // tight layout: allow less padding
        if (strokeLength < 0.5) {
            log.debug("VexFlowMusicSheetDrawer.drawTremoloBetweenTwoNotes: not enough horizontal space to draw tremolo strokes.");
            return strokeId;
        }
        const xCenter: number = (leftX + rightX) / 2;
        const startX: number = xCenter - strokeLength / 2;
        const stopX: number = xCenter + strokeLength / 2;

        // vertical center of the strokes at start and stop (in units), with the slant (vertical rise/fall) limited:
        const yMiddle: number = (startYPx + stopYPx) / 2 / unitInPixels;
        let slant: number = (stopYPx - startYPx) / unitInPixels;
        const maxSlant: number = this.rules.TremoloBetweenNotesMaxSlant;
        if (Math.abs(slant) > maxSlant) {
            slant = Math.sign(slant) * maxSlant;
        }
        let startY: number = yMiddle - slant / 2;
        let stopY: number = yMiddle + slant / 2;

        // shift the stroke group vertically if necessary to keep it within the allowed range at both notes,
        //   e.g. when the slant was limited above (for notes far apart),
        //   which moves the group out of the middle of the stems' free regions:
        const minimumYShift: number = Math.max(startCenterMinY - startY, stopCenterMinY - stopY);
        const maximumYShift: number = Math.min(startCenterMaxY - startY, stopCenterMaxY - stopY);
        let yShift: number = 0;
        if (minimumYShift <= maximumYShift) {
            yShift = Math.min(Math.max(0, minimumYShift), maximumYShift); // smallest shift that satisfies both ranges
        } else {
            yShift = (minimumYShift + maximumYShift) / 2; // both ranges can't be satisfied (e.g. very short stems): balance the violations
        }
        startY += yShift;
        stopY += yShift;

        // draw the strokes as parallelograms (like beams), stacked vertically around the center line:
        const color: string = this.rules.DefaultColorMusic;
        for (let strokeIndex: number = 0; strokeIndex < tremolo.strokes; strokeIndex++) {
            const strokeStartTopY: number = startY - totalStrokesHeight / 2 + strokeIndex * strokePeriod;
            const strokeStopTopY: number = stopY - totalStrokesHeight / 2 + strokeIndex * strokePeriod;
            const strokePoints: PointF2D[] = [
                new PointF2D(startX, strokeStartTopY),
                new PointF2D(stopX, strokeStopTopY),
                new PointF2D(stopX, strokeStopTopY + strokeThickness),
                new PointF2D(startX, strokeStartTopY + strokeThickness),
                new PointF2D(startX, strokeStartTopY)
            ];
            const id: string = `tremoloBetweenNotes-${measure.MeasureNumber}-${measure.ParentStaff.Id}-${strokeId}`;
            this.DrawPath(strokePoints, stopGNote.ParentMusicPage, true, id, color);
            strokeId++;
        }

        // update SkyLine/BottomLine with the outer edges of the strokes
        //   (calculated geometrically, much cheaper than re-doing the pixel-based skyline calculation):
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        const staffLineAbsolute: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        skyBottomLineCalculator.mergeSkyLineWithLine(
            new PointF2D(startX - staffLineAbsolute.x, startY - totalStrokesHeight / 2 - staffLineAbsolute.y),
            new PointF2D(stopX - staffLineAbsolute.x, stopY - totalStrokesHeight / 2 - staffLineAbsolute.y));
        skyBottomLineCalculator.mergeBottomLineWithLine(
            new PointF2D(startX - staffLineAbsolute.x, startY + totalStrokesHeight / 2 - staffLineAbsolute.y),
            new PointF2D(stopX - staffLineAbsolute.x, stopY + totalStrokesHeight / 2 - staffLineAbsolute.y));
        return strokeId;
    }

    // private drawPixel(coord: PointF2D): void {
    //     coord = this.applyScreenTransformation(coord);
    //     const ctx: any = this.backend.getContext();
    //     const oldStyle: string = ctx.fillStyle;
    //     ctx.fillStyle = "#00FF00FF";
    //     ctx.fillRect( coord.x, coord.y, 2, 2 );
    //     ctx.fillStyle = oldStyle;
    // }

    /** Draws a line in the current backend. Only usable while pages are drawn sequentially, because backend reference is updated in that process.
     *  To add your own lines after rendering, use DrawOverlayLine.
     */
    protected drawLine(start: PointF2D, stop: PointF2D, color: string = "#000000FF", lineWidth: number = 0.2): Node {
        // TODO maybe the backend should be given as an argument here as well, otherwise this can't be used after rendering of multiple pages is done.
        start = this.applyScreenTransformation(start);
        stop = this.applyScreenTransformation(stop);
        /*if (!this.backend) {
            this.backend = this.backends[0];
        }*/
        return this.backend.renderLine(start, stop, color, lineWidth * unitInPixels);
    }

    /** Lets a user/developer draw an overlay line on the score. Use this instead of drawLine, which is for OSMD internally only.
     *  The MusicPage has to be specified, because each page and Vexflow backend has its own relative coordinates.
     *  (the AbsolutePosition of a GraphicalNote is relative to its backend)
     *  To get a MusicPage, use GraphicalNote.ParentMusicPage.
     */
    public DrawOverlayLine(start: PointF2D, stop: PointF2D, musicPage: GraphicalMusicPage,
                           color: string = "#FF0000FF", lineWidth: number = 0.2,
                           id?: string): Node {
        if (!musicPage.PageNumber || musicPage.PageNumber > this.backends.length || musicPage.PageNumber < 1) {
            console.log("VexFlowMusicSheetDrawer.drawOverlayLine: invalid page number / music page number doesn't correspond to an existing backend.");
            return;
        }
        const musicPageIndex: number = musicPage.PageNumber - 1;
        const backendToUse: VexFlowBackend = this.backends[musicPageIndex];

        start = this.applyScreenTransformation(start);
        stop = this.applyScreenTransformation(stop);
        if (!id) {
            id = `overlayLine ${start.x}/${start.y}`;
        }
        return backendToUse.renderLine(start, stop, color, lineWidth * unitInPixels, id);
    }

    public DrawPath(inputPoints: PointF2D[], musicPage: GraphicalMusicPage,
        fill: boolean = true, id?: string, color?: string): Node {
        const musicPageIndex: number = musicPage.PageNumber - 1;
        const backendToUse: VexFlowBackend = this.backends[musicPageIndex];

        const transformedPoints: PointF2D[] = [];
        for (const inputPoint of inputPoints) {
            transformedPoints.push(this.applyScreenTransformation(inputPoint));
        }
        return backendToUse.renderPath(transformedPoints, fill, id, color);
    }

    protected drawSkyLine(staffline: StaffLine): void {
        const startPosition: PointF2D = staffline.PositionAndShape.AbsolutePosition;
        const width: number = staffline.PositionAndShape.Size.width;
        this.drawSampledLine(staffline.SkyLine, startPosition, width);
    }

    protected drawBottomLine(staffline: StaffLine): void {
        const startPosition: PointF2D = new PointF2D(staffline.PositionAndShape.AbsolutePosition.x,
                                                     staffline.PositionAndShape.AbsolutePosition.y);
        const width: number = staffline.PositionAndShape.Size.width;
        this.drawSampledLine(staffline.BottomLine, startPosition, width, "#0000FFFF");
    }

    /**
     * Draw a line with a width and start point in a chosen color (used for skyline/bottom line debugging) from
     * a simple array
     * @param line numeric array. 0 marks the base line. Direction given by sign. Dimensions in units
     * @param startPosition Start position in units
     * @param width Max line width in units
     * @param color Color to paint in. Default is red
     */
    private drawSampledLine(line: number[], startPosition: PointF2D, width: number, color: string = "#FF0000FF"): void {
        const indices: number[] = [];
        let currentValue: number = 0;
        //Loops through bottom line, grabs all indices that don't equal the previously grabbed index
        //Starting with 0 (gets index of all line changes)
        for (let i: number = 0; i < line.length; i++) {
            if (line[i] !== currentValue) {
                indices.push(i);
                currentValue = line[i];
            }
        }

        const absolute: PointF2D = startPosition;
        if (indices.length > 0) {
            const samplingUnit: number = this.rules.SamplingUnit;

            let horizontalStart: PointF2D = new PointF2D(absolute.x, absolute.y);
            let horizontalEnd: PointF2D = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
            this.drawLine(horizontalStart, horizontalEnd, color);

            let verticalStart: PointF2D;
            let verticalEnd: PointF2D;

            if (line[0] >= 0) {
                verticalStart = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
                verticalEnd = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y + line[indices[0]]);
                this.drawLine(verticalStart, verticalEnd, color);
            }

            for (let i: number = 1; i < indices.length; i++) {
                horizontalStart = new PointF2D(indices[i - 1] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                horizontalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                this.drawLine(horizontalStart, horizontalEnd, color);

                verticalStart = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                verticalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i]]);
                this.drawLine(verticalStart, verticalEnd, color);
            }

            if (indices[indices.length - 1] < line.length) {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y + line[indices[indices.length - 1]]);
                horizontalEnd = new PointF2D(absolute.x + width, absolute.y + line[indices[indices.length - 1]]);
                this.drawLine(horizontalStart, horizontalEnd, color);
            } else {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y);
                horizontalEnd = new PointF2D(absolute.x + width, absolute.y);
                this.drawLine(horizontalStart, horizontalEnd, color);
            }
        } else {
            // Flat line
            const start: PointF2D = new PointF2D(absolute.x, absolute.y);
            const end: PointF2D = new PointF2D(absolute.x + width, absolute.y);
            this.drawLine(start, end, color);
        }
    }

    private drawStaffEntry(staffEntry: GraphicalStaffEntry): void {
        if (staffEntry.FingeringEntries.length > 0) {
            for (const fingeringEntry of staffEntry.FingeringEntries) {
                fingeringEntry.SVGNode = this.drawLabel(fingeringEntry, GraphicalLayers.Notes);
            }
        }
        // Draw ChordSymbols
        if (staffEntry.graphicalChordContainers !== undefined && staffEntry.graphicalChordContainers.length > 0) {
            for (const graphicalChordContainer of staffEntry.graphicalChordContainers) {
                const label: GraphicalLabel = graphicalChordContainer.GraphicalLabel;
                label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
        if (this.rules.RenderLyrics) {
            if (staffEntry.LyricsEntries.length > 0) {
                this.drawLyrics(staffEntry.LyricsEntries, <number>GraphicalLayers.Notes);
            }
        }
    }

    /**
     * Draw all lyrics to the canvas
     * @param lyricEntries Array of lyric entries to be drawn
     * @param layer Number of the layer that the lyrics should be drawn in
     */
    private drawLyrics(lyricEntries: GraphicalLyricEntry[], layer: number): void {
        lyricEntries.forEach(lyricsEntry => {
            const label: GraphicalLabel = lyricsEntry.GraphicalLabel;
            label.Label.colorDefault = this.rules.DefaultColorLyrics;
            label.SVGNode = this.drawLabel(label, layer);
            (label.SVGNode as SVGGElement)?.classList.add("lyrics");
        });
    }

    protected drawInstrumentBrace(brace: GraphicalObject, system: MusicSystem): void {
        const ctx: VF.RenderContext = this.backend.getContext();
        ctx.openGroup("brace");
        // Draw InstrumentBrackets at beginning of line
        const vexBrace: VexFlowInstrumentBrace = (brace as VexFlowInstrumentBrace);
        vexBrace.draw(ctx);
        ctx.closeGroup();
    }

    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void {
        const ctx: VF.RenderContext = this.backend.getContext();
        ctx.openGroup("bracket");
        // Draw InstrumentBrackets at beginning of line
        const vexBrace: VexFlowInstrumentBracket = (bracket as VexFlowInstrumentBracket);
        vexBrace.draw(ctx);
        ctx.closeGroup();
    }

    protected drawOctaveShifts(staffLine: StaffLine): void {
        for (const graphicalOctaveShift of staffLine.OctaveShifts) {
            if (graphicalOctaveShift) {
                const vexFlowOctaveShift: VexFlowOctaveShift = graphicalOctaveShift as VexFlowOctaveShift;
                const ctx: VF.RenderContext = this.backend.getContext();
                const textBracket: VF.TextBracket = vexFlowOctaveShift.getTextBracket();
                if (this.rules.DefaultColorMusic) {
                    (textBracket as any).renderOptions.color = this.rules.DefaultColorMusic;
                }
                textBracket.setContext(ctx);
                try {
                    textBracket.draw();
                } catch (ex) {
                    log.warn(ex);
                }
            }
        }
    }

    protected drawPedals(staffLine: StaffLine): void {
        for (const graphicalPedal of staffLine.Pedals) {
            if (graphicalPedal) {
                const vexFlowPedal: VexFlowPedal = graphicalPedal as VexFlowPedal;
                const ctx: VF.RenderContext = this.backend.getContext();
                const pedalMarking: VF.PedalMarking = vexFlowPedal.getPedalMarking();
                (pedalMarking as any).renderOptions.color = this.rules.DefaultColorMusic;
                pedalMarking.setContext(ctx);
                pedalMarking.draw();
            }
        }
    }

    protected drawWavyLines(staffLine: StaffLine): void {
        for (const graphicalWavyLine of staffLine.WavyLines) {
            if (graphicalWavyLine) {
                const vexFlowVibratoBracket: VexFlowVibratoBracket = graphicalWavyLine as VexFlowVibratoBracket;
                const ctx: VF.RenderContext = this.backend.getContext();
                const vfVibratoBracket: VF.VibratoBracket = vexFlowVibratoBracket.getVibratoBracket();
                (vfVibratoBracket as any).setContext(ctx);
                vfVibratoBracket.draw();
            }
        }
    }

    protected drawExpressions(staffline: StaffLine): void {
        // Draw all Expressions
        for (const abstractGraphicalExpression of staffline.AbstractExpressions) {
            // Draw InstantaneousDynamics
            if (abstractGraphicalExpression instanceof GraphicalInstantaneousDynamicExpression) {
                this.drawInstantaneousDynamic((abstractGraphicalExpression as VexFlowInstantaneousDynamicExpression));
                // Draw InstantaneousTempo
            } else if (abstractGraphicalExpression instanceof GraphicalInstantaneousTempoExpression) {
                if (abstractGraphicalExpression.SourceExpression.parentMeasure?.MeasureNumber <= 1 &&
                    !this.rules.RenderFirstTempoExpression
                ) {
                    continue;
                }
                const label: GraphicalLabel = (abstractGraphicalExpression as GraphicalInstantaneousTempoExpression).GraphicalLabel;
                label.SVGNode = this.drawLabel(label, GraphicalLayers.Notes);
                // Draw ContinuousDynamics
            } else if (abstractGraphicalExpression instanceof GraphicalContinuousDynamicExpression) {
                this.drawContinuousDynamic((abstractGraphicalExpression as VexFlowContinuousDynamicExpression));
                // Draw ContinuousTempo
                // } else if (abstractGraphicalExpression instanceof GraphicalContinuousTempoExpression) {
                //     this.drawLabel((abstractGraphicalExpression as GraphicalContinuousTempoExpression).GraphicalLabel, GraphicalLayers.Notes);
                // // Draw Mood
                // } else if (abstractGraphicalExpression instanceof GraphicalMoodExpression) {
                //     GraphicalMoodExpression; graphicalMood = (GraphicalMoodExpression); abstractGraphicalExpression;
                //     drawLabel(graphicalMood.GetGraphicalLabel, <number>GraphicalLayers.Notes);
            // Draw Unknown
            } else if (abstractGraphicalExpression instanceof GraphicalUnknownExpression) {
                const label: GraphicalLabel = abstractGraphicalExpression.Label;
                label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
            } else {
                log.warn("Unkown type of expression!");
            }
        }
    }

    protected drawInstantaneousDynamic(instantaneousDynamic: GraphicalInstantaneousDynamicExpression): void {
        const label: GraphicalLabel = (instantaneousDynamic as VexFlowInstantaneousDynamicExpression).Label;
        label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
    }

    protected drawContinuousDynamic(graphicalExpression: VexFlowContinuousDynamicExpression): void {
        if (graphicalExpression.IsVerbal) {
            const label: GraphicalLabel = graphicalExpression.Label;
            label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
        } else {
            for (const line of graphicalExpression.Lines) {
                const start: PointF2D = new PointF2D(graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.x + line.Start.x,
                                                     graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.y + line.Start.y);
                const end: PointF2D = new PointF2D(graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.x + line.End.x,
                                                   graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.y + line.End.y);
                line.SVGElement = this.drawLine(start, end, line.colorHex ?? "#000000", line.Width);
                // the null check for colorHex is not strictly necessary anymore, but the previous default color was red.
            }
        }
    }

    /**
     * Renders a Label to the screen (e.g. Title, composer..)
     * @param graphicalLabel holds the label string, the text height in units and the font parameters
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param bitmapWidth Not needed for now.
     * @param bitmapHeight Not needed for now.
     * @param heightInPixel the height of the text in screen coordinates
     * @param screenPosition the position of the lower left corner of the text in screen coordinates
     */
    protected renderLabel(graphicalLabel: GraphicalLabel, layer: number, bitmapWidth: number,
                          bitmapHeight: number, fontHeightInPixel: number, screenPosition: PointF2D): Node {
        if (!graphicalLabel.Label.print) {
            return undefined;
        }
        const height: number = graphicalLabel.Label.fontHeight * unitInPixels;
        const { font } = graphicalLabel.Label;
        let color: string;
        if (this.rules.ColoringEnabled) {
            color = graphicalLabel.Label.colorDefault;
            if (graphicalLabel.ColorXML) {
                color = graphicalLabel.ColorXML;
            }
            if (!color) {
                color = this.rules.DefaultColorLabel;
            }
        }
        let { fontStyle, fontFamily } = graphicalLabel.Label;
        if (!fontStyle) {
            fontStyle = this.rules.DefaultFontStyle;
        }
        if (!fontFamily) {
            fontFamily = this.rules.DefaultFontFamily;
        }

        let node: Node;
        for (let i: number = 0; i < graphicalLabel.TextLines?.length; i++) {
            const currLine: {text: string, xOffset: number, width: number} = graphicalLabel.TextLines[i];
            const xOffsetInPixel: number = this.calculatePixelDistance(currLine.xOffset);
            const linePosition: PointF2D = new PointF2D(screenPosition.x + xOffsetInPixel, screenPosition.y);
            const newNode: Node =
                this.backend.renderText(height, fontStyle, font, currLine.text, fontHeightInPixel, linePosition, color, graphicalLabel.Label.fontFamily);
            if (!node) {
                node = newNode;
            } else {
                node.appendChild(newNode);
            }
            screenPosition.y = screenPosition.y + fontHeightInPixel;
            if (graphicalLabel.TextLines.length > 1) {
                screenPosition.y += this.rules.SpacingBetweenTextLines;
            }
        }
        // font currently unused, replaced by fontFamily
        return node; // alternatively, return Node[] and refactor annotationElementMap to handle node array instead of single node
    }

    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     * @param alpha alpha value between 0 and 1
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number, colorHex: string, alpha: number): Node {
        return this.backend.renderRectangle(rectangle, styleId, colorHex, alpha);
    }

    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D {
        return new PointF2D(point.x * unitInPixels, point.y * unitInPixels);
    }

    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D {
        return new RectangleF2D(rectangle.x * unitInPixels, rectangle.y * unitInPixels, rectangle.width * unitInPixels, rectangle.height * unitInPixels);
    }
}
