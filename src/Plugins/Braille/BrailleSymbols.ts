import { NoteEnum, AccidentalEnum } from "../../Common/DataObjects/Pitch";
import { NoteType } from "../../MusicalScore/VoiceData/NoteType";
import { RepetitionInstructionEnum } from "../../MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { ClefEnum } from "../../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { OctaveEnum } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";

/**
 * Duration categories in braille music.
 * Braille music uses the same characters for notes differing by a factor of 4.
 * Context (time signature, beat position) determines which actual duration is meant.
 */
export enum BrailleDurationGroup {
    /** Whole notes and 16th notes share characters */
    WholeOr16th = 0,
    /** Half notes and 32nd notes share characters */
    HalfOr32nd = 1,
    /** Quarter notes and 64th notes share characters */
    QuarterOr64th = 2,
    /** Eighth notes and 128th notes share characters */
    EighthOr128th = 3,
}

// ── Braille dot bit values ──────────────────────────────────────────────────
// Dot layout:  1 4
//              2 5
//              3 6
export const DOT1: number = 0x01;
export const DOT2: number = 0x02;
export const DOT3: number = 0x04;
export const DOT4: number = 0x08;
export const DOT5: number = 0x10;
export const DOT6: number = 0x20;

/** Base Unicode code point for braille patterns (U+2800) */
export const BRAILLE_BASE: number = 0x2800;

/**
 * Convert a dot pattern (bitwise OR of DOT1..DOT6) to a braille Unicode character.
 */
export function dotsToChar(dots: number): string {
    return String.fromCharCode(BRAILLE_BASE | dots);
}

// ── Duration group dot patterns (lower dots 3 and 6) ────────────────────────
// These are OR'd with the pitch pattern to form the full note character.

/** Duration dot patterns indexed by BrailleDurationGroup */
export const DURATION_DOTS: number[] = [
    DOT3 | DOT6,  // WholeOr16th:    dots 3,6
    DOT3,         // HalfOr32nd:     dot 3
    DOT6,         // QuarterOr64th:  dot 6
    0,            // EighthOr128th:  no lower dots
];

// ── Pitch dot patterns (upper dots 1,2,4,5) ────────────────────────────────
// These are the pitch-only patterns. Combined with duration dots to form notes.
// Verified from Music Braille Code 2015, Table 2 (p.27) via NABCC decoding.

export const PITCH_DOTS: Map<NoteEnum, number> = new Map([
    [NoteEnum.C, DOT1 | DOT4 | DOT5],         // dots 1,4,5  → eighth C = ⠙ (U+2819)
    [NoteEnum.D, DOT1 | DOT5],                 // dots 1,5    → eighth D = ⠑ (U+2811)
    [NoteEnum.E, DOT1 | DOT2 | DOT4],          // dots 1,2,4  → eighth E = ⠋ (U+280B)
    [NoteEnum.F, DOT1 | DOT2 | DOT4 | DOT5],   // dots 1,2,4,5 → eighth F = ⠛ (U+281B)
    [NoteEnum.G, DOT1 | DOT2 | DOT5],          // dots 1,2,5  → eighth G = ⠓ (U+2813)
    [NoteEnum.A, DOT2 | DOT4],                 // dots 2,4    → eighth A = ⠊ (U+280A)
    [NoteEnum.B, DOT2 | DOT4 | DOT5],          // dots 2,4,5  → eighth B = ⠚ (U+281A)
]);

/**
 * Get the braille character for a note with a given pitch and duration group.
 */
export function getNoteChar(pitch: NoteEnum, durationGroup: BrailleDurationGroup): string {
    const pitchDots: number | undefined = PITCH_DOTS.get(pitch);
    if (pitchDots === undefined) {
        return "";
    }
    return dotsToChar(pitchDots | DURATION_DOTS[durationGroup]);
}

// ── Rest characters ─────────────────────────────────────────────────────────
// Rests have unique character assignments (not a simple base+duration pattern).
// Verified from Music Braille Code 2015, Table 5 (p.29) via NABCC decoding.

/** Rest characters indexed by BrailleDurationGroup */
export const REST_CHARS: Map<BrailleDurationGroup, string> = new Map([
    [BrailleDurationGroup.WholeOr16th,    dotsToChar(DOT1 | DOT3 | DOT4)],         // ⠍ (U+280D) dots 1,3,4
    [BrailleDurationGroup.HalfOr32nd,     dotsToChar(DOT1 | DOT3 | DOT6)],         // ⠥ (U+2825) dots 1,3,6
    [BrailleDurationGroup.QuarterOr64th,  dotsToChar(DOT1 | DOT2 | DOT3 | DOT6)],  // ⠧ (U+2827) dots 1,2,3,6
    [BrailleDurationGroup.EighthOr128th,  dotsToChar(DOT1 | DOT3 | DOT4 | DOT6)],  // ⠭ (U+282D) dots 1,3,4,6
]);

/**
 * Get the braille character for a rest with a given duration group.
 */
export function getRestChar(durationGroup: BrailleDurationGroup): string {
    return REST_CHARS.get(durationGroup) ?? "";
}

// ── Octave marks ────────────────────────────────────────────────────────────
// Braille octave marks use octave numbers 1-7 (standard music octave numbering).
// Octave 4 contains middle C (C4). Octave 1 = lowest C on piano.
// Verified from Music Braille Code 2015, Table 3 (p.28) via NABCC decoding.

export const OCTAVE_MARKS: Map<number, string> = new Map([
    [1, dotsToChar(DOT4)],                      // ⠈ (U+2808) dot 4
    [2, dotsToChar(DOT4 | DOT5)],               // ⠘ (U+2818) dots 4,5
    [3, dotsToChar(DOT4 | DOT5 | DOT6)],        // ⠸ (U+2838) dots 4,5,6
    [4, dotsToChar(DOT5)],                       // ⠐ (U+2810) dot 5
    [5, dotsToChar(DOT4 | DOT6)],               // ⠨ (U+2828) dots 4,6
    [6, dotsToChar(DOT5 | DOT6)],               // ⠰ (U+2830) dots 5,6
    [7, dotsToChar(DOT6)],                       // ⠠ (U+2820) dot 6
]);

