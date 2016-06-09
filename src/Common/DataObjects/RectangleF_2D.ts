export class RectangleF_2D {
    public X: number;
    public Y: number;
    public Width: number;
    public Height: number;
    constructor(x: number, y: number, width: number, height: number) {
        this.X = x;
        this.Y = y;
        this.Width = width;
        this.Height = height;
    }
    public static createFromLocationAndSize(location: PointF_2D, size: SizeF_2D): RectangleF_2D {
        return new RectangleF_2D(location.X, location.Y, size.Width, size.Height);
    }
    public get Location(): PointF_2D {
        return new PointF_2D(this.X, this.Y);
    }
    public get Size(): SizeF_2D {
        return new SizeF_2D(this.Width, this.Height);
    }
}
