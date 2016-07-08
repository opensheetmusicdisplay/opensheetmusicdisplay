"use strict";
var RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/ = (function () {
    function RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/() {
    }
    RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/.Compare = function (x, y) {
        if (x.parentRepetition !== undefined && y.parentRepetition !== undefined) {
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
    };
    return RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/;
}());
exports.RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/ = RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/;
var RepetitionInstruction /*implements IComparable*/ = (function () {
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
    function RepetitionInstruction /*implements IComparable*/(measureIndex, endingIndices, type, alignment, parentRepetition) {
        this.measureIndex = measureIndex;
        this.endingIndices = endingIndices.slice();
        this.type = type;
        this.alignment = alignment;
        this.parentRepetition = parentRepetition;
    }
    RepetitionInstruction /*implements IComparable*/.prototype.CompareTo = function (obj) {
        var other = obj;
        if (this.measureIndex > other.measureIndex) {
            return 1;
        }
        else if (this.measureIndex < other.measureIndex) {
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
        }
        else {
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
    };
    RepetitionInstruction /*implements IComparable*/.prototype.equals = function (other) {
        if (this.measureIndex !== other.measureIndex
            || this.type !== other.type
            || this.alignment !== other.alignment
            || this.endingIndices.length !== other.endingIndices.length) {
            return false;
        }
        for (var i = 0; i < this.endingIndices.length; i++) {
            if (this.endingIndices[i] !== other.endingIndices[i]) {
                return false;
            }
        }
        return true;
    };
    return RepetitionInstruction /*implements IComparable*/;
}());
exports.RepetitionInstruction /*implements IComparable*/ = RepetitionInstruction /*implements IComparable*/;
(function (RepetitionInstructionEnum) {
    RepetitionInstructionEnum[RepetitionInstructionEnum["StartLine"] = 0] = "StartLine";
    RepetitionInstructionEnum[RepetitionInstructionEnum["ForwardJump"] = 1] = "ForwardJump";
    RepetitionInstructionEnum[RepetitionInstructionEnum["BackJumpLine"] = 2] = "BackJumpLine";
    RepetitionInstructionEnum[RepetitionInstructionEnum["Ending"] = 3] = "Ending";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DaCapo"] = 4] = "DaCapo";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DalSegno"] = 5] = "DalSegno";
    RepetitionInstructionEnum[RepetitionInstructionEnum["Fine"] = 6] = "Fine";
    RepetitionInstructionEnum[RepetitionInstructionEnum["ToCoda"] = 7] = "ToCoda";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DalSegnoAlFine"] = 8] = "DalSegnoAlFine";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DaCapoAlFine"] = 9] = "DaCapoAlFine";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DalSegnoAlCoda"] = 10] = "DalSegnoAlCoda";
    RepetitionInstructionEnum[RepetitionInstructionEnum["DaCapoAlCoda"] = 11] = "DaCapoAlCoda";
    RepetitionInstructionEnum[RepetitionInstructionEnum["Coda"] = 12] = "Coda";
    RepetitionInstructionEnum[RepetitionInstructionEnum["Segno"] = 13] = "Segno";
    RepetitionInstructionEnum[RepetitionInstructionEnum["None"] = 14] = "None";
})(exports.RepetitionInstructionEnum || (exports.RepetitionInstructionEnum = {}));
var RepetitionInstructionEnum = exports.RepetitionInstructionEnum;
(function (AlignmentType) {
    AlignmentType[AlignmentType["Begin"] = 0] = "Begin";
    AlignmentType[AlignmentType["End"] = 1] = "End";
})(exports.AlignmentType || (exports.AlignmentType = {}));
var AlignmentType = exports.AlignmentType;
