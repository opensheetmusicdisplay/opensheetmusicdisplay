import { MusicSheet } from "../MusicSheet";
import { Instrument } from "../Instrument";
import { TabNote } from "../VoiceData/TabNote";
import { MidiInstrument } from "../VoiceData/Instructions/ClefInstruction";

/** Gives the tablature notes of a transposed sheet the frets of their transposed pitches (TabNote.TransposedFretNumber).
 *  A note stays on its string, so the fingering the XML gives moves along the fretboard as a whole: transposed 3 halftones up,
 *  a D major chord on frets 2-3-2 is an F major chord on frets 5-6-5, and a slide from fret 3 to 5 goes from fret 6 to 8. */
export class TabFretTransposer {
    /** Sets the transposed fret and string of all tablature notes, or removes them if their instrument isn't transposed.
     *  @param transposing whether the sheet's notes are transposed at all: whether a transpose calculator is set
     */
    public static transposeFrets(sheet: MusicSheet, transposing: boolean): void {
        for (const measure of sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    if (!staffEntry) {
                        continue;
                    }
                    const instrument: Instrument = staffEntry.ParentStaff.ParentInstrument;
                    // as for the pitches (MusicSheetCalculator.checkNoteForAccidental()): percussion isn't transposed
                    const halftones: number = transposing && instrument.MidiInstrumentId !== MidiInstrument.Percussion ?
                        sheet.Transpose + instrument.Transpose : 0;
                    for (const voiceEntry of staffEntry.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            if (note instanceof TabNote) {
                                note.TransposedFretNumber = halftones !== 0 ? note.FretNumber + halftones : undefined;
                                note.TransposedStringNumberTab = halftones !== 0 ? note.StringNumberTab : undefined;
                            }
                        }
                    }
                }
            }
        }
    }
}
