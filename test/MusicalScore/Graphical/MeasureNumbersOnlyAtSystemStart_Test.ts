import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

/**
 * drawMeasureNumbersOnlyAtSystemStart (EngravingRules.RenderMeasureNumbersOnlyAtSystemStart) draws one measure number
 * per system, the one of its first measure - or of its second measure if the first one is a pickup measure.
 * It used to also draw the number of the second measure of every system, when that one was due by measureNumberInterval
 * (e.g. with measureNumberInterval 1).
 */
describe("Measure numbers only at system start", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function renderSystems(sampleFilename: string): Promise<MusicSystem[]> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        // interval 1: without drawMeasureNumbersOnlyAtSystemStart, every measure would get a number
        osmd.setOptions({ drawMeasureNumbersOnlyAtSystemStart: true, measureNumberInterval: 1 });
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
        const systems: MusicSystem[] = osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
        expect(systems.length, "the sample needs several systems").to.be.greaterThan(2);
        return systems;
    }

    function measureNumberTexts(system: MusicSystem): string[] {
        return system.MeasureNumberLabels.map((label: GraphicalLabel) => label.Label.text);
    }

    it("draws only the number of the first measure of each system", async () => {
        const systems: MusicSystem[] = await renderSystems("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        // the first system doesn't show measure number 1
        expect(measureNumberTexts(systems[0]), "system 1").to.deep.equal([]);
        for (let i: number = 1; i < systems.length; i++) {
            const firstMeasureNumber: number = systems[i].StaffLines[0].Measures[0].MeasureNumber;
            expect(measureNumberTexts(systems[i]), `system ${i + 1}`).to.deep.equal([firstMeasureNumber.toString()]);
        }
    });

    it("draws the number of measure 1 after a pickup measure", async () => {
        const systems: MusicSystem[] = await renderSystems("Mozart_AnChloe.xml");
        expect(systems[0].StaffLines[0].Measures[0].parentSourceMeasure.ImplicitMeasure, "pickup measure").to.equal(true);
        expect(measureNumberTexts(systems[0]), "system 1").to.deep.equal(["1"]);
        for (let i: number = 1; i < systems.length; i++) {
            const firstMeasureNumber: number = systems[i].StaffLines[0].Measures[0].MeasureNumber;
            expect(measureNumberTexts(systems[i]), `system ${i + 1}`).to.deep.equal([firstMeasureNumber.toString()]);
        }
    });
});
