import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

describe("drawUpToSystemNumber", () => {
    // render() lays out only the first systems, so the measures after them aren't in a staffline. render() used to throw a
    //   TypeError for a dynamic, a wedge or a tempo expression in such a measure.
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1440px"; // the same layout in every browser
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** The measure numbers in each system laid out, e.g. ["1 2 3 4", "5 6 7 8"]. */
    function systemsLaidOut(): string[] {
        const systems: MusicSystem[] = osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
        return systems.map((system: MusicSystem): string =>
            system.StaffLines[0].Measures.map((measure: GraphicalMeasure): number => measure.MeasureNumber).join(" "));
    }

    for (const [sampleFilename, after] of [
        ["MuzioClementi_SonatinaOpus36No1_Part1.xml", "a dynamic"],
        ["Beethoven_AnDieFerneGeliebte.xml", "a wedge"],
        ["Dichterliebe01.xml", "a tempo expression and a pedal"]
    ]) {
        it(`draws the first system of ${sampleFilename}, with ${after} after it, like the first one of the whole sheet`, async () => {
            osmd.setOptions({ drawUpToSystemNumber: 1 });
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.render();
            const firstSystem: string[] = systemsLaidOut();
            osmd.setOptions({ drawUpToSystemNumber: Number.MAX_VALUE }); // the default
            osmd.render();
            expect(firstSystem).to.deep.equal([systemsLaidOut()[0]]);
        });
    }

    it("draws the first system of Dichterliebe01.xml, with a pedal after it, also after a render() of the whole sheet", async () => {
        // The measures after it used to keep the stafflines of the layout before: the pedal was calculated in them, and
        //   threw a TypeError looking for the system after the last one.
        await osmd.load(TestUtils.getScore("Dichterliebe01.xml"));
        osmd.render();
        const firstSystemOfSheet: string = systemsLaidOut()[0];
        osmd.setOptions({ drawUpToSystemNumber: 1 });
        osmd.render();
        expect(systemsLaidOut()).to.deep.equal([firstSystemOfSheet]);
    });
});
