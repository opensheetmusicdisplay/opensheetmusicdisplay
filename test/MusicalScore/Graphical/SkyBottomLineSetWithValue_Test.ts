import { expect } from "chai";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * setSkyLineWithValue() and setBottomLineWithValue() set every sample of the sky or bottom line to the value.
 * Before, they assigned the value to the forEach parameter, which changed nothing.
 */
describe("Sky and bottom line set to one value", () => {
    let calculator: SkyBottomLineCalculator;
    beforeEach(() => {
        // the calculator only needs the staff line for the rules here
        const staffLine: StaffLine = { ParentMusicSystem: { rules: new EngravingRules() } } as unknown as StaffLine;
        calculator = new SkyBottomLineCalculator(staffLine);
        calculator.setLinesDirectly([0, -1, -2, -3], [4, 5, 6, 7]);
    });

    it("sets every sample of the sky line", () => {
        calculator.setSkyLineWithValue(-5);
        expect(calculator.SkyLine).to.deep.equal([-5, -5, -5, -5]);
        expect(calculator.BottomLine, "the bottom line stays").to.deep.equal([4, 5, 6, 7]);
    });

    it("sets every sample of the bottom line", () => {
        calculator.setBottomLineWithValue(9);
        expect(calculator.BottomLine).to.deep.equal([9, 9, 9, 9]);
        expect(calculator.SkyLine, "the sky line stays").to.deep.equal([0, -1, -2, -3]);
    });
});
