"use strict";
/**
 * Created by Oliver on 16.03.2016.
 */
var fraction_1 = require("../../../src/Common/DataObjects/fraction");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
describe("Fraction Unit Tests:", function () {
    describe("Construct Fraction, check properties", function () {
        var f1 = new fraction_1.Fraction(2, 6);
        it("Numerator and Denominator", function (done) {
            chai.expect(f1.Numerator).to.equal(1);
            chai.expect(f1.Denominator).to.equal(3);
            done();
        });
        it("Real value", function (done) {
            chai.expect(f1.RealValue).to.equal(1 / 3);
            done();
        });
    });
    describe("Compare fractions", function () {
        var f1;
        var f2;
        var rand = function () {
            return Math.floor(Math.random() * 500) + 1;
        };
        it("lt attribute", function (done) {
            for (var i = 0; i < 10; i += 1) {
                f1 = new fraction_1.Fraction(rand(), rand());
                f2 = new fraction_1.Fraction(rand(), rand());
                chai.expect(f1.lt(f2)).to.equal(f1.RealValue < f2.RealValue);
            }
            done();
        });
    });
    // Todo: remove when typescript porting phase 2 is done an project is compiling properly again
    describe("blablabla", function () {
        var dict = new Dictionary_1.default();
        //     new Collections.Dictionary<Fraction, Fraction>(
        //     function(f: Fraction): string {
        //         return f.toString();
        // });
        var keys = [];
        var values = [];
        for (var i = 0; i < 10; ++i) {
            keys.push(new fraction_1.Fraction(1, i));
            values.push(new fraction_1.Fraction(i, 1));
            dict.setValue(keys[i], values[i]);
        }
        it("retrieved fractions should be equal", function (done) {
            for (var i = 9; i > -1; --i) {
                var key = keys[i];
                var value = values[i];
                //console.log(values[i].toString() + "== " + dict.getValue(key));
                console.log(values[i].toString() + "== " + dict.getValue(new fraction_1.Fraction(key.Numerator, key.Denominator)));
                // chai.expect(dict.getValue(key)).to.equal(value);
                chai.expect(dict.getValue(new fraction_1.Fraction(key.Numerator, key.Denominator))).to.equal(value);
            }
            done();
        });
    });
});
