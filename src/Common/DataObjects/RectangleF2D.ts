import {SizeF2D} from "./SizeF2D";
import {PointF2D} from "./PointF2D";

/**
 * Represent a rectangle on a plane
 */
export class RectangleF2D {
    public x: number = 0;
    public y: number = 0;
    public width: number = 0;
    public height: number = 0;

    /**
     *
     * @param x
     * @param y
     * @param width
     * @param height
     */
    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public static createFromLocationAndSize(location: PointF2D, size: SizeF2D): RectangleF2D {
        return new RectangleF2D(location.x, location.y, size.width, size.height);
    }
    public get Location(): PointF2D {
        return new PointF2D(this.x, this.y);
    }
    public get Size(): SizeF2D {
        return new SizeF2D(this.width, this.height);
    }
}
