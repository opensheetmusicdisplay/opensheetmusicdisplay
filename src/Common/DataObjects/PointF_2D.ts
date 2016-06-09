module PhonicScore.Common.DataObjects {
    export class PointF_2D {
        public X: number;
        public Y: number;
        constructor(x: number = 0, y: number = 0) {
            this.X = x;
            this.Y = y;
        }
        public static get Empty(): PointF_2D {
            return new PointF_2D();
        }
        public static pointsAreEqual(p1: PointF_2D, p2: PointF_2D): boolean {
            return (p1.X == p2.X && p1.Y == p2.Y);
        }
        public ToString(): string {
            return "[" + this.X + ", " + this.Y + "]";
        }
    }
}