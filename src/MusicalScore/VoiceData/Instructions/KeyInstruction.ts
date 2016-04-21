import {AbstractNotationInstruction} from "./AbstractNotationInstruction";
import {SourceStaffEntry} from "../SourceStaffEntry";
import {NoteEnum} from "../../../Common/DataObjects/pitch";
import {AccidentalEnum} from "../../../Common/DataObjects/pitch";
import {Pitch} from "../../../Common/DataObjects/pitch";


export class KeyInstruction extends AbstractNotationInstruction {
  constructor(first: SourceStaffEntry|KeyInstruction, key?: number, mode?: KeyEnum) {
    if (first === undefined) {
      super(undefined); // FIXME check
      this.Key = key;
      this.mode = mode;
    }
    if (first instanceof SourceStaffEntry) {
      let parent: SourceStaffEntry = <SourceStaffEntry> first;
      super(parent);
      this.Key = key;
      this.mode = mode;
    }
    if (first instanceof KeyInstruction) {
      let keyInstruction: KeyInstruction = <KeyInstruction> first;
      super(undefined); // FIXME check
      this(keyInstruction.parent, keyInstruction.keyType, keyInstruction.mode);
      this.keyType = keyInstruction.keyType;
      this.mode = keyInstruction.mode;
    }

  }

  private static sharpPositionList: NoteEnum[] = [NoteEnum.F, NoteEnum.C, NoteEnum.G, NoteEnum.D, NoteEnum.A, NoteEnum.E, NoteEnum.B];
  private static flatPositionList: NoteEnum[] = [NoteEnum.B, NoteEnum.E, NoteEnum.A, NoteEnum.D, NoteEnum.G, NoteEnum.C, NoteEnum.F];

  private keyType: number;
  private mode: KeyEnum;

  public static getNoteEnumList(instruction: KeyInstruction): NoteEnum[] {
    let enums: NoteEnum[] = new Array();
    if (instruction.keyType > 0) {
      for (let i: number = 0; i < instruction.keyType; i++) {
        enums.push(KeyInstruction.sharpPositionList[i]);
      }
    }
    if (instruction.keyType < 0) {
      for (let i: number = 0; i < Math.abs(instruction.keyType); i++) {
        enums.push(KeyInstruction.flatPositionList[i]);
      }
    }
    return enums;
  }

  public static getAllPossibleMajorKeyInstructions(): KeyInstruction[] {
    let keyInstructionList: KeyInstruction[] = new Array();
    for (let keyType: number = -7; keyType < 7; keyType++) {
      let currentKeyInstruction: KeyInstruction = new KeyInstruction(undefined, keyType, KeyEnum.major);
      keyInstructionList.push(currentKeyInstruction);
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
  public getFundamentalNotesOfAccidentals(): NoteEnum[] {
    let noteList: NoteEnum[] = new Array();
    if (this.keyType > 0) {
      for (let i: number = 0; i < this.keyType; i++) {
        noteList.push(KeyInstruction.sharpPositionList[i]);
      }
    } else if (this.keyType < 0) {
      for (let i: number = 0; i < -this.keyType; i++) {
        noteList.push(KeyInstruction.flatPositionList[i]);
      }
    }
    return noteList;
  }
  public getAlterationForPitch(pitch: Pitch): AccidentalEnum {
    if (this.keyType > 0 && KeyInstruction.sharpPositionList.indexOf(pitch.FundamentalNote) <= this.keyType) {
      return AccidentalEnum.SHARP;
    } else if (this.keyType < 0 && KeyInstruction.flatPositionList.indexOf(pitch.FundamentalNote) <= Math.abs(this.keyType)) {
      return AccidentalEnum.FLAT;
    }
    return AccidentalEnum.NONE;
  }
  public ToString(): string {
    return "Key: " + this.keyType + "" + this.mode;
  }
  public OperatorEquals(key2: KeyInstruction): boolean {
    let key1: KeyInstruction = this;
    if (key1 === key2) {
      return true;
    }
    if ((key1 === undefined) || (key2 === undefined)) {
      return false;
    }
    return (key1.Key === key2.Key && key1.Mode === key2.Mode);
  }

  public OperatorNotEqual(key2: KeyInstruction): boolean {
    let key1: KeyInstruction = this;
    return !(key1 === key2);
  }
}

export module KeyInstruction {
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
