import Vex from "vexflow";
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowStaffLine } from "./VexFlowStaffLine";

/**
 * Class that defines a instrument bracket at the beginning of a line.
 */
export class VexFlowInstrumentBrace extends VexFlowInstrumentBracket {

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine, depth: number = 0) {
        super(firstVexFlowStaffLine, lastVexFlowStaffLine, depth);
        this.vexflowConnector.setType(Vex.Flow.StaveConnector.type.BRACE);
    }
}
