import { ETC, ETCDirections, ETCPitch } from "./ETC";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay";

/*
KEY RELATION TABLE

I know many of you will do this calculation in your head,
but then I forget the reasoning behind it and get confused
every time. I prefer to keep a table at hand...

MainKey   |  Cb  Gb  Db  Ab  Eb  Bb  F   C   G   D   A   E   B   F#  C#
Transpose | -7  -6  -5  -4  -3  -2  -1   0   1   2   3   4   5   6   7
----------+------------------------------------------------------------
Cb   -7   |  0  -1  -2  -3  -4  -5  -6  -7   7   6   5   4   3   2   1
Gb   -6   |  1   0  -1  -2  -3  -4  -5  -6  -7   7   6   5   4   3   2
Db   -5   |  2   1   0  -1  -2  -3  -4  -5  -6  -7   7   6   5   4   3
Ab   -4   |  3   2   1   0  -1  -2  -3  -4  -5  -6  -7   7   6   5   4
Eb   -3   |  4   3   2   1   0  -1  -2  -3  -4  -5  -6  -7   7   6   5
Bb   -2   |  5   4   3   2   1   0  -1  -2  -3  -4  -5  -6  -7   7   6
F    -1   |  6   5   4   3   2   1   0  -1  -2  -3  -4  -5  -6  -7   7
C     0   |  7   6   5   4   3   2   1   0  -1  -2  -3  -4  -5  -6  -7
G     1   | -7   7   6   5   4   3   2   1   0  -1  -2  -3  -4  -5  -6
D     2   | -6  -7   7   6   5   4   3   2   1   0  -1  -2  -3  -4  -5
A     3   | -5  -6  -7   7   6   5   4   3   2   1   0  -1  -2  -3  -4
E     4   | -4  -5  -6  -7   7   6   5   4   3   2   1   0  -1  -2  -3
B     5   | -3  -4  -5  -6  -7   7   6   5   4   3   2   1   0  -1  -2
F#    6   | -2  -3  -4  -5  -6  -7   7   6   5   4   3   2   1   0  -1
C#    7   | -1  -2  -3  -4  -5  -6  -7   7   6   5   4   3   2   1   0

*/


export class TransposeOptions {
    // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
    // If we remove the condition "transposeHalftones !== 0" from the function
    // "createGraphicalMeasure" in the file MusicSheetCalculator.ts, this workaround is not needed.
    /*
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
    */
    private static transposeByHalftone: number = 0;
    private static transposeByDiatonic: number = 1;
    private static transposeByInterval: number = 2;
    private static transposeByKey: number = 3;
    private static transposeByKeyRelation: number = 4;
    public static keySignaturesIsTransposed: number = 0;
    public static keySignaturesIsFixed: number = 1;
    public static keySignaturesIsRemoved: number = 2;

    private transposeType: number = TransposeOptions.transposeByHalftone;

    private keySignatures: number = TransposeOptions.keySignaturesIsTransposed;

    private osmd: OpenSheetMusicDisplay = undefined;

    private transposeDirection: ETCDirections = "up";

    private transposeOctave: number = 0;

