import { Pitch, NoteEnum } from "../../Common/DataObjects/Pitch";
import { OCTAVE_MARKS } from "./BrailleSymbols";

/**
 * Tracks the current octave context and determines when octave marks
 * are needed in braille music output.
 *
 * Rules from Music Braille Code 2015, Par. 3.2:
 * - 3.2.1: Octave mark REQUIRED for first note of a braille line, and after numeric indicators
 * - 3.2.2(a): NOT marked if interval from previous note is less than a 4th (unison, 2nd, 3rd)
 * - 3.2.2(b): ALWAYS marked if interval is greater than a 5th (6th or more)
 * - 3.2.2(c): For interval of a 4th or 5th: ONLY marked if the note is in a different octave
 */
export class BrailleOctaveTracker {
    private previousPitch: Pitch | undefined;
    private isFirstNote: boolean = true;

    /**
     * Determine if an octave mark is needed for the given pitch,
     * and return the appropriate braille octave mark string.
     * Returns empty string if no mark is needed.
     *
     * Also updates internal state to track the current pitch for future comparisons.
     *
     * @param pitch The pitch of the current note
     * @returns The braille octave mark string, or empty string if not needed
     */
    public getOctaveMark(pitch: Pitch): string {
        const brailleOctave: number = pitch.Octave + Pitch.OctaveXmlDifference;
        let needsMark: boolean = false;

        if (this.isFirstNote) {
            needsMark = true;
            this.isFirstNote = false;
        } else if (this.previousPitch) {
            const interval: number = BrailleOctaveTracker.calculateDiatonicInterval(this.previousPitch, pitch);
            if (interval <= 3) {
                // Par. 3.2.2(a): interval < 4th — no mark needed
                needsMark = false;
            } else if (interval >= 6) {
                // Par. 3.2.2(b): interval > 5th — always mark
                needsMark = true;
            } else {
                // Par. 3.2.2(c): interval is 4th or 5th — mark only if different octave
                const prevBrailleOctave: number = this.previousPitch.Octave + Pitch.OctaveXmlDifference;
                needsMark = brailleOctave !== prevBrailleOctave;
            }
        } else {
            needsMark = true;
        }

        this.previousPitch = pitch;

        if (needsMark) {
            const mark: string | undefined = OCTAVE_MARKS.get(brailleOctave);
            return mark ?? "";
        }
        return "";
    }

    /**
     * Reset state (e.g., at start of new line, new section, or new piece).
     * After reset, the next note will receive an octave mark.
     */
    public reset(): void {
        this.previousPitch = undefined;
        this.isFirstNote = true;
    }

    /**
     * Calculate the diatonic interval (in scale steps) between two pitches.
     * A unison = 1, a second = 2, a third = 3, a fourth = 4, etc.
     * This counts letter names, not semitones.
     *
     * @param from The starting pitch
     * @param to The target pitch
     * @returns The diatonic interval (1 = unison, 2 = second, etc.)
     */
    public static calculateDiatonicInterval(from: Pitch, to: Pitch): number {
        const fromIndex: number = BrailleOctaveTracker.noteEnumToDiatonicIndex(from.FundamentalNote);
        const toIndex: number = BrailleOctaveTracker.noteEnumToDiatonicIndex(to.FundamentalNote);

        const fromAbsolute: number = (from.Octave + Pitch.OctaveXmlDifference) * 7 + fromIndex;
        const toAbsolute: number = (to.Octave + Pitch.OctaveXmlDifference) * 7 + toIndex;

        return Math.abs(toAbsolute - fromAbsolute) + 1; // +1 because unison = 1, not 0
    }

    /**
     * Convert a NoteEnum to a diatonic index (0-6).
     * C=0, D=1, E=2, F=3, G=4, A=5, B=6
     */
    public static noteEnumToDiatonicIndex(note: NoteEnum): number {
        switch (note) {
            case NoteEnum.C: return 0;
            case NoteEnum.D: return 1;
            case NoteEnum.E: return 2;
            case NoteEnum.F: return 3;
            case NoteEnum.G: return 4;
            case NoteEnum.A: return 5;
            case NoteEnum.B: return 6;
            default: return 0;
        }
    }
}
