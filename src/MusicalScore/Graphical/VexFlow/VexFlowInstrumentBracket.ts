import Vex from "vexflow";
import { GraphicalObject } from "../GraphicalObject";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";

/**
 * Class that defines a instrument bracket at the beginning of a line.
 */
export class VexFlowInstrumentBracket extends GraphicalObject {

    protected vexflowConnector: Vex.Flow.StaveConnector;

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine, depth: number = 0) {
        super();
        this.PositionAndShape = new BoundingBox(this, firstVexFlowStaffLine.ParentMusicSystem.PositionAndShape);
        const firstVexMeasure: VexFlowMeasure = firstVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        const lastVexMeasure: VexFlowMeasure = lastVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        this.addConnector(firstVexMeasure.getVFStave(), lastVexMeasure.getVFStave(), Vex.Flow.StaveConnector.type.BRACKET, depth);
    }

    /**
     * Render the bracket using the given backend
     * @param ctx Render Vexflow context
     */
    public draw(ctx: Vex.IRenderContext): void {
        // Draw vexflow brace. This sets the positions inside the connector.
        this.vexflowConnector.setContext(ctx).draw();
        // Set bounding box
        const con: Vex.Flow.StaveConnector = this.vexflowConnector;
        // First line in first stave
        const topY: number = con.top_stave.getYForLine(0);
        // Last line in last stave
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness;
        // Set bounding box position and size in OSMD units
        this.PositionAndShape.AbsolutePosition.x = (con.top_stave.getX() - 2 + con.x_shift) / unitInPixels;
        this.PositionAndShape.AbsolutePosition.y = topY / unitInPixels;
        this.PositionAndShape.Size.height = (botY - topY) / unitInPixels;
        this.PositionAndShape.Size.width = 12 / unitInPixels; // width is always 12 -> vexflow implementation
    }
    /**
     * Adds a connector between two staves
     *
     * @param {Stave} stave1: First stave
     * @param {Stave} stave2: Second stave
     * @param {Flow.StaveConnector.type} type: Type of connector
     */
    private addConnector(stave1: Vex.Flow.Stave, stave2: Vex.Flow.Stave, type: any, depth: number): void {
        this.vexflowConnector = new Vex.Flow.StaveConnector(stave1, stave2)
        .setType(type)
        .setXShift(depth * -5);
    }
}