// ── Augmentation dot ────────────────────────────────────────────────────────
// Verified: Par. 2.3 — "A dotted note is shown by adding dot 3 after the note."
export const BRAILLE_AUGMENTATION_DOT: string = dotsToChar(DOT3); // ⠄ (U+2804) dot 3

// ── Barlines ────────────────────────────────────────────────────────────────
// Par. 1.1: "Print bar line (space)"
/** In braille music, measure separation is represented by a space */
export const BRAILLE_MEASURE_SEPARATOR: string = " ";

// Final double bar: dots 1,2,6 + dots 1,3 (NABCC: '<k')
export const BRAILLE_FINAL_DOUBLE_BAR: string = dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT1 | DOT3); // ⠣⠅

// Sectional double bar: dots 1,2,6 + dots 1,3 + dot 3 (NABCC: "<k'")
export const BRAILLE_SECTIONAL_DOUBLE_BAR: string =
    dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT1 | DOT3) + dotsToChar(DOT3); // ⠣⠅⠄

// ── In-accord signs (M4) ────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 11 (Chapter 11)
// Used when two or more voices share a staff but have different rhythms.

/** Full-measure in-accord: separates complete voice measures. ⠣⠜ (dots 1,2,6 + dots 3,4,5) */
export const BRAILLE_FULL_MEASURE_IN_ACCORD: string =
    dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT3 | DOT4 | DOT5); // ⠣⠜

/** Part-measure in-accord: separates voices within a measure section. ⠐⠂ (dots 5 + dots 2) */
export const BRAILLE_PART_MEASURE_IN_ACCORD: string =
    dotsToChar(DOT5) + dotsToChar(DOT2); // ⠐⠂

/** Measure division: divides a measure into sections for part-measure in-accords. ⠨⠅ (dots 4,6 + dots 1,3) */
export const BRAILLE_MEASURE_DIVISION: string =
    dotsToChar(DOT4 | DOT6) + dotsToChar(DOT1 | DOT3); // ⠨⠅

// ── Interval signs (M3) ─────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 9 (p.31)
// Used for chord notation: each non-written note is represented by its
// diatonic interval from the written (first) note.
export const BRAILLE_INTERVAL_SIGNS: Map<number, string> = new Map([
    [2, dotsToChar(DOT3 | DOT4)],                // Second: ⠌ dots 3,4
    [3, dotsToChar(DOT3 | DOT4 | DOT6)],          // Third:  ⠬ dots 3,4,6
    [4, dotsToChar(DOT3 | DOT4 | DOT5 | DOT6)],   // Fourth: ⠼ dots 3,4,5,6
    [5, dotsToChar(DOT3 | DOT5)],                 // Fifth:  ⠔ dots 3,5
    [6, dotsToChar(DOT3 | DOT5 | DOT6)],          // Sixth:  ⠴ dots 3,5,6
    [7, dotsToChar(DOT2 | DOT5)],                 // Seventh:⠒ dots 2,5
    [8, dotsToChar(DOT3 | DOT6)],                 // Octave: ⠤ dots 3,6
]);

/**
 * Get the braille character for a diatonic interval sign (2nd through octave).
 * For compound intervals (>8), the interval is reduced: 9th→2nd, 10th→3rd, etc.
 */
export function getIntervalChar(interval: number): string {
    // Reduce compound intervals to simple (9→2, 10→3, ..., 15→8→8)
    let simple: number = interval;
    if (simple > 8) {
        simple = ((simple - 2) % 7) + 2; // 9→2, 10→3, ..., 15→8
    }
    return BRAILLE_INTERVAL_SIGNS.get(simple) ?? "";
}

/**
 * Get a human-readable name for an interval (for debug output).
 */
