import { expect } from "chai";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexflowStafflineNoteCalculator", () => {
    // #1726: a percussion clef in measure 3 must not reposition the notes of the G clef measures 1-2.
    // Before the fix, A5 and E5 in measure 1 (pitches that also occur under the percussion clef)
    // were remapped to the percussion one-line positions ("cn/3"), like the notes in measure 3.
    it("does not apply percussion note positioning to notes under a non-percussion clef (#1726)", async () => {
        const score: Document = TestUtils.getScore("test_percussion_clef_midpart_earlier_notes_1726.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();

        const vfKeysOfMeasure: (measureIndex: number) => string[] = (measureIndex: number): string[] => {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0];
            const keys: string[] = [];
            for (const staffEntry of measure.staffEntries) {
                for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                    for (const note of voiceEntry.notes) {
                        keys.push((note as VexFlowGraphicalNote).vfpitch[0]);
                    }
                }
            }
            return keys;
        };

        // measure 1 and 2: G clef, notes keep their real pitch positions
        expect(vfKeysOfMeasure(0)).to.deep.equal(["an/5", "gn/5", "fn/5", "en/5"]);
        expect(vfKeysOfMeasure(1)).to.deep.equal(["cn/5"]);
        // measure 3: percussion clef, 2 distinct pitches -> percussion position mapping still applies
        expect(vfKeysOfMeasure(2)).to.deep.equal(["cn/3", "cn/3"]);
    });
});
