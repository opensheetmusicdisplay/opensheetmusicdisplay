import { expect } from "chai";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * Labels like dynamics write the samples their box covers completely into the sky/bottom line and read every sample
 * their box touches. Before, both rounded outward to the samples (1 / SamplingUnit wide), so a label next to another one,
 * e.g. a p right after "dim.", was placed below it when both touched the same sample.
 */
describe("Sky and bottom line with labels", () => {
    let calculator: SkyBottomLineCalculator;
    let sample: number; // width of a sample in units
    beforeEach(() => {
        // the calculator only needs the staff line for the rules here
        const staffLine: StaffLine = { ParentMusicSystem: { rules: new EngravingRules() } } as unknown as StaffLine;
        calculator = new SkyBottomLineCalculator(staffLine);
        sample = 1 / calculator.SamplingUnit;
        // an empty staff: the bottom line is at the bottom staff line (4) everywhere
        calculator.setLinesDirectly(new Array(20).fill(0), new Array(20).fill(4));
        // a label below the staff, e.g. "dim.", from sample 1.5 to 4.2: it covers samples 2 and 3 completely
        calculator.updateBottomLineWithLabel(1.5 * sample, 4.2 * sample, 6);
    });

    it("places labels next to each other when their boxes only touch the same sample", () => {
        expect(calculator.getBottomLineMaxForLabel(4.3 * sample, 7 * sample), "label after it").to.equal(4);
        expect(calculator.getBottomLineMaxForLabel(0, 1.4 * sample), "label before it").to.equal(4);
    });

    it("places a label below another one when their boxes overlap", () => {
        expect(calculator.getBottomLineMaxForLabel(3.5 * sample, 7 * sample)).to.equal(6);
    });

    it("places a label below a note in a sample its box only touches", () => {
        calculator.BottomLine[6] = 7; // e.g. a note below the staff
        expect(calculator.getBottomLineMaxForLabel(4.3 * sample, 6.2 * sample)).to.equal(7);
    });
});
