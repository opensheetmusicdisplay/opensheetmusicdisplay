import { ITransposeCalculator } from "../../MusicalScore/Interfaces/ITransposeCalculator";
import { Pitch, NoteEnum } from "../../Common/DataObjects/Pitch";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions/KeyInstruction";
import { TransposeCalculator } from "./TransposeCalculator";

/** A note spelling as letter, octave and alteration, independent of Pitch/AccidentalEnum. */
interface SpelledPitch {
    /** Letter index: 0 = C, 1 = D, ... 6 = B. */
    letter: number;
    octave: number;
    /** Alteration in halftones: -2 = double flat ... 2 = double sharp. */
    alter: number;
}

/** Transposes notes and chord symbols by interval, so that their spelling stays consistent with the key signature.
 *
 * The default TransposeCalculator only counts halftones and chooses each note's enharmonic spelling
 * (sharp or flat) by the transposed key signature. Notes that aren't in the key then change their function:
 * in C major, transposing the leading tone A# (to B) down a whole tone to Bb major gives Ab instead of G#,
 * because Bb major prefers flats. The result sounds the same, but it isn't what an engraver (or MuseScore, Sibelius,
 * Finale...) would write.
 *
 * This calculator moves every note by the same interval instead: a number of letter steps
 * (MusicXML's <transpose><diatonic>) plus the number of halftones (<chromatic>), like MuseScore's "transpose chromatically".
 * The letter steps follow from the original and transposed key signatures, e.g. C major -> Bb major is one letter down,
 * so A# -> G#, D# -> C#, and C -> Bb.
 *
 * Key signatures are still transposed by the default TransposeCalculator (keyMapping), so the choice of Db vs C#
 * etc. is unchanged. If the interval would need more than a double sharp/flat, or the pitch has a microtonal
 * accidental, the default calculator is used for that note.
 *
 * Chord symbols are spelled more simply by default (SimpleChordSymbolSpelling): a root or bass that the interval
 * would spell with a double sharp/flat or as Fb, Cb, E# or B# is spelled like the default calculator does,
 * e.g. Ebmaj7 in D major transposed by +1 (Eb major) is Emaj7, not Fbmaj7, as lead sheet readers expect.
 *
 * Opt-in, like the default calculator:
 *   osmd.TransposeCalculator = new IntervalTransposeCalculator();
 *   osmd.Sheet.Transpose = -2;
 */
export class IntervalTransposeCalculator implements ITransposeCalculator {
    /** Spell a chord symbol root or bass that the interval would spell with a double sharp/flat or as Fb, Cb, E# or B#
     * like the default calculator does, e.g. Ebmaj7 in D major transposed by +1 as Emaj7 instead of Fbmaj7.
     * The notes keep their interval spelling. Default: true. */
    public SimpleChordSymbolSpelling: boolean = true;
    /** Spell a note or chord symbol that the interval would spell with a double sharp/flat like the default calculator does instead,
     * e.g. Ab in C major transposed by +1 (Db major) as A instead of Bbb.
     * Default: false, i.e. double sharps/flats are used (like MuseScore with "Use double sharps and flats"). */
    public AvoidDoubleAccidentals: boolean = false;

    /** Letters C D E F G A B by letter index. */
    private static readonly letters: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    /** Letter index of the major tonic for key signatures -7..7: Cb Gb Db Ab Eb Bb F C G D A E B F# C#. */
    private static readonly tonicLetterByFifths: number[] = [0, 4, 1, 5, 2, 6, 3, 0, 4, 1, 5, 2, 6, 3, 0];

    private readonly fallback: ITransposeCalculator;

    /** @param fallback transposes the key signatures, and the notes this calculator can't spell (default: TransposeCalculator) */
    constructor(fallback: ITransposeCalculator = new TransposeCalculator()) {
        this.fallback = fallback;
    }

    public transposeKey(keyInstruction: KeyInstruction, transpose: number): void {
        this.fallback.transposeKey(keyInstruction, transpose);
    }

