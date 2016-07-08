export declare enum NoteEnum {
    C = 0,
    D = 2,
    E = 4,
    F = 5,
    G = 7,
    A = 9,
    B = 11,
}
export declare enum AccidentalEnum {
    DOUBLEFLAT = -2,
    FLAT = -1,
    NONE = 0,
    SHARP = 1,
    DOUBLESHARP = 2,
}
export declare class Pitch {
    static pitchEnumValues: NoteEnum[];
    private static halftoneFactor;
    private static octXmlDiff;
    private octave;
    private fundamentalNote;
    private accidental;
    private frequency;
    private halfTone;
    static getNoteEnumString(note: NoteEnum): string;
    /**
     * @param the input pitch
     * @param the number of halftones to transpose with
     * @returns ret[0] = the transposed fundamental.
     *          ret[1] = the octave shift (not the new octave!)
     * @constructor
     */
    static CalculateTransposedHalfTone(pitch: Pitch, transpose: number): {
        value: number;
        overflow: number;
    };
    static WrapAroundCheck(value: number, limit: number): {
        value: number;
        overflow: number;
    };
    static calcFrequency(obj: Pitch | number): number;
    static calcFractionalKey(frequency: number): number;
    static fromFrequency(frequency: number): Pitch;
    static fromHalftone(halftone: number): Pitch;
    static ceiling(halftone: number): NoteEnum;
    static floor(halftone: number): NoteEnum;
    constructor(fundamentalNote: NoteEnum, octave: number, accidental: AccidentalEnum);
    Octave: number;
    FundamentalNote: NoteEnum;
    Accidental: AccidentalEnum;
    Frequency: number;
    static OctaveXmlDifference: number;
    getHalfTone(): number;
    getTransposedPitch(factor: number): Pitch;
    DoEnharmonicChange(): void;
    ToString(): string;
    OperatorEquals(p2: Pitch): boolean;
    OperatorNotEqual(p2: Pitch): boolean;
    private getHigherPitchByTransposeFactor(factor);
    private getLowerPitchByTransposeFactor(factor);
    private getNextFundamentalNote(fundamental);
    private getPreviousFundamentalNote(fundamental);
}