export function getIntervalName(interval: number): string {
    const names: string[] = ["", "unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "octave"];
    if (interval >= 2 && interval <= 8) {
        return names[interval];
    }
    if (interval > 8) {
        return interval + "th (compound)";
    }
    return "unknown";
}

// ── Accidentals (M2) ───────────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 6 (p.29)
export const BRAILLE_SHARP: string = dotsToChar(DOT1 | DOT4 | DOT6);           // ⠩ (U+2829) dots 1,4,6
export const BRAILLE_FLAT: string = dotsToChar(DOT1 | DOT2 | DOT6);            // ⠣ (U+2823) dots 1,2,6
export const BRAILLE_NATURAL: string = dotsToChar(DOT1 | DOT6);                // ⠡ (U+2821) dots 1,6
export const BRAILLE_DOUBLE_SHARP: string = BRAILLE_SHARP + BRAILLE_SHARP;     // ⠩⠩ two cells
export const BRAILLE_DOUBLE_FLAT: string = BRAILLE_FLAT + BRAILLE_FLAT;        // ⠣⠣ two cells

// ── Number sign and digits (for time/key signatures, M2) ───────────────────
// Verified from NABCC standard
export const BRAILLE_NUMBER_SIGN: string = dotsToChar(DOT3 | DOT4 | DOT5 | DOT6);  // ⠼ (U+283C)

/**
 * Lower-cell digits ("dropped numbers", dots 2,3,5,6 region).
 * Braille music uses these for: time signature DENOMINATORS (Table 7),
 * volta ending numbers (Table 17), and other lower-cell number contexts.
 * Not for counts/numerators after the number sign — those use BRAILLE_UPPER_DIGITS.
 */
export const BRAILLE_DIGITS: string[] = [
    dotsToChar(DOT3 | DOT5 | DOT6),        // 0: ⠴ dots 3,5,6
    dotsToChar(DOT2),                        // 1: ⠂ dot 2
    dotsToChar(DOT2 | DOT3),                // 2: ⠆ dots 2,3
    dotsToChar(DOT2 | DOT5),                // 3: ⠒ dots 2,5
    dotsToChar(DOT2 | DOT5 | DOT6),         // 4: ⠲ dots 2,5,6
    dotsToChar(DOT2 | DOT6),                // 5: ⠢ dots 2,6
    dotsToChar(DOT2 | DOT3 | DOT5),         // 6: ⠖ dots 2,3,5
    dotsToChar(DOT2 | DOT3 | DOT5 | DOT6),  // 7: ⠶ dots 2,3,5,6
    dotsToChar(DOT2 | DOT3 | DOT6),         // 8: ⠦ dots 2,3,6
    dotsToChar(DOT3 | DOT5),                // 9: ⠔ dots 3,5
];

/**
 * Upper-cell digits (ordinary literary braille numbers — same dot patterns as
 * letters A–J). Used after the number sign ⠼ for: literary text numbers,
 * key signature counts of 4+ (Table 6: ⠼⠙⠩ = 4 sharps), time signature
 * NUMERATORS (Table 7: 4/4 = ⠼⠙⠲), ottava numerals (Par. 3.3.1), and
 * bar-over-bar/ensemble measure numbers (Par. 29.3(b), Example 29.3-1).
 */
export const BRAILLE_UPPER_DIGITS: string[] = [
    dotsToChar(DOT2 | DOT4 | DOT5),         // 0: ⠚ dots 2,4,5 (= letter J)
    dotsToChar(DOT1),                        // 1: ⠁ dot 1     (= letter A)
    dotsToChar(DOT1 | DOT2),                // 2: ⠃ dots 1,2  (= letter B)
    dotsToChar(DOT1 | DOT4),                // 3: ⠉ dots 1,4  (= letter C)
    dotsToChar(DOT1 | DOT4 | DOT5),         // 4: ⠙ dots 1,4,5 (= letter D)
    dotsToChar(DOT1 | DOT5),                // 5: ⠑ dots 1,5  (= letter E)
    dotsToChar(DOT1 | DOT2 | DOT4),         // 6: ⠋ dots 1,2,4 (= letter F)
    dotsToChar(DOT1 | DOT2 | DOT4 | DOT5),  // 7: ⠛ dots 1,2,4,5 (= letter G)
    dotsToChar(DOT1 | DOT2 | DOT5),         // 8: ⠓ dots 1,2,5 (= letter H)
    dotsToChar(DOT2 | DOT4),                // 9: ⠊ dots 2,4  (= letter I)
];

/**
 * Convert a non-negative integer to upper-cell braille digits (without number sign).
 * Handles multi-digit numbers (e.g., 12 → ⠁⠃).
 */
export function numberToUpperDigits(n: number): string {
    let result: string = "";
    for (const ch of n.toString()) {
        result += BRAILLE_UPPER_DIGITS[parseInt(ch, 10)];
    }
    return result;
}

/**
 * Convert a non-negative integer to lower-cell braille digits (without number sign).
 * Handles multi-digit numbers (e.g., 12 → ⠂⠆).
 */
export function numberToLowerDigits(n: number): string {
    let result: string = "";
    for (const ch of n.toString()) {
        result += BRAILLE_DIGITS[parseInt(ch, 10)];
    }
    return result;
}

// ── Accidental lookup ─────────────────────────────────────────────────────

/**
 * Get the braille string for an accidental.
 * Returns empty string for NONE or unsupported accidentals.
 */
export function getAccidentalChar(accidental: AccidentalEnum): string {
    switch (accidental) {
        case AccidentalEnum.SHARP:          return BRAILLE_SHARP;
        case AccidentalEnum.FLAT:           return BRAILLE_FLAT;
        case AccidentalEnum.NATURAL:        return BRAILLE_NATURAL;
        case AccidentalEnum.DOUBLESHARP:    return BRAILLE_DOUBLE_SHARP;
        case AccidentalEnum.DOUBLEFLAT:     return BRAILLE_DOUBLE_FLAT;
        default:                            return "";
    }
}

/**
 * Get a human-readable name for an accidental (for debug output).
 */
export function getAccidentalName(accidental: AccidentalEnum): string {
    switch (accidental) {
        case AccidentalEnum.SHARP:          return "sharp";
        case AccidentalEnum.FLAT:           return "flat";
        case AccidentalEnum.NATURAL:        return "natural";
        case AccidentalEnum.DOUBLESHARP:    return "double sharp";
        case AccidentalEnum.DOUBLEFLAT:     return "double flat";
        default:                            return "";
    }
}

// ── Articulation signs (M5) ──────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 22(A) (p.41)
// These symbols PRECEDE the note, before any accidental or octave mark.

/** Staccato: dot above/below note. ⠦ dots 2,3,6 */
export const BRAILLE_STACCATO: string = dotsToChar(DOT2 | DOT3 | DOT6);
/** Staccatissimo: pear-shaped dot. ⠠⠦ dots 6 + dots 2,3,6 */
export const BRAILLE_STACCATISSIMO: string = dotsToChar(DOT6) + dotsToChar(DOT2 | DOT3 | DOT6);
/** Mezzo-staccato (detached legato): dot and short line. ⠐⠦ dots 5 + dots 2,3,6 */
export const BRAILLE_MEZZO_STACCATO: string = dotsToChar(DOT5) + dotsToChar(DOT2 | DOT3 | DOT6);
/** Tenuto (agogic accent): short line. ⠸⠦ dots 4,5,6 + dots 2,3,6 */
export const BRAILLE_TENUTO: string = dotsToChar(DOT4 | DOT5 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6);
/** Accent: thin converging wedge. ⠨⠦ dots 4,6 + dots 2,3,6 */
export const BRAILLE_ACCENT: string = dotsToChar(DOT4 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6);
/** Strong accent / marcato: thick inverted V. ⠰⠦ dots 5,6 + dots 2,3,6 */
export const BRAILLE_MARCATO: string = dotsToChar(DOT5 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6);

// ── Fermata signs (M5) ─────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 22(B) (p.42)
// These symbols FOLLOW the note.

/** Fermata over/under a note. ⠣⠇ dots 1,2,6 + dots 1,2,3 */
export const BRAILLE_FERMATA: string = dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3);

// ── Ornament signs (M5) ────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 16 (p.36-37)
// These symbols PRECEDE the note, before any accidental or octave mark.

