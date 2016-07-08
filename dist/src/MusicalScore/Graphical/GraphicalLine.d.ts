import { OutlineAndFillStyleEnum } from "./DrawingEnums";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
export declare class GraphicalLine {
    constructor(start: PointF2D, end: PointF2D, width?: number, styleEnum?: OutlineAndFillStyleEnum);
    styleId: number;
    private start;
    private end;
    private width;
    Start: PointF2D;
    End: PointF2D;
    Width: number;
}
