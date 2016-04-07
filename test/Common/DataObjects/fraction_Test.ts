/**
 * Created by Oliver on 16.03.2016.
 */
import { Fraction } from "../../../src/Common/DataObjects/fraction";

describe("Fraction Unit Tests:", () => {
    describe("Construct Fraction, check Properties", () => {
        let f1: Fraction = new Fraction(2, 6);

        it("Numerator and Denominator", (done: MochaDone) => {
            chai.expect(f1.Numerator).to.equal(1);
            chai.expect(f1.Denominator).to.equal(3);
            done();
        });
    });
});
