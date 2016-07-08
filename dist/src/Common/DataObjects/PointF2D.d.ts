export declare class PointF2D {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    static Empty: PointF2D;
    static pointsAreEqual(p1: PointF2D, p2: PointF2D): boolean;
    ToString(): string;
}
