import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum, AccidentalEnum } from "../../Common/DataObjects";
import { KeyInstruction, KeyEnum } from "../../MusicalScore/VoiceData/Instructions";

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
        const isMinorKey: boolean = currentKeyInstruction.Mode !== KeyEnum.major;

        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue === transposedHalfTone) {
                // In sharp-key minor keys, a raised note that lands exactly on a natural note
                // must be spelled as the raised degree below (e.g. E# in F# minor, not F♮; B# in C# minor, not C♮).
                // Flat-key minor keys (C minor, F minor, Bb minor…) are excluded: their raised 7th
                // lands on a natural note that is correctly spelled with a ♮ sign (B♮, E♮, A♮).
                if (hasSharpAccidental && isMinorKey && currentKeyInstruction.Key > 0) {
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

                const keyHasSharps: boolean = currentKeyInstruction.Key > 0;
                const keyHasFlats: boolean = currentKeyInstruction.Key < 0;
                let preferSharps: boolean = true;

                // Choose enharmonic (sharp vs flat) based on the transposed key signature (#1345),
                //   but keep the original accidental when the key has no preference
                //   (e.g. Beethoven Geliebte measure 6, transposing -3 to C major: keep flat instead of sharp).
                // In minor keys, a raised note (sharp accidental) must stay sharp regardless of key flats,
                //   so the leading tone is spelled as raised 7th degree (e.g. C# in D minor, F# in G minor).
                if (hasSharpAccidental && isMinorKey) {
                    preferSharps = true;
                } else if (keyHasSharps) {
                    preferSharps = true;
                } else if (keyHasFlats) {
                    preferSharps = false;
                } else if (hasSharpAccidental || hasFlatAccidental) {
                    preferSharps = hasSharpAccidental;
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
