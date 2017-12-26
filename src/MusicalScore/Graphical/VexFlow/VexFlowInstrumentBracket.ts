import Vex = require("vexflow");
import {GraphicalObject} from "../GraphicalObject";
import {VexFlowStaffLine} from "./VexFlowStaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowMeasure } from "./VexFlowMeasure";

/**
 * Class that defines a instrument bracket at the beginning of a line.
 */
export class VexFlowInstrumentBracket extends GraphicalObject {

    private vexflowConnector: Vex.Flow.StaveConnector;

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine) {
        super();
        // FIXME: B.Giesinger: Fill in sizes after calculation
        this.boundingBox = new BoundingBox(this);
        const firstVexMeasure: VexFlowMeasure = firstVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        const lastVexMeasure: VexFlowMeasure = lastVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        this.addConnector(firstVexMeasure.getVFStave(), lastVexMeasure.getVFStave(), Vex.Flow.StaveConnector.type.BRACE);
    }

    /**
     * Render the bracket using the given backend
     * @param ctx Render Vexflow context
     */
    public draw(ctx: Vex.Flow.RenderContext): void {
        this.vexflowConnector.setContext(ctx).draw();
    }

    /**
     * Adds a connector between two staves
     *
     * @param {Stave} stave1: First stave
     * @param {Stave} stave2: Second stave
     * @param {Flow.StaveConnector.type} type: Type of connector
     */
    private addConnector(stave1: Vex.Flow.Stave, stave2: Vex.Flow.Stave, type: any): void {
        this.vexflowConnector = new Vex.Flow.StaveConnector(stave1, stave2)
        .setType(type);
    }
}
