import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RhythmInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";

/**
 * test_time_signatures_additive.musicxml: the flute has 2+2+3/8, 3+2+2/8, and in measure 3 1+1/4 with 3/8 (two beats/beat-type pairs).
 * The oboe has no time signature in measure 1, so it takes the flute's, an explicit 7/8 in measure 2, and none in measure 3.
 */
describe("Additive time signatures", () => {
    it("draws the numerator groups given in the source, e.g. 2+2+3/8 instead of 7/8, and keeps the summed duration", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1300px"; // one system, so no courtesy time signature is drawn at the end of a system
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        try {
            await osmd.load(TestUtils.getScore("test_time_signatures_additive.musicxml"));
            osmd.render();
            // [flute, oboe] per measure
            const groups: number[][][] = osmd.Sheet.SourceMeasures.map(measure => measure.FirstInstructionsStaffEntries.map(entry =>
                (entry.Instructions.find(instruction => instruction instanceof RhythmInstruction) as RhythmInstruction).NumeratorGroups));
            expect(groups).to.deep.equal([[[2, 2, 3], [2, 2, 3]], [[3, 2, 2], undefined], [undefined, undefined]]);
            expect(osmd.Sheet.SourceMeasures.map(measure => measure.Duration.RealValue)).to.deep.equal([7 / 8, 7 / 8, 7 / 8]);
            // [measure number, number of glyphs] of the time signatures drawn, the flute's first: 2+2+3 over 8 has 6 glyphs, 7 over 8 two
            const timeSignatures: [string, number][] = Array.from(container.querySelectorAll(".vf-timesignature"))
                .map((time): [string, number] => [time.closest(".vf-measure").id, time.querySelectorAll("path").length]);
            expect(timeSignatures).to.deep.equal([["1", 6], ["2", 6], ["3", 2], ["1", 6], ["2", 2], ["3", 2]]);
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});
