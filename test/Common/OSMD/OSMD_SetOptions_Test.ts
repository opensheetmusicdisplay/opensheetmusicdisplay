import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";

/** osmd.setOptions(): an option that is given is applied, also when it's false, and an option that is left out is kept. */
describe("OSMD setOptions", () => {
    it("turns the tuplet options on and off again", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        const rules: EngravingRules = osmd.EngravingRules;
        osmd.setOptions({ tupletsRatioed: true, tupletsBracketed: true, tripletsBracketed: true });
        osmd.setOptions({ drawTitle: false }); // leaving the options out keeps them
        expect([rules.TupletsRatioed, rules.TupletsBracketed, rules.TripletsBracketed], "after setOptions() without the options")
            .to.deep.equal([true, true, true]);
        osmd.setOptions({ tupletsRatioed: false, tupletsBracketed: false, tripletsBracketed: false });
        expect([rules.TupletsRatioed, rules.TupletsBracketed, rules.TripletsBracketed]).to.deep.equal([false, false, false]);
    });
});
