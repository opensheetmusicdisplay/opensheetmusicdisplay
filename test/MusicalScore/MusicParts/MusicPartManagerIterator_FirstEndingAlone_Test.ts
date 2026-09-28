import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

/**
 * A first ending with no second ending written after it is played on the first pass only: the last pass goes on after it.
 * It used to be played on both passes, since a repetition with fewer endings than passes plays its first ending on the extra ones.
 *
 * Sample: measures 2-3 repeated, measure 3 under a first ending with no second ending after it.
 */
describe("MusicPartManagerIterator with a first ending and no second ending", () => {
    const sample: string = "test_repeat_first_ending_without_second_ending.musicxml";

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = document.createElement("div");
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
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

    it("skips the first ending on the second pass", () => {
        expect(playedMeasures()).to.deep.equal([0, 1, 2, 1, 3]);
    });
});
