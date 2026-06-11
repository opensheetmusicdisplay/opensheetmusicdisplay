import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum, AccidentalEnum } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";

/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    private static noteEnums: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        if (halftones === 0) {
            return pitch;
            // this fixes chord symbols changing when no transposition was requested (Transpose = 0),
            //   e.g. OSMD_function_test_chord_symbols measure 2 showed D#7 instead of Eb7,
            //   just because sharps fit the key signature better.
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
