import { GraphicalInstantaniousDynamicExpression } from "../GraphicalInstantaniousDynamicExpression";
import { InstantaniousDynamicExpression } from "../../VoiceData/Expressions/InstantaniousDynamicExpression";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";

export class VexFlowInstantaniousDynamicExpression extends GraphicalInstantaniousDynamicExpression {

    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffEntry: GraphicalStaffEntry) {
        super(instantaniousDynamicExpression);
    }
}
