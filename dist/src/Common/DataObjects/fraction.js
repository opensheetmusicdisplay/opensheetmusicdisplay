// FIXME: Check the operators' names
// FIXME: This class should probably be immutable?
"use strict";
var Fraction = (function () {
    function Fraction(numerator, denominator, simplify) {
        if (numerator === void 0) { numerator = 0; }
        if (denominator === void 0) { denominator = 1; }
        if (simplify === void 0) { simplify = true; }
        this.numerator = 0;
        this.denominator = 1;
        this.numerator = numerator;
        this.denominator = denominator;
        if (simplify) {
            this.simplify();
        }
        this.setRealValue();
    }
    Fraction.max = function (f1, f2) {
        if (f1.RealValue > f2.RealValue) {
            return f1;
        }
        else {
            return f2;
        }
    };
    Fraction.Equal = function (f1, f2) {
        // FIXME
        return f1.Denominator === f2.Denominator && f1.Numerator === f2.Numerator;
    };
    Fraction.createFromFraction = function (fraction) {
        return new Fraction(fraction.numerator, fraction.denominator);
    };
    Fraction.plus = function (f1, f2) {
        var sum = f1.clone();
        sum.Add(f2);
        return sum;
    };
    Fraction.minus = function (f1, f2) {
        var sum = f1.clone();
        sum.Sub(f2);
        return sum;
    };
    Fraction.greatestCommonDenominator = function (a, b) {
        if (a === 0) {
            return b;
        }
        if (b === 1) {
            return 1;
        }
        while (b !== 0) {
            if (a > b) {
                a -= b;
            }
            else {
                b -= a;
            }
        }
        return a;
    };
    Fraction.prototype.toString = function () {
        return this.numerator + "/" + this.denominator;
    };
    Fraction.prototype.clone = function () {
        return new Fraction(this.numerator, this.denominator, false);
    };
    Object.defineProperty(Fraction.prototype, "Numerator", {
        get: function () {
            return this.numerator;
        },
        set: function (value) {
            if (this.numerator !== value) {
                this.numerator = value;
                this.simplify();
                this.setRealValue();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Fraction.prototype, "Denominator", {
        get: function () {
            return this.denominator;
        },
        set: function (value) {
            if (this.denominator !== value) {
                this.denominator = value;
                if (this.numerator !== 0) {
                    this.simplify();
                }
                this.setRealValue();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Fraction.prototype, "RealValue", {
        get: function () {
            return this.realValue;
        },
        enumerable: true,
        configurable: true
    });
    Fraction.prototype.multiplyWithFactor = function (factor) {
        this.numerator *= factor;
        this.denominator *= factor;
    };
    Fraction.prototype.multiplyDenominatorWithFactor = function (factor) {
        this.denominator *= factor;
        this.setRealValue();
    };
    Fraction.prototype.Add = function (fraction) {
        this.numerator = this.numerator * fraction.denominator + fraction.numerator * this.denominator;
        this.denominator = this.denominator * fraction.denominator;
        this.simplify();
        this.setRealValue();
    };
    Fraction.prototype.Sub = function (fraction) {
        this.numerator = this.numerator * fraction.denominator - fraction.numerator * this.denominator;
        this.denominator = this.denominator * fraction.denominator;
        this.simplify();
        this.setRealValue();
    };
    Fraction.prototype.Quantize = function (maxAllowedDenominator) {
        if (this.denominator <= maxAllowedDenominator) {
            return this;
        }
        var upTestFraction = new Fraction(this.numerator + 1, this.denominator);
        while (upTestFraction.Denominator > maxAllowedDenominator) {
            upTestFraction.Numerator++;
        }
        if (this.numerator > this.denominator) {
            var downTestFraction = new Fraction(this.numerator - 1, this.denominator);
            while (downTestFraction.Denominator > maxAllowedDenominator) {
                downTestFraction.Numerator--;
            }
            if (downTestFraction.Denominator < upTestFraction.Denominator) {
                return downTestFraction;
            }
        }
        return upTestFraction;
    };
    Fraction.prototype.Equals = function (obj) {
        return this.RealValue === obj.RealValue;
    };
    Fraction.prototype.CompareTo = function (obj) {
        var diff = this.numerator * obj.Denominator - this.denominator * obj.Numerator;
        // Return the sign of diff
        return diff ? diff < 0 ? -1 : 1 : 0;
    };
    Fraction.prototype.lt = function (frac) {
        return (this.numerator * frac.Denominator - this.denominator * frac.Numerator) < 0;
    };
    Fraction.prototype.lte = function (frac) {
        return (this.numerator * frac.Denominator - this.denominator * frac.Numerator) <= 0;
    };
    //public Equals(f: Fraction): boolean {
    //    if (ReferenceEquals(this, f))
    //        return true;
    //    if (ReferenceEquals(f, undefined))
    //        return false;
    //    return <number>this.numerator * f.denominator === <number>f.numerator * this.denominator;
    //}
    Fraction.prototype.GetInversion = function () {
        return new Fraction(this.denominator, this.numerator);
    };
    Fraction.prototype.setRealValue = function () {
        this.realValue = this.numerator / this.denominator;
    };
    Fraction.prototype.simplify = function () {
        if (this.numerator === 0) {
            this.denominator = 1;
            return;
        }
        var i = Fraction.greatestCommonDenominator(Math.abs(this.numerator), Math.abs(this.denominator));
        this.numerator /= i;
        this.denominator /= i;
        if (this.denominator > Fraction.maximumAllowedNumber) {
            var factor = this.denominator / Fraction.maximumAllowedNumber;
            this.numerator = Math.round(this.numerator / factor);
            this.denominator = Math.round(this.denominator / factor);
        }
        if (this.numerator > Fraction.maximumAllowedNumber) {
            var factor = this.numerator / Fraction.maximumAllowedNumber;
            this.numerator = Math.round(this.numerator / factor);
            this.denominator = Math.round(this.denominator / factor);
        }
    };
    Fraction.maximumAllowedNumber = 46340;
    return Fraction;
}());
exports.Fraction = Fraction;
