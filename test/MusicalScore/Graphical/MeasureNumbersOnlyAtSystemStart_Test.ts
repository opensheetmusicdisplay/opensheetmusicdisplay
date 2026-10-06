import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { IOSMDOptions } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

/**
 * drawMeasureNumbersOnlyAtSystemStart (EngravingRules.RenderMeasureNumbersOnlyAtSystemStart) draws one measure number
 * per system, the one of its first measure - or of its second measure if the first one is an implicit measure without number
 * (a pickup measure, or e.g. the second part of a measure split by a repeat), regardless of measureNumberInterval.
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

    /** measure 3 is split by a repeat sign, and its second part (implicit, measure 4 in the file) starts system 2. */
    const splitMeasureSample: string = "test_measure_numbers_only_at_system_start_split_measure.musicxml";

    async function renderSystems(sampleFilename: string, options: IOSMDOptions = {},
                                 configure?: (osmd: OpenSheetMusicDisplay) => void): Promise<MusicSystem[]> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        // interval 1: without drawMeasureNumbersOnlyAtSystemStart, every measure would get a number
        osmd.setOptions({ drawMeasureNumbersOnlyAtSystemStart: true, measureNumberInterval: 1, ...options });
        configure?.(osmd);
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

    it("draws the number of the measure after an implicit first measure, regardless of measureNumberInterval", async () => {
        // with the default interval 2, measure 5 isn't due after measure 4, but it's the only number system 2 can show
        const systems: MusicSystem[] = await renderSystems(splitMeasureSample, { measureNumberInterval: 2, newSystemFromXML: true });
        expect(systems[1].StaffLines[0].Measures[0].parentSourceMeasure.ImplicitMeasure, "system 2 starts with an implicit measure")
            .to.equal(true);
        expect(systems.map(measureNumberTexts)).to.deep.equal([[], ["5"], ["7"]]);
    });

    it("draws only the number of an implicit first measure if implicit measures get numbers", async () => {
        const systems: MusicSystem[] = await renderSystems(splitMeasureSample, { newSystemFromXML: true },
            (osmd: OpenSheetMusicDisplay): void => {
                osmd.EngravingRules.RenderMeasureNumbersForImplicitMeasures = true;
            });
        expect(systems.map(measureNumberTexts)).to.deep.equal([[], ["4"], ["7"]]);
    });

    it("can be turned off again with setOptions()", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ drawMeasureNumbersOnlyAtSystemStart: true });
        osmd.setOptions({ drawTitle: false }); // leaving the option out keeps it
        expect(osmd.EngravingRules.RenderMeasureNumbersOnlyAtSystemStart, "after setOptions() without the option").to.equal(true);
        osmd.setOptions({ drawMeasureNumbersOnlyAtSystemStart: false });
        expect(osmd.EngravingRules.RenderMeasureNumbersOnlyAtSystemStart).to.equal(false);
    });
});
