import Vex from "vexflow";
import VF = Vex.Flow;
import {VexFlowMeasure} from "./VexFlowMeasure";
import {StaffLine} from "../StaffLine";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";

/**
 * Draws the sign for one measure-repeat unit (see EngravingRules.RenderMeasureRepeats and
 * VexFlowMusicSheetCalculator.prepareMeasureRepeats(), which decide which units get a sign and create one
 * VexFlowMeasureRepeat per unit, shared by all of that unit's measures).
 * A unit's measures keep their own notes, timestamps and width either way - only VexFlowMeasure.draw() calling
 * this instead of its own drawNotes() for a measure that belongs to a unit is affected by this class.
 */
export class VexFlowMeasureRepeat {
    /** Half-width (in staffline-local units, the same units as GraphicalMeasure.PositionAndShape) of the
     *  skyline reservation around the unit's measure-count number - see reserveSkyline(). */
    private static readonly NUMBER_HALF_WIDTH: number = 1.2;
    /** How far (in the same units) the reservation reaches above the staff - see reserveSkyline(). */
    private static readonly NUMBER_HEIGHT: number = 3.5;

    /** The unit's measures, in order (all on the same staff and staffline). Length 1, 2 or 4. */
    private readonly measures: VexFlowMeasure[];
    /** Number of slashes to draw, from the MusicXML "slashes" attribute (e.g. 2 for a 2-measure unit, per
     *  MuseScore's own export convention of writing one slash per repeated measure; default 1). */
    private readonly slashes: number;

    constructor(measures: VexFlowMeasure[], slashes: number) {
        this.measures = measures;
        // Clamp to a sane range: the repeated unit's own length is itself restricted to 1, 2 or 4 measures (see
        //   InstrumentReader.SUPPORTED_MEASURE_REPEAT_LENGTHS), and MuseScore's own export convention never
        //   writes more slashes than that. A hostile or malformed MusicXML "slashes" attribute (e.g. "20000", or
        //   an even larger value) must not translate into an unbounded number of drawn paths, an absurdly wide
        //   sign, or a hang (see drawSign()'s loop). Math.trunc(slashes) || 1 also turns NaN/0 into the default 1.
        this.slashes = Math.min(4, Math.max(1, Math.trunc(slashes) || 1));
    }

    /** The unit's measures, in order. */
    public get Measures(): VexFlowMeasure[] {
        return this.measures;
    }

    /**
     * Draws the sign, once for the whole unit: every measure of the unit calls this from its own draw() (see
     * VexFlowMeasure.draw()), but only the call from the unit's last measure actually draws anything - drawing
     * once there, instead of once per measure, means an earlier measure's barline can never be painted over
     * afterwards by a later measure's own stave drawing.
     * A one-measure unit's sign sits in the middle of its (only) measure; a two- or four-measure unit's sign
     * sits on the barline between its two halves, with the unit's measure-count (2 or 4) as a number above the
     * staff, as MuseScore draws it (see also reserveSkyline(), which keeps a measure number from overlapping it).
     * @param ctx
     * @param owner the VexFlowMeasure currently drawing (i.e. calling this from its own draw())
     */
    public draw(ctx: Vex.IRenderContext, owner: VexFlowMeasure): void {
        if (owner !== this.measures[this.measures.length - 1]) {
            return;
        }
        const stave: VF.Stave = owner.getVFStave();
        const spacing: number = stave.getSpacingBetweenLines();
        const middleY: number = stave.getYForLine((stave.getNumLines() - 1) / 2);
        const centerX: number = this.centerX(owner);

        const group: SVGGElement = ctx.openGroup() as SVGGElement;
        if (group) {
            group.classList?.add("vf-measure-repeat");
        }
        this.drawSign(ctx, centerX, middleY, spacing);
        if (this.measures.length > 1) {
            this.drawNumber(ctx, stave, centerX);
        }
        ctx.closeGroup();
    }

    /**
     * Reserves skyline space (in staffline-local units, the same units as GraphicalMeasure.PositionAndShape)
     * for this unit's measure-count number, drawn above the staff on a two- or four-measure unit's middle
     * barline. A one-measure unit's sign sits within the staff and needs no reservation.
     * Must be called after SkyBottomLineCalculator has computed the staffline's skyline - which, for an
     * abbreviated measure, reflects the drawn sign itself (or nothing at all under it), not the fully
     * written-out notes underneath: the skyline follows whatever is actually drawn, and
     * EngravingRules.RenderMeasureRepeats replaces the notes with the sign - and before measure numbers are
     * placed - calculateSkyBottomLines() replaces the skyline array outright, which would otherwise wipe out an
     * earlier reservation; and measure-number
     * placement reads the current skyline value to place its label above whatever is already there (see
     * VexFlowMusicSheetCalculator.reserveSkylineForMeasureRepeats(), which runs this at the right point).
     * The x-range and y-value are a deliberately generous approximation: the drawn glyph's exact pixel size
     * isn't known yet at this point (only draw(), later, works in pixel space).
     */
    public reserveSkyline(): void {
        if (this.measures.length < 2) {
            return;
        }
        const beforeMiddle: VexFlowMeasure = this.measures[this.measures.length / 2 - 1];
        const staffLine: StaffLine = beforeMiddle.ParentStaffLine;
        if (!staffLine) {
            return;
        }
        const barlineX: number = beforeMiddle.PositionAndShape.RelativePosition.x + beforeMiddle.PositionAndShape.Size.width;
        staffLine.SkyBottomLineCalculator.updateSkyLineInRange(
            barlineX - VexFlowMeasureRepeat.NUMBER_HALF_WIDTH, barlineX + VexFlowMeasureRepeat.NUMBER_HALF_WIDTH,
            -VexFlowMeasureRepeat.NUMBER_HEIGHT);
    }

