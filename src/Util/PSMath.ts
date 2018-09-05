/**
 * Some useful Maths methods.
 */
export class PSMath {

    public static log(base: number, x: number): number {
        return Math.log(x) / Math.log(base);
    }

    public static log10(x: number): number {
        return PSMath.log(10, x);
    }

    public static meanSimple(values: number[]): number {
        let sum: number = 0;
        for (let i: number = 0; i < values.length; i++) {
            sum += values[i];
        }
        return sum / values.length;
    }

    public static meanWeighted(values: number[], weights: number[]): number {
        if (values.length !== weights.length || values.length === 0) {
            return 0;
        }
        let sumWeigtedValues: number = 0;
        let sumWeights: number = 0;
        for (let i: number = 0; i < values.length; i++) {
            const weight: number = weights[i];
            sumWeigtedValues += values[i] * weight;
            sumWeights += weight;
        }
        return sumWeigtedValues / sumWeights;
    }

}



