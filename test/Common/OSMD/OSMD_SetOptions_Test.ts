import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { CursorType } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";

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

    it("keeps the cursors when cursorsOptions is left out, and gives a new OSMD the standard cursor", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            /** The type and color of each cursor. */
            const cursorsOf: (instance: OpenSheetMusicDisplay) => string = (instance: OpenSheetMusicDisplay): string =>
                instance.cursors.map(cursor => `${cursor.CursorOptions.type} ${cursor.CursorOptions.color}`).join(", ");
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, {
                autoResize: false,
                cursorsOptions: [
                    { type: CursorType.CurrentArea, color: "#2bb8cd", alpha: 0.6, follow: true },
                    { type: CursorType.ThinLeft, color: "#ff0000", alpha: 0.5, follow: false },
                ],
            });
            await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            osmd.render();
            osmd.cursorsOptions[0].color = "#123456"; // an option changed in place
            osmd.setOptions({ darkMode: true });
            osmd.render();
            expect(cursorsOf(osmd), "after setOptions() without cursorsOptions").to.equal("3 #123456, 1 #ff0000");

            container.innerHTML = "";
            const osmdWithStandardCursor: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmdWithStandardCursor.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            osmdWithStandardCursor.render();
            expect(cursorsOf(osmdWithStandardCursor), "a new OSMD").to.equal(`0 ${osmdWithStandardCursor.EngravingRules.DefaultColorCursor}`);
        } finally {
            container.remove();
        }
    });
});
