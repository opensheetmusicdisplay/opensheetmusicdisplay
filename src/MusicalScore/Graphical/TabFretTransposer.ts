import { log } from "../../Common/Logging";
import { MusicSheet } from "../MusicSheet";
import { Instrument } from "../Instrument";
import { Note } from "../VoiceData/Note";
import { Staff } from "../VoiceData/Staff";
import { TabNote } from "../VoiceData/TabNote";
import { MidiInstrument } from "../VoiceData/Instructions/ClefInstruction";

/** Gives the tablature notes of a transposed sheet the frets of their transposed pitches (TabNote.TransposedFretNumber).
 *  A note stays on its string, so the fingering the XML gives moves along the fretboard as a whole: transposed 3 halftones up,
 *  a D major chord on frets 2-3-2 is an F major chord on frets 5-6-5, and a slide from fret 3 to 5 goes from fret 6 to 8.
 *
 *  Only a note that leaves the fretboard on its string (below fret 0 or above EngravingRules.TabTransposeMaxFret) moves to
 *  the nearest string that it fits on and that no other note at its time is on, together with the notes it's connected
 *  to by a tie, hammer-on, pull-off or slide. A note that fits on no string (e.g. below the lowest open string) stays
 *  on its string an octave higher or lower. */
export class TabFretTransposer {
    /** Open strings in halftones from the lowest, if the XML gives no <staff-tuning>: guitar, and bass for 4 lines. */
    private static readonly standardTuning: number[] = [28, 33, 38, 43, 47, 52];
    private static readonly standardTuningBass: number[] = [16, 21, 26, 31];

    /** Sets the transposed fret and string of all tablature notes, or removes them if their instrument isn't transposed.
     *  @param transposing whether the sheet's notes are transposed at all: whether a transpose calculator is set
     *  @param maxFret the highest fret of the fretboard
     */
    public static transposeFrets(sheet: MusicSheet, transposing: boolean, maxFret: number): void {
        const notes: TabNote[] = [];
        for (const measure of sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                        for (const note of voiceEntry.Notes) {
                            if (note instanceof TabNote) {
                                note.TransposedFretNumber = undefined;
                                note.TransposedStringNumberTab = undefined;
                                notes.push(note);
                            }
                        }
                    }
                }
            }
        }
        let notesInOtherOctave: number = 0;
        for (const note of notes) {
            const instrument: Instrument = note.ParentStaffEntry.ParentStaff.ParentInstrument;
            // as for the pitches (MusicSheetCalculator.checkNoteForAccidental()): percussion isn't transposed
            const halftones: number = transposing && instrument.MidiInstrumentId !== MidiInstrument.Percussion ?
                sheet.Transpose + instrument.Transpose : 0;
            if (halftones === 0 || note.TransposedFretNumber !== undefined) {
                continue; // not transposed, or already placed with a connected note
            }
            const connectedNotes: TabNote[] = TabFretTransposer.connectedNotes(note);
            if (TabFretTransposer.placeOnOneString(connectedNotes, halftones, maxFret)) {
                continue;
            }
            for (const connectedNote of connectedNotes) {
                if (!TabFretTransposer.placeOnOneString([connectedNote], halftones, maxFret)) {
                    let fret: number = connectedNote.FretNumber + halftones;
                    fret += 12 * Math.ceil(-fret / 12); // the first octave from fret 0
                    while (fret > maxFret && fret >= 12) {
                        fret -= 12;
                    }
                    connectedNote.TransposedFretNumber = fret;
                    connectedNote.TransposedStringNumberTab = connectedNote.StringNumberTab;
                    notesInOtherOctave++;
                }
            }
        }
        if (notesInOtherOctave > 0) {
            log.warn(`[OSMD] transposed tablature: ${notesInOtherOctave} note(s) fit on no string and are shown in another octave.`);
        }
    }

    /** The note and the tablature notes it has to share a string with: those of its ties, hammer-ons, pull-offs and slides. */
    private static connectedNotes(note: TabNote): TabNote[] {
        const connected: Note[] = [note];
        for (let i: number = 0; i < connected.length; i++) { // grows while notes are found
            const glissandoNotes: Note[] = [connected[i].NoteGlissando?.StartNote, connected[i].NoteGlissando?.EndNote];
            for (const other of [...connected[i].NoteTies.flatMap(tie => tie.Notes), ...glissandoNotes]) {
                if (other instanceof TabNote && !connected.includes(other)) {
                    connected.push(other);
                }
            }
        }
        return connected as TabNote[];
    }

    /** Places the notes, which are on one string in the XML, on the string nearest to it that they all fit on transposed,
     *  first of all their own. Returns false, leaving them unplaced, if there is none, or if they are on different strings. */
    private static placeOnOneString(notes: TabNote[], halftones: number, maxFret: number): boolean {
        const xmlString: number = notes[0].StringNumberTab;
        if (notes.some(note => note.StringNumberTab !== xmlString)) {
            return false;
        }
        const staff: Staff = notes[0].ParentStaffEntry.ParentStaff;
        let tuning: number[] = staff.StringTuning;
        if (tuning.length === 0) {
            tuning = staff.StafflineCount === 4 ? TabFretTransposer.standardTuningBass : TabFretTransposer.standardTuning;
        }
        /** The open string in halftones. String 1 is the highest. */
        const openString: (stringNumber: number) => number = (stringNumber: number) => tuning[tuning.length - stringNumber];
        // the XML's string, then its neighbors by distance
        for (let distance: number = 0; distance < Math.max(tuning.length, 1); distance++) {
            for (const stringNumber of distance === 0 ? [xmlString] : [xmlString + distance, xmlString - distance]) {
                // the frets on the string: by the halftones, and by the interval to the XML's string
                const fretShift: number = distance === 0 ? halftones : halftones + openString(xmlString) - openString(stringNumber);
                const fits: boolean = notes.every(note => {
                    const fret: number = note.FretNumber + fretShift; // NaN if the tuning lacks a string
                    return fret >= 0 && fret <= maxFret && (distance === 0 || TabFretTransposer.isStringFree(stringNumber, note));
                });
                if (fits) {
                    for (const note of notes) {
                        note.TransposedFretNumber = note.FretNumber + fretShift;
                        note.TransposedStringNumberTab = stringNumber;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    /** Whether no other note at the note's time is on the string (transposed, if it's already placed). */
    private static isStringFree(stringNumber: number, note: TabNote): boolean {
        return !note.ParentStaffEntry.VoiceEntries.some(voiceEntry => voiceEntry.Notes.some(
            other => other !== note && other instanceof TabNote && other.DisplayedStringNumberTab === stringNumber));
    }
}
