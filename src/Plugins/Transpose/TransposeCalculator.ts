import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum, AccidentalEnum } from "../../Common/DataObjects";
import { KeyInstruction, KeyEnum } from "../../MusicalScore/VoiceData/Instructions";

type SpelledPitch = {
    accidental: AccidentalEnum;
    chromaticClass?: number;
    fundamentalNote: NoteEnum;
};

/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    private static noteEnums: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    private static readonly majorKeyTonics: Map<number, SpelledPitch> = new Map<number, SpelledPitch>([
        [-8, { fundamentalNote: NoteEnum.F, accidental: AccidentalEnum.FLAT }],
        [-7, { fundamentalNote: NoteEnum.C, accidental: AccidentalEnum.FLAT }],
        [-6, { fundamentalNote: NoteEnum.G, accidental: AccidentalEnum.FLAT }],
        [-5, { fundamentalNote: NoteEnum.D, accidental: AccidentalEnum.FLAT }],
        [-4, { fundamentalNote: NoteEnum.A, accidental: AccidentalEnum.FLAT }],
        [-3, { fundamentalNote: NoteEnum.E, accidental: AccidentalEnum.FLAT }],
        [-2, { fundamentalNote: NoteEnum.B, accidental: AccidentalEnum.FLAT }],
        [-1, { fundamentalNote: NoteEnum.F, accidental: AccidentalEnum.NONE }],
        [0, { fundamentalNote: NoteEnum.C, accidental: AccidentalEnum.NONE }],
        [1, { fundamentalNote: NoteEnum.G, accidental: AccidentalEnum.NONE }],
        [2, { fundamentalNote: NoteEnum.D, accidental: AccidentalEnum.NONE }],
        [3, { fundamentalNote: NoteEnum.A, accidental: AccidentalEnum.NONE }],
        [4, { fundamentalNote: NoteEnum.E, accidental: AccidentalEnum.NONE }],
        [5, { fundamentalNote: NoteEnum.B, accidental: AccidentalEnum.NONE }],
        [6, { fundamentalNote: NoteEnum.F, accidental: AccidentalEnum.SHARP }],
        [7, { fundamentalNote: NoteEnum.C, accidental: AccidentalEnum.SHARP }],
        [8, { fundamentalNote: NoteEnum.G, accidental: AccidentalEnum.SHARP }],
    ]);
    private static readonly minorKeyTonics: Map<number, SpelledPitch> = new Map<number, SpelledPitch>([
        [-7, { fundamentalNote: NoteEnum.A, accidental: AccidentalEnum.FLAT }],
        [-6, { fundamentalNote: NoteEnum.E, accidental: AccidentalEnum.FLAT }],
        [-5, { fundamentalNote: NoteEnum.B, accidental: AccidentalEnum.FLAT }],
        [-4, { fundamentalNote: NoteEnum.F, accidental: AccidentalEnum.NONE }],
        [-3, { fundamentalNote: NoteEnum.C, accidental: AccidentalEnum.NONE }],
        [-2, { fundamentalNote: NoteEnum.G, accidental: AccidentalEnum.NONE }],
        [-1, { fundamentalNote: NoteEnum.D, accidental: AccidentalEnum.NONE }],
        [0, { fundamentalNote: NoteEnum.A, accidental: AccidentalEnum.NONE }],
        [1, { fundamentalNote: NoteEnum.E, accidental: AccidentalEnum.NONE }],
        [2, { fundamentalNote: NoteEnum.B, accidental: AccidentalEnum.NONE }],
        [3, { fundamentalNote: NoteEnum.F, accidental: AccidentalEnum.SHARP }],
        [4, { fundamentalNote: NoteEnum.C, accidental: AccidentalEnum.SHARP }],
        [5, { fundamentalNote: NoteEnum.G, accidental: AccidentalEnum.SHARP }],
        [6, { fundamentalNote: NoteEnum.D, accidental: AccidentalEnum.SHARP }],
        [7, { fundamentalNote: NoteEnum.A, accidental: AccidentalEnum.SHARP }],
    ]);

    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        if (halftones === 0) {
            return pitch;
            // this fixes chord symbols changing when no transposition was requested (Transpose = 0),
            //   e.g. OSMD_function_test_chord_symbols measure 2 showed D#7 instead of Eb7,
            //   just because sharps fit the key signature better.
        }

        const preservedSingleSemitonePitch: Pitch = this.tryPreservePitchLetterForSingleSemitoneTranspose(
            pitch,
            currentKeyInstruction,
            halftones,
        );
        if (preservedSingleSemitonePitch) {
            return preservedSingleSemitonePitch;
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

    private tryPreservePitchLetterForSingleSemitoneTranspose(
        pitch: Pitch,
        currentKeyInstruction: KeyInstruction,
        halftones: number,
    ): Pitch {
        const octaveSteps: number = Math.trunc(halftones / 12);
        const chromaticRemainder: number = halftones - octaveSteps * 12;
        if (Math.abs(chromaticRemainder) !== 1) {
            return undefined;
        }

        const diatonicKeyPitch: Pitch = this.tryTransposePitchByScaleDegree(
            pitch,
            currentKeyInstruction,
            halftones,
            octaveSteps,
        );
        if (diatonicKeyPitch) {
            return diatonicKeyPitch;
        }

        const transposedAccidentalHalfTones: number =
            Pitch.HalfTonesFromAccidental(pitch.Accidental) + chromaticRemainder;
        if (Math.abs(transposedAccidentalHalfTones) > 3) {
            return undefined;
        }
        if (!this.isSingleSemitoneSpellingCompatibleWithKey(transposedAccidentalHalfTones, currentKeyInstruction.Key)) {
            return undefined;
        }
        return new Pitch(
            pitch.FundamentalNote,
            pitch.Octave + octaveSteps,
            Pitch.AccidentalFromHalfTones(transposedAccidentalHalfTones),
        );
    }

    private tryTransposePitchByScaleDegree(
        pitch: Pitch,
        currentKeyInstruction: KeyInstruction,
        halftones: number,
        octaveSteps: number,
    ): Pitch {
        const originalScale: SpelledPitch[] = this.getKeyScalePitches(
            currentKeyInstruction.keyTypeOriginal,
            currentKeyInstruction.Mode,
        );
        const transposedScale: SpelledPitch[] = this.getKeyScalePitches(
            currentKeyInstruction.Key,
            currentKeyInstruction.Mode,
        );
        if (!originalScale || !transposedScale) {
            return undefined;
        }

        const degreeIndex: number = originalScale.findIndex((scalePitch: SpelledPitch): boolean =>
            scalePitch.fundamentalNote === pitch.FundamentalNote && scalePitch.accidental === pitch.Accidental,
        );
        if (degreeIndex < 0) {
            return undefined;
        }

        const transposedSpelling: SpelledPitch = transposedScale[degreeIndex];
        const transposedHalfTone: number = Pitch.CalculateTransposedHalfTone(pitch, halftones).halftone;
        if (transposedSpelling.chromaticClass !== transposedHalfTone) {
            return undefined;
        }

        const targetHalfTone: number = pitch.getHalfTone() + halftones;
        let transposedPitch: Pitch = new Pitch(
            transposedSpelling.fundamentalNote,
            pitch.Octave + octaveSteps,
            transposedSpelling.accidental,
        );

        while (transposedPitch.getHalfTone() < targetHalfTone) {
            transposedPitch = new Pitch(
                transposedSpelling.fundamentalNote,
                transposedPitch.Octave + 1,
                transposedSpelling.accidental,
            );
        }
        while (transposedPitch.getHalfTone() > targetHalfTone) {
            transposedPitch = new Pitch(
                transposedSpelling.fundamentalNote,
                transposedPitch.Octave - 1,
                transposedSpelling.accidental,
            );
        }

        return transposedPitch.getHalfTone() === targetHalfTone ? transposedPitch : undefined;
    }

    private getKeyScalePitches(keyType: number, mode: KeyEnum): SpelledPitch[] {
        const tonic: SpelledPitch = this.getKeyTonicSpelling(keyType, mode);
        const scaleIntervals: number[] = this.getScaleIntervals(mode);
        if (!tonic || !scaleIntervals) {
            return undefined;
        }

        const tonicChromaticClass: number = this.getChromaticClass(
            tonic.fundamentalNote,
            tonic.accidental,
        );
        return scaleIntervals.map((interval: number, degreeIndex: number): SpelledPitch => {
            const [fundamentalNote]: [NoteEnum, number] = Pitch.lineShiftFromNoteEnum(
                tonic.fundamentalNote,
                degreeIndex,
            );
            const chromaticClass: number = Pitch.WrapAroundCheck(tonicChromaticClass + interval, 12).halftone;
            const accidentalHalfTones: number = this.normalizeAccidentalHalfTones(
                chromaticClass - <number>fundamentalNote,
            );
            return {
                accidental: Pitch.AccidentalFromHalfTones(accidentalHalfTones),
                chromaticClass,
                fundamentalNote,
            };
        });
    }

    private getKeyTonicSpelling(keyType: number, mode: KeyEnum): SpelledPitch {
        const tonicMap: Map<number, SpelledPitch> =
            mode === KeyEnum.minor
                ? TransposeCalculator.minorKeyTonics
                : mode === KeyEnum.major
                    ? TransposeCalculator.majorKeyTonics
                    : undefined;
        return tonicMap?.get(keyType);
    }

    private getScaleIntervals(mode: KeyEnum): number[] {
        switch (mode) {
            case KeyEnum.major:
                return [0, 2, 4, 5, 7, 9, 11];
            case KeyEnum.minor:
                return [0, 2, 3, 5, 7, 8, 10];
            default:
                return undefined;
        }
    }

    private getChromaticClass(fundamentalNote: NoteEnum, accidental: AccidentalEnum): number {
        return Pitch.WrapAroundCheck(
            <number>fundamentalNote + Pitch.HalfTonesFromAccidental(accidental),
            12,
        ).halftone;
    }

    private normalizeAccidentalHalfTones(accidentalHalfTones: number): number {
        while (accidentalHalfTones > 6) {
            accidentalHalfTones -= 12;
        }
        while (accidentalHalfTones < -6) {
            accidentalHalfTones += 12;
        }
        return accidentalHalfTones;
    }

    private isSingleSemitoneSpellingCompatibleWithKey(
        accidentalHalfTones: number,
        transposedKeyType: number,
    ): boolean {
        if (transposedKeyType > 0 && accidentalHalfTones < 0) {
            return false;
        }
        if (transposedKeyType < 0 && accidentalHalfTones > 0) {
            return false;
        }
        return true;
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
        const mappedKey: number = TransposeCalculator.keyMapping[newIndex];
        // Six accidentals is the one enharmonic key-signature tie in this mapping:
        // +6 denotes F#/D# and -6 denotes Gb/Eb. Keep the direction of the
        // chromatic move so a downward semitone from E minor becomes Eb minor,
        // matching the flat spelling used for its notes and chord symbols.
        keyInstruction.Key = mappedKey === 6 && transpose < 0 ? -6 : mappedKey;
        keyInstruction.isTransposedBy = transpose;
    }
}
