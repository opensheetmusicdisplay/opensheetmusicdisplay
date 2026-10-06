import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";

/**
 * The order in which the iterator (cursor and playback) plays the measures of repetitions: repeat signs, endings, D.C.
 */
describe("MusicPartManagerIterator measure order with repetitions", () => {
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

    /** Loads the sample and returns the measure indices the iterator plays, in order (a measure played again right after a jump is listed again). */
    async function playedMeasures(sample: string): Promise<number[]> {
        await osmd.load(TestUtils.getScore(sample));
        const measures: number[] = [];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            if (iterator.CurrentMeasureIndex !== measures[measures.length - 1] || iterator.JumpOccurred) {
                measures.push(iterator.CurrentMeasureIndex);
            }
            iterator.moveToNext();
        }
        return measures;
    }

    /**
     * A first ending with no second ending written after it is played on the first pass only: the last pass goes on after it.
     * It used to be played on both passes, since a repetition with fewer endings than passes plays its first ending on the extra ones.
     *
     * Sample: measures 2-3 repeated, measure 3 under a first ending with no second ending after it.
     */
    it("skips a first ending without a second ending on the second pass", async () => {
        expect(await playedMeasures("test_repeat_first_ending_without_second_ending.musicxml")).to.deep.equal([0, 1, 2, 1, 3]);
    });

    /**
     * An ending without any repeat sign repeats nothing, it is played once.
     * OSMD used to add a backward repeat at the end of the piece, so the whole piece was played twice.
     *
     * Sample: a first ending on the last measure (10), no repeat sign.
     */
    it("plays an ending without any repeat sign once", async () => {
        expect(await playedMeasures("OSMD_function_test_expressions.musicxml")).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    /**
     * A D.C. after a repetition from the first measure with endings was added to that repetition as a second backward jump,
     * which was never taken. After the D.C., the repeat is not taken again: the second ending follows the first measure.
     *
     * Sample: measures 1-2 repeated, with a first ending (2) and a second ending (3), which has the D.C.
     */
    it("takes a D.C. in the second ending of a repetition from the first measure, without the repeat after it", async () => {
        expect(await playedMeasures("test_repeat_da_capo_in_second_ending.musicxml")).to.deep.equal([0, 1, 0, 2, 0, 2]);
    });

    /**
     * A D.C. al Coda plays the piece once: from the beginning to the To Coda again, without repeats, then the coda.
     * The whole piece used to be played twice, and the repeat again after the D.C.
     *
     * Sample: measure 1 repeated, To Coda in measure 2, D.C. al Coda in measure 3, coda in measures 4-5.
     */
    it("plays a D.C. al Coda once, without the repeat after the D.C.", async () => {
        expect(await playedMeasures("test_repeat_da_capo_al_coda_after_repeat.musicxml")).to.deep.equal([0, 0, 1, 2, 0, 1, 3, 4]);
    });

    /**
     * Sample: five movements (the measure numbers restart), see the comment in the file:
     * 1. A first ending without a forward repeat after a repeat goes back to the measure after that repeat (it went back to the first measure).
     * 2. A segno in the measure of a forward repeat: the repeat's endings belong to the repeat, and the D.S. al Coda is taken
     *    (the repeat's backward jump closed the segno's repetition, so the D.S. al Coda was lost).
     * 3. No repeat or jump, so the first instruction of movement 4 crosses two movement starts.
     * 4. "Menuetto D.C. al Fine" goes back to the start of its movement (it went back to the first measure of the piece, and wasn't read).
     * 5. A second segno that the MusicXML marks as a D.S. target (<sound segno>) isn't taken for a D.S. back to the first one.
     */
    it("plays repeats and jumps within their movement", async () => {
        expect(await playedMeasures("test_repeat_movements.musicxml")).to.deep.equal([
            0, 0, 1, 2, 1, 3,
            4, 5, 4, 6, 7, 8, 4, 6, 7, 9,
            10, 11,
            12, 13, 14, 12, 13,
            15, 16, 17,
        ]);
    });

    /** The types of the repetition instructions drawn at the end of the measure. */
    function lastInstructionTypes(measureIndex: number): RepetitionInstructionEnum[] {
        return osmd.Sheet.SourceMeasures[measureIndex].LastRepetitionInstructions.map(
            (instruction: RepetitionInstruction): RepetitionInstructionEnum => instruction.type);
    }

    /**
     * A plain D.C. with a Fine before it goes back to the beginning and ends at the Fine, as a D.C. al Fine does.
     * It used to play on to the end. It is still a D.C., as written.
     *
     * Sample: a Fine at the end of measure 2, a D.C. at the end of measure 4.
     */
    it("ends a plain D.C. at the Fine before it", async () => {
        expect(await playedMeasures("test_repeat_da_capo_with_fine.musicxml")).to.deep.equal([0, 1, 2, 3, 0, 1]);
        expect(lastInstructionTypes(3)).to.contain(RepetitionInstructionEnum.DaCapo);
    });

    /**
     * A Fine written in French, «Fin», is read from its sound element (<sound fine="yes"/>). It used to be plain text,
     * so the D.C. played on to the end.
     *
     * Sample: «Fin» at the end of measure 2, «D.C.» at the end of measure 4.
     */
    it("reads a Fine written in French from its sound element", async () => {
        expect(await playedMeasures("test_repeat_instructions_from_sound_french.musicxml")).to.deep.equal([0, 1, 2, 3, 0, 1]);
        expect(lastInstructionTypes(1)).to.contain(RepetitionInstructionEnum.Fine);
    });

    /**
     * A plain D.C. with a To Coda before it goes back to the beginning and jumps to the coda at the To Coda,
     * as a D.C. al Coda does: <sound dacapo="yes"/> can't say "al Coda". Both are written in German,
     * so they are read from their sound elements.
     *
     * Sample: «Zur Coda» at the end of measure 2, «D.C. bis zur Coda» at the end of measure 3, the coda in measures 4-5.
     */
    it("jumps to the coda at the To Coda before a plain D.C.", async () => {
        expect(await playedMeasures("test_repeat_da_capo_to_coda_german.musicxml")).to.deep.equal([0, 1, 2, 0, 1, 3, 4]);
        expect(lastInstructionTypes(2)).to.contain(RepetitionInstructionEnum.DaCapo);
    });

    /**
     * A D.C. or D.S. at the barline of a backward repeat to the same measure is a jump of its own: the repeat is played first,
     * then the D.C. or D.S. They were merged into one repetition, which lost the repeat, the jump, or both (with a Fine).
     * A D.S. without a segno goes back like a backward repeat, and a Fine that no jump takes is drawn.
     *
     * Sample: four movements, see the comment in the file.
     */
    it("plays a repeat and then the D.C. or D.S. at the same barline", async () => {
        expect(await playedMeasures("test_repeat_jumps_at_repeat_signs.musicxml")).to.deep.equal([
            0, 1, 0, 1, 0,
            2, 3, 4, 2, 3, 4, 2, 3, 5, 6,
            7, 8, 9, 10, 8, 9, 10, 8, 9, 11, 12,
            13, 14, 15, 13, 14, 15,
        ]);
        expect(lastInstructionTypes(14)).to.contain(RepetitionInstructionEnum.Fine);
    });
});
