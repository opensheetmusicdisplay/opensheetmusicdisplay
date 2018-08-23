import { PointF2D } from "../../Common/DataObjects/PointF2D";

export class GraphicalCurve {
    private static bezierCurveStepSize: number = 1000;
    private static tPow3: number[];
    private static oneMinusTPow3: number[];
    private static bezierFactorOne: number[];
    private static bezierFactorTwo: number[];

    // Pre-calculate Curve-independend factors, to be used later in the Slur- and TieCurvePoints calculation.
    constructor() {
        GraphicalCurve.tPow3 = new Array(GraphicalCurve.bezierCurveStepSize);
        GraphicalCurve.oneMinusTPow3 = new Array(GraphicalCurve.bezierCurveStepSize);
        GraphicalCurve.bezierFactorOne = new Array(GraphicalCurve.bezierCurveStepSize);
        GraphicalCurve.bezierFactorTwo = new Array(GraphicalCurve.bezierCurveStepSize);
        for (let i: number = 0; i < GraphicalCurve.bezierCurveStepSize; i++) {
            const t: number =  i / GraphicalCurve.bezierCurveStepSize;

            GraphicalCurve.tPow3[i] = Math.pow(t, 3);
            GraphicalCurve.oneMinusTPow3[i] = Math.pow((1 - t), 3);
            GraphicalCurve.bezierFactorOne[i] = 3 * Math.pow((1 - t), 2) * t;
            GraphicalCurve.bezierFactorTwo[i] = 3 * (1 - t) * Math.pow(t, 2);
        }
    }

    public bezierStartPt: PointF2D;
    public bezierStartControlPt: PointF2D;
    public bezierEndControlPt: PointF2D;
    public bezierEndPt: PointF2D;

    /**
     *
     * @param relativePosition
     */
    public calculateCurvePointAtIndex(relativePosition: number): PointF2D {
        const index: number =  Math.round(relativePosition);
        if (index < 0 || index >= GraphicalCurve.bezierCurveStepSize) {
            return new PointF2D();
        }

        return new PointF2D(  (GraphicalCurve.oneMinusTPow3[index] * this.bezierStartPt.x
            + GraphicalCurve.bezierFactorOne[index] * this.bezierStartControlPt.x
            + GraphicalCurve.bezierFactorTwo[index] * this.bezierEndControlPt.x
            + GraphicalCurve.tPow3[index] * this.bezierEndPt.x)
            ,                 (GraphicalCurve.oneMinusTPow3[index] * this.bezierStartPt.y
            + GraphicalCurve.bezierFactorOne[index] * this.bezierStartControlPt.y
            + GraphicalCurve.bezierFactorTwo[index] * this.bezierEndControlPt.y + GraphicalCurve.tPow3[index] * this.bezierEndPt.y));
    }
}
