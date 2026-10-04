import { PointF2D } from "../../Common/DataObjects/PointF2D";

export class GraphicalCurve {
    private static readonly bezierCurveStepSize: number = 1000;
    // Curve-independent factors, to be used later in the Slur- and TieCurvePoints calculation (calculateCurvePointAtIndex()).
    //   They only depend on the constant bezierCurveStepSize, so they are constants, calculated once,
    //   not again for every curve (each slur filled these 4 arrays of 1000 numbers with Math.pow).
    private static readonly tPow3: number[] = GraphicalCurve.calculateBezierFactors(t => Math.pow(t, 3));
    private static readonly oneMinusTPow3: number[] = GraphicalCurve.calculateBezierFactors(t => Math.pow((1 - t), 3));
    private static readonly bezierFactorOne: number[] = GraphicalCurve.calculateBezierFactors(t => 3 * Math.pow((1 - t), 2) * t);
    private static readonly bezierFactorTwo: number[] = GraphicalCurve.calculateBezierFactors(t => 3 * (1 - t) * Math.pow(t, 2));

    /**
     * Calculates a curve-independent factor for each step t = i / bezierCurveStepSize of a Bezier curve.
     * @param factorAt the factor at t
     * @returns the factors of all steps
     */
    private static calculateBezierFactors(factorAt: (t: number) => number): number[] {
        const factors: number[] = new Array(GraphicalCurve.bezierCurveStepSize);
        for (let i: number = 0; i < GraphicalCurve.bezierCurveStepSize; i++) {
            factors[i] = factorAt(i / GraphicalCurve.bezierCurveStepSize);
        }
        return factors;
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
        const index: number =  Math.round(relativePosition * GraphicalCurve.bezierCurveStepSize);
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
