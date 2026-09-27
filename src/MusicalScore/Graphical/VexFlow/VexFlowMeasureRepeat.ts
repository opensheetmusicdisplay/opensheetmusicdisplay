import Vex from "vexflow";
import VF = Vex.Flow;
import {VexFlowMeasure} from "./VexFlowMeasure";
import {StaffLine} from "../StaffLine";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";

/** Draws a measure-repeat unit. */
export class VexFlowMeasureRepeat {
    /** Half-width of the measure-count skyline reservation in staffline units. */
    private static readonly NUMBER_HALF_WIDTH: number = 1.2;
    /** Height of the measure-count skyline reservation in staffline units. */
    private static readonly NUMBER_HEIGHT: number = 3.5;

    /** Unit measures in staff order. */
    private readonly measures: VexFlowMeasure[];
    /** Slash count from MusicXML, defaulting to one. */
    private readonly slashes: number;

    constructor(measures: VexFlowMeasure[], slashes: number) {
        this.measures = measures;
        // Keep the sign within the supported one-to-four slash range.
        this.slashes = Math.min(4, Math.max(1, Math.trunc(slashes) || 1));
    }

    /** Unit measures in staff order. */
    public get Measures(): VexFlowMeasure[] {
        return this.measures;
    }

    /** Draws the unit from its final measure so later staves do not cover the sign. */
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

    /** Reserves skyline space above multi-measure repeat counts. */
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

    /** Position relative to the owner's stave: skyline drawing runs before final stave positions are assigned. */
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

    /** Draws the unit length above a multi-measure repeat sign. */
    private drawNumber(ctx: Vex.IRenderContext, stave: VF.Stave, centerX: number): void {
        // The patched TimeSignature API is not represented by its TypeScript declarations.
        const timeSig: any = new (VF.TimeSignature as any)(null, undefined, false);
        timeSig.point = 40; // the null constructor skips the normal font-size initialization
        timeSig.setTimeSig("/" + this.measures.length);
        timeSig.setStave(stave);
        timeSig.x = centerX - timeSig.timeSig.glyph.getMetrics().width / 2;
        timeSig.bottomLine = -0.5;
        timeSig.setContext(ctx).draw();
    }

    /** Draws the repeat slashes and flanking dots. */
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
        // Align the dots with the outer slashes according to SMuFL measure-repeat geometry.
        const dotRadius: number = spacing * 0.24;
        const dotOffsetY: number = spacing * 0.5;
        const dotGap: number = spacing * 0.9;
        const firstSlashX: number = centerX + firstOffset - slantWidth / 2;
        const lastSlashX: number = firstSlashX + (this.slashes - 1) * strokeGap;
        const leftEdgeX: number = firstSlashX + slantWidth * (slantHeight / 2 + dotOffsetY) / slantHeight;
        const rightEdgeX: number = lastSlashX + strokeThickness + slantWidth * (slantHeight / 2 - dotOffsetY) / slantHeight;
        this.drawDot(ctx, leftEdgeX - dotGap, middleY - dotOffsetY, dotRadius);
        this.drawDot(ctx, rightEdgeX + dotGap, middleY + dotOffsetY, dotRadius);
        ctx.restore();
    }

    private drawDot(ctx: Vex.IRenderContext, x: number, y: number, radius: number): void {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, false);
        ctx.fill();
    }
}
