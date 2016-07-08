import { OutlineAndFillStyleEnum } from "./DrawingEnums";
import { BoundingBox } from "./BoundingBox";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalObject } from "./GraphicalObject";
export declare class GraphicalRectangle extends GraphicalObject {
    constructor(upperLeftPoint: PointF2D, lowerRightPoint: PointF2D, parent: BoundingBox, style: OutlineAndFillStyleEnum);
    style: OutlineAndFillStyleEnum;
}
