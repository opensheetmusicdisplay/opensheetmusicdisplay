import {Repetition} from "../../MusicSource/Repetition";

export class RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/ {
    public static Compare(x: RepetitionInstruction, y: RepetitionInstruction): number {
        if (x.parentRepetition !== undefined && y.parentRepetition) {
            if (x.alignment === AlignmentType.End && y.alignment === AlignmentType.End) {
                if (x.parentRepetition.StartIndex < y.parentRepetition.StartIndex) {
                    return 1;
                }
                if (x.parentRepetition.StartIndex > y.parentRepetition.StartIndex) {
                    return -1;
                }
            }
            if (x.alignment === AlignmentType.Begin && y.alignment === AlignmentType.Begin) {
                if (x.parentRepetition.EndIndex < y.parentRepetition.EndIndex) {
                    return 1;
                }
                if (x.parentRepetition.EndIndex > y.parentRepetition.EndIndex) {
                    return -1;
                }
            }
        }
        return 0;
    }
}

export class RepetitionInstruction /*implements IComparable*/ {
    /* FIXME: Check constructor calling from other classes
     constructor(measureIndex: number, type: RepetitionInstructionEnum) {
     this(measureIndex, [], type, AlignmentType.End, undefined);
     if (type === RepetitionInstructionEnum.StartLine || type === RepetitionInstructionEnum.Segno || type === RepetitionInstructionEnum.Coda) {
     this.alignment = AlignmentType.Begin;
     }
     }
     constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
     this(measureIndex, [], type, alignment, parentRepetition);

     }
     constructor(measureIndex: number, endingIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
     this(measureIndex, [endingIndex], type, alignment, parentRepetition);

     }
     */
    constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType = AlignmentType.End,
                parentRepetition: Repetition = undefined, endingIndices: number[] = undefined) {
        this.measureIndex = measureIndex;
        if (endingIndices) {
            this.endingIndices = endingIndices.slice(); // slice=arrayCopy
        }
        this.type = type;
        this.alignment = alignment;
        this.parentRepetition = parentRepetition;
    }

    public measureIndex: number;
    public endingIndices: number[] = undefined;
    public type: RepetitionInstructionEnum;
    public alignment: AlignmentType;
    public parentRepetition: Repetition;

    public CompareTo(obj: Object): number {
        const other: RepetitionInstruction = <RepetitionInstruction>obj;
        if (this.measureIndex > other.measureIndex) {
            return 1;
        } else if (this.measureIndex < other.measureIndex) {
            return -1;
        }
        if (this.alignment === AlignmentType.Begin) {
            if (other.alignment === AlignmentType.End) {
                return -1;
            }
            switch (this.type) {
                case RepetitionInstructionEnum.Ending:
                    return 1;
                case RepetitionInstructionEnum.StartLine:
                    if (other.type === RepetitionInstructionEnum.Ending) {
                        return -1;
                    }
                    return 1;
                case RepetitionInstructionEnum.Coda:
                case RepetitionInstructionEnum.Segno:
                    if (other.type === RepetitionInstructionEnum.Coda) {
                        return 1;
                    }
                    return -1;
                default:
            }
        } else {
            if (other.alignment === AlignmentType.Begin) {
                return 1;
            }
            switch (this.type) {
                case RepetitionInstructionEnum.Ending:
                    return -1;
                case RepetitionInstructionEnum.Fine:
                case RepetitionInstructionEnum.ToCoda:
                    if (other.type === RepetitionInstructionEnum.Ending) {
                        return 1;
                    }
                    return -1;
                case RepetitionInstructionEnum.ForwardJump:
                    switch (other.type) {
                        case RepetitionInstructionEnum.Ending:
                        case RepetitionInstructionEnum.Fine:
                        case RepetitionInstructionEnum.ToCoda:
                            return 1;
                        default:
                    }
                    return -1;
                case RepetitionInstructionEnum.DalSegnoAlFine:
                case RepetitionInstructionEnum.DaCapoAlFine:
                case RepetitionInstructionEnum.DalSegnoAlCoda:
                case RepetitionInstructionEnum.DaCapoAlCoda:
                case RepetitionInstructionEnum.DaCapo:
                case RepetitionInstructionEnum.DalSegno:
                case RepetitionInstructionEnum.BackJumpLine:
                    return 1;
                default:
            }
        }
        return 0;
    }

    public equals(other: RepetitionInstruction): boolean {
        if (
            this.measureIndex !== other.measureIndex
            || this.type !== other.type
            || this.alignment !== other.alignment
        ) {
            return false;
        }
        if (this.endingIndices === other.endingIndices) {
            return true;
        }
        if (!this.endingIndices || !other.endingIndices ||
            this.endingIndices.length !== other.endingIndices.length) {
            return false;
        }
        for (let i: number = 0; i < this.endingIndices.length; i++) {
            if (this.endingIndices[i] !== other.endingIndices[i]) {
                return false;
            }
        }
        return true;
    }
}

export enum RepetitionInstructionEnum {
    StartLine,
    ForwardJump,
    BackJumpLine,
    Ending,
    DaCapo,
    DalSegno,
    Fine,
    ToCoda,
    DalSegnoAlFine,
    DaCapoAlFine,
    DalSegnoAlCoda,
    DaCapoAlCoda,
    Coda,
    Segno,
    None,
}

export enum AlignmentType {
    Begin,
    End,
}
