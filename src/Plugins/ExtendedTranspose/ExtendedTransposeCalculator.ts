import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay";
import { ETC, ETCPitch} from "./ETC";
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
            alterations: Pitch.HalfTonesFromAccidental(pitch.Accidental),
            octave: pitch.Octave
        });
        return comma;
    }

    private pitchToDegree(pitch: Pitch, majorKey: number): number {
        const degree: number = ETC.pitchToDegree({
            fundamentalNote: Number(pitch.FundamentalNote),
            alterations: Pitch.HalfTonesFromAccidental(pitch.Accidental),
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
        halftones = Math.floor(halftones);
        if(!this.Options.TransposeByDiatonic) {
            if (this.Options.TransposeKeySignatures) {
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
        transpose = Math.floor(transpose);
        if (this.Options.TransposeByKey) {
            const octave: number = ETC.keyOctave(transpose);
            const transposeToKey: number = ETC.keyToMajorKey(transpose - (octave * ETC.OctaveSize));
            keyInstruction.Key = ETC.keyToMajorKey(transposeToKey - this.MainKey + keyInstruction.keyTypeOriginal);
            // At this point, we need to ensure that the closest direction chosen is always the same
            // as the existing one between the MainKey and the target transpose key.
            // I wonder if it would be appropriate to perform this operation only once and
            // perhaps place it in TransposeOptions.
            const closest: string = ETC.directionsOfKeyRelation(
                this.MainKey,
                transposeToKey
            ).closestIs;

            keyInstruction.isTransposedBy = ETC.directionsOfKeyRelation(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            )[closest] + (octave * ETC.OctaveSize);
            if (!this.Options.TransposeKeySignatures) {
                keyInstruction.Key = keyInstruction.keyTypeOriginal;
            }
        } else if (this.Options.TransposeKeySignatures && ( this.Options.TransposeByInterval || this.Options.TransposeByHalftone)) {
            const octave: number = Math.floor(transpose / 12);
            const semitone: number = ((transpose % 12) + 12 ) % 12;
            keyInstruction.Key = ETC.keyToMajorKey(keyInstruction.keyTypeOriginal + (semitone * -5));
            keyInstruction.isTransposedBy = ETC.directionsOfKeyRelation(
                keyInstruction.keyTypeOriginal,
                keyInstruction.Key
            ).up + (octave * ETC.OctaveSize);
        } else {
            keyInstruction.Key = keyInstruction.keyTypeOriginal;
            keyInstruction.isTransposedBy = transpose;
        }
    }
}
