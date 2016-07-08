import { GraphicalObject } from "./GraphicalObject";
import { OctaveShift } from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import { BoundingBox } from "./BoundingBox";
import { MusicSymbol } from "./MusicSymbol";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
export declare class GraphicalOctaveShift extends GraphicalObject {
    constructor(octaveShift: OctaveShift, parent: BoundingBox);
    getOctaveShift: OctaveShift;
    octaveSymbol: MusicSymbol;
    dashesStart: PointF2D;
    dashesEnd: PointF2D;
    endsOnDifferentStaffLine: boolean;
    isFirstPart: boolean;
    isSecondPart: boolean;
    private setSymbol();
}