/** Trill. ⠖ dots 2,3,5 */
export const BRAILLE_TRILL: string = dotsToChar(DOT2 | DOT3 | DOT5);
/** Turn between notes. ⠲ dots 2,5,6 */
export const BRAILLE_TURN: string = dotsToChar(DOT2 | DOT5 | DOT6);
/** Turn above/below a note. ⠠⠲ dots 6 + dots 2,5,6 */
export const BRAILLE_TURN_ON_NOTE: string = dotsToChar(DOT6) + dotsToChar(DOT2 | DOT5 | DOT6);
/** Inverted turn between notes. ⠲⠇ dots 2,5,6 + dots 1,2,3 */
export const BRAILLE_INVERTED_TURN: string = dotsToChar(DOT2 | DOT5 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3);
/** Inverted turn above/below a note. ⠠⠲⠇ dots 6 + dots 2,5,6 + dots 1,2,3 */
export const BRAILLE_INVERTED_TURN_ON_NOTE: string =
    dotsToChar(DOT6) + dotsToChar(DOT2 | DOT5 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3);
/** Upper mordent (short trill). ⠐⠖ dots 5 + dots 2,3,5 */
export const BRAILLE_MORDENT: string = dotsToChar(DOT5) + dotsToChar(DOT2 | DOT3 | DOT5);
/** Lower mordent (inverted mordent). ⠐⠖⠇ dots 5 + dots 2,3,5 + dots 1,2,3 */
export const BRAILLE_INVERTED_MORDENT: string =
    dotsToChar(DOT5) + dotsToChar(DOT2 | DOT3 | DOT5) + dotsToChar(DOT1 | DOT2 | DOT3);

// ── Dynamic signs (M5) ─────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 22(C) (p.43)
// Dynamics use the word sign (dots 3,4,5) followed by lowercase braille letters.

/**
 * Word sign: signals that what follows is literary text (letters/words), not music notation.
 * In music braille, this precedes dynamics (e.g. >f, >pp), tempo markings, and other
 * text-based expressions. See New International Manual 10-2, Music Braille Code Par. 22.3.
 * ⠜ dots 3,4,5
 */
export const BRAILLE_WORD_SIGN: string = dotsToChar(DOT3 | DOT4 | DOT5);

// Braille lowercase letter characters used in dynamics
const BRAILLE_LETTER_C: string = dotsToChar(DOT1 | DOT4);           // ⠉
const BRAILLE_LETTER_D: string = dotsToChar(DOT1 | DOT4 | DOT5);    // ⠙
const BRAILLE_LETTER_F: string = dotsToChar(DOT1 | DOT2 | DOT4);    // ⠋
const BRAILLE_LETTER_M: string = dotsToChar(DOT1 | DOT3 | DOT4);    // ⠍
const BRAILLE_LETTER_P: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT4); // ⠏
const BRAILLE_LETTER_R: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT5); // ⠗
const BRAILLE_LETTER_S: string = dotsToChar(DOT2 | DOT3 | DOT4);    // ⠎
const BRAILLE_LETTER_Z: string = dotsToChar(DOT1 | DOT3 | DOT5 | DOT6); // ⠵

/** Abbreviation period (dot 3). Used in cresc., dim., etc. */
export const BRAILLE_ABBREV_PERIOD: string = dotsToChar(DOT3);
/** Literary opening parenthesis. ⠷ dots 1,2,3,5,6. Used in verse numbering (Par. 35.7). */
export const BRAILLE_OPEN_PAREN: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT5 | DOT6);
/** Literary closing parenthesis. ⠾ dots 2,3,4,5,6. Used in verse numbering (Par. 35.7). */
export const BRAILLE_CLOSE_PAREN: string = dotsToChar(DOT2 | DOT3 | DOT4 | DOT5 | DOT6);

/** Crescendo hairpin start. ⠜⠉ word sign + c */
export const BRAILLE_CRESC_HAIRPIN: string = BRAILLE_WORD_SIGN + BRAILLE_LETTER_C;
/** Diminuendo hairpin start. ⠜⠙ word sign + d */
export const BRAILLE_DIM_HAIRPIN: string = BRAILLE_WORD_SIGN + BRAILLE_LETTER_D;

/**
 * Get the braille string for a dynamic marking.
 * Returns word sign followed by the appropriate letter sequence.
 */
export function getDynamicBraille(dynamicName: string): string {
    // Dynamic markings are word sign + lowercase letters
    let letters: string = "";
    for (const ch of dynamicName) {
        switch (ch) {
            case "p": letters += BRAILLE_LETTER_P; break;
            case "f": letters += BRAILLE_LETTER_F; break;
            case "m": letters += BRAILLE_LETTER_M; break;
            case "s": letters += BRAILLE_LETTER_S; break;
            case "z": letters += BRAILLE_LETTER_Z; break;
            case "r": letters += BRAILLE_LETTER_R; break;
            default: break;
        }
    }
    if (!letters) {
        return "";
    }
    return BRAILLE_WORD_SIGN + letters;
}

// ── Tie signs (M6) ────────────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 10 (p.31)
// Tie is placed after the first tied note (after dots, fermata, slur). Par. 10.1.

/** Tie between single notes. ⠈⠉ dots 4 + dots 1,4 */
export const BRAILLE_SINGLE_TIE: string = dotsToChar(DOT4) + dotsToChar(DOT1 | DOT4);
/** Tie between chords (two or more ties). ⠨⠉ dots 4,6 + dots 1,4 */
export const BRAILLE_CHORD_TIE: string = dotsToChar(DOT4 | DOT6) + dotsToChar(DOT1 | DOT4);

// ── Slur signs (M6) ──────────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 13 (p.33)
// Short slur: placed after each note of the phrase except the last. Par. 13.2.
// Bracket slurs: for phrases > 4 notes. Par. 13.3.

/** Short slur sign. ⠉ dots 1,4 */
export const BRAILLE_SLUR: string = dotsToChar(DOT1 | DOT4);
/** Syllabic slur sign for lyrics melisma. ⠉ dots 1,4. Same glyph as BRAILLE_SLUR (Par. 35.2). */
export const BRAILLE_SYLLABIC_SLUR: string = dotsToChar(DOT1 | DOT4);
/** Bracket slur opening sign. ⠰⠃ dots 5,6 + dots 1,2 */
export const BRAILLE_BRACKET_SLUR_OPEN: string = dotsToChar(DOT5 | DOT6) + dotsToChar(DOT1 | DOT2);
/** Bracket slur closing sign. ⠘⠆ dots 4,5 + dots 2,3 */
export const BRAILLE_BRACKET_SLUR_CLOSE: string = dotsToChar(DOT4 | DOT5) + dotsToChar(DOT2 | DOT3);

