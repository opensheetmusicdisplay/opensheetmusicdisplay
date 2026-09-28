import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";

/**
 * A D.C. in a piece with a Fine before it goes back to the beginning and ends at the Fine, as a D.C. al Fine does:
 * a plain D.C. used to play on to the end. And a D.C. or a Fine written in words that aren't Italian or English is read
 * from the direction's sound element (<sound dacapo="yes"/>, <sound fine="yes"/>), where it used to be plain text.
 *
 * Samples: a D.C. at the end of measure 4, a Fine at the end of measure 2, in Italian and in French ("Fin").
 */
describe("MusicPartManagerIterator with a D.C. and a Fine", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** The measure indices the iterator plays, in order. */
    function playedMeasures(): number[] {
        const measures: number[] = [];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            if (iterator.CurrentMeasureIndex !== measures[measures.length - 1]) {
                measures.push(iterator.CurrentMeasureIndex);
            }
            iterator.moveToNext();
        }
        return measures;
    }

    const types: (instructions: RepetitionInstruction[]) => RepetitionInstructionEnum[] =
        (instructions: RepetitionInstruction[]): RepetitionInstructionEnum[] =>
            instructions.map((instruction: RepetitionInstruction): RepetitionInstructionEnum => instruction.type);

    it("ends a plain D.C. at the Fine before it", async () => {
        await osmd.load(TestUtils.getScore("test_repetition_da_capo_with_fine.musicxml"));
        expect(playedMeasures()).to.deep.equal([0, 1, 2, 3, 0, 1]);
        // still a D.C., as written
        expect(types(osmd.Sheet.SourceMeasures[3].LastRepetitionInstructions)).to.contain(RepetitionInstructionEnum.DaCapo);
    });

    it("reads a D.C. and a Fine written in French from their sound elements", async () => {
        await osmd.load(TestUtils.getScore("test_repetition_instructions_from_sound_french.musicxml"));
        expect(playedMeasures()).to.deep.equal([0, 1, 2, 3, 0, 1]);
        expect(types(osmd.Sheet.SourceMeasures[1].LastRepetitionInstructions)).to.contain(RepetitionInstructionEnum.Fine);
    });
});
