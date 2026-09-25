import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { GraphicalGlissando } from "../../../src/MusicalScore/Graphical/GraphicalGlissando";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";

/**
 * test_glissando_without_slur_or_slide.musicxml has a glissando on notes without a <slur> or <slide> of their own,
 * inside a slur with the same number (measure 1), and two chained glissandi (measure 2).
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

    it("draws both glissandi of a note that ends one and starts the next", () => {
        osmd.render();
        const glissandi: GraphicalGlissando[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].GraphicalGlissandi;
        expect(glissandi.length, "one glissando in measure 1, two in measure 2").to.equal(3);
        for (const glissando of glissandi) {
            const endStaffEntry: GraphicalStaffEntry = glissando.staffEntries[glissando.staffEntries.length - 1];
            expect(endStaffEntry.findGraphicalNoteFromNote(glissando.Glissando.EndNote), "drawn to its end note").to.not.equal(undefined);
        }
    });
});
