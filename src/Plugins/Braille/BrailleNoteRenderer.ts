import { Note } from "../../MusicalScore/VoiceData/Note";
import { AccidentalEnum, Pitch } from "../../Common/DataObjects/Pitch";
import { NoteType } from "../../MusicalScore/VoiceData/NoteType";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { BrailleOctaveTracker } from "./BrailleOctaveTracker";
import {
    BrailleDurationGroup,
    getNoteChar,
    getRestChar,
    getAccidentalChar,
    getAccidentalName,
    noteTypeToDurationGroup,
    fractionToDurationGroup,
    BRAILLE_AUGMENTATION_DOT,
    BRAILLE_SINGLE_TIE,
    BRAILLE_CHORD_TIE,
} from "./BrailleSymbols";
import {
    renderArticulations,
    renderFermata,
    getOrnamentBraille,
    getOrnamentName,
    BrailleExpressionResult,
} from "./BrailleExpressions";

/**
 * Debug information for a single rendered braille element.
 */
export interface BrailleNoteDebugInfo {
    /** The braille character(s) produced */
    braille: string;
    /** Human-readable meaning, e.g. "octave 4", "quarter note C", "quarter rest" */
    meaning: string;
}

/**
 * Result of rendering a single note to braille.
 */
export interface BrailleNoteResult {
    /** The complete braille string for this note (octave mark + note char + dots) */
    braille: string;
    /** Debug entries for each braille element in the result */
    debugEntries: BrailleNoteDebugInfo[];
}

/**
 * Converts a single OSMD Note to its braille representation.
 * Handles pitch, duration, octave marks, rests, and augmentation dots.
 */
export class BrailleNoteRenderer {

    /**
     * Render a single note to braille.
     *
     * Per Music Braille Code 2015, the ordering around a note is:
     *   [articulations] [ornaments] [accidental] [octave mark] [note char] [aug dots] [fermata]
     *
     * Articulations and ornaments precede accidentals (Par. 22.1, 16.3).
     * Fermata follows the note (Par. 22.2).
     *
     * @param note The OSMD Note to convert
     * @param octaveTracker Tracks octave context for octave mark decisions
     * @param voiceEntry Optional VoiceEntry for articulation/ornament data
     * @param pitchOverride Optional pitch override for facsimile ottava (staff pitch instead of sounding)
     * @returns BrailleNoteResult with braille string and debug info
     */
    public render(note: Note, octaveTracker: BrailleOctaveTracker, voiceEntry?: VoiceEntry,
                  pitchOverride?: Pitch): BrailleNoteResult {
        const result: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];

        // Determine duration group
        const durationGroup: BrailleDurationGroup = this.getDurationGroup(note);

        if (note.isRest()) {
            // Rests don't have articulations, ornaments, or pitch
            const restChar: string = getRestChar(durationGroup);
            result.push(restChar);
            debugEntries.push({
                braille: restChar,
                meaning: this.getDurationName(durationGroup) + " rest",
            });
        } else if (note.Pitch) {
            // Use pitch override (facsimile ottava staff pitch) when provided,
            // but keep original pitch for accidentals (accidentals reflect the printed score).
            const effectivePitch: Pitch = pitchOverride ?? note.Pitch;

            // Articulations (Par. 22.1: precede the note, before accidental/octave)
            if (voiceEntry && voiceEntry.Articulations && voiceEntry.Articulations.length > 0) {
                const artResult: BrailleExpressionResult = renderArticulations(voiceEntry.Articulations);
                if (artResult.braille) {
                    result.push(artResult.braille);
                    debugEntries.push(...artResult.debugEntries);
                }
            }

            // Ornaments (Par. 16.3: precede the note, before accidental/octave)
            if (voiceEntry && voiceEntry.OrnamentContainer) {
                const ornBraille: string = getOrnamentBraille(voiceEntry.OrnamentContainer.GetOrnament);
                if (ornBraille) {
                    result.push(ornBraille);
                    debugEntries.push({
                        braille: ornBraille,
                        meaning: getOrnamentName(voiceEntry.OrnamentContainer.GetOrnament),
                    });
                }
            }

            // Accidental mark (must precede octave mark per Music Braille Code Par. 3.3)
            // Use original pitch accidentals (not overridden — accidentals match print)
            if (note.Pitch.AccidentalXml !== undefined && note.Pitch.Accidental !== AccidentalEnum.NONE) {
                const accChar: string = getAccidentalChar(note.Pitch.Accidental);
                if (accChar) {
                    result.push(accChar);
                    debugEntries.push({
                        braille: accChar,
                        meaning: getAccidentalName(note.Pitch.Accidental),
                    });
                }
            }

            // Get octave mark if needed (uses effective pitch for octave placement)
            const octaveMark: string = octaveTracker.getOctaveMark(effectivePitch);
            if (octaveMark) {
                const brailleOctave: number = effectivePitch.Octave + 3; // Pitch.OctaveXmlDifference
                result.push(octaveMark);
                debugEntries.push({
                    braille: octaveMark,
                    meaning: "octave " + brailleOctave,
                });
            }

            // Get note character (pitch name from effective pitch + duration)
            const noteChar: string = getNoteChar(effectivePitch.FundamentalNote, durationGroup);
            result.push(noteChar);
            debugEntries.push({
                braille: noteChar,
                meaning: this.getDurationName(durationGroup) + " " +
                    effectivePitch.ToStringShort(Pitch.OctaveXmlDifference),
            });
        }