// ── Repeat barline signs (M6) ────────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 17 (p.39)
// Forward repeat (start of repeated passage) precedes the measure's first note.
// Backward repeat (end of repeated passage) follows the measure's last note.
// Par. 17.1: first note after either sign requires a special octave mark.

/** Forward repeat (double bar followed by dots). ⠣⠶ dots 1,2,6 + dots 2,3,5,6 */
export const BRAILLE_FORWARD_REPEAT: string =
    dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT5 | DOT6);
/** Backward repeat (double bar preceded by dots). ⠣⠆ dots 1,2,6 + dots 2,3 */
export const BRAILLE_BACKWARD_REPEAT: string =
    dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT2 | DOT3);

// ── Volta signs (M6) ─────────────────────────────────────────────────────
// Verified from Music Braille Code 2015, Par. 17.1.1
// Volta = number sign + ending number digit. Placed before the first sign of the measure.
// First note after volta requires a special octave mark.
// If the sign following the volta contains dot 1, 2, or 3, a dot 3 separator is needed.

/**
 * Get the braille string for a volta (alternate ending) sign.
 * Uses number sign + digit for the ending number.
 * @param endingNumber The ending number (1, 2, 3, etc.)
 * @returns Braille string for the volta sign
 */
export function getVoltaBraille(endingNumber: number): string {
    if (endingNumber < 0 || endingNumber > 9) {
        return "";
    }
    return BRAILLE_NUMBER_SIGN + BRAILLE_DIGITS[endingNumber];
}

// ── Navigation / repeat direction signs (M6b) ──────────────────────────────
// Verified from Music Braille Code 2015, Table 20 / Par. 20.1
// D.C., D.S., Fine, etc. are rendered as word-sign expressions (text between word signs).
// Segno and Coda are standalone music signs.

/** Segno sign. ⠬ dots 3,4,6 */
export const BRAILLE_SEGNO: string = dotsToChar(DOT3 | DOT4 | DOT6);
/** Coda sign. ⠬⠇ dots 3,4,6 + dots 1,2,3 */
export const BRAILLE_CODA: string = dotsToChar(DOT3 | DOT4 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3);

// Additional braille letter constants for navigation expressions
const BRAILLE_LETTER_A: string = dotsToChar(DOT1);                           // ⠁
const BRAILLE_LETTER_E: string = dotsToChar(DOT1 | DOT5);                   // ⠑
const BRAILLE_LETTER_I: string = dotsToChar(DOT2 | DOT4);                   // ⠊
const BRAILLE_LETTER_L: string = dotsToChar(DOT1 | DOT2 | DOT3);           // ⠇
const BRAILLE_LETTER_N: string = dotsToChar(DOT1 | DOT3 | DOT4 | DOT5);    // ⠝
const BRAILLE_LETTER_O: string = dotsToChar(DOT1 | DOT3 | DOT5);           // ⠕

/** Blank braille cell (U+2800). Used as word separator and for bar-over-bar alignment padding. */
export const BRAILLE_BLANK_CELL: string = dotsToChar(0);                    // ⠀ U+2800

// Pre-built navigation word expressions (word sign + letters + word sign)
// D.C. = word sign + D + period + C + period + word sign
const NAV_DC: string = BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
    BRAILLE_LETTER_C + BRAILLE_ABBREV_PERIOD + BRAILLE_WORD_SIGN;
// D.S. = word sign + D + period + S + period + word sign
const NAV_DS: string = BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
    BRAILLE_LETTER_S + BRAILLE_ABBREV_PERIOD + BRAILLE_WORD_SIGN;
// FINE = word sign + F + I + N + E + word sign
const NAV_FINE: string = BRAILLE_WORD_SIGN + BRAILLE_LETTER_F + BRAILLE_LETTER_I +
    BRAILLE_LETTER_N + BRAILLE_LETTER_E + BRAILLE_WORD_SIGN;
// AL FINE = A + L + blank + F + I + N + E
const WORD_AL_FINE: string = BRAILLE_LETTER_A + BRAILLE_LETTER_L + BRAILLE_BLANK_CELL +
    BRAILLE_LETTER_F + BRAILLE_LETTER_I + BRAILLE_LETTER_N + BRAILLE_LETTER_E;
// AL CODA = A + L + blank + C + O + D + A
const WORD_AL_CODA: string = BRAILLE_LETTER_A + BRAILLE_LETTER_L + BRAILLE_BLANK_CELL +
    BRAILLE_LETTER_C + BRAILLE_LETTER_O + BRAILLE_LETTER_D + BRAILLE_LETTER_A;

/**
 * Get the braille string for a navigation/repeat direction instruction.
 * Returns empty string for unsupported types.
 */
export function getNavigationBraille(type: RepetitionInstructionEnum): string {
    switch (type) {
        case RepetitionInstructionEnum.Segno:
            return BRAILLE_SEGNO;
        case RepetitionInstructionEnum.Coda:
            return BRAILLE_CODA;
        case RepetitionInstructionEnum.ToCoda:
            return BRAILLE_CODA;
        case RepetitionInstructionEnum.Fine:
            return NAV_FINE;
        case RepetitionInstructionEnum.DaCapo:
            return NAV_DC;
        case RepetitionInstructionEnum.DalSegno:
            return NAV_DS;
        case RepetitionInstructionEnum.DaCapoAlFine:
            // D.C. al Fine = word sign + D.C. letters + blank + AL FINE + word sign
            return BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
                BRAILLE_LETTER_C + BRAILLE_ABBREV_PERIOD + BRAILLE_BLANK_CELL +
                WORD_AL_FINE + BRAILLE_WORD_SIGN;
        case RepetitionInstructionEnum.DalSegnoAlFine:
            return BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
                BRAILLE_LETTER_S + BRAILLE_ABBREV_PERIOD + BRAILLE_BLANK_CELL +
                WORD_AL_FINE + BRAILLE_WORD_SIGN;
        case RepetitionInstructionEnum.DaCapoAlCoda:
            return BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
                BRAILLE_LETTER_C + BRAILLE_ABBREV_PERIOD + BRAILLE_BLANK_CELL +
                WORD_AL_CODA + BRAILLE_WORD_SIGN;
        case RepetitionInstructionEnum.DalSegnoAlCoda:
            return BRAILLE_WORD_SIGN + BRAILLE_LETTER_D + BRAILLE_ABBREV_PERIOD +
                BRAILLE_LETTER_S + BRAILLE_ABBREV_PERIOD + BRAILLE_BLANK_CELL +
                WORD_AL_CODA + BRAILLE_WORD_SIGN;
        default:
            return "";
    }
}

