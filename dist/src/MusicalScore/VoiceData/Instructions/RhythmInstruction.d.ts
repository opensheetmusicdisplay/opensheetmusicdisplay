import { AbstractNotationInstruction } from "./AbstractNotationInstruction";
import { Fraction } from "../../../Common/DataObjects/fraction";
export declare class RhythmInstruction extends AbstractNotationInstruction {
    constructor(rhythm: Fraction, numerator: number, denominator: number, rhythmSymbolEnum: RhythmSymbolEnum);
    private numerator;
    private denominator;
    private rhythm;
    private symbolEnum;
    Rhythm: Fraction;
    SymbolEnum: RhythmSymbolEnum;
    clone(): RhythmInstruction;
    OperatorEquals(rhythm2: RhythmInstruction): boolean;
    OperatorNotEqual(rhythm2: RhythmInstruction): boolean;
    ToString(): string;
}
export declare enum RhythmSymbolEnum {
    NONE = 0,
    COMMON = 1,
    CUT = 2,
}