        // Add augmentation dots
        const dotCount: number = note.DotsXml ?? 0;
        for (let i: number = 0; i < dotCount; i++) {
            result.push(BRAILLE_AUGMENTATION_DOT);
            debugEntries.push({
                braille: BRAILLE_AUGMENTATION_DOT,
                meaning: "augmentation dot",
            });
        }

        // Fermata (Par. 22.2: follows the note and augmentation dots)
        if (voiceEntry && voiceEntry.Articulations && voiceEntry.Articulations.length > 0) {
            const fermataResult: BrailleExpressionResult = renderFermata(voiceEntry.Articulations);
            if (fermataResult.braille) {
                result.push(fermataResult.braille);
                debugEntries.push(...fermataResult.debugEntries);
            }
        }

        // Tie (Par. 10.1: placed after dots, fermata, slur)
        // Only emit on the START note of the tie.
        if (note.NoteTie && note.NoteTie.StartNote === note) {
            const isChordTie: boolean = voiceEntry !== undefined && voiceEntry.Notes.length > 1;
            const tieSign: string = isChordTie ? BRAILLE_CHORD_TIE : BRAILLE_SINGLE_TIE;
            const tieMeaning: string = isChordTie ? "chord tie" : "tie";
            result.push(tieSign);
            debugEntries.push({
                braille: tieSign,
                meaning: tieMeaning,
            });
        }

        return {
            braille: result.join(""),
            debugEntries: debugEntries,
        };
    }

    /**
     * Determine the BrailleDurationGroup for a note.
     * Uses NoteTypeXml if available, falls back to computing from the length Fraction.
     */
    private getDurationGroup(note: Note): BrailleDurationGroup {
        const noteType: NoteType = note.NoteTypeXml;
        if (noteType !== undefined && noteType !== NoteType.UNDEFINED) {
            const group: BrailleDurationGroup | undefined = noteTypeToDurationGroup(noteType);
            if (group !== undefined) {
                return group;
            }
        }

        // Fallback: infer from Fraction duration
        if (note.Length) {
            return fractionToDurationGroup(note.Length.RealValue);
        }

        // Default to quarter if nothing else works
        return BrailleDurationGroup.QuarterOr64th;
    }

    /**
     * Get a human-readable duration name for debug output.
     */
    private getDurationName(group: BrailleDurationGroup): string {
        switch (group) {
            case BrailleDurationGroup.WholeOr16th: return "whole/16th";
            case BrailleDurationGroup.HalfOr32nd: return "half/32nd";
            case BrailleDurationGroup.QuarterOr64th: return "quarter/64th";
            case BrailleDurationGroup.EighthOr128th: return "eighth/128th";
            default: return "unknown";
        }
    }

}