/**
 * Get a human-readable name for a navigation instruction (for debug output).
 */
export function getNavigationName(type: RepetitionInstructionEnum): string {
    switch (type) {
        case RepetitionInstructionEnum.Segno:       return "segno";
        case RepetitionInstructionEnum.Coda:        return "coda";
        case RepetitionInstructionEnum.ToCoda:      return "to coda";
        case RepetitionInstructionEnum.Fine:        return "fine";
        case RepetitionInstructionEnum.DaCapo:      return "D.C.";
        case RepetitionInstructionEnum.DalSegno:    return "D.S.";
        case RepetitionInstructionEnum.DaCapoAlFine: return "D.C. al Fine";
        case RepetitionInstructionEnum.DalSegnoAlFine: return "D.S. al Fine";
        case RepetitionInstructionEnum.DaCapoAlCoda: return "D.C. al Coda";
        case RepetitionInstructionEnum.DalSegnoAlCoda: return "D.S. al Coda";
        default:                                    return "";
    }
}

// ── Clef signs (M7, facsimile only) ─────────────────────────────────────────
// Verified from Music Braille Code 2015, Table 4 (p.28) / Par. 4.1-4.5
// Clef signs are routinely OMITTED in nonfacsimile. In facsimile mode, they
// appear at the start of each system and on mid-measure clef changes.
// The note following a clef sign must always have its proper octave mark.
// If the next sign contains dot 1, 2, or 3, a dot-3 separator is needed (Par. 4.2).

/** Clef sign suffix. ⠇ dots 1,2,3 */
const BRAILLE_CLEF_SUFFIX: string = dotsToChar(DOT1 | DOT2 | DOT3);
/** Clef identifier for G (treble). ⠌ dots 3,4 */
const BRAILLE_CLEF_G_ID: string = dotsToChar(DOT3 | DOT4);
/** Clef identifier for F (bass). ⠼ dots 3,4,5,6 */
const BRAILLE_CLEF_F_ID: string = dotsToChar(DOT3 | DOT4 | DOT5 | DOT6);
/** Clef identifier for C (alto/tenor). ⠬ dots 3,4,6 */
const BRAILLE_CLEF_C_ID: string = dotsToChar(DOT3 | DOT4 | DOT6);

/** G clef (treble). ⠜⠌⠇ word sign + G-id + suffix */
export const BRAILLE_CLEF_G: string = BRAILLE_WORD_SIGN + BRAILLE_CLEF_G_ID + BRAILLE_CLEF_SUFFIX;
/** F clef (bass). ⠜⠼⠇ word sign + F-id + suffix */
export const BRAILLE_CLEF_F: string = BRAILLE_WORD_SIGN + BRAILLE_CLEF_F_ID + BRAILLE_CLEF_SUFFIX;
/** C clef (alto, 3rd line). ⠜⠬⠇ word sign + C-id + suffix */
export const BRAILLE_CLEF_C: string = BRAILLE_WORD_SIGN + BRAILLE_CLEF_C_ID + BRAILLE_CLEF_SUFFIX;
/** C clef on 4th line (tenor). ⠜⠬⠐⠇ word sign + C-id + line-4 indicator + suffix */
export const BRAILLE_CLEF_TENOR: string =
    BRAILLE_WORD_SIGN + BRAILLE_CLEF_C_ID + dotsToChar(DOT5) + BRAILLE_CLEF_SUFFIX;

/**
 * Get the braille string for a clef type.
 * Returns the standard clef sign for facsimile mode.
 * @param clefType The ClefEnum value
 * @param line Optional clef line (for distinguishing alto vs tenor C clef)
 */
export function getClefBraille(clefType: ClefEnum, line?: number): string {
    switch (clefType) {
        case ClefEnum.G:
            return BRAILLE_CLEF_G;
        case ClefEnum.F:
            return BRAILLE_CLEF_F;
        case ClefEnum.C:
            // Tenor clef = C clef on line 4; alto = C clef on line 3 (default)
            if (line === 4) {
                return BRAILLE_CLEF_TENOR;
            }
            return BRAILLE_CLEF_C;
        default:
            return "";
    }
}

/**
 * Get a human-readable name for a clef type (for debug output).
 */
export function getClefName(clefType: ClefEnum, line?: number): string {
    switch (clefType) {
        case ClefEnum.G:      return "treble clef";
        case ClefEnum.F:      return "bass clef";
        case ClefEnum.C:
            if (line === 4) {
                return "tenor clef";
            }
            return "alto clef";
        default:              return "clef";
    }
}

// ── Facsimile-specific signs (M7) ───────────────────────────────────────────
// These signs appear only in facsimile mode (Par. 1.1).

/** Music hyphen: dot 5. Used when a measure continues across a braille line break. Par. 1.11. */
export const BRAILLE_MUSIC_HYPHEN: string = dotsToChar(DOT5);

/** Print page indicator: dots 5 + dots 2,5. Precedes page number in facsimile. Par. 1.5. */
export const BRAILLE_PAGE_INDICATOR: string = dotsToChar(DOT5) + dotsToChar(DOT2 | DOT5);

/** Braille line break character for facsimile output. */
export const BRAILLE_LINE_BREAK: string = "\n";

// ── Hand signs (M8a, keyboard/multi-staff) ───────────────────────────────────
// Verified from Music Braille Code 2015, Table 25 / Par. 29.2.
// Hand signs indicate which staff is being rendered in multi-staff music.
// The note following a hand sign MUST have an octave mark.
// If the next sign after a hand sign contains dot 1, 2, or 3, a dot-3 separator is needed.

