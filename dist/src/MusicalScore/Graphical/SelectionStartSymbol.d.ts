import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalLine } from "./GraphicalLine";
import { MusicSystem } from "./MusicSystem";
import { GraphicalObject } from "./GraphicalObject";
export declare class SelectionStartSymbol extends GraphicalObject {
    constructor(system: MusicSystem, xPosition: number);
    verticalLine: GraphicalLine;
    arrows: PointF2D[][];
}
