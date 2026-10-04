import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { SystemLinePosition } from "../../../src/MusicalScore/Graphical/SystemLinePosition";
import { SystemLinesEnum } from "../../../src/MusicalScore/Graphical/SystemLinesEnum";

describe("Multiple rest measures generated from rest measures", () => {
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

    /** Loads and renders the sample, and returns per measure how many measures the multiple rest measure it begins has (0 for none). */
    async function renderSample(sampleName: string): Promise<number[]> {
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        return osmd.Sheet.SourceMeasures.map(measure => measure.multipleRestMeasures ?? 0);
    }

    /**
     * test_multiple_rest_measures_auto_key_time_change.musicxml: measures 2-6 are whole-measure rests, measure 2 starts with D major,
     * measure 3 with E major and measure 5 with 3/4. A multiple rest measure only shows the key and time signature of its first measure,
     * so measure 2 stays a single rest measure, and measures 3-4 and 5-6 become multiple rest measures (instead of one for measures 2-6).
     */
    it("begins a new multiple rest measure at a key or time change, and draws the key and time signature there", async () => {
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_key_time_change.musicxml");
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
    });

    /**
     * test_multiple_rest_measures_auto_rehearsal_mark.musicxml: measures 2-5 are whole-measure rests, measure 4 has the rehearsal mark B.
     * A multiple rest measure only shows the rehearsal mark of its first measure, so measures 2-3 and 4-5 become multiple rest measures.
     */
    it("begins a new multiple rest measure at a rehearsal mark, and draws the rehearsal mark there", async () => {
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_rehearsal_mark.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-6").to.deep.equal([0, 2, 0, 2, 0, 0]);
        // [measure number, text] of the rehearsal marks drawn, the only texts in the measures
        const rehearsalMarks: [string, string][] = Array.from(container.querySelectorAll(".vf-measure text"))
            .map((text): [string, string] => [text.closest(".vf-measure").id, text.textContent]);
        expect(rehearsalMarks, "A in measure 1, B in measure 4").to.deep.equal([["1", "A"], ["4", "B"]]);
    });

    /**
     * test_multiple_rest_measures_auto_barlines.musicxml: measures 2-9 are whole-measure rests, measure 3 ends with a double barline,
     * measure 5 with a heavy-heavy one and measure 7 with a final barline (the end of the first movement).
     * A multiple rest measure only shows the barline of its last measure, so measures 2-3, 4-5, 6-7 and 8-9 become multiple rest measures.
     */
    it("ends a multiple rest measure with a double or final barline, and begins a new part after the final barline", async () => {
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = false; // one system, measure numbers 1-10 (read when loading)
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_barlines.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-10").to.deep.equal([0, 2, 0, 2, 0, 2, 0, 2, 0, 0]);
        // [measure number, barline] of the barlines at the measure ends
        const endBarlines: [number, SystemLinesEnum][] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].SystemLines
            .filter(line => line.linePosition === SystemLinePosition.MeasureEnd)
            .map((line): [number, SystemLinesEnum] => [line.topMeasure.MeasureNumber, line.lineType]);
        expect(endBarlines, "barlines after measures 1, 2-3, 4-5, 6-7, 8-9 and 10").to.deep.equal([
            [1, SystemLinesEnum.SingleThin], [2, SystemLinesEnum.DoubleThin], [4, SystemLinesEnum.DoubleBold],
            [6, SystemLinesEnum.ThinBold], [8, SystemLinesEnum.SingleThin], [10, SystemLinesEnum.ThinBold]]);

        // the second movement begins a new system when the multiple rest measure 6-7 ends the first one with its final barline
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = true; // (read when loading)
        await renderSample("test_multiple_rest_measures_auto_barlines.musicxml");
        const measuresPerSystem: number[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0].Measures.length);
        expect(measuresPerSystem, "measures 1, 2-3, 4-5, 6-7 in the first system, 8-9 and 10 in the second").to.deep.equal([4, 2]);
    });
});