/** Right hand sign. ⠨⠜ dots 4,6 + dots 3,4,5. Par. 29.2. */
export const BRAILLE_HAND_RIGHT: string = dotsToChar(DOT4 | DOT6) + dotsToChar(DOT3 | DOT4 | DOT5);

/** Left hand sign. ⠸⠜ dots 4,5,6 + dots 3,4,5. Par. 29.2. */
export const BRAILLE_HAND_LEFT: string = dotsToChar(DOT4 | DOT5 | DOT6) + dotsToChar(DOT3 | DOT4 | DOT5);

/**
 * Check whether a braille string's first character contains dot 1, 2, or 3.
 * Used to determine if a dot-3 separator is needed after hand signs and clef signs (Par. 29.2, 4.2).
 */
export function firstCharHasLowerDots(braille: string): boolean {
    if (!braille || braille.length === 0) {
        return false;
    }
    const code: number = braille.charCodeAt(0) - BRAILLE_BASE;
    // Dots 1, 2, 3 are bits 0x01, 0x02, 0x04
    return (code & (DOT1 | DOT2 | DOT3)) !== 0;
}

// ── Ottava (8va/8vb/15ma/15mb) word expressions (M7, facsimile) ─────────────
// Verified from Music Braille Code 2015, Par. 3.3.1 (facsimile word-sign method).
// Uses upper-cell (literary) digits: 1=dot1, 5=dots1,5, 8=dots1,2,5
// (distinct from lower-cell digits used in time signatures).
// Format: word_sign + number_sign + literary_digits + letters + period + period
// End marker: word_sign + period

// Additional braille letter constants for ottava expressions
const BRAILLE_LETTER_B: string = dotsToChar(DOT1 | DOT2);                  // ⠃
const BRAILLE_LETTER_V: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT6);   // ⠧

// Upper-cell (literary) digits — same dot patterns as letters A, E, H.
// See BRAILLE_UPPER_DIGITS; aliased here for readability of the ottava constants.
const UPPER_DIGIT_1: string = BRAILLE_UPPER_DIGITS[1];                     // ⠁ (= letter A)
const UPPER_DIGIT_5: string = BRAILLE_UPPER_DIGITS[5];                     // ⠑ (= letter E)
const UPPER_DIGIT_8: string = BRAILLE_UPPER_DIGITS[8];                     // ⠓ (= letter H)

/** 8va start: ⠜⠼⠓⠧⠁⠄⠄ word_sign + #8 + va + period + period. Par. 3.3.1 */
export const BRAILLE_OTTAVA_8VA: string = BRAILLE_WORD_SIGN + BRAILLE_NUMBER_SIGN +
    UPPER_DIGIT_8 + BRAILLE_LETTER_V + BRAILLE_LETTER_A + BRAILLE_ABBREV_PERIOD + BRAILLE_ABBREV_PERIOD;

/** 8vb start: ⠜⠼⠓⠧⠃⠄⠄ word_sign + #8 + vb + period + period. Par. 3.3.1 */
export const BRAILLE_OTTAVA_8VB: string = BRAILLE_WORD_SIGN + BRAILLE_NUMBER_SIGN +
    UPPER_DIGIT_8 + BRAILLE_LETTER_V + BRAILLE_LETTER_B + BRAILLE_ABBREV_PERIOD + BRAILLE_ABBREV_PERIOD;

/** 15ma start: ⠜⠼⠁⠑⠍⠁⠄⠄ word_sign + #15 + ma + period + period. Par. 3.3.1 */
export const BRAILLE_OTTAVA_15MA: string = BRAILLE_WORD_SIGN + BRAILLE_NUMBER_SIGN +
    UPPER_DIGIT_1 + UPPER_DIGIT_5 + BRAILLE_LETTER_M + BRAILLE_LETTER_A +
    BRAILLE_ABBREV_PERIOD + BRAILLE_ABBREV_PERIOD;

/** 15mb start: ⠜⠼⠁⠑⠍⠃⠄⠄ word_sign + #15 + mb + period + period. Par. 3.3.1 */
export const BRAILLE_OTTAVA_15MB: string = BRAILLE_WORD_SIGN + BRAILLE_NUMBER_SIGN +
    UPPER_DIGIT_1 + UPPER_DIGIT_5 + BRAILLE_LETTER_M + BRAILLE_LETTER_B +
    BRAILLE_ABBREV_PERIOD + BRAILLE_ABBREV_PERIOD;

/** Ottava end marker: ⠜⠄ word_sign + period. Placed after the last note of the ottava passage. */
export const BRAILLE_OTTAVA_END: string = BRAILLE_WORD_SIGN + BRAILLE_ABBREV_PERIOD;

/**
 * Get the braille start marker for an ottava type.
 * Returns empty string for OctaveEnum.NONE.
 */
export function getOttavaBraille(type: OctaveEnum): string {
    switch (type) {
        case OctaveEnum.VA8:   return BRAILLE_OTTAVA_8VA;
        case OctaveEnum.VB8:   return BRAILLE_OTTAVA_8VB;
        case OctaveEnum.MA15:  return BRAILLE_OTTAVA_15MA;
        case OctaveEnum.MB15:  return BRAILLE_OTTAVA_15MB;
        default:               return "";
    }
}

/**
 * Get a human-readable name for an ottava type (for debug output).
 */
export function getOttavaName(type: OctaveEnum): string {
    switch (type) {
        case OctaveEnum.VA8:   return "8va";
        case OctaveEnum.VB8:   return "8vb";
        case OctaveEnum.MA15:  return "15ma";
        case OctaveEnum.MB15:  return "15mb";
        default:               return "";
    }
}

// ── NoteType to BrailleDurationGroup mapping ────────────────────────────────

/**
 * Maps a NoteType enum value to its BrailleDurationGroup.
 * Returns undefined for types that don't map to a standard braille duration.
 */
