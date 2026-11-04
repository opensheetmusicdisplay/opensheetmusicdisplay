import Vex from "vexflow";
import VF = Vex.Flow;
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { GroupSymbol } from "../../InstrumentalGroup";

/**
 * Class that defines a instrument brace at the beginning of a line: of a part with several staves, or of a part group with the
 * group symbol brace.
 */
export class VexFlowInstrumentBrace extends VexFlowInstrumentBracket {

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine, column: number = 0) {
        super(firstVexFlowStaffLine, lastVexFlowStaffLine, column);
        this.vexflowConnector.setType(VF.StaveConnector.type.BRACE);
        this.Shape = GroupSymbol.Brace;
    }
}
