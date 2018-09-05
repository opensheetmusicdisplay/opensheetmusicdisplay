// The value of the enum indicates the number of halftoneSteps from one note to the next
export enum NoteEnum {
    C = 0,
    D = 2,
    E = 4,
    F = 5,
    G = 7,
    A = 9,
    B = 11
}

/** Describes Accidental types.
 * Do not use the number values of these enum members directly for calculation anymore.
 * To use these for pitch calculation, use pitch.AccidentalHalfTones()
 *  or Pitch.HalfTonesFromAccidental(accidentalEnum).
 */
export enum AccidentalEnum {
    SHARP,
    FLAT,
    NONE,
    NATURAL,
    DOUBLESHARP,
    DOUBLEFLAT,
    TRIPLESHARP,
    TRIPLEFLAT,
    QUARTERTONESHARP,
    QUARTERTONEFLAT,
}

// This class represents a musical note. The middle A (440 Hz) lies in the octave with the value 1.
export class Pitch {
    public static pitchEnumValues: NoteEnum[] = [
        NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B,
    ];

    private static halftoneFactor: number = 12 / (Math.LN2 / Math.LN10);
    private static octXmlDiff: number = 3;

    // private _sourceOctave: number;
    // private _sourceFundamentalNote: NoteEnum;
    // private _sourceAccidental: AccidentalEnum = AccidentalEnum.NONE;
    private octave: number;
    private fundamentalNote: NoteEnum;
    private accidental: AccidentalEnum = AccidentalEnum.NONE;
    private frequency: number;
    private halfTone: number;

    public static getNoteEnumString(note: NoteEnum): string {
        switch (note) {
            case NoteEnum.C:
                return "C";
            case NoteEnum.D:
                return "D";
            case NoteEnum.E:
                return "E";
            case NoteEnum.F:
                return "F";
            case NoteEnum.G:
                return "G";
            case NoteEnum.A:
                return "A";
            case NoteEnum.B:
                return "B";
            default:
                return "";
        }
    }

    /**
     * @param the input pitch
     * @param the number of halftones to transpose with
     * @returns ret[0] = the transposed fundamental.
     *          ret[1] = the octave shift (not the new octave!)
     * @constructor
     */
    public static CalculateTransposedHalfTone(pitch: Pitch, transpose: number): { value: number; overflow: number; } {
        const newHalfTone: number = <number>pitch.fundamentalNote + pitch.AccidentalHalfTones + transpose;
        return Pitch.WrapAroundCheck(newHalfTone, 12);
    }

    public static WrapAroundCheck(value: number, limit: number): { value: number; overflow: number; } {
        let overflow: number = 0;

        while (value < 0) {
            value += limit;
            overflow--; // the octave change
        }
        while (value >= limit) {
            value -= limit;
            overflow++; // the octave change
        }
        return {overflow: overflow, value: value};
    }

    //public static calcFrequency(pitch: Pitch): number;

    //public static calcFrequency(fractionalKey: number): number;

    public static calcFrequency(obj: Pitch|number): number {
        let octaveSteps: number = 0;
        let halfToneSteps: number;
        if (obj instanceof Pitch) {
            // obj is a pitch
            const pitch: Pitch = obj;
            octaveSteps = pitch.octave - 1;
            halfToneSteps = <number>pitch.fundamentalNote - <number>NoteEnum.A + pitch.AccidentalHalfTones;
        } else if (typeof obj === "number") {
            // obj is a fractional key
            const fractionalKey: number = obj;
            halfToneSteps = fractionalKey - 57.0;
        }
        // Return frequency:
        return 440.0 * Math.pow(2, octaveSteps) * Math.pow(2, halfToneSteps / 12.0);
    }

    public static calcFractionalKey(frequency: number): number {
        // Return half-tone frequency:
        return Math.log(frequency / 440.0) / Math.LN10 * Pitch.halftoneFactor + 57.0;
    }

    public static fromFrequency(frequency: number): Pitch {
        const key: number = Pitch.calcFractionalKey(frequency) + 0.5;
        const octave: number = Math.floor(key / 12) - Pitch.octXmlDiff;
        const halftone: number = Math.floor(key) % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        let accidental: AccidentalEnum = AccidentalEnum.NONE;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = <NoteEnum>(halftone - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, octave, accidental);
    }

    public static fromHalftone(halftone: number): Pitch {
        const octave: number = Math.floor(halftone / 12) - Pitch.octXmlDiff;
        const halftoneInOctave: number = halftone % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftoneInOctave;
        let accidental: AccidentalEnum = AccidentalEnum.NONE;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = <NoteEnum>(halftoneInOctave - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, octave, accidental);
    }

