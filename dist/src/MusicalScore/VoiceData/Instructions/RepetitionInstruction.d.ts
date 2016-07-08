import { Repetition } from "../../MusicSource/Repetition";
export declare class RepetitionInstructionComparer {
    static Compare(x: RepetitionInstruction, y: RepetitionInstruction): number;
}
export declare class RepetitionInstruction {
    constructor(measureIndex: number, endingIndices: number[], type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition);
    measureIndex: number;
    endingIndices: number[];
    type: RepetitionInstructionEnum;
    alignment: AlignmentType;
    parentRepetition: Repetition;
    CompareTo(obj: Object): number;
    equals(other: RepetitionInstruction): boolean;
}
export declare enum RepetitionInstructionEnum {
    StartLine = 0,
    ForwardJump = 1,
    BackJumpLine = 2,
    Ending = 3,
    DaCapo = 4,
    DalSegno = 5,
    Fine = 6,
    ToCoda = 7,
    DalSegnoAlFine = 8,
    DaCapoAlFine = 9,
    DalSegnoAlCoda = 10,
    DaCapoAlCoda = 11,
    Coda = 12,
    Segno = 13,
    None = 14,
}
export declare enum AlignmentType {
    Begin = 0,
    End = 1,
}
