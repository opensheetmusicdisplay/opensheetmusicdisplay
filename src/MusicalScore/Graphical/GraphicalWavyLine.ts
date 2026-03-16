import { BoundingBox } from "./BoundingBox";
import { WavyLine } from "../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { GraphicalObject } from "./GraphicalObject";

export class GraphicalWavyLine extends GraphicalObject {
    constructor(wavyLine: WavyLine, parent: BoundingBox) {
        super();
        this.getWavyLine = wavyLine;
        this.PositionAndShape = new BoundingBox(this, parent);
    }

    public getWavyLine: WavyLine;
}
