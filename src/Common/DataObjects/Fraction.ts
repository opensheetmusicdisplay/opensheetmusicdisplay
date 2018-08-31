// TODO: Check the operators' names
// TODO: This class should probably be immutable?

/**
 * A class representing mathematical fractions, which have a numerator and a denominator.
 */
export class Fraction {
  private static maximumAllowedNumber: number = 46340; // sqrt(int.Max) --> signed int with 4 bytes (2^31)
  private numerator: number = 0;
  private denominator: number = 1;
  private wholeValue: number = 0;
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
    return f1.wholeValue === f2.wholeValue && f1.Denominator === f2.Denominator && f1.Numerator === f2.Numerator;
  }

  /**
   * The same as Fraction.clone
   * @param fraction
   * @returns {Fraction}
   */
  public static createFromFraction(fraction: Fraction): Fraction {
    return new Fraction(fraction.numerator, fraction.denominator, fraction.wholeValue, false);
  }

  public static plus(f1: Fraction, f2: Fraction): Fraction {
    const sum: Fraction = f1.clone();
    sum.Add(f2);
    return sum;
  }

  public static minus(f1: Fraction, f2: Fraction): Fraction {
    const sum: Fraction = f1.clone();
    sum.Sub(f2);
    return sum;
  }

    public static multiply (f1: Fraction, f2: Fraction): Fraction {
        return new Fraction ( (f1.wholeValue * f1.denominator + f1.numerator) * (f2.wholeValue * f2.denominator + f2.numerator),
                              f1.denominator * f2.denominator);
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
   * @param wholeValue - the integer number, needed for values greater than 1
   * @param simplify - If simplify is true, then the fraction is simplified
   *      to make both the numerator and denominator coprime, and less than maximumAllowedNumber.
   */
  constructor(numerator: number = 0, denominator: number = 1, wholeValue: number = 0, simplify: boolean = true) {
    this.numerator = numerator;
    this.denominator = denominator;
    this.wholeValue = wholeValue;

    if (simplify) {
      this.simplify();
    }
    this.setRealValue();
  }

  public toString(): string {
    let result: string = this.numerator + "/" + this.denominator;
    if (this.wholeValue !== 0) {
      result = this.wholeValue + " " + result;
    }

    return result;
  }

  public clone(): Fraction {
    return new Fraction(this.numerator, this.denominator, this.wholeValue, false);
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
      // don't simplify in case of a GraceNote (need it in order to set the right symbol)
      if (this.numerator !== 0) {
        this.simplify();
      }
      this.setRealValue();
    }
  }

  public get WholeValue(): number {
    return this.wholeValue;
  }

  public set WholeValue(value: number) {
    if (this.wholeValue !== value) {
      this.wholeValue = value;
      this.setRealValue();
    }
  }

  /**
   * Returns the unified numerator where the whole value will be expanded
   * with the denominator and added to the existing numerator.
   */
  public GetExpandedNumerator(): number {
    return this.wholeValue * this.denominator + this.numerator;
  }

  public IsNegative(): boolean {
    return this.realValue < 0;
  }

  public get RealValue(): number {
    return this.realValue;
  }

  public expand(expansionValue: number): void {
    this.numerator *= expansionValue;
    this.denominator *= expansionValue;
    if (this.wholeValue !== 0) {
      this.numerator += this.wholeValue * this.denominator;
      this.wholeValue = 0;
    }
  }

  // public multiplyDenominatorWithFactor(factor: number): void {
  //   this.denominator *= factor;
  //   this.setRealValue();
  // }

  /**
   * Adds a Fraction to this Fraction.
   * Attention: This changes the already existing Fraction, which might be referenced elsewhere!
   * Use Fraction.plus() for creating a new Fraction object being the sum of two Fractions.
   * @param fraction the Fraction to add.
   */
  public Add(fraction: Fraction): void {
    // normally should check if denominator or fraction.denominator is 0 but in our case
    // a zero denominator doesn't make sense
    this.numerator = (this.wholeValue * this.denominator + this.numerator) * fraction.denominator +
      (fraction.wholeValue * fraction.denominator + fraction.numerator) * this.denominator;
    this.denominator = this.denominator * fraction.denominator;
    this.wholeValue = 0;
    this.simplify();
    this.setRealValue();
  }

  /**
   * Subtracts a Fraction from this Fraction.
   * Attention: This changes the already existing Fraction, which might be referenced elsewhere!
   * Use Fraction.minus() for creating a new Fraction object being the difference of two Fractions.
   * @param fraction the Fraction to subtract.
   */
  public Sub(fraction: Fraction): void {
    // normally should check if denominator or fraction.denominator is 0 but in our case
    // a zero denominator doesn't make sense
    this.numerator = (this.wholeValue * this.denominator + this.numerator) * fraction.denominator -
      (fraction.wholeValue * fraction.denominator + fraction.numerator) * this.denominator;
    this.denominator = this.denominator * fraction.denominator;
    this.wholeValue = 0;
    this.simplify();
    this.setRealValue();
  }
  /**
   * Brute Force quanization by searching incremental with the numerator until the denominator is
   * smaller/equal than the desired one.
   * @param maxAllowedDenominator
   */
  public Quantize(maxAllowedDenominator: number): Fraction {
    if (this.denominator <= maxAllowedDenominator) {
      return this;
    }

    const upTestFraction: Fraction = new Fraction(this.numerator + 1, this.denominator, this.wholeValue);

    while (upTestFraction.Denominator > maxAllowedDenominator) {
      upTestFraction.Numerator++;
    }

    if (this.numerator > this.denominator) {
      const downTestFraction: Fraction = new Fraction(this.numerator - 1, this.denominator, this.wholeValue);

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
    return this.realValue === obj.realValue;
  }

  public CompareTo(obj: Fraction): number {
    const diff: number = this.realValue - obj.realValue;
    // Return the sign of diff
    return diff ? diff < 0 ? -1 : 1 : 0;
  }

  public lt(frac: Fraction): boolean {
    return this.realValue < frac.realValue;
  }

  public lte(frac: Fraction): boolean {
    return this.realValue <= frac.realValue;
  }

  //public Equals(f: Fraction): boolean {
  //    if (ReferenceEquals(this, f))
  //        return true;
  //    if (ReferenceEquals(f, undefined))
  //        return false;
  //    return this.numerator * f.denominator === f.numerator * this.denominator;
  //}

  private setRealValue(): void {
    this.realValue = this.wholeValue + this.numerator / this.denominator;
  }

  private simplify(): void {
    // don't simplify in case of a GraceNote (need it in order to set the right symbol)
    if (this.numerator === 0) {
      this.denominator = 1;
      return;
    }

    // normally should check if denominator or fraction.denominator is 0 but in our case a zero denominator
    // doesn't make sense. Could probably be optimized
    const i: number = Fraction.greatestCommonDenominator(Math.abs(this.numerator), Math.abs(this.denominator));

    this.numerator /= i;
    this.denominator /= i;

    const whole: number = Math.floor(this.numerator / this.denominator);
    if (whole !== 0) {
      this.wholeValue += whole;
      this.numerator -= whole * this.denominator;
      if (this.numerator === 0) {
        this.denominator = 1;
      }
    }
    if (this.denominator > Fraction.maximumAllowedNumber) {
      const factor: number = this.denominator / Fraction.maximumAllowedNumber;
      this.numerator = Math.round(this.numerator / factor);
      this.denominator = Math.round(this.denominator / factor);
    }
    if (this.numerator > Fraction.maximumAllowedNumber) {
      const factor: number = this.numerator / Fraction.maximumAllowedNumber;
      this.numerator = Math.round(this.numerator / factor);
      this.denominator = Math.round(this.denominator / factor);
    }
  }


  //private static equals(f1: Fraction, f2: Fraction): boolean {
  //    return f1.numerator * f2.denominator === f2.numerator * f1.denominator;
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
  //            n = Math.round(value * d);
  //        }
  //        fraction = n / d;
  //    }
  //    return new Fraction(n, d);
  //}
  //public static GetEarlierTimestamp(m1: Fraction, m2: Fraction): Fraction {
  //    if (m1 < m2)
  //        return m1;
  //    else return m2;
  //}

  //public static getFraction(value: number, denominatorPrecision: number): Fraction {
  //    let numerator: number = Math.round(value / (1.0 / denominatorPrecision));
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