    public static ceiling(halftone: number): NoteEnum {
        halftone = (halftone) % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = <NoteEnum>(halftone + 1);
        }
        return fundamentalNote;
    }

    public static floor(halftone: number): NoteEnum {
        halftone = halftone % 12;
        let fundamentalNote: NoteEnum = <NoteEnum>halftone;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = <NoteEnum>(halftone - 1);
        }
        return fundamentalNote;
    }

    constructor(fundamentalNote: NoteEnum, octave: number, accidental: AccidentalEnum) {
        this.fundamentalNote = fundamentalNote;
        this.octave = octave;
        this.accidental = accidental;
        this.halfTone = <number>(fundamentalNote) + (octave + Pitch.octXmlDiff) * 12 +
            Pitch.HalfTonesFromAccidental(accidental);
        this.frequency = Pitch.calcFrequency(this);
    }

    /** Turns an AccidentalEnum into half tone steps for pitch calculation.
     *
     */
    public static HalfTonesFromAccidental(accidental: AccidentalEnum): number {
        // about equal performance to hashmap/dictionary. could be turned into hashmap for convenience
        // switch is very slightly faster, but both are negligibly short anyways.
        switch (accidental) {
            // ordered from most to least common to improve average runtime
            case AccidentalEnum.NONE:
                return 0;
            case AccidentalEnum.SHARP:
                return 1;
            case AccidentalEnum.FLAT:
                return -1;
            case AccidentalEnum.NATURAL:
                return 0;
            case AccidentalEnum.DOUBLESHARP:
                return 2;
            case AccidentalEnum.DOUBLEFLAT:
                return -2;
            case AccidentalEnum.QUARTERTONESHARP:
                return 0.5;
            case AccidentalEnum.QUARTERTONEFLAT:
                return -0.5;
            case AccidentalEnum.TRIPLESHARP: // very rare, in some classical pieces
                return 3;
            case AccidentalEnum.TRIPLEFLAT:
                return -3;
            default:
                throw new Error("Unhandled AccidentalEnum value");
                // return 0;
        }
    }

    public static AccidentalFromHalfTones(halfTones: number): AccidentalEnum {
        switch (halfTones) {
            case 0:
                // for enharmonic change, we won't get a Natural accidental. Maybe there are edge cases though?
                return AccidentalEnum.NONE;
            case 1:
                return AccidentalEnum.SHARP;
            case -1:
                return AccidentalEnum.FLAT;
            case 2:
                return AccidentalEnum.DOUBLESHARP;
            case -2:
                return AccidentalEnum.DOUBLEFLAT;
            case 0.5:
                return AccidentalEnum.QUARTERTONESHARP;
            case -0.5:
                return AccidentalEnum.QUARTERTONEFLAT;
            case 3:
                return AccidentalEnum.TRIPLESHARP;
            case -3:
                return AccidentalEnum.TRIPLEFLAT;
            default:
                if (halfTones > 0 && halfTones < 1) {
                    return AccidentalEnum.QUARTERTONESHARP;
                } else if (halfTones < 0 && halfTones > -1) {
                    return AccidentalEnum.QUARTERTONEFLAT;
                }
                // potentially unhandled or broken accidental halfTone value
                return AccidentalEnum.QUARTERTONESHARP; // to signal unhandled value
        }
    }

    public get AccidentalHalfTones(): number {
        return Pitch.HalfTonesFromAccidental(this.accidental);
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

    // This method returns a new Pitch transposed by the given factor
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
                this.accidental = Pitch.AccidentalFromHalfTones(this.halfTone - (<number>(this.fundamentalNote) +
                (this.octave + Pitch.octXmlDiff) * 12));
                break;
            case AccidentalEnum.SHARP:
            case AccidentalEnum.DOUBLESHARP:
                this.fundamentalNote = this.getNextFundamentalNote(this.fundamentalNote);
                this.accidental = Pitch.AccidentalFromHalfTones(this.halfTone - (<number>(this.fundamentalNote) +
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
        const p1: Pitch = this;
        // if (ReferenceEquals(p1, p2)) {
        //     return true;
        // }
        if ((<Object>p1 === undefined) || (<Object>p2 === undefined)) {
            return false;
        }
        return (p1.FundamentalNote === p2.FundamentalNote && p1.Octave === p2.Octave && p1.Accidental === p2.Accidental);
    }

    public OperatorNotEqual(p2: Pitch): boolean {
        const p1: Pitch = this;
        return !(p1 === p2);
    }

    // This method returns a new Pitch factor-Halftones higher than the current Pitch
    private getHigherPitchByTransposeFactor(factor: number): Pitch {
        const noteEnumIndex: number = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
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
        const noteEnumIndex: number = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
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
        let i: number = Pitch.pitchEnumValues.indexOf(fundamental);
        i = (i + 1) % Pitch.pitchEnumValues.length;
        return Pitch.pitchEnumValues[i];
    }

    private getPreviousFundamentalNote(fundamental: NoteEnum): NoteEnum {
        const i: number = Pitch.pitchEnumValues.indexOf(fundamental);
        if (i > 0) {
            return Pitch.pitchEnumValues[i - 1];
        } else {
            return Pitch.pitchEnumValues[Pitch.pitchEnumValues.length - 1];
        }
    }
}