export function noteTypeToDurationGroup(noteType: NoteType): BrailleDurationGroup | undefined {
    switch (noteType) {
        case NoteType.WHOLE:
        case NoteType._16th:
            return BrailleDurationGroup.WholeOr16th;
        case NoteType.HALF:
        case NoteType._32nd:
            return BrailleDurationGroup.HalfOr32nd;
        case NoteType.QUARTER:
        case NoteType._64th:
            return BrailleDurationGroup.QuarterOr64th;
        case NoteType.EIGTH:
        case NoteType._128th:
            return BrailleDurationGroup.EighthOr128th;
        default:
            return undefined;
    }
}

/**
 * Infer a BrailleDurationGroup from a Fraction duration (fallback when NoteType is UNDEFINED).
 * Uses the fraction's real value (fraction of a whole note).
 */
export function fractionToDurationGroup(realValue: number): BrailleDurationGroup {
    // Map common real values to duration groups
    // Whole = 1.0, Half = 0.5, Quarter = 0.25, Eighth = 0.125
    // 16th = 0.0625, 32nd = 0.03125, 64th = 0.015625, 128th = 0.0078125
    if (realValue >= 0.5) {
        // Whole (1.0) or Half (0.5)
        return realValue >= 0.75 ? BrailleDurationGroup.WholeOr16th : BrailleDurationGroup.HalfOr32nd;
    }
    if (realValue >= 0.125) {
        // Quarter (0.25) or Eighth (0.125)
        return realValue >= 0.1875 ? BrailleDurationGroup.QuarterOr64th : BrailleDurationGroup.EighthOr128th;
    }
    // 16th (0.0625) or shorter
    if (realValue >= 0.03125) {
        return realValue >= 0.046875 ? BrailleDurationGroup.WholeOr16th : BrailleDurationGroup.HalfOr32nd;
    }
    return realValue >= 0.01171875 ? BrailleDurationGroup.QuarterOr64th : BrailleDurationGroup.EighthOr128th;
}

// ── Literary Braille Alphabet (Grade 1) ───────────────────────────────────
// Complete a-z alphabet for text-to-braille conversion (instrument names, etc.)
// Letters already defined above: A, B, C, D, E, F, I, L, M, N, O, P, R, S, V, Z
// Missing letters added here: G, H, J, K, Q, T, U, W, X, Y

const BRAILLE_LETTER_G: string = dotsToChar(DOT1 | DOT2 | DOT4 | DOT5);       // ⠛
const BRAILLE_LETTER_H: string = dotsToChar(DOT1 | DOT2 | DOT5);              // ⠓
const BRAILLE_LETTER_J: string = dotsToChar(DOT2 | DOT4 | DOT5);              // ⠚
const BRAILLE_LETTER_K: string = dotsToChar(DOT1 | DOT3);                     // ⠅
const BRAILLE_LETTER_Q: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT4 | DOT5); // ⠟
const BRAILLE_LETTER_T: string = dotsToChar(DOT2 | DOT3 | DOT4 | DOT5);      // ⠞
const BRAILLE_LETTER_U: string = dotsToChar(DOT1 | DOT3 | DOT6);             // ⠥
const BRAILLE_LETTER_W: string = dotsToChar(DOT2 | DOT4 | DOT5 | DOT6);      // ⠺
const BRAILLE_LETTER_X: string = dotsToChar(DOT1 | DOT3 | DOT4 | DOT6);      // ⠭
const BRAILLE_LETTER_Y: string = dotsToChar(DOT1 | DOT3 | DOT4 | DOT5 | DOT6); // ⠽

/** Lookup table: lowercase ASCII letter → braille literary character. */
const BRAILLE_ALPHABET: Map<string, string> = new Map([
    ["a", BRAILLE_LETTER_A], ["b", BRAILLE_LETTER_B], ["c", BRAILLE_LETTER_C],
    ["d", BRAILLE_LETTER_D], ["e", BRAILLE_LETTER_E], ["f", BRAILLE_LETTER_F],
    ["g", BRAILLE_LETTER_G], ["h", BRAILLE_LETTER_H], ["i", BRAILLE_LETTER_I],
    ["j", BRAILLE_LETTER_J], ["k", BRAILLE_LETTER_K], ["l", BRAILLE_LETTER_L],
    ["m", BRAILLE_LETTER_M], ["n", BRAILLE_LETTER_N], ["o", BRAILLE_LETTER_O],
    ["p", BRAILLE_LETTER_P], ["q", BRAILLE_LETTER_Q], ["r", BRAILLE_LETTER_R],
    ["s", BRAILLE_LETTER_S], ["t", BRAILLE_LETTER_T], ["u", BRAILLE_LETTER_U],
    ["v", BRAILLE_LETTER_V], ["w", BRAILLE_LETTER_W], ["x", BRAILLE_LETTER_X],
    ["y", BRAILLE_LETTER_Y], ["z", BRAILLE_LETTER_Z],
]);

/**
 * Convert a text string to braille literary characters (Grade 1 alphabet).
 * Used for instrument abbreviations in ensemble scores.
 *
 * - Letters (a-z, A-Z) are converted to braille lowercase (case-insensitive)
 * - Digits (0-9) are converted to braille digits with number sign prefix
 * - Spaces become braille blank cells
 * - Periods (.) become dot 3 (abbreviation period)
 * - Other characters are skipped
 *
 * @param text The text string to convert
 * @returns Braille literary string
 */
export function textToBraille(text: string): string {
    let result: string = "";
    let inNumber: boolean = false; // true while consecutive digits share one number sign
    for (const ch of text) {
        if (ch >= "0" && ch <= "9") {
            // Literary numbers: number sign + upper-cell digits (letters a–j).
            // Consecutive digits share a single number sign (e.g. "12" → ⠼⠁⠃).
            if (!inNumber) {
                result += BRAILLE_NUMBER_SIGN;
                inNumber = true;
            }
            result += BRAILLE_UPPER_DIGITS[parseInt(ch, 10)];
            continue;
        }
        inNumber = false;
        const lower: string = ch.toLowerCase();
        const brailleLetter: string | undefined = BRAILLE_ALPHABET.get(lower);
        if (brailleLetter) {
            result += brailleLetter;
        } else if (ch === " ") {
            result += BRAILLE_BLANK_CELL;
        } else if (ch === ".") {
            result += BRAILLE_ABBREV_PERIOD;
        }
        // Other characters (commas, hyphens, etc.) are silently skipped
    }
    return result;
}
