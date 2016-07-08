import { GraphicalObject } from "./GraphicalObject";
import { MusicSystem } from "./MusicSystem";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalLine } from "./GraphicalLine";
export declare class SelectionEndSymbol extends GraphicalObject {
    constructor(system: MusicSystem, xPosition: number);
    verticalLine: GraphicalLine;
    arrows: PointF2D[][];
    arrowlines: PointF2D[][];
}
