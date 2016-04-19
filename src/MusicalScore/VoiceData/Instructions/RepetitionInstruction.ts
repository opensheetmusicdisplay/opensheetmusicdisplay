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

export class RepetitionInstructionComparer implements IComparer<RepetitionInstruction> {
  public Compare(x: RepetitionInstruction, y: RepetitionInstruction): number {
    if (x.ParentRepetition !== undefined && y.ParentRepetition !== undefined) {
      if (x.Alignment === AlignmentType.End && y.Alignment === AlignmentType.End) {
        if (x.ParentRepetition.StartIndex < y.ParentRepetition.StartIndex) { return 1; }
        if (x.ParentRepetition.StartIndex > y.ParentRepetition.StartIndex) { return -1; }
      }
      if (x.Alignment === AlignmentType.Begin && y.Alignment === AlignmentType.Begin) {
        if (x.ParentRepetition.EndIndex < y.ParentRepetition.EndIndex) { return 1; }
        if (x.ParentRepetition.EndIndex > y.ParentRepetition.EndIndex) { return -1; }
      }
    }
    return 0;
  }
}
export class RepetitionInstruction implements IComparable {
  constructor(measureIndex: number, type: RepetitionInstructionEnum) {
    this(measureIndex, new List<number>(), type, AlignmentType.End, undefined);
    if (type === RepetitionInstructionEnum.StartLine || type === RepetitionInstructionEnum.Segno || type === RepetitionInstructionEnum.Coda) {
      this.Alignment = AlignmentType.Begin;
    }
  }
  constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
    this(measureIndex, new List<number>(), type, alignment, parentRepetition);

  }
  constructor(measureIndex: number, endingIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
    this(measureIndex, __init(new List<number>(), { endingIndex }), type, alignment, parentRepetition);

  }
  constructor(measureIndex: number, endingIndices: List<number>, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
    this.MeasureIndex = measureIndex;
    this.EndingIndices = new List<number>();
    for (let idx: number = 0, len: number = endingIndices.Count; idx < len; ++idx) {
      let endingIndex: number = endingIndices[idx];
      this.EndingIndices.Add(endingIndex);
    }
    this.Type = type;
    this.Alignment = alignment;
    this.ParentRepetition = parentRepetition;
  }
  public MeasureIndex: number;
  public EndingIndices: List<number>;
  public Type: RepetitionInstructionEnum;
  public Alignment: AlignmentType;
  public ParentRepetition: Repetition;
  public CompareTo(obj: Object): number {
    let other: RepetitionInstruction = <RepetitionInstruction>obj;
    if (this.MeasureIndex > other.MeasureIndex) {
      return 1;
    } else if (this.MeasureIndex < other.MeasureIndex) {
      return -1;
    }
    if (this.Alignment === AlignmentType.Begin) {
      if (other.Alignment === AlignmentType.End) { return -1; }
      switch (this.Type) {
        case RepetitionInstructionEnum.Ending:
          return 1;
        case RepetitionInstructionEnum.StartLine:
          if (other.Type === RepetitionInstructionEnum.Ending) {
            return -1;
          }
          return 1;
        case RepetitionInstructionEnum.Coda:
        case RepetitionInstructionEnum.Segno:
          if (other.Type === RepetitionInstructionEnum.Coda) {
            return 1;
          }
          return -1;
        default:
      }
    } else {
      if (other.Alignment === AlignmentType.Begin) { return 1; }
      switch (this.Type) {
        case RepetitionInstructionEnum.Ending:
          return -1;
        case RepetitionInstructionEnum.Fine:
        case RepetitionInstructionEnum.ToCoda:
          if (other.Type === RepetitionInstructionEnum.Ending) { return 1; }
          return -1;
        case RepetitionInstructionEnum.ForwardJump:
          switch (other.Type) {
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
  public isIdenticalTo(other: RepetitionInstruction): boolean {
    if (
      this.MeasureIndex !== other.MeasureIndex
      || this.Type !== other.Type
      || this.Alignment !== other.Alignment
      || this.EndingIndices.Count !== other.EndingIndices.Count
    ) { return false; }
    for (let i: number = 0; i < this.EndingIndices.Count; i++) {
      if (this.EndingIndices[i] !== other.EndingIndices[i]) { return false; }
    }
    return true;
  }
}
