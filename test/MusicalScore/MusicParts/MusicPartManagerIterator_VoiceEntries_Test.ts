import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { Instrument } from "../../../src/MusicalScore/Instrument";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

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

    /**
     * A chord whose first note continues a tie was dropped whole, also when another note of it is newly struck.
     * An entry is left out only when all its notes continue ties.
     */
    it("returns a chord with a tied and a newly struck note as audible", async () => {
        await osmd.load(TestUtils.getScore(sample));
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        iterator.moveToNext(); // measure 2
        expect(iterator.CurrentMeasureIndex, "measure index").to.equal(1);
        expect(iterator.CurrentVoiceEntries.length, "all entries in measure 2").to.equal(2);
        const audible: VoiceEntry[] = iterator.CurrentAudibleVoiceEntries();
        expect(audible.length, "audible entries in measure 2").to.equal(2);
        const chord: VoiceEntry = iterator.CurrentVoiceEntries.find(ve => ve.Notes.length === 2);
        expect(chord !== undefined, "chord of the tied C5 and the new E5").to.equal(true);
        expect(audible.includes(chord), "the chord is audible").to.equal(true);
        expect(iterator.CurrentAudibleVoiceEntries(osmd.Sheet.Instruments[0]).length, "audible entries of the piano in measure 2").to.equal(2);
    });

    /**
     * An entry whose notes all continue ties is not audible: nothing is struck.
     */
    it("leaves out an entry whose notes all continue ties", async () => {
        await osmd.load(TestUtils.getScore(sample));
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        iterator.moveToNext();
        iterator.moveToNext(); // measure 3
        expect(iterator.CurrentMeasureIndex, "measure index").to.equal(2);
        expect(iterator.CurrentVoiceEntries.length, "all entries in measure 3").to.equal(2);
        const audible: VoiceEntry[] = iterator.CurrentAudibleVoiceEntries();
        expect(audible.length, "audible entries in measure 3: the left hand's C3").to.equal(1);
        expect(audible[0].Notes[0].Pitch.Octave, "octave of the audible note (C3 is octave 0 in OSMD)").to.equal(0);
    });
});
