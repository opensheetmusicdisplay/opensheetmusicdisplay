import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay";
import { ETC, ETCPitch } from "./ETC";
import { TransposeOptions } from "./TransposeOptions";

export class ExtendedTransposeCalculator implements ITransposeCalculator {
    private osmd: OpenSheetMusicDisplay = undefined;
    public Options: TransposeOptions = undefined;

    constructor (graphicSheet: OpenSheetMusicDisplay = undefined) {
        this.osmd = graphicSheet;
        this.Options = new TransposeOptions(this.osmd);
    }

    public get MainKey(): number{
        if (this.osmd && this.osmd.GraphicSheet) {
            return this.osmd.GraphicSheet.GetMainKey().keyTypeOriginal || 0;
        } else {
            return 0;
        }
    }

    private pitchToComma(pitch: Pitch): number {
        const comma: number = ETC.pitchToComma({
            fundamentalNote: Number(pitch.FundamentalNote),
            // Math.floor() -> Temporary fix for microtonal tunings
            alterations: Math.floor(Pitch.HalfTonesFromAccidental(pitch.Accidental)),
            octave: pitch.Octave
        });
        return comma;
    }

    private pitchToDegree(pitch: Pitch, majorKey: number): number {
        if (pitch.AccidentalXml){
            //console.log(pitch.AccidentalXml);
        }
        const degree: number = ETC.pitchToDegree({
            fundamentalNote: Number(pitch.FundamentalNote),
            // Math.floor() -> Temporary fix for microtonal tunings
            alterations: Math.floor(Pitch.HalfTonesFromAccidental(pitch.Accidental)),
            octave: pitch.Octave
        }, majorKey);
        return degree;
    }

