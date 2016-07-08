import { SizeF2D } from "./SizeF2D";
import { PointF2D } from "./PointF2D";
export declare class RectangleF2D {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x: number, y: number, width: number, height: number);
    static createFromLocationAndSize(location: PointF2D, size: SizeF2D): RectangleF2D;
    Location: PointF2D;
    Size: SizeF2D;
}
