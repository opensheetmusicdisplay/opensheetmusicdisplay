export class KeyInstruction extends AbstractNotationInstruction {
  constructor(key: number, mode: KeyEnum) {
    super();
    this.Key = key;
    this.mode = mode;
  }
  constructor(parent: SourceStaffEntry, key: number, mode: KeyEnum) {
    super(parent);
    this.Key = key;
    this.mode = mode;
  }
  constructor(keyInstruction: KeyInstruction) {
    this(keyInstruction.parent, keyInstruction.keyType, keyInstruction.mode);
    this.keyType = keyInstruction.keyType;
    this.mode = keyInstruction.mode;
  }

  private static sharpPositionList: NoteEnum[] = [NoteEnum.F, NoteEnum.C, NoteEnum.G, NoteEnum.D, NoteEnum.A, NoteEnum.E, NoteEnum.B];
  private static flatPositionList: NoteEnum[] = [NoteEnum.B, NoteEnum.E, NoteEnum.A, NoteEnum.D, NoteEnum.G, NoteEnum.C, NoteEnum.F];

  private keyType: number;
  private mode: KeyEnum;

  public static getNoteEnumList(instruction: KeyInstruction): List<NoteEnum> {
    let enums: List<NoteEnum> = new List<NoteEnum>();
    if (instruction.keyType > 0) {
      for (let i: number = 0; i < instruction.keyType; i++) {
        enums.Add(KeyInstruction.sharpPositionList[i]);
      }
    }
    if (instruction.keyType < 0) {
      for (let i: number = 0; i < Math.Abs(instruction.keyType); i++) {
        enums.Add(KeyInstruction.flatPositionList[i]);
      }
    }
    return enums;
  }

  public static getAllPossibleMajorKeyInstructions(): KeyInstruction[] {
    let keyInstructionList: KeyInstruction[] = new Array();
    for (let keyType: number = -7; keyType < 7; keyType++) {
      let currentKeyInstruction: KeyInstruction = new KeyInstruction(keyType, KeyEnum.major);
      keyInstructionList.Add(currentKeyInstruction);
    }
    return keyInstructionList;
  }
  public get Key(): number {
    return this.keyType;
  }
  public set Key(value: number) {
    this.keyType = value;
  }
  public get Mode(): KeyEnum {
    return this.mode;
  }
  public set Mode(value: KeyEnum) {
    this.mode = value;
  }
  public getFundamentalNotesOfAccidentals(): List<NoteEnum> {
    let noteList: List<NoteEnum> = new List<NoteEnum>();
    if (this.keyType > 0) {
      for (let i: number = 0; i < this.keyType; i++) {
        noteList.Add(KeyInstruction.sharpPositionList[i]);
      }
    } else if (this.keyType < 0) {
      for (let i: number = 0; i < -this.keyType; i++) {
        noteList.Add(KeyInstruction.flatPositionList[i]);
      }
    }
    return noteList;
  }
  public getAlterationForPitch(pitch: Pitch): AccidentalEnum {
    if (this.keyType > 0 && Array.IndexOf(KeyInstruction.sharpPositionList, pitch.FundamentalNote) <= this.keyType) {
      return AccidentalEnum.SHARP;
    } else if (this.keyType < 0 && Array.IndexOf(KeyInstruction.flatPositionList, pitch.FundamentalNote) <= Math.Abs(this.keyType)) {
      return AccidentalEnum.FLAT;
    }
    return AccidentalEnum.NONE;
  }
  public ToString(): string {
    return "Key: " + this.keyType.ToString() + this.mode.ToString();
  }
  public OperatorEquals(key2: KeyInstruction): boolean {
    let key1: KeyInstruction = this;
    if (ReferenceEquals(key1, key2)) {
      return true;
    }
    if ((<Object>key1 === undefined) || (<Object>key2 === undefined)) {
      return false;
    }
    return (key1.Key === key2.Key && key1.Mode === key2.Mode);
  }

  public OperatorNotEqual(key2: KeyInstruction): boolean {
    let key1: KeyInstruction = this;
    return !(key1 === key2);
  }

  export class NoteEnumToHalfToneLink {
    constructor(note: NoteEnum, halftone: number) {
      this.note = note;
      this.halfTone = halftone;
    }
    public note: NoteEnum;
    public halfTone: number;
  }

}
export enum KeyEnum {
  major = 0,
  minor = 1,
  none = 2,
}