    private commaToPitch(comma: number): Pitch {
        const pitch: ETCPitch = ETC.commaToDrawablePitch(comma);
        return new Pitch(
            <NoteEnum>pitch.fundamentalNote,
            pitch.octave,
            Pitch.AccidentalFromHalfTones(pitch.alterations),
        );
    }

    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
        // If we remove the condition "transposeHalftones !== 0" from the function
        // "createGraphicalMeasure" in the file MusicSheetCalculator.ts, this workaround is not needed.
        /*
            halftones = Math.floor(halftones);
        */
        if(!this.Options.TransposeByDiatonic) {
            if (this.Options.NoKeySignatures) {
                return pitch;
            } else if (this.Options.TransposeKeySignatures) {
                // TRANSPOSE BY KEY, INTERVAL, HALFTONESE WITH SIGNATURE TRANSPOSING
                const degree: number = this.pitchToDegree(pitch, currentKeyInstruction.keyTypeOriginal);
                return this.commaToPitch(degree + currentKeyInstruction.isTransposedBy);
            } else {
                const srcComma: number = this.pitchToComma(pitch);
                if (this.Options.TransposeByKey) {
                    // TRANSPOSE BY KEY WITHOUT KEY SIGNATURE TRANSPOSING
                    const degreeOfKey: number = this.pitchToDegree(pitch, currentKeyInstruction.keyTypeOriginal);
                    return this.commaToPitch(degreeOfKey + currentKeyInstruction.isTransposedBy);
                } else if( this.Options.TransposeByInterval) {
                    // TRANSPOSE BY INTERVAL WITHOUT KEY SIGNATURE TRANSPOSING
                    const comma: number = this.pitchToComma(pitch);
                    return this.commaToPitch(comma + currentKeyInstruction.isTransposedBy);
                } else {
                    // TRANSPOSE BY HALFTONE WITHOUT KEY SIGNATURE TRANSPOSING
                    const octave: number = Math.floor(halftones/12);
                    let addictionalComma: number = octave * ETC.OctaveSize;
                    if (currentKeyInstruction.Key<0){
                        addictionalComma += ETC.chromaticSemitone(halftones);
                    } else {
                        addictionalComma += ETC.diatonicSemitone(halftones);
                    }
                    return this.commaToPitch(srcComma + addictionalComma);
                }
            }
        } else {
            // TRANSPOSE DIATONICALLY
            const degree: number = this.pitchToDegree(pitch, currentKeyInstruction.keyTypeOriginal);
            const srcFundamentalDegree: number = ETC.FundamentalNotes.indexOf(pitch.FundamentalNote);
            const dstFundamentalNote: number = ETC.FundamentalNotes[((srcFundamentalDegree+currentKeyInstruction.isTransposedBy % 7) + 7) % 7];
            const octaveShift: number =  Math.floor((srcFundamentalDegree + currentKeyInstruction.isTransposedBy)/7);
            const modulatedDiatonicDegree: number = ETC.FundamentalCommas.indexOf(((degree % ETC.OctaveSize ) + ETC.OctaveSize ) % ETC.OctaveSize);
            if ( modulatedDiatonicDegree>=0) {
                const dstFundamentalComma: number =  ETC.FundamentalCommas[((modulatedDiatonicDegree+currentKeyInstruction.isTransposedBy % 7) + 7) % 7];
                const etcPitch: ETCPitch = ETC.commaToPitch(ETC.keyToComma(currentKeyInstruction.Key) + dstFundamentalComma);
                return new Pitch(
                    <NoteEnum>etcPitch.fundamentalNote,
                    pitch.Octave + octaveShift,
                    Pitch.AccidentalFromHalfTones(etcPitch.alterations)
                );
            } else {
                return new Pitch(
                    <NoteEnum>dstFundamentalNote,
                    pitch.Octave + octaveShift,
                    pitch.Accidental
                );
            }
        }
    }

    public transposeKey(keyInstruction: KeyInstruction, transpose: number): void {
        // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
        // If we remove the condition "transposeHalftones !== 0" from the function
        // "createGraphicalMeasure" in the file MusicSheetCalculator.ts, this workaround is not needed.
        /*
            transpose = Math.floor(transpose);
        */
        if (this.Options.TransposeByKey) {
            /*
            const octave: number = ETC.keyOctave(transpose);
            const transposeToKey: number = ETC.keyToMajorKey(transpose - (octave * ETC.OctaveSize));
            keyInstruction.Key = ETC.keyToMajorKey(transposeToKey - this.MainKey + keyInstruction.keyTypeOriginal);

            // At this point, we need to ensure that the closest direction chosen is always the same
            // as the existing one between the MainKey and the target transpose key.
            // I wonder if it would be appropriate to perform this operation only once and
            // perhaps place it in TransposeOptions.

            const closest: string = ETC.keyToKeyProximity(
                this.MainKey,
                transposeToKey,
                true // swapTritoneSense!
            ).closestIs;

            keyInstruction.isTransposedBy = ETC.keyToKeyProximity(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            )[closest] + (octave * ETC.OctaveSize);
            */
            const transposeToKey: number = ETC.keyToMajorKey(transpose);
            keyInstruction.Key = ETC.keyToMajorKey(transposeToKey - this.MainKey + keyInstruction.keyTypeOriginal);

            keyInstruction.isTransposedBy = ETC.keyToKeyProximity(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            )[this.Options.TransposeDirection] + (this.Options.TransposeOctave * ETC.OctaveSize);

            if (!this.Options.TransposeKeySignatures) {
                keyInstruction.Key = keyInstruction.keyTypeOriginal;
            }
        } else if (this.Options.TransposeKeySignatures && this.Options.TransposeByInterval) {
            const octave: number = Math.floor(transpose / 12);
            const semitone: number = ((transpose % 12) + 12 ) % 12;
            if((transpose%12)!==0) {
                keyInstruction.Key = ETC.keyToMajorKey(keyInstruction.keyTypeOriginal + (semitone * ETC.KeyDiatonicFactor));
            } else {
                keyInstruction.Key = keyInstruction.keyTypeOriginal;
            }
            keyInstruction.isTransposedBy = ETC.keyToKeyProximity(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            ).up + (octave * ETC.OctaveSize);
        } else if (this.Options.TransposeKeySignatures && this.Options.TransposeByHalftone) {

            const octave: number = Math.floor(transpose / 12);

            const semitone: number = ((transpose % 12) + 12 ) % 12;

            // This is a voodoo ritual practiced by members of the Circle of Fifths club:
            // you must multiply the semitone distance ( to be converted to a key ) by the
            // key's diatonic factor (-5) if the original key is >= 0 or keys's chromatic
            // factor (7) if the original key is < 0, then add the value of the original key.
            // Take the product modulo 12, and if the resulting value is < -7, add 12, else
            // if the resulting value is > 7, subtract 12.
            // ...more...
            // In compliance with the previous version, the keys will be chosen from -5 to +6
            // in each case, but unlike the old version, it is now possible to start from any key.
            // If you do not wish to use this simplification (personally, I believe that
            // simplifying keys is a wise choice when it comes to halftone transposition),
            // replace ETC.keyToSimplifiedMajorKey() with ETC.keyToMajorKey().
            if(transpose!==0){
                if (keyInstruction.keyTypeOriginal >= 0) {
                    keyInstruction.Key = ETC.keyToSimplifiedMajorKey(keyInstruction.keyTypeOriginal + (semitone * ETC.KeyDiatonicFactor));
                } else {
                    keyInstruction.Key = ETC.keyToSimplifiedMajorKey(keyInstruction.keyTypeOriginal + (semitone * ETC.KeyChromaticFactor));
                }
            } else {
                keyInstruction.Key = keyInstruction.keyTypeOriginal;
            }

            // Alright, for the semitone transposition, let's look for a proximity comma value
            // between keys that, unlike "closest", always goes in one direction.
            // "Up" has never given me any problems.
            // Ah! And at this point, we add any additional octaves.
            keyInstruction.isTransposedBy = ETC.keyToKeyProximity(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            ).up + (octave * ETC.OctaveSize);
        } else if( this.Options.NoKeySignatures ) {
            keyInstruction.Key = 0;
            keyInstruction.isTransposedBy = 0;
        } else {
            keyInstruction.Key = keyInstruction.keyTypeOriginal;
            keyInstruction.isTransposedBy = transpose;
        }
        keyInstruction.Mode = 0;
    }

}
