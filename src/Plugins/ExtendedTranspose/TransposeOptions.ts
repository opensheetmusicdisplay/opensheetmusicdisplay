import { ETC, ETCPitch } from "./ETC";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay";

export class TransposeOptions {
    // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
    private static calculatePrecision(): number {
        let precision: number = 1;
        let value: number = 1;
        while (1 + value !== 1) {
          precision *= 0.1;
          value *= 0.1;
        }
        return precision;
    }
    private static precision: number = this.calculatePrecision();

    private static transposeByHalftone: number = 0;
    private static transposeByDiatonic: number = 1;
    private static transposeByInterval: number = 2;
    private static transposeByKey: number = 3;
    private transposeType: number = TransposeOptions.transposeByHalftone;

    private osmd: OpenSheetMusicDisplay = undefined;

    private transposeKeySignatures: boolean = true;

    private transposeOctave: number = 0;

    private set Transpose(value: number){
        // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
        this.osmd.Sheet.Transpose = TransposeOptions.precision + value;
    }

    constructor(osmd: OpenSheetMusicDisplay = undefined){
        this.osmd = osmd;
    }

    public get OSMD(): OpenSheetMusicDisplay {
        return this.osmd || undefined;
    }

    public set OSMD(osmd: OpenSheetMusicDisplay) {
        this.osmd  = osmd;
    }

    public get MainKey(): number{
        if (this.osmd && this.osmd.GraphicSheet) {
            return this.osmd.GraphicSheet.GetMainKey().keyTypeOriginal || 0;
        } else {
            return 0;
        }
    }

    public get TransposeByHalftone(): boolean {
        return !this.osmd || this.transposeType === TransposeOptions.transposeByHalftone;
    }

    public set TransposeByHalftone(value: boolean) {
        if (Boolean(value)) {
            this.transposeType = TransposeOptions.transposeByHalftone;
        }
    }

    public get TransposeByDiatonic(): boolean {
        return this.transposeType === TransposeOptions.transposeByDiatonic;
    }

    public set TransposeByDiatonic(value: boolean) {
        this.transposeType = Boolean(value) ? TransposeOptions.transposeByDiatonic : TransposeOptions.transposeByHalftone;
    }

    public get TransposeByInterval(): boolean {
        return this.transposeType === TransposeOptions.transposeByInterval;
    }

    public set TransposeByInterval(value: boolean) {
        this.transposeType = Boolean(value) ? TransposeOptions.transposeByInterval : TransposeOptions.transposeByHalftone;
    }

    public get TransposeByKey(): boolean {
        return this.osmd && this.transposeType ===  TransposeOptions.transposeByKey;
    }

    public set TransposeByKey(value: boolean) {
        this.transposeType = Boolean(value) ? TransposeOptions.transposeByKey : TransposeOptions.transposeByHalftone;
    }

    public get TransposeKeySignatures(): boolean {
        return this.transposeKeySignatures;
    }

    public set TransposeKeySignatures(value: boolean) {
        this.transposeKeySignatures = Boolean(value);
    }

    public get TransposeOctave(): number {
        return this.transposeOctave;
    }

    public set TransposeOctave(value: number) {
        this.transposeOctave = Number(value);
    }

    public transposeToHalftone(value: number): void {
        this.TransposeByHalftone = true;
        this.Transpose = value;
    }

    public transposeToKey(value: number, octave: number = 0): void {
        this.TransposeByKey = true;
        value = value + (octave * ETC.OctaveSize);
        this.Transpose = value;
    }

    public transposeToKeyRelation(value: number, octave: number = 0): void {
        this.TransposeByKey = true;
        const keyRelation: number = value - this.MainKey;
        value = keyRelation + (octave * ETC.OctaveSize);
        this.Transpose = value;
    }

    public transposeToInterval(value: number): void {
        value = Number(value);
        this.TransposeByInterval = true;
        if (this.TransposeKeySignatures) {
            const pitch: ETCPitch = ETC.commaToPitch(value);
            value = (pitch.octave * 12) + pitch.fundamentalNote + pitch.alterations;
            this.Transpose = value;
        } else {
            this.Transpose = value;
        }
    }

    public transposeToDiatonic(value: number): void {
        this.TransposeByDiatonic = true;
        this.Transpose = Number(value);
    }
}
