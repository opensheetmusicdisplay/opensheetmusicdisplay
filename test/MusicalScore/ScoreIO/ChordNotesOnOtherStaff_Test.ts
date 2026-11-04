import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Pitch } from "../../../src/Common/DataObjects/Pitch";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { Tuplet } from "../../../src/MusicalScore/VoiceData/Tuplet";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

/**
 * A chord note on another staff than the chord's previous note (<chord/> with another <staff>), e.g. of a piano chord split
 * between the staves of the two hands, was read into the previous note's voice entry and drawn on its staff, with ledger
 * lines. (The reader's branch for these notes, VoiceGenerator.checkForStaffEntryLink(), could never run: it checked whether
 * the staff entry just looked up for the note's staff was on another staff.) Now the note belongs to the chord's voice entry
 * on its own staff, so each staff draws its part of the chord, and a part on the other staff is beamed like its chord and
 * is in its tuplet.
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

    /** The notes of each of m4's triplet chords (C5 / E3, D5 / F3, E5 / G3) that are in the triplet, e.g. "E3 C5": the notes
     *  with the triplet as NoteTuplet and in NoteTuplets, in the triplet's group of notes of the chord's first note. */
    function tripletChordNotesInTuplet(display: OpenSheetMusicDisplay): string[] {
        const chords: Note[][] = display.Sheet.SourceMeasures[3].VerticalSourceStaffEntryContainers.slice(0, 3)
            .map(verticalContainer => verticalContainer.StaffEntries.flatMap((staffEntry: SourceStaffEntry) =>
                staffEntry?.VoiceEntries.flatMap((voiceEntry: VoiceEntry) => voiceEntry.Notes) ?? []));
        const triplet: Tuplet = chords[0][0].NoteTuplet;
        expect(triplet.Notes.length, "a group of notes per chord").to.equal(3);
        return chords.map((chord: Note[]) => {
            const group: Note[] = triplet.Notes.find((notes: Note[]) => notes.includes(chord[0]));
            return pitchesOf(chord.filter((note: Note) => note.NoteTuplet === triplet && note.NoteTuplets.includes(triplet) &&
                group?.includes(note)));
        });
    }

    it("puts a chord's part on the other staff into the chord's tuplet, also after the tuplet's stop note", () => {
        // the triplet starts at C5 and stops at E5, on staff 1. G3 took the tuplet of its voice entry's first note, which for a
        //   part is G3 itself, so it wasn't in the triplet: staff 2's bracket ended at F3.
        expect(tripletChordNotesInTuplet(osmd)).to.deep.equal(["E3 C5", "F3 D5", "G3 E5"]);
    });

    it("puts a part's second note into the chord's tuplet too", async () => {
        // the sample with B3 after G3: the chord E5 / G3 B3
        const xml: Document = TestUtils.getScore("test_chord_notes_cross_staff.musicxml").cloneNode(true) as Document;
        const g3: Element = Array.from(xml.querySelectorAll("measure[number='4'] note")).find((note: Element) =>
            note.querySelector("step")?.textContent === "G" && note.querySelector("octave")?.textContent === "3");
        const b3: Element = g3.cloneNode(true) as Element;
        b3.querySelector("step").textContent = "B";
        g3.after(b3);
        const variantContainer: HTMLElement = TestUtils.getDivElement(document);
        const variant: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(variantContainer);
        try {
            await variant.load(xml);
            expect(tripletChordNotesInTuplet(variant)).to.deep.equal(["E3 C5", "F3 D5", "G3 B3 E5"]);
        } finally {
            variant.clear();
            variantContainer.remove();
        }
    });
});