    /** @param chordSymbol true for the root or bass of a chord symbol, which is spelled simply if SimpleChordSymbolSpelling is set */
    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number, chordSymbol: boolean = false): Pitch {
        if (chordSymbol) {
            return this.transposeByInterval(pitch, currentKeyInstruction, halftones,
                this.SimpleChordSymbolSpelling || this.AvoidDoubleAccidentals, this.SimpleChordSymbolSpelling);
        }
        return this.transposeByInterval(pitch, currentKeyInstruction, halftones, this.AvoidDoubleAccidentals, false);
    }

    /** Transposes by interval, or like the default calculator if the interval spelling isn't wanted:
     * a double sharp/flat (avoidDoubleAccidentals), or a sharp/flat that sounds like a natural (avoidWhiteKeyAccidentals: Fb, Cb, E#, B#). */
    private transposeByInterval(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number,
                                avoidDoubleAccidentals: boolean, avoidWhiteKeyAccidentals: boolean): Pitch {
        if (halftones === 0) {
            return pitch;
        }
        const letter: number = IntervalTransposeCalculator.letters.indexOf(pitch.FundamentalNote);
        if (letter < 0 || !currentKeyInstruction) {
            return this.fallback.transposePitch(pitch, currentKeyInstruction, halftones);
        }
        // The original key transposed by exactly these halftones: currentKeyInstruction can be transposed by others,
        //   e.g. chord symbols are transposed by Sheet.Transpose, their key by Sheet.Transpose + Instrument.Transpose.
        const transposedKey: KeyInstruction = new KeyInstruction(undefined, currentKeyInstruction.keyTypeOriginal);
        this.fallback.transposeKey(transposedKey, halftones);
        const steps: number = IntervalTransposeCalculator.letterSteps(transposedKey.keyTypeOriginal, transposedKey.Key, halftones);
        const spelled: SpelledPitch = IntervalTransposeCalculator.spell(
            {letter: letter, octave: pitch.Octave, alter: Pitch.HalfTonesFromAccidental(pitch.Accidental)}, halftones, steps);
        if (!spelled ||
            (avoidDoubleAccidentals && Math.abs(spelled.alter) === 2) ||
            (avoidWhiteKeyAccidentals && spelled.alter !== 0 && IntervalTransposeCalculator.isWhiteKey(spelled))) {
            return this.fallback.transposePitch(pitch, currentKeyInstruction, halftones);
        }
        return new Pitch(IntervalTransposeCalculator.letters[spelled.letter], spelled.octave, Pitch.AccidentalFromHalfTones(spelled.alter));
    }

    /** Whether the spelled pitch sounds like a natural, e.g. Fb (E), Cb (B), E# (F), B# (C). */
    private static isWhiteKey(pitch: SpelledPitch): boolean {
        const halftone: number = (((IntervalTransposeCalculator.letters[pitch.letter] + pitch.alter) % 12) + 12) % 12;
        return IntervalTransposeCalculator.letters.indexOf(halftone) >= 0;
    }

    /** The number of letter steps to move every note by, for a transposition by the given halftones
     * from the original key signature (fifths, -7..7) to the transposed one.
     * The step count is congruent (mod 7) to the letter distance between the two major tonics,
     * and closest to the proportional letter distance of the halftones (7 letters per 12 halftones),
     * e.g. -2 halftones from C to Bb -> -1, +12 -> 7. */
    private static letterSteps(originalFifths: number, transposedFifths: number, halftones: number): number {
        const from: number = IntervalTransposeCalculator.tonicLetterByFifths[IntervalTransposeCalculator.normalizeFifths(originalFifths) + 7];
        const to: number = IntervalTransposeCalculator.tonicLetterByFifths[IntervalTransposeCalculator.normalizeFifths(transposedFifths) + 7];
        const residue: number = (((to - from) % 7) + 7) % 7;
        const ideal: number = (halftones * 7) / 12;
        const base: number = Math.round((ideal - residue) / 7) * 7 + residue;
        // near a rounding boundary the neighbouring candidate can be closer, so compare both
        let best: number = base;
        for (const candidate of [base - 7, base + 7]) {
            if (Math.abs(candidate - ideal) < Math.abs(best - ideal)) {
                best = candidate;
            }
        }
        return best;
    }

    /** Moves a spelled pitch by the given letter steps and halftones.
     * Returns undefined if the result would need more than a double sharp/flat, or the alteration is microtonal. */
    private static spell(pitch: SpelledPitch, halftones: number, steps: number): SpelledPitch {
        if (!Number.isInteger(pitch.alter)) {
            return undefined;
        }
        const diatonic: number = pitch.octave * 7 + pitch.letter + steps;
        const letter: number = ((diatonic % 7) + 7) % 7;
        const octave: number = Math.floor(diatonic / 7);
        const target: number = pitch.octave * 12 + IntervalTransposeCalculator.letters[pitch.letter] + pitch.alter + halftones;
        const alter: number = target - (octave * 12 + IntervalTransposeCalculator.letters[letter]);
        if (alter < -2 || alter > 2) {
            return undefined;
        }
        return {letter: letter, octave: octave, alter: alter};
    }

    private static normalizeFifths(fifths: number): number {
        let normalized: number = Math.round(fifths);
        while (normalized > 7) {
            normalized -= 12;
        }
        while (normalized < -7) {
            normalized += 12;
        }
        return normalized;
    }
}
