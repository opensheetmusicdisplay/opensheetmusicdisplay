import { Note } from "../../MusicalScore/VoiceData/Note";
import { AccidentalEnum, Pitch } from "../../Common/DataObjects/Pitch";
import { ClefEnum } from "../../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { OctaveShift } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { BrailleNoteRenderer, BrailleNoteResult, BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import { BrailleOctaveTracker } from "./BrailleOctaveTracker";
import {
    getIntervalChar,
    getIntervalName,
    getAccidentalChar,
    getAccidentalName,
    OCTAVE_MARKS,
} from "./BrailleSymbols";

/**
 * Converts a chord (multiple simultaneous notes in a VoiceEntry) to braille.
 *
 * In braille music, chords are encoded as:
 * 1. One "written note" rendered as a full note character (accidental + octave + pitch/duration + dots)
 * 2. Remaining notes rendered as interval signs from the written note
 *
 * The written note depends on the clef:
 * - G clef (treble) / C clef: highest note, intervals read downward
 * - F clef (bass): lowest note, intervals read upward
 *
 * See Music Braille Code 2015, Chapter 5.
 */
export class BrailleChordRenderer {
    private noteRenderer: BrailleNoteRenderer;

    constructor() {
        this.noteRenderer = new BrailleNoteRenderer();
    }

    /**
     * Render a chord to braille.
     *
     * @param notes All notes in the chord (from VoiceEntry.Notes[])
     * @param clefType The current clef (determines interval direction)
     * @param octaveTracker Tracks octave context for the written note
     * @param voiceEntry Optional VoiceEntry for articulation/ornament data
     * @param activeOctaveShift Optional active ottava for facsimile pitch adjustment
     * @param forceUpward When true, always read intervals upward (ensemble mode, Par. 33.4.2)
     * @returns BrailleNoteResult with braille string and debug info
     */
    public render(notes: Note[], clefType: ClefEnum, octaveTracker: BrailleOctaveTracker,
                  voiceEntry?: VoiceEntry, activeOctaveShift?: OctaveShift,
                  forceUpward?: boolean): BrailleNoteResult {
        // Sort notes by pitch height (lowest to highest)
        const sorted: Note[] = this.sortByPitch(notes);

        // Determine written note and interval notes based on clef (or forced upward for ensemble)
        const effectiveClef: ClefEnum = forceUpward ? ClefEnum.F : clefType;
        const writtenNote: Note = this.getWrittenNote(sorted, effectiveClef);
        const intervalNotes: Note[] = this.getIntervalNotes(sorted, writtenNote, effectiveClef);

        // In facsimile ottava, adjust the written note pitch to staff (visual) pitch
        const writtenPitchOverride: Pitch | undefined = activeOctaveShift && writtenNote.Pitch
            ? OctaveShift.getPitchFromOctaveShift(writtenNote.Pitch, activeOctaveShift.Type)
            : undefined;

        // Render the written note using the standard note renderer
        // Pass voiceEntry so articulations/ornaments are rendered with the chord's written note
        const writtenResult: BrailleNoteResult =
            this.noteRenderer.render(writtenNote, octaveTracker, voiceEntry, writtenPitchOverride);
        const result: string[] = [writtenResult.braille];
        const debugEntries: BrailleNoteDebugInfo[] = [...writtenResult.debugEntries];

        // Render each interval note
        for (const intervalNote of intervalNotes) {
            if (!intervalNote.Pitch || !writtenNote.Pitch) {
                continue;
            }

            // Use effective pitches for interval calculation when ottava is active
            const effectiveWrittenPitch: Pitch = writtenPitchOverride ?? writtenNote.Pitch;
            const effectiveIntervalPitch: Pitch = activeOctaveShift
                ? OctaveShift.getPitchFromOctaveShift(intervalNote.Pitch, activeOctaveShift.Type)
                : intervalNote.Pitch;

            // Calculate diatonic interval from written note (using effective pitches)
            const interval: number = BrailleOctaveTracker.calculateDiatonicInterval(
                effectiveWrittenPitch, effectiveIntervalPitch
            );

            // Compound interval (>octave): add octave mark of the interval note
            if (interval > 8) {
                const brailleOctave: number = effectiveIntervalPitch.Octave + Pitch.OctaveXmlDifference;
                const octaveMark: string | undefined = OCTAVE_MARKS.get(brailleOctave);
                if (octaveMark) {
                    result.push(octaveMark);
                    debugEntries.push({
                        braille: octaveMark,
                        meaning: "interval octave " + brailleOctave,
                    });
                }
            }

            // Accidental on interval note (precedes interval sign) — use original pitch
            if (intervalNote.Pitch.AccidentalXml !== undefined &&
                intervalNote.Pitch.Accidental !== AccidentalEnum.NONE) {
                const accChar: string = getAccidentalChar(intervalNote.Pitch.Accidental);
                if (accChar) {
                    result.push(accChar);
                    debugEntries.push({
                        braille: accChar,
                        meaning: getAccidentalName(intervalNote.Pitch.Accidental),
                    });
                }
            }

            // Interval sign
            const intervalChar: string = getIntervalChar(interval);
            if (intervalChar) {
                result.push(intervalChar);
                debugEntries.push({
                    braille: intervalChar,
                    meaning: getIntervalName(interval) + " interval",
                });
            }
        }

        return {
            braille: result.join(""),
            debugEntries: debugEntries,
        };
    }

    /**
     * Sort notes by pitch height (lowest to highest).
     * Uses the original (untransposed) pitch for comparison.
     */
    private sortByPitch(notes: Note[]): Note[] {
        return [...notes].sort((a: Note, b: Note): number => {
            const aHalf: number = a.Pitch ? a.Pitch.getHalfTone() : 0;
            const bHalf: number = b.Pitch ? b.Pitch.getHalfTone() : 0;
            return aHalf - bHalf;
        });
    }

    /**
     * Get the written note (the one rendered as a full note character).
     * G/C clef: highest note. F clef: lowest note.
     */
    private getWrittenNote(sortedNotes: Note[], clefType: ClefEnum): Note {
        if (clefType === ClefEnum.F) {
            return sortedNotes[0]; // lowest
        }
        return sortedNotes[sortedNotes.length - 1]; // highest (G, C, percussion, TAB)
    }

    /**
     * Get the interval notes in reading order (nearest to written note first).
     * G/C clef: next-highest → lowest. F clef: next-lowest → highest.
     */
    private getIntervalNotes(sortedNotes: Note[], writtenNote: Note, clefType: ClefEnum): Note[] {
        const others: Note[] = sortedNotes.filter((n: Note): boolean => n !== writtenNote);
        if (clefType === ClefEnum.F) {
            // Bass: written=lowest, intervals read upward (next-lowest first)
            return others; // already sorted low→high
        }
        // Treble/Alto: written=highest, intervals read downward (next-highest first)
        return others.reverse();
    }
}
