// TODO: Check the operators' names
// TODO: This class should probably be immutable?

/**
 * A class representing mathematical fractions, which have a numerator and a denominator.
 */
export class Fraction {
    private static maximumAllowedNumber: number = 46340;
    private numerator: number = 0;
    private denominator: number = 1;
    private realValue: number;

    /**
     * Returns the maximum of two fractions (does not clone)
     * @param f1
     * @param f2
     * @returns {Fraction}
     */
    public static max(f1: Fraction, f2: Fraction): Fraction {
        if (f1.RealValue > f2.RealValue) {
            return f1;
        } else {
            return f2;
        }
    }

    public static Equal(f1: Fraction, f2: Fraction): boolean {
        return f1.Denominator === f2.Denominator && f1.Numerator === f2.Numerator;
    }

    /**
     * The same as Fraction.clone
     * @param fraction
     * @returns {Fraction}
     */
    public static createFromFraction(fraction: Fraction): Fraction {
        return new Fraction(fraction.numerator, fraction.denominator);
    }

    public static plus (f1: Fraction, f2: Fraction): Fraction {
        let sum: Fraction = f1.clone();
        sum.Add(f2);
        return sum;
    }

    public static minus(f1: Fraction , f2: Fraction): Fraction {
        let sum: Fraction = f1.clone();
        sum.Sub(f2);
        return sum;
    }

    private static greatestCommonDenominator(a: number, b: number): number {
        if (a === 0) {
            return b;
        }

        if (b === 1) {
            return 1;
        }

        while (b !== 0) {
            if (a > b) {
                a -= b;
            } else {
                b -= a;
            }
        }

        return a;
    }

    /**
     *
     * @param numerator
     * @param denominator
     * @param simplify - If simplify is true, then the fraction is simplified
     *      to make both the numerator and denominator coprime, and less than maximumAllowedNumber.
     */
    constructor(numerator: number = 0, denominator: number = 1, simplify: boolean = true) {
        this.numerator = numerator;
        this.denominator = denominator;

        if (simplify) { this.simplify(); }
        this.setRealValue();
    }

    public toString(): string {
        return this.numerator + "/" + this.denominator;
    }

    public clone(): Fraction {
        return new Fraction(this.numerator, this.denominator, false);
    }

    public get Numerator(): number {
        return this.numerator;
    }

    public set Numerator(value: number) {
        if (this.numerator !== value) {
            this.numerator = value;
            this.simplify();
            this.setRealValue();
        }
    }

    public get Denominator(): number {
        return this.denominator;
    }

    public set Denominator(value: number) {
        if (this.denominator !== value) {
            this.denominator = value;
            if (this.numerator !== 0) {
                this.simplify();
            }
            this.setRealValue();
        }
    }

    public get RealValue(): number {
        return this.realValue;
    }

    public multiplyWithFactor(factor: number): void {
        this.numerator *= factor;
        this.denominator *= factor;
    }

    public multiplyDenominatorWithFactor(factor: number): void {
        this.denominator *= factor;
        this.setRealValue();
    }

    public Add(fraction: Fraction): void {
        this.numerator = this.numerator * fraction.denominator + fraction.numerator * this.denominator;
        this.denominator = this.denominator * fraction.denominator;
        this.simplify();
        this.setRealValue();

    }

    public Sub(fraction: Fraction): void {
        this.numerator = this.numerator * fraction.denominator - fraction.numerator * this.denominator;
        this.denominator = this.denominator * fraction.denominator;
        this.simplify();
        this.setRealValue();
    }

    public Quantize(maxAllowedDenominator: number): Fraction {
        if (this.denominator <= maxAllowedDenominator) {
            return this;
        }

        let upTestFraction: Fraction = new Fraction(this.numerator + 1, this.denominator);

        while (upTestFraction.Denominator > maxAllowedDenominator) {
            upTestFraction.Numerator++;
        }

        if (this.numerator > this.denominator) {
            let downTestFraction: Fraction = new Fraction(this.numerator - 1, this.denominator);

            while (downTestFraction.Denominator > maxAllowedDenominator) {
                downTestFraction.Numerator--;
            }

            if (downTestFraction.Denominator < upTestFraction.Denominator) {
                return downTestFraction;
            }
        }
        return upTestFraction;
    }

    public Equals(obj: Fraction): boolean {
        return this.RealValue === obj.RealValue;
    }

    public CompareTo(obj: Fraction): number {
        let diff: number = this.numerator * obj.Denominator - this.denominator * obj.Numerator;
        // Return the sign of diff
        return diff ? diff < 0 ? -1 : 1 : 0;
    }

    public lt(frac: Fraction): boolean {
        return (this.numerator * frac.Denominator - this.denominator * frac.Numerator) < 0;
    }
    public lte(frac: Fraction): boolean {
        return (this.numerator * frac.Denominator - this.denominator * frac.Numerator) <= 0;
    }

    //public Equals(f: Fraction): boolean {
    //    if (ReferenceEquals(this, f))
    //        return true;
    //    if (ReferenceEquals(f, undefined))
    //        return false;
    //    return <number>this.numerator * f.denominator === <number>f.numerator * this.denominator;
    //}

    public GetInversion(): Fraction {
        return new Fraction(this.denominator, this.numerator);
    }

    private setRealValue(): void {
        this.realValue = this.numerator / this.denominator;
    }

