import {PSMath} from "../..//Util/psMath";
import {CollectionUtil} from "../../Util/collectionUtil";

export enum NoteEnum {
    C = 0,
    D = 2,
    E = 4,
    F = 5,
    G = 7,
    A = 9,
    B = 11
}

export enum AccidentalEnum {
    DOUBLEFLAT = -2,
    FLAT = -1,
    NONE = 0,
    SHARP = 1,
    DOUBLESHARP = 2
}

export class Pitch {

    constructor(fundamentalNote: NoteEnum, octave: number, accidental: AccidentalEnum) {
        this.fundamentalNote = fundamentalNote;
        this.octave = octave;
        this.accidental = accidental;
        this.halfTone = <number>(fundamentalNote) + (octave + Pitch.octXmlDiff) * 12 + <number>accidental;
        this.frequency = Pitch.calcFrequency(this);
    }

    public static pitchEnumValues: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];

    private static halftoneFactor: number = 12 / PSMath.log10(2);
    private static octXmlDiff: number = 3;  // Pitch.octXmlDiff

    // private _sourceOctave: number;
    // private _sourceFundamentalNote: NoteEnum;
    // private _sourceAccidental: AccidentalEnum = AccidentalEnum.NONE;
    private octave: number;
    private fundamentalNote: NoteEnum;
    private accidental: AccidentalEnum = AccidentalEnum.NONE;
    private frequency: number;
    private halfTone: number;

    /**
     * @param the input pitch
     * @param the number of halftones to transpose with
     * @returns ret[0] = the transposed fundamental.
     *          ret[1] = the octave shift (not the new octave!)
     * @constructor
     */
    public static CalculateTransposedHalfTone(pitch: Pitch, transpose: number): number[] {
        let newHalfTone: number = <number>pitch.fundamentalNote + <number>pitch.accidental + transpose;
        return Pitch.WrapAroundCheck(newHalfTone, 12);
    }

    public static WrapAroundCheck(value: number, limit: number): number[] {
        let overflow: number = 0;

        while (value < 0) {
            value += limit;
            overflow--; // the octave change
        }
        while (value >= limit) {
            value -= limit;
            overflow++; // the octave change
        }
        return [value, overflow];
    }

    public static calcFrequency(pitch: Pitch): number;

    public static calcFrequency(fractionalKey: number): number;

    public static calcFrequency(pitch: any): number {
        if (pitch instanceof Pitch) {
            let octaveSteps: number = pitch.octave - 1;
            let halftoneSteps: number = <number>pitch.fundamentalNote - <number>NoteEnum.A + <number>pitch.accidental;
            let frequency: number = <number>(440.0 * Math.pow(2, octaveSteps) * Math.pow(2, halftoneSteps / 12.0));
            return frequency;
        } else if (typeof pitch === "number") {
            let fractionalKey: number = pitch;
            let frequency: number = <number>(440.0 * Math.pow(2, (fractionalKey - 57.0) / 12));
            return frequency;
        }
    }

    public static calcFractionalKey(frequency: number): number {
        let halftoneFrequency: number = <number>((PSMath.log10(frequency / 440.0) * Pitch.halftoneFactor) + 57.0);
        return halftoneFrequency;
    }

    public static getPitchFromFrequency(frequency: number): Pitch {
        let key: number = Pitch.calcFractionalKey(frequency) + 0.5;
        let octave: number = <number>Math.floor(key / 12) - Pitch.octXmlDiff;
        let halftone: number = Math.floor(<number>(key)) % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        let accidental: AccidentalEnum = AccidentalEnum.NONE;
        if (!CollectionUtil.contains(this.pitchEnumValues, fundamentalNote)) {
            fundamentalNote = <NoteEnum>(halftone - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, <number>octave, accidental);
    }

    public static getPitchFromHalftone(halftone: number): Pitch {
        let octave: number = <number>Math.floor(<number>halftone / 12) - Pitch.octXmlDiff;
        let halftoneInOctave: number = halftone % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftoneInOctave;
        let accidental: AccidentalEnum = AccidentalEnum.NONE;
        if (!CollectionUtil.contains(this.pitchEnumValues, fundamentalNote)) {
            fundamentalNote = <NoteEnum>(halftoneInOctave - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, <number>octave, accidental);
    }

    public static ceiling(halftone: number): NoteEnum {
        halftone = <number>(halftone) % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        if (!CollectionUtil.contains(this.pitchEnumValues, fundamentalNote)) {
            fundamentalNote = <NoteEnum>(halftone + 1);
        }
        return fundamentalNote;
    }

    public static floor(halftone: number): NoteEnum {
        halftone = <number>(halftone) % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        if (!CollectionUtil.contains(this.pitchEnumValues, fundamentalNote)) {
            fundamentalNote = <NoteEnum>(halftone - 1);
        }
        return fundamentalNote;
    }

    public get Octave(): number {
        return this.octave;
    }

    public get FundamentalNote(): NoteEnum {
        return this.fundamentalNote;
    }

    public get Accidental(): AccidentalEnum {
        return this.accidental;
    }

    public get Frequency(): number {
        return this.frequency;
    }

    public static get OctaveXmlDifference(): number {
        return Pitch.octXmlDiff;
    }

    public getHalfTone(): number {
        return this.halfTone;
    }

    public getTransposedPitch(factor: number): Pitch {
        if (factor > 12) {
            throw new Error("rewrite this method to handle bigger octave changes or don't use is with bigger octave changes!");
        }
        if (factor > 0) {
            return this.getHigherPitchByTransposeFactor(factor);
        }
        if (factor < 0) {
            return this.getLowerPitchByTransposeFactor(-factor);
        }
        return this;
    }

    public DoEnharmonicChange(): void {
        switch (this.accidental) {
            case AccidentalEnum.FLAT:
            case AccidentalEnum.DOUBLEFLAT:
                this.fundamentalNote = this.getPreviousFundamentalNote(this.fundamentalNote);
                this.accidental = <AccidentalEnum>(this.halfTone - (<number>(this.fundamentalNote) +
                (this.octave + Pitch.octXmlDiff) * 12));
                break;
            case AccidentalEnum.SHARP:
            case AccidentalEnum.DOUBLESHARP:
                this.fundamentalNote = this.getNextFundamentalNote(this.fundamentalNote);
                this.accidental = <AccidentalEnum>(this.halfTone - (<number>(this.fundamentalNote) +
                (this.octave + Pitch.octXmlDiff) * 12));
                break;
            default:
                return;
        }
    }

    public ToString(): string {
        return "Note: " + this.fundamentalNote + ", octave: " + this.octave.toString() + ", alter: " +
            this.accidental;
    }

    public OperatorEquals(p2: Pitch): boolean {
        let p1: Pitch = this;
        // if (ReferenceEquals(p1, p2)) {
        //     return true;
        // }
        if ((<Object>p1 === undefined) || (<Object>p2 === undefined)) {
            return false;
        }
        return (p1.FundamentalNote === p2.FundamentalNote && p1.Octave === p2.Octave && p1.Accidental === p2.Accidental);
    }

    public OperatorNotEqual(p2: Pitch): boolean {
        let p1: Pitch = this;
        return !(p1 === p2);
    }

    private getHigherPitchByTransposeFactor(factor: number): Pitch {
        let noteEnumIndex: number = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
        let newOctave: number = this.octave;
        let newNoteEnum: NoteEnum;
        if (noteEnumIndex + factor > Pitch.pitchEnumValues.length - 1) {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex + factor - Pitch.pitchEnumValues.length];
            newOctave++;
        } else {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex + factor];
        }
        return new Pitch(newNoteEnum, newOctave, AccidentalEnum.NONE);
    }

    private getLowerPitchByTransposeFactor(factor: number): Pitch {
        let noteEnumIndex: number = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
        let newOctave: number = this.octave;
        let newNoteEnum: NoteEnum;
        if (noteEnumIndex - factor < 0) {
            newNoteEnum = Pitch.pitchEnumValues[Pitch.pitchEnumValues.length + noteEnumIndex - factor];
            newOctave--;
        } else {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex - factor];
        }
        return new Pitch(newNoteEnum, newOctave, AccidentalEnum.NONE);
    }

    private getNextFundamentalNote(fundamental: NoteEnum): NoteEnum {
        let i: number = 0;
        for (; i < Pitch.pitchEnumValues.length; i++) {
            let note: NoteEnum = Pitch.pitchEnumValues[i];
            if (note === fundamental) {
                break;
            }
        }
        i = ++i % Pitch.pitchEnumValues.length;
        return Pitch.pitchEnumValues[i];
    }

    private getPreviousFundamentalNote(fundamental: NoteEnum): NoteEnum {
        let i: number = 0;
        for (; i < Pitch.pitchEnumValues.length; i++) {
            let note: NoteEnum = Pitch.pitchEnumValues[i];
            if (note === fundamental) {
                break;
            }
        }
        i--;
        if (i < 0) {
            i += Pitch.pitchEnumValues.length;
        }
        return Pitch.pitchEnumValues[i];
    }
}

