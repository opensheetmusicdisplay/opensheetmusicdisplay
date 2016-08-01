/**
 * Created by Oliver on 16.03.2016.
 */
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import {Logging} from "../../../src/Common/Logging";

describe("Fraction Unit Tests:", () => {
    describe("Construct Fraction, check properties", () => {
        let f1: Fraction = new Fraction(2, 6);

        it("Numerator and Denominator", (done: MochaDone) => {
            chai.expect(f1.Numerator).to.equal(1);
            chai.expect(f1.Denominator).to.equal(3);
            done();
        });

        it("Real value", (done: MochaDone) => {
            chai.expect(f1.RealValue).to.equal(1 / 3);
            done();
        });
    });
    describe("Compare fractions", () => {
      let f1: Fraction;
      let f2: Fraction;
      let rand: () => number = function(): number {
        return Math.floor(Math.random() * 500) + 1;
      };
      it("lt attribute", (done: MochaDone) => {
        for (let i: number = 0; i < 10; i += 1) {
          f1 = new Fraction(rand(), rand());
          f2 = new Fraction(rand(), rand());
          chai.expect(f1.lt(f2)).to.equal(f1.RealValue < f2.RealValue);
        }
        done();
      });
    });
    // Todo: remove when typescript porting phase 2 is done an project is compiling properly again
    describe("blablabla", () => {
        let dict: Dictionary<Fraction, Fraction> = new Dictionary<Fraction, Fraction>();
        //     new Collections.Dictionary<Fraction, Fraction>(
        //     function(f: Fraction): string {
        //         return f.toString();
        // });

        let keys: Fraction[] = [];
        let values: Fraction[] = [];

        for (let i: number = 0; i < 10; ++i) {
            keys.push(new Fraction(1, i));
            values.push(new Fraction(i, 1));
            dict.setValue(keys[i], values[i]);
        }

        it("retrieved fractions should be equal", (done: MochaDone) => {
            for (let i: number = 9; i > -1; --i) {
                let key: Fraction = keys[i];
                let value: Fraction = values[i];

                //console.log(values[i].toString() + "== " + dict.getValue(key));
                Logging.debug(values[i].toString() + "== " + dict.getValue(new Fraction(key.Numerator, key.Denominator)));
                // chai.expect(dict.getValue(key)).to.equal(value);
                chai.expect(dict.getValue(new Fraction(key.Numerator, key.Denominator))).to.equal(value);
            }

            done();
        });
    });
});