    private simplify(): void {
        if (this.numerator === 0) {
            this.denominator = 1;
            return;
        }

        let i: number = Fraction.greatestCommonDenominator(Math.abs(this.numerator), Math.abs(this.denominator));

        this.numerator /= i;
        this.denominator /= i;

        if (this.denominator > Fraction.maximumAllowedNumber) {
            let factor: number = this.denominator / Fraction.maximumAllowedNumber;
            this.numerator = Math.round(this.numerator / factor);
            this.denominator = Math.round(this.denominator / factor);
        }
        if (this.numerator > Fraction.maximumAllowedNumber) {
            let factor: number = this.numerator / Fraction.maximumAllowedNumber;
            this.numerator = Math.round(this.numerator / factor);
            this.denominator = Math.round(this.denominator / factor);
        }
    }



    //private static equals(f1: Fraction, f2: Fraction): boolean {
    //    return <number>f1.numerator * f2.denominator === <number>f2.numerator * f1.denominator;
    //}
    //
    //public static ApproximateFractionFromValue(value: number, epsilonForPrecision: number): Fraction {
    //    let n: number = 1;
    //    let d: number = 1;
    //    let fraction: number = n / d;
    //    while (Math.abs(fraction - value) > epsilonForPrecision) {
    //        if (fraction < value) {
    //            n++;
    //        }
    //        else {
    //            d++;
    //            n = <number>Math.round(value * d);
    //        }
    //        fraction = n / <number>d;
    //    }
    //    return new Fraction(n, d);
    //}
    //public static GetEarlierTimestamp(m1: Fraction, m2: Fraction): Fraction {
    //    if (m1 < m2)
    //        return m1;
    //    else return m2;
    //}

    //public static getFraction(value: number, denominatorPrecision: number): Fraction {
    //    let numerator: number = <number>Math.round(value / (1.0 / denominatorPrecision));
    //    return new Fraction(numerator, denominatorPrecision);
    //}
    //public static fractionMin(f1: Fraction, f2: Fraction): Fraction {
    //    if (f1 < f2)
    //        return f1;
    //    else return f2;
    //}

    //public static GetMaxValue(): Fraction {
    //    return new Fraction(Fraction.maximumAllowedNumber, 1);
    //}
    //public static get MaxAllowedNumerator(): number {
    //    return Fraction.maximumAllowedNumber;
    //}
    //public static get MaxAllowedDenominator(): number {
    //    return Fraction.maximumAllowedNumber;
    //}
    //public ToFloatingString(): string {
    //    return this.RealValue.ToString();
    //}
    //public Compare(x: Fraction, y: Fraction): number {
    //    if (x > y)
    //        return 1;
    //    if (x < y)
    //        return -1;
    //    return 0;
    //}

    //#region operators
    //
    //    // operator overloads must always come in pairs
    //    // operator overload +
    //    public static Fraction operator + (Fraction f1, Fraction f2)
    //{
    //    Fraction sum = new Fraction(f1);
    //    sum.Add(f2);
    //    return sum;
    //}
    //
    //// operator overload -
    //public static Fraction operator - (Fraction f1, Fraction f2)
    //{
    //    Fraction diff = new Fraction(f1);
    //    diff.Sub(f2);
    //    return diff;
    //}
    //
    //// operator overloads must always come in pairs
    //// operator overload >
    //public static bool operator > (Fraction f1, Fraction f2)
    //{
    //    //return (long) f1.Numerator*f2._denominator > (long) f2._numerator*f1._denominator;
    //    return f1.RealValue > f2.RealValue;
    //}
    //
    //// operator overload <
    //public static bool operator < (Fraction f1, Fraction f2)
    //{
    //    //return (long) f1._numerator*f2._denominator < (long) f2._numerator*f1._denominator;
    //    return f1.RealValue < f2.RealValue;
    //}
    //
    //// operator overload ==
    //public static bool operator === (Fraction f1, Fraction f2)
    //{
    //    // code enhanced for performance
    //    // System.Object.ReferenceEquals(f1, undefined) is better than if (f1 === undefined)
    //    // and comparisons between booleans are quick
    //    bool f1IsNull = System.Object.ReferenceEquals(f1, undefined);
    //    bool f2IsNull = System.Object.ReferenceEquals(f2, undefined);
    //
    //    // method returns true when both are undefined, false when only the first is undefined, otherwise the result of equals
    //    if (f1IsNull !== f2IsNull)
    //        return false;
    //
    //    if (f1IsNull /*&& f2IsNull*/)
    //        return true;
    //
    //    return equals(f1, f2);
    //}
    //
    //// operator overload !=
    //public static bool operator !== (Fraction f1, Fraction f2)
    //{
    //    return (!(f1 === f2));
    //}
    //
    //// operator overload >=
    //public static bool operator >= (Fraction f1, Fraction f2)
    //{
    //    return (!(f1 < f2));
    //}
    //
    //// operator overload <=
    //public static bool operator <= (Fraction f1,Fraction f2)
    //{
    //    return (!(f1 > f2));
    //}
    //
    //public static Fraction operator / (Fraction f, int i)
    //{
    //    return new Fraction(f._numerator, f._denominator *= i);
    //}
    //
    //public static Fraction operator / (Fraction f1, Fraction f2)
    //{
    //    let res = new Fraction(f1.Numerator*f2.Denominator, f1.Denominator*f2.Numerator);
    //    return res.Denominator === 0 ? new Fraction(0, 1) : res;
    //}
    //
    //public static Fraction operator * (Fraction f1, Fraction f2)
    //{
    //    return new Fraction(f1.Numerator*f2.Numerator, f1.Denominator*f2.Denominator);
    //}
    //
    //public static Fraction operator % (Fraction f1, Fraction f2)
    //{
    //    let a = f1/f2;
    //    return new Fraction(a.Numerator%a.Denominator, a.Denominator)*f2;
    //}
    //
    //#endregion operators
}
