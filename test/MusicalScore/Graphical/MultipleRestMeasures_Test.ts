import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";

/**
 * test_multiple_rest_measures_auto_key_time_change.musicxml: measures 2-6 are whole-measure rests, measure 2 starts with D major,
 * measure 3 with E major and measure 5 with 3/4. A multiple rest measure only shows the key and time signature of its first measure,
 * so measure 2 stays a single rest measure, and measures 3-4 and 5-6 become multiple rest measures (instead of one for measures 2-6).
 */
describe("Multiple rest measures", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1300px"; // one system, so no courtesy key or time signature is drawn at the end of a system
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("begins a new multiple rest measure at a key or time change, and draws the key and time signature there", async () => {
        await osmd.load(TestUtils.getScore("test_multiple_rest_measures_auto_key_time_change.musicxml"));
        osmd.render();
        const restMeasureCounts: number[] = osmd.Sheet.SourceMeasures.map(measure => measure.multipleRestMeasures ?? 0);
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-7").to.deep.equal([0, 0, 2, 0, 2, 0, 0]);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(1);
        // [measure number, number of accidentals] of the key signatures drawn (none for C major); the group of a measure has its number as id
        const keySignatures: [string, number][] = Array.from(container.querySelectorAll(".vf-keysignature"))
            .map((key): [string, number] => [key.closest(".vf-measure").id, key.querySelectorAll("path").length]);
        expect(keySignatures, "D major in measure 2, E major in measure 3").to.deep.equal([["2", 2], ["3", 4]]);
        // the measure numbers of the time signatures drawn, without the numbers of the multiple rest measures, drawn like time signatures
        const timeSignatures: string[] = Array.from(container.querySelectorAll(".vf-timesignature"))
            .filter(time => !time.closest(".vf-multirest")).map(time => time.closest(".vf-measure").id);
        expect(timeSignatures, "4/4 in measure 1, 3/4 in measure 5").to.deep.equal(["1", "5"]);
        expect(osmd.GraphicSheet.findGraphicalMeasure(3, 0)).to.equal(osmd.GraphicSheet.MeasureList[2][0]);
        expect(osmd.GraphicSheet.findGraphicalMeasure(5, 0)).to.equal(osmd.GraphicSheet.MeasureList[4][0]);
    });

    it("resolves explicit rest members to their representative measure and preserves fallback lookups", async () => {
        await osmd.load(TestUtils.getScore("OSMD_function_test_multiple_rest_measures.musicxml"));
        const graphic: GraphicalMusicSheet = osmd.GraphicSheet;
        const measures: GraphicalMeasure[][] = graphic.MeasureList;
        const staffCount: number = graphic.NumberOfStaves;
        // Measures 19-23 form a five-measure rest in all four staves.
        const restStart: number = 18;
        const restLength: number = 5;
        expect(staffCount).to.equal(4);
        expect(osmd.Sheet.SourceMeasures[restStart].multipleRestMeasures).to.equal(restLength);
        expect(measures[restStart].filter(Boolean)).to.have.length(staffCount);
        for (let index: number = restStart; index < restStart + restLength; index++) {
            for (let staff: number = 0; staff < staffCount; staff++) {
                expect(graphic.findGraphicalMeasure(index, staff), `measure ${index + 1}, staff ${staff}`).to.equal(measures[restStart][staff]);
            }
        }
        for (let staff: number = 0; staff < staffCount; staff++) {
            expect(graphic.findGraphicalMeasure(restStart - 1, staff)).to.equal(measures[restStart - 1][staff]);
            expect(graphic.findGraphicalMeasure(restStart + restLength, staff)).to.equal(measures[restStart + restLength][staff]);
            expect(graphic.findGraphicalMeasure(measures.length, staff)).to.equal(measures[24][staff]);
        }
        expect(graphic.findGraphicalMeasure(-1, 0)).to.equal(undefined);
        expect(graphic.findGraphicalMeasure(22, staffCount)).to.equal(undefined);
    });
});
