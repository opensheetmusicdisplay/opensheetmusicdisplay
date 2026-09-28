import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

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
     * Sample: four movements (the measure numbers restart), see the comment in the file:
     * 1. A first ending without a forward repeat after a repeat goes back to the measure after that repeat (it went back to the first measure).
     * 2. A segno in the measure of a forward repeat: the repeat's endings belong to the repeat, and the D.S. al Coda is taken
     *    (the repeat's backward jump closed the segno's repetition, so the D.S. al Coda was lost).
     * 3. No repeat or jump, so the first instruction of movement 4 crosses two movement starts.
     * 4. "Menuetto D.C. al Fine" goes back to the start of its movement (it went back to the first measure of the piece, and wasn't read).
     */
    it("plays repeats and jumps within their movement", async () => {
        expect(await playedMeasures("test_repeat_movements.musicxml")).to.deep.equal([
            0, 0, 1, 2, 1, 3,
            4, 5, 4, 6, 7, 8, 4, 6, 7, 9,
            10, 11,
            12, 13, 14, 12, 13,
        ]);
    });
});
