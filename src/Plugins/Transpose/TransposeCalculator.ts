import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum, AccidentalEnum } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";
import { EngravingRules } from "../../MusicalScore/Graphical/EngravingRules";

/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    private static noteEnums: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    /** Set by OpenSheetMusicDisplay.TransposeCalculator. Undefined when the calculator is used standalone,
     * in which case the default (non-strict) spelling is used. */
    public rules: EngravingRules;

    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        if (halftones === 0) {
            return pitch;
            // this fixes chord symbols changing when no transposition was requested (Transpose = 0),
            //   e.g. OSMD_function_test_chord_symbols measure 2 showed D#7 instead of Eb7,
            //   just because sharps fit the key signature better.
        }
        if (this.rules?.StrictTransposeSpelling) {
            const strictPitch: Pitch = this.transposePitchStrict(pitch, currentKeyInstruction, halftones);
            if (strictPitch) {
                return strictPitch;
            } // else fall through to the default spelling, e.g. for an unknown fundamental note
        }

        let transposedFundamentalNote: NoteEnum = NoteEnum.C;
        let transposedOctave: number = 0;
        let transposedAccidental: AccidentalEnum = AccidentalEnum.NONE;
        const result: { halftone: number, overflow: number } = Pitch.CalculateTransposedHalfTone(pitch, halftones);
        let transposedHalfTone: number = result.halftone;
        let octaveChange: number = result.overflow;

        const accidentalHalfTones: number = Pitch.HalfTonesFromAccidental(pitch.Accidental);
        const hasSharpAccidental: boolean = accidentalHalfTones > 0;
        const hasFlatAccidental: boolean = accidentalHalfTones < 0;

        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue === transposedHalfTone) {
                // In sharp-key contexts (minor or major), a non-flat note that lands exactly on a note
                // the key sharps must be spelled as the raised degree below (e.g. E# in F# minor/A major,
                // not F♮; B# in C# minor/E major, not C♮; G→F𝄪 in G# minor/B major).
                // Flat-key contexts are excluded: their raised notes land on naturals correctly
                // spelled with a ♮ sign (B♮ in C/G minor, E♮ in F minor, etc.).
                if (!hasFlatAccidental && currentKeyInstruction.Key > 0 &&
                    currentKeyInstruction.willAlterateNote(TransposeCalculator.noteEnums[i])) {
                    let noteIndex: number = i - 1;
                    if (noteIndex < 0) {
                        noteIndex += 7;
                        transposedHalfTone += 12;
                        octaveChange--;
                    }
                    transposedFundamentalNote = TransposeCalculator.noteEnums[noteIndex];
                    transposedAccidental = Pitch.AccidentalFromHalfTones(transposedHalfTone - <number>transposedFundamentalNote);
                    transposedOctave = <number>(pitch.Octave + octaveChange);
                    return new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental);
                }
                transposedFundamentalNote = TransposeCalculator.noteEnums[i];
                transposedOctave = <number>(pitch.Octave + octaveChange);
                transposedAccidental = AccidentalEnum.NONE;
                return new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental);
            } else if (currentValue > transposedHalfTone) {
                break;
            }
        }
        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue > transposedHalfTone) {
                let noteIndex: number = i;

                const key: number = currentKeyInstruction.Key;
                let preferSharps: boolean = true;

                if (key <= -3) {
                    // Rule: never use sharps in keys with 3 or more flats
                    preferSharps = false;
                } else {
                    // Check if there is an explicit override for this key and halftone from the clean list
                    let hasOverride: boolean = false;
                    let overrideValue: boolean = false;

                    if (key === -2) {
                        // Bb Major / G minor: Gb -> F#
                        if (transposedHalfTone === 6) {
                            hasOverride = true;
                            overrideValue = true;
                        }
                    } else if (key === -1) {
                        // F Major / D minor: Db -> C#
                        if (transposedHalfTone === 1) {
                            hasOverride = true;
                            overrideValue = true;
                        }
                    } else if (key === 0) {
                        // C Major / A minor: Ab -> G#
                        if (transposedHalfTone === 8) {
                            hasOverride = true;
                            overrideValue = true;
                        }
                    } else if (key === 1) {
                        // G Major / E minor: Eb -> D#
                        if (transposedHalfTone === 3) {
                            hasOverride = true;
                            overrideValue = true;
                        }
                    } else if (key === 2) {
                        // D Major / B minor: Bb -> A#
                        if (transposedHalfTone === 10) {
                            hasOverride = true;
                            overrideValue = true;
                        }
                    }

                    if (hasOverride) {
                        preferSharps = overrideValue;
                    } else if (hasSharpAccidental || hasFlatAccidental) {
                        // Respect original accidental if present
                        preferSharps = hasSharpAccidental;
                    } else {
                        // Default based on key signature
                        if (key > 0) {
                            preferSharps = true;
                        } else if (key < 0) {
                            preferSharps = false;
                        } else {
                            // C Major / A minor default:
                            // We keep Eb (3) and Bb (10) as flats, others as sharps.
                            if (transposedHalfTone === 3 || transposedHalfTone === 10) {
                                preferSharps = false;
                            } else {
                                preferSharps = true;
                            }
                        }
                    }
                }

                if (preferSharps) {
                    noteIndex--;
                }
                while (noteIndex < 0) {
                    noteIndex += 7;
                    transposedHalfTone += 12;
                    octaveChange--;
                }
                while (noteIndex >= 7) {
                    noteIndex -= 7;
                    transposedHalfTone -= 12;
                    octaveChange++;
                }
                transposedFundamentalNote = TransposeCalculator.noteEnums[noteIndex];
                transposedAccidental = Pitch.AccidentalFromHalfTones(transposedHalfTone - <number>transposedFundamentalNote);
                transposedOctave = <number>(pitch.Octave + octaveChange);
                break;
            }
        }

        const transposedPitch: Pitch = new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental);
        return transposedPitch;
    }

    /** Transposes a pitch by interval instead of by pitch class (EngravingRules.StrictTransposeSpelling).
     * The letter name always moves by the generic interval between the original and the transposed key
     * (e.g. 2 letter steps for C -> Eb), and the accidental is whatever makes the halftone distance exact.
     * This preserves the spelling logic of the original: a flat stays a flat (Ab +2 -> Bb, not A#),
     * a sharp stays a sharp (D# +3 -> F#, not Gb), enharmonically distinct notes stay distinct (C# vs Db),
     * and Cb/Fb/B#/E# and double accidentals are produced where they are the correct spelling.
     * @returns undefined if the pitch cannot be transposed this way, so the caller can fall back. */
    private transposePitchStrict(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        const letterIndex: number = TransposeCalculator.noteEnums.indexOf(pitch.FundamentalNote);
        if (letterIndex < 0) {
            return undefined; // unknown fundamental note, shouldn't happen
        }
        const transposedLetterIndex: number = letterIndex + this.getGenericIntervalSteps(currentKeyInstruction, halftones);
        const transposedFundamentalNote: NoteEnum = TransposeCalculator.noteEnums[transposedLetterIndex % 7];
        const originalHalfTone: number = pitch.Octave * 12 + <number>pitch.FundamentalNote + Pitch.HalfTonesFromAccidental(pitch.Accidental);
        // the letter name can only carry the transposition up to a whole octave, the rest is octave change
        let transposedOctave: number = pitch.Octave + Math.floor(transposedLetterIndex / 7);
        let accidentalHalfTones: number = originalHalfTone + halftones - (transposedOctave * 12 + <number>transposedFundamentalNote);
        while (accidentalHalfTones > 6) {
            transposedOctave++;
            accidentalHalfTones -= 12;
        }
        while (accidentalHalfTones < -6) {
            transposedOctave--;
            accidentalHalfTones += 12;
        }
        if (Math.abs(accidentalHalfTones) > 3) {
            return undefined;
            // beyond a triple sharp/flat there is no accidental to write this with,
            //   which only happens for already extreme input (e.g. Fx transposed by a diminished interval).
            //   Fall back to the default spelling instead of drawing a wrong accidental.
        }
        const transposedAccidental: AccidentalEnum = Pitch.AccidentalFromHalfTones(accidentalHalfTones);
        return new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental);
    }

    /** The number of letter name steps (0-6) that every note moves for the given transposition,
     * taken from the tonics of the original and the transposed key, so that the note spellings agree
     * with the key signature that transposeKey() picks (e.g. C -> Eb is 2 steps, C -> D# would be 1). */
    private getGenericIntervalSteps(keyInstruction: KeyInstruction, halftones: number): number {
        const keyType: number = keyInstruction?.keyTypeOriginal ?? 0;
        let keyTypeForMapping: number = keyType;
        // normalize key signatures that aren't in keyMapping (Gb major, or 7 sharps/flats) to their enharmonic equivalent
        if (keyTypeForMapping > 6) {
            keyTypeForMapping -= 12;
        } else if (keyTypeForMapping < -5) {
            keyTypeForMapping += 12;
        }
        let originalIndex: number = TransposeCalculator.keyMapping.indexOf(keyTypeForMapping);
        if (originalIndex < 0) {
            originalIndex = 0; // unknown key signature, assume C major
        }
        let transposedIndex: number = (originalIndex + halftones) % 12;
        if (transposedIndex < 0) {
            transposedIndex += 12;
        }
        // the original letter name has to come from the key as it is written, not from the normalized one:
        //   in Cb major (7 flats) the tonic is a C, so its notes move by one letter step to Db major, not by two.
        const steps: number = TransposeCalculator.tonicLetterIndex(TransposeCalculator.keyMapping[transposedIndex])
            - TransposeCalculator.tonicLetterIndex(keyType);
        return ((steps % 7) + 7) % 7;
    }

    /** Letter name index (C = 0 ... B = 6) of the tonic of the given key signature (positive = sharps, negative = flats).
     * Each step around the circle of fifths moves the tonic by 4 letter names: C(0) G(4) D(1) A(5) E(2) B(6) F#(3) C#(0)... */
    private static tonicLetterIndex(keyType: number): number {
        return (((keyType * 4) % 7) + 7) % 7;
    }

    public transposeKey(keyInstruction: KeyInstruction, transpose: number): void {
        let currentIndex: number = 0;
        let previousKeyType: number = 0;
        let keyTypeForMapping: number = keyInstruction.keyTypeOriginal;

        // restore the original key signature when the net transpose is a multiple of 12, so a C# -> C-> C# round trip returns to C#
        if (transpose % 12 === 0) {
            keyInstruction.Key = keyInstruction.keyTypeOriginal;
            keyInstruction.isTransposedBy = transpose;
            return;
        }

        // Normalize rare key signatures (e.g., 7 sharps or 7 flats) to enharmonic equivalents present in mapping.
        if (keyTypeForMapping > 6) {
            keyTypeForMapping -= 12;
        } else if (keyTypeForMapping < -6) {
            keyTypeForMapping += 12;
        }

        for (; currentIndex < TransposeCalculator.keyMapping.length; currentIndex++) {
            previousKeyType = TransposeCalculator.keyMapping[currentIndex];
            if (previousKeyType === keyTypeForMapping) {
                break;
            }
        }
        let newIndex: number = (currentIndex + transpose);
        while (newIndex >= 12) {
            newIndex -= 12;
        }
        while (newIndex < 0) {
            newIndex += 12;
        }
        keyInstruction.Key = TransposeCalculator.keyMapping[newIndex];
        keyInstruction.isTransposedBy = transpose;
    }
}
