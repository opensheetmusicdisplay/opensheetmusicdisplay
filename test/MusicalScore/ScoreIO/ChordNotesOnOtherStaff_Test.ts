import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Pitch } from "../../../src/Common/DataObjects/Pitch";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

/**
 * A chord note on another staff than the chord's previous note (<chord/> with another <staff>), e.g. of a piano chord split
 * between the staves of the two hands, was read into the previous note's voice entry and drawn on its staff, with ledger
 * lines. (The reader's branch for these notes, VoiceGenerator.checkForStaffEntryLink(), could never run: it checked whether
 * the staff entry just looked up for the note's staff was on another staff.) Now the note belongs to the chord's voice entry
 * on its own staff, so each staff draws its part of the chord, and a part on the other staff is beamed like its chord.
 *
 * Fixture: m1 a whole note chord C5 / E3; m2 quarter note chords, the first note on staff 1, or on staff 2 (beat 3);
 * m3 beamed eighth note chords and a half note chord; m4 a triplet of beamed eighth note chords and a dotted half.
 */
describe("Chord notes on another staff", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeAll(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_chord_notes_cross_staff.musicxml"));
        osmd.render();
    });
    afterAll(() => {
        osmd.clear();
        container.remove();
    });

    /** The pitches of a chord's notes, lowest first, e.g. "E4 G4" (octaves as in MusicXML: C4 is middle C). */
    function pitchesOf(notes: Note[]): string {
        return notes.slice().sort((a: Note, b: Note) => a.halfTone - b.halfTone)
            .map((note: Note) => note.Pitch.ToStringShort(Pitch.OctaveXmlDifference)).join(" ");
    }

    /** The chords a staff has in a measure, from the voice entries of its staff entries, e.g. ["C3", "C3 G3"]. */
    function chordsRead(measureIndex: number, staffIndex: number): string[] {
        return osmd.Sheet.SourceMeasures[measureIndex].VerticalSourceStaffEntryContainers
            .map(verticalContainer => verticalContainer.StaffEntries[staffIndex])
            .filter((staffEntry: SourceStaffEntry) => staffEntry !== undefined)
            .map((staffEntry: SourceStaffEntry) => staffEntry.VoiceEntries.map((voiceEntry: VoiceEntry) => pitchesOf(voiceEntry.Notes)).join(" | "));
    }

    /** The chords a staff draws in a measure, from its graphical measure. */
    function chordsDrawn(measureIndex: number, staffIndex: number): string[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex].staffEntries.map(staffEntry =>
            staffEntry.graphicalVoiceEntries.map(voiceEntry => pitchesOf(voiceEntry.notes.map(note => note.sourceNote))).join(" | "));
    }

    const expectedChords: string[][][] = [ // per measure: the chords of staff 1, of staff 2
        [["C5"], ["E3"]],
        [["G4", "E4 G4", "E4 G4", "C4 E4"], ["C3", "C3 G3", "C3"]],
        [["C5", "D5", "E5", "F5", "G4"], ["E3", "F3", "G3", "A3", "B2"]],
        [["C5", "D5", "E5", "C5"], ["E3", "F3", "G3", "C3"]],
    ];

    it("reads a chord note into the chord's voice entry on its own staff", () => {
        expect(expectedChords.map((_, measure: number) => [chordsRead(measure, 0), chordsRead(measure, 1)])).to.deep.equal(expectedChords);
    });

    it("draws each part of a chord on its staff", () => {
        expect(expectedChords.map((_, measure: number) => [chordsDrawn(measure, 0), chordsDrawn(measure, 1)])).to.deep.equal(expectedChords);
    });

    it("beams a chord's part on the other staff with the chord's beam", () => {
        // m3: the eighth note chords C5 / E3 and D5 / F3, E5 / G3 and F5 / A3 are beamed in pairs, the half note G4 / B2 isn't
        const notesOfStaff: (staffIndex: number) => Note[] = (staffIndex: number) => osmd.Sheet.SourceMeasures[2].VerticalSourceStaffEntryContainers
            .map(verticalContainer => verticalContainer.StaffEntries[staffIndex].VoiceEntries[0].Notes[0]);
        const staff1: Note[] = notesOfStaff(0);
        const staff2: Note[] = notesOfStaff(1);
        expect(staff2.map((note: Note, i: number) => note.NoteBeam !== undefined && note.NoteBeam === staff1[i].NoteBeam), "same beam as the chord")
            .to.deep.equal([true, true, true, true, false]);
        expect(staff1[0].NoteBeam === staff1[2].NoteBeam, "one beam per pair").to.equal(false);
    });
});
