import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum /*, AccidentalEnum */ } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";
import { ETC, ETCPitch } from "../ExtendedTranspose/ETC";

/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export class TransposeCalculator implements ITransposeCalculator {

    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {

        // What is the degree relationship of "pitch" in the context of "currentKeyInstruction.keyTypeOriginal"?
        const degree: number = ETC.pitchToDegree({
            fundamentalNote: Number(pitch.FundamentalNote),
            alterations: Pitch.HalfTonesFromAccidental(pitch.Accidental),
            octave: pitch.Octave
        }, currentKeyInstruction.keyTypeOriginal);

        // Right now, "currentKeyInstruction.isTransposedBy" holds the distance (expressed in commas)
        // between currentKeyInstruction.keyTypeOriginal and currentKeyInstruction.Key.
        // We will add the obtained degree to this distance, resulting in the transposed comma on the new key.
        const etcPitch: ETCPitch = ETC.commaToDrawablePitch(degree + currentKeyInstruction.isTransposedBy);

        // Alright, let's translate everything into the OSMD Pitch.
        return new Pitch(
            <NoteEnum>etcPitch.fundamentalNote,
            etcPitch.octave,
            Pitch.AccidentalFromHalfTones(etcPitch.alterations),
        );
    }

    public transposeKey(keyInstruction: KeyInstruction, transpose: number): void {

        const octave: number = Math.floor(transpose / 12);

        const semitone: number = ((transpose % 12) + 12 ) % 12;

        // This is a voodoo ritual practiced by members of the Circle of Fifths club:
        // you must multiply the semitone distance ( to be converted to a key ) by the
        // key's diatonic factor (-5) if the original key is >= 0 or chromatic factor
        // if the original key is < 0, then add the value of the original key.
        // Take the product modulo 12, and if the resulting value is < -7, add 12, else
        // if the resulting value is > 7, subtract 12.
        // In compliance with the previous version, the keys will be chosen from -5 to +6
        // in each case, but unlike the old version, it is now possible to start from any key.
        // If you do not wish to use this simplification (personally, I believe that
        // simplifying keys is a wise choice when it comes to halftone transposition),
        // replace ETC.keyToSimplifiedMajorKey() with ETC.keyToMajorKey().
        if (keyInstruction.keyTypeOriginal >= 0) {
            keyInstruction.Key = ETC.keyToSimplifiedMajorKey(keyInstruction.keyTypeOriginal + (semitone * ETC.KeyDiatonicFactor));
        } else {
            keyInstruction.Key = ETC.keyToSimplifiedMajorKey(keyInstruction.keyTypeOriginal + (semitone * ETC.KeyChromaticFactor));
        }

        // Alright, for the semitone transposition, let's look for a proximity comma value
        // between keys that, unlike "closest", always goes in one direction.
        // "Up" has never given me any problems.
        // Ah! And at this point, we add any additional octaves.
        keyInstruction.isTransposedBy = ETC.keyToKeyProximity(
            keyInstruction.keyTypeOriginal,
            keyInstruction.Key
        ).up + (octave * ETC.OctaveSize);
    }
}

/*
export class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    private static noteEnums: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {

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

                if (accidentalHalfTones > 0 || (accidentalHalfTones === 0 && currentKeyInstruction.Key >= 0)) {
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
        for (; currentIndex < TransposeCalculator.keyMapping.length; currentIndex++) {
            previousKeyType = TransposeCalculator.keyMapping[currentIndex];
            if (previousKeyType === keyInstruction.keyTypeOriginal) {
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
*/
