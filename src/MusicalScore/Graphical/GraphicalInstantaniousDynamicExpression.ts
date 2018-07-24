import { GraphicalObject } from "./GraphicalObject";
import { InstantaniousDynamicExpression } from "../VoiceData/Expressions/InstantaniousDynamicExpression";

export class GraphicalInstantaniousDynamicExpression extends GraphicalObject {

    protected instantaniousDynamicExpression: InstantaniousDynamicExpression;

    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression) {
        super();
    }
}