    /**
     * Horizontal center of the sign, in pixels: the middle of the (only) measure for a one-measure unit, or
     * the barline between its two halves for a two- or four-measure unit.
     * Expressed as an offset from owner's own stave position, in owner's own pixel space, rather than reading
     * another measure's stave position directly: VexFlowMeasure.draw() - and so this method - is also called
     * by the sky-/bottom-line calculators to measure a measure's own drawn extent in isolation, before any
     * measure's stave has its final absolute position (see SkyBottomLineCalculator.calculateLinesGeometric());
     * at that point another measure's stave position is not comparable to this one's. GraphicalMeasure's own
     * PositionAndShape.RelativePosition (staffline-local units, set during layout) is valid regardless of when
     * this runs, and owner's own stave position anchors the result back to owner's own pixel space.
     * @param owner the VexFlowMeasure currently drawing (see draw())
     */
    private centerX(owner: VexFlowMeasure): number {
        const stave: VF.Stave = owner.getVFStave();
        if (this.measures.length === 1) {
            return (stave.getNoteStartX() + stave.getNoteEndX()) / 2;
        }
        const beforeMiddle: VexFlowMeasure = this.measures[this.measures.length / 2 - 1];
        const barlineOffsetInUnits: number = beforeMiddle.PositionAndShape.RelativePosition.x + beforeMiddle.PositionAndShape.Size.width -
            owner.PositionAndShape.RelativePosition.x;
        return stave.getX() + barlineOffsetInUnits * unitInPixels;
    }

    /**
     * Draws the unit's measure-count (2 or 4) above the staff, using the time-signature digit glyphs - the
     * same approach OSMD's existing multi-measure rest uses for its own number (see
     * src/VexFlowPatch/src/multimeasurerest.js's draw()): a TimeSignature given the pseudo-spec "/N" draws
     * only the bottom number, with no top number or slash line (validate_args is false, since "/N" isn't a
     * real time signature). This avoids adding a font-size engraving rule or measuring the glyph with the
     * browserless SVG backend's measureText(), which returns 0 width there and would misposition a
     * custom-sized number.
     * @param ctx
     * @param stave the unit's own stave, for the digit's vertical placement (spacing, staff line count)
     * @param centerX horizontal center of the number, in pixels (the same one drawSign() centers the sign on)
     */
    private drawNumber(ctx: Vex.IRenderContext, stave: VF.Stave, centerX: number): void {
        // Cast to any: the TS declarations for this vendored/patched class don't cover setTimeSig/setStave/x/
        //   bottomLine/point, though the JS class (src/VexFlowPatch/src/timesignature.js) has all of them.
        // Passing timeSpec=null makes the constructor return before setting this.point (see its "if (timeSpec
        //   === null) return;"), so it must be set here first - glyph metrics come out NaN-wide without it.
        const timeSig: any = new (VF.TimeSignature as any)(null, undefined, false);
        timeSig.point = 40; // same default TimeSignature normally sets itself, and multimeasurerest.js's number uses
        timeSig.setTimeSig("/" + this.measures.length);
        timeSig.setStave(stave);
        timeSig.x = centerX - timeSig.timeSig.glyph.getMetrics().width / 2;
        timeSig.bottomLine = -0.5; // same offset multimeasurerest.js uses for its own number, just above the staff
        timeSig.setContext(ctx).draw();
    }

    /**
     * Draws the diagonal slash(es) and their two flanking dots, in the style VexFlow 1.2.93 uses for its own
     * hand-drawn glyphs (see notehead.js's drawSlashNoteHead()) rather than a font glyph: the vendored font has
     * no measure-repeat glyph (its SMuFL table only lists segno and coda among "repeats" - see
     * node_modules/vexflow/src/tables.js and src/VexFlowPatch/src/fonts/vexflow_font.js).
     * @param ctx
     * @param centerX horizontal center of the sign, in pixels
     * @param middleY the staff's middle line, in pixels
     * @param spacing pixel distance between two adjacent staff lines
     */
    private drawSign(ctx: Vex.IRenderContext, centerX: number, middleY: number, spacing: number): void {
        const slantWidth: number = spacing * 1.6;
        const slantHeight: number = spacing * 2;
        const strokeThickness: number = spacing * 0.45;
        const strokeGap: number = spacing * 0.7;
        const topY: number = middleY - slantHeight / 2;
        const bottomY: number = middleY + slantHeight / 2;
        const firstOffset: number = -((this.slashes - 1) / 2) * strokeGap;

        ctx.save();
        ctx.setLineWidth(1);
        for (let i: number = 0; i < this.slashes; i++) {
            const dx: number = firstOffset + i * strokeGap;
            const xBottomLeft: number = centerX + dx - slantWidth / 2;
            ctx.beginPath();
            ctx.moveTo(xBottomLeft, bottomY);
            ctx.lineTo(xBottomLeft + strokeThickness, bottomY);
            ctx.lineTo(xBottomLeft + strokeThickness + slantWidth, topY);
            ctx.lineTo(xBottomLeft + slantWidth, topY);
            ctx.closePath();
            ctx.fill();
        }
        const dotRadius: number = spacing * 0.22;
        const dotMargin: number = dotRadius * 1.8;
        const leftmostDx: number = firstOffset;
        const rightmostDx: number = firstOffset + (this.slashes - 1) * strokeGap;
        this.drawDot(ctx, centerX + leftmostDx - slantWidth / 2 - dotMargin, topY, dotRadius);
        this.drawDot(ctx, centerX + rightmostDx + slantWidth / 2 + dotMargin, bottomY, dotRadius);
        ctx.restore();
    }

    private drawDot(ctx: Vex.IRenderContext, x: number, y: number, radius: number): void {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, false);
        ctx.fill();
    }
}
