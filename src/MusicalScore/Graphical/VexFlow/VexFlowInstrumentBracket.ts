import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalObject } from "../GraphicalObject";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { GroupSymbol } from "../../InstrumentalGroup";

/**
 * Class that defines a instrument bracket at the beginning of a line.
 */
export class VexFlowInstrumentBracket extends GraphicalObject {

    public vexflowConnector: VF.StaveConnector;
    public Visible: boolean = true;
    /** The symbol drawn: VexFlow's bracket, a thin line with right-angled hooks (Square) or a thin line (Line); a brace is a
     *  VexFlowInstrumentBrace. */
    public Shape: GroupSymbol = GroupSymbol.Bracket;
    public readonly FirstStaffLine: VexFlowStaffLine;
    public readonly LastStaffLine: VexFlowStaffLine;
    private column: number = 0;

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine, column: number = 0) {
        super();
        this.PositionAndShape = new BoundingBox(this, firstVexFlowStaffLine.ParentMusicSystem.PositionAndShape);
        this.FirstStaffLine = firstVexFlowStaffLine;
        this.LastStaffLine = lastVexFlowStaffLine;
        const firstVexMeasure: VexFlowMeasure = firstVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        const lastVexMeasure: VexFlowMeasure = lastVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        this.addConnector(firstVexMeasure.getVFStave(), lastVexMeasure.getVFStave(), VF.StaveConnector.type.BRACKET);
        this.Column = column;
    }

    /**
     * The column left of the staves the bracket stands in: 0 beside the staves, 1 one EngravingRules.GroupBracketColumnDistance
     * further left (a group nested in a bracketed group, or the brace of a part inside one), and so on.
     */
    public get Column(): number {
        return this.column;
    }
    public set Column(value: number) {
        this.column = value;
        this.vexflowConnector.setXShift(-value * this.FirstStaffLine.ParentMusicSystem.rules.GroupBracketColumnDistance * unitInPixels);
    }

    /** How far left of the staves the symbol reaches in its column, in px: VexFlow draws a brace 14 px wide at 2 px from
     *  the staves, and a bracket's 3 px bar at 5 px; a square bracket and a line stand where the bar stands. */
    protected get reach(): number {
        return (this.Shape === GroupSymbol.Brace ? 14 : 5) - this.vexflowConnector.x_shift;
    }

    /**
     * Render the bracket using the given backend
     * @param ctx Render Vexflow context
     */
    public draw(ctx: Vex.IRenderContext): void {
        // Draw vexflow brace. This sets the positions inside the connector.
        if (this.Visible) {
            if (this.Shape === GroupSymbol.Square || this.Shape === GroupSymbol.Line) {
                this.drawThinLine(ctx);
            } else {
                this.vexflowConnector.setContext(ctx).draw();
            }
        }
        // Set bounding box
        const con: VF.StaveConnector = this.vexflowConnector;
        // First line in first stave
        const topY: number = con.top_stave.getYForLine(0);
        // Last line in last stave
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness;
        // Set bounding box position and size in OSMD units: from the symbol's left edge to the staves
        const staveX: number = con.top_stave.getX();
        this.PositionAndShape.AbsolutePosition.x = (staveX - this.reach) / unitInPixels;
        this.PositionAndShape.AbsolutePosition.y = topY / unitInPixels;
        this.PositionAndShape.Size.height = (botY - topY) / unitInPixels;
        this.PositionAndShape.Size.width = this.reach / unitInPixels;
    }

    /**
     * A square bracket (a thin line with right-angled hooks reaching towards the staves, the secondary bracket of a group
     * inside a bracketed group) or a line, as in MusicXML's pictures and MuseScore: 1.5 px wide, where VexFlow's bracket bar
     * stands, from the top line of the first staff to the bottom line of the last; the hooks reach 5 px, to the system's
     * barline or the outer bracket.
     */
    private drawThinLine(ctx: Vex.IRenderContext): void {
        const con: VF.StaveConnector = this.vexflowConnector;
        const topY: number = con.top_stave.getYForLine(0);
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness;
        const x: number = con.top_stave.getX() - this.reach;
        const lineWidth: number = 1.5;
        const hookLength: number = 5;
        ctx.fillRect(x, topY, lineWidth, botY - topY);
        if (this.Shape === GroupSymbol.Square) {
            ctx.fillRect(x, topY, hookLength, lineWidth);
            ctx.fillRect(x, botY - lineWidth, hookLength, lineWidth);
        }
    }

    /**
     * Adds a connector between two staves
     *
     * @param {Stave} stave1: First stave
     * @param {Stave} stave2: Second stave
     * @param {Flow.StaveConnector.type} type: Type of connector
     */
    private addConnector(stave1: VF.Stave, stave2: VF.Stave, type: any): void {
        this.vexflowConnector = new VF.StaveConnector(stave1, stave2)
        .setType(type);
    }
}
