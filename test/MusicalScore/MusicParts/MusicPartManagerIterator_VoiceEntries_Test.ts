import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { Instrument } from "../../../src/MusicalScore/Instrument";

/**
 * The voice entries the iterator returns at a position, as third-party players and score followers read them.
 */
describe("MusicPartManagerIterator voice entries", () => {
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

    /**
     * Sample: a two-staff piano, right hand C5 tied into measure 2, left hand C3;
     * in measure 2 the right hand plays a chord of the tied C5 and a newly struck E5, the left hand a new C3.
     */
    const sample: string = "test_iterator_piano_tied_chord.musicxml";

    /**
     * The per-instrument calls returned only the first voice entry of the instrument, e.g. one hand of a piano.
     */
    it("returns the voice entries of both piano staves for the piano", async () => {
        await osmd.load(TestUtils.getScore(sample));
        const piano: Instrument = osmd.Sheet.Instruments[0];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        expect(iterator.CurrentAudibleVoiceEntries().length, "audible entries of all instruments").to.equal(2);
        expect(iterator.CurrentAudibleVoiceEntries(piano).length, "audible entries of the piano").to.equal(2);
        expect(iterator.CurrentScoreFollowingVoiceEntries().length, "score following entries of all instruments").to.equal(2);
        expect(iterator.CurrentScoreFollowingVoiceEntries(piano).length, "score following entries of the piano").to.equal(2);
    });
});
