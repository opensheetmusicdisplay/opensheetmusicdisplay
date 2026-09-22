import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

/**
 * test_glissando_without_slur_or_slide.musicxml has a glissando on notes without a <slur> or <slide> of their own,
 * inside a slur with the same number.
 */
describe("Glissandi", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_glissando_without_slur_or_slide.musicxml"));
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("reads a glissando on notes without a slur or slide, and keeps the slur with the same number around it", () => {
        const notes: Note[] = osmd.Sheet.Instruments[0].Voices[0].VoiceEntries.flatMap(voiceEntry => voiceEntry.Notes);
        expect(notes.indexOf(notes[1].NoteGlissando?.EndNote), "end of the glissando from the second note").to.equal(2);
        expect(notes.indexOf(notes[0].NoteSlurs[0]?.EndNote), "end of the slur from the first note").to.equal(3);
    });
});
