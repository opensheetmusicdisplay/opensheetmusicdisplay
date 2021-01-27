/**
 * Created by Oliver on 16.03.2016.
 */
import { Fraction } from "../../../src/Common/DataObjects/Fraction";

describe("Fraction Unit Tests:", () => {
    describe("Construct Fraction, check properties", () => {
        const f1: Fraction = new Fraction(2, 6);

        it("Numerator and Denominator", (done: Mocha.Done) => {
            chai.expect(f1.Numerator).to.equal(1);
            chai.expect(f1.Denominator).to.equal(3);
            done();
        });

        it("Real value", (done: Mocha.Done) => {
            chai.expect(f1.RealValue).to.equal(1 / 3);
            done();
        });
    });
    describe("Compare fractions", () => {
      let f1: Fraction;
      let f2: Fraction;
      const rand: () => number = function(): number {
        return Math.floor(Math.random() * 500) + 1;
      };
      it("lt attribute", (done: Mocha.Done) => {
        for (let i: number = 0; i < 10; i += 1) {
          f1 = new Fraction(rand(), rand());
          f2 = new Fraction(rand(), rand());
          chai.expect(f1.lt(f2)).to.equal(f1.RealValue < f2.RealValue);
        }
        done();
      });
    });
});
