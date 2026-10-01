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

        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue === transposedHalfTone) {
                const noteIndex: number = i;
                transposedFundamentalNote = TransposeCalculator.noteEnums[noteIndex];
                transposedOctave = <number>(pitch.Octave + octaveChange);
                transposedAccidental = AccidentalEnum.NONE;
                // Spell the white key like the key signature if it has it (E# with 6 or 7 sharps, B# with 7, Cb with 6 or 7 flats,
                //   Fb with 7) and the original note was spelled like its key signature too: e.g. the leading tone of F# major is E#,
                //   as F it needed a natural sign (and the tonic F# after it a sharp). A chromatic note stays natural:
                //   e.g. Cb in C major, the lowered tonic or the third of Ab minor, is F in F# major (the third of D minor).
                const keySignatureNote: Pitch = TransposeCalculator.keySignatureSpelling(currentValue, transposedOctave, currentKeyInstruction);
                if (keySignatureNote && TransposeCalculator.isSpelledLikeKeySignature(pitch, currentKeyInstruction.keyTypeOriginal)) {
                    return keySignatureNote;
                }
                return new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental);
            } else if (currentValue > transposedHalfTone) {
                break;
            }
        }
        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue > transposedHalfTone) {
                let noteIndex: number = i;

                const accidentalHalfTones: number = Pitch.HalfTonesFromAccidental(pitch.Accidental);
                const hasSharpAccidental: boolean = accidentalHalfTones > 0;
                const hasFlatAccidental: boolean = accidentalHalfTones < 0;
                const keyHasSharps: boolean = currentKeyInstruction.Key > 0;
                const keyHasFlats: boolean = currentKeyInstruction.Key < 0;
                let preferSharps: boolean = true;

                // Choose enharmonic (sharp vs flat) based on the transposed key signature (#1345),
                //   but keep the original accidental when the key has no preference
                //   (e.g. Beethoven Geliebte measure 6, transposing -3 to C major: keep flat instead of sharp).
                if (keyHasSharps) {
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

    /** The key signature's spelling of a white key (its halftone, 0 = C to 11 = B) with the neighboring letter, if it has one:
     * E# for F with 6 or 7 sharps, B# for C with 7 sharps, Cb for B with 6 or 7 flats, Fb for E with 7 flats.
     * The octave is the white key's: B# is in the octave below its C, Cb in the octave above its B. */
    private static keySignatureSpelling(whiteKey: number, octave: number, key: KeyInstruction): Pitch {
        if (!key) {
            return undefined;
        }
        const alteration: number = key.Key > 0 ? 1 : -1;
        for (const alteredNote of key.AlteratedNotes) {
            const alteredHalfTone: number = <number>alteredNote + alteration; // -1 (Cb) to 12 (B#)
            if ((alteredHalfTone + 12) % 12 === whiteKey) {
                return new Pitch(alteredNote, octave - Math.floor(alteredHalfTone / 12), Pitch.AccidentalFromHalfTones(alteration));
            }
        }
        return undefined;
    }

    /** Whether the pitch is altered as the key signature (in fifths) alters its letter, e.g. B in C major and Bb in Cb major, not Cb in C major. */
    private static isSpelledLikeKeySignature(pitch: Pitch, keySignature: number): boolean {
        const key: KeyInstruction = new KeyInstruction(undefined, keySignature);
        const keyAlteration: number = key.willAlterateNote(pitch.FundamentalNote) ? Math.sign(keySignature) : 0;
        return pitch.AccidentalHalfTones === keyAlteration;
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

        // Normalize key signatures missing from the mapping to their enharmonic equivalents:
        //   7 sharps (C# major) -> 5 flats, 7 flats (Cb major) -> 5 sharps,
        //   and 6 flats (Gb major) -> 6 sharps (F# major), since the mapping only holds F# for that pitch.
        //   Without this, Gb major wasn't found and was transposed as if it were C major (e.g. Gb -2 -> Bb instead of E).
        if (keyTypeForMapping > 6) {
            keyTypeForMapping -= 12;
        } else if (keyTypeForMapping <= -6) {
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