    private set Transpose(value: number){
        // A "dirty workaround" to bypass OSMD's inaction when Sheet.Transpose === 0.
        // If we remove the condition "transposeHalftones !== 0" from the function
        // "createGraphicalMeasure" in the file MusicSheetCalculator.ts, this workaround is not needed.
        /*
         this.osmd.Sheet.Transpose = TransposeOptions.precision + value;
        */
        this.osmd.Sheet.Transpose = value;
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

    public get TransposeType(): number {
        return this.transposeType;
    }

    public get KeySignatures(): number {
        return this.keySignatures;
    }

    public get KeySignaturesIsTransposed(): boolean {
        return this.keySignatures === TransposeOptions.keySignaturesIsTransposed;
    }

    public set KeySignaturesIsTransposed(value: boolean) {
        if (Boolean(value)) {
            this.keySignatures = TransposeOptions.keySignaturesIsTransposed;
        }
    }

    public get KeySignaturesIsFixed(): boolean {
        return this.keySignatures === TransposeOptions.keySignaturesIsFixed;
    }

    public set KeySignaturesIsFixed(value: boolean) {
        if (Boolean(value)) {
            this.keySignatures = TransposeOptions.keySignaturesIsFixed;
        }
    }

    public get KeySignaturesIsRemoved(): boolean {
        return this.keySignatures === TransposeOptions.keySignaturesIsRemoved;
    }

    public set KeySignaturesIsRemoved(value: boolean) {
        if (Boolean(value)) {
            this.keySignatures = TransposeOptions.keySignaturesIsRemoved;
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

    public get TransposeByKeyRelation(): boolean {
        return this.osmd && this.transposeType ===  TransposeOptions.transposeByKeyRelation;
    }

    public set TransposeByKeyRelation(value: boolean) {
        console.log("-.------------------------------");
        console.log(this.transposeType);
        this.transposeType = Boolean(value) ? TransposeOptions.transposeByKeyRelation : TransposeOptions.transposeByHalftone;
        console.log(this.transposeType, this.TransposeByKeyRelation);
    }

    public get TransposeOctave(): number {
        return this.transposeOctave;
    }

    public set TransposeOctave(value: number) {
        this.transposeOctave = Number(value);
    }

    public get TransposeDirection(): ETCDirections {
        return this.transposeDirection;
    }

    public set TransposeDirection(value: ETCDirections) {
        this.transposeDirection = value;
    }

    public transposeToHalftone(
        value: number,
        keySignatures: number = TransposeOptions.keySignaturesIsTransposed
    ): void {
        this.keySignatures = keySignatures;
        value = Number(value);
        this.TransposeByHalftone = true;
        this.Transpose = value;
    }

    public transposeToKey(
        toKey: number,
        octave: number = 0,
        keySignatures: number = TransposeOptions.keySignaturesIsTransposed
    ): void {
        this.keySignatures = keySignatures;
        toKey = Number(toKey);
        octave = Number(octave);
        this.TransposeByKey = true;
        this.TransposeOctave = octave;
        // At this point, we need to ensure that the closest direction chosen is always the same
        // as the existing one between the MainKey and the target transpose key.
        this.TransposeDirection = ETC.keyToKeyProximity(
            this.MainKey,
            toKey,
            true // swapTritoneSense!
        ).closestIs;
        this.Transpose = toKey;
    }

    public transposeToKeyRelation(
        toKey: number,
        octave: number = 0,
        keySignatures: number = TransposeOptions.keySignaturesIsTransposed
    ): void {
        this.keySignatures = keySignatures;
        this.TransposeByKeyRelation = true;
        toKey = Number(toKey);
        octave = Number(octave);
        this.TransposeOctave = octave;
        // At this point, we need to ensure that the closest direction chosen is always the same
        // as the existing one between the MainKey and the target transpose key.
        this.TransposeDirection = ETC.keyToKeyProximity(
            this.MainKey,
            toKey,
            true // swapTritoneSense!
        ).closestIs;
        const keyRelation: number = ETC. computeKeyRelation(this.MainKey, toKey);
        this.Transpose = keyRelation;
    }

    public transposeToInterval(
        value: number,
        keySignatures: number = TransposeOptions.keySignaturesIsTransposed
    ): void {
        this.keySignatures = keySignatures;
        value = Number(value);
        this.TransposeByInterval = true;
        if (this.KeySignaturesIsTransposed) {
            const pitch: ETCPitch = ETC.commaToPitch(value);
            value = (pitch.octave * 12) + pitch.fundamentalNote + pitch.alterations;
            this.Transpose = value;
        } else {
            this.Transpose = value;
        }
    }

    public transposeToDiatonic(value: number): void {
        this.KeySignaturesIsFixed = true;
        value = Number(value);
        this.TransposeByDiatonic = true;
        this.Transpose = Number(value);
    }

    public removeKeySignatures(): void {
        this.KeySignaturesIsRemoved = true;
        this.Transpose = 0;
    }

}
