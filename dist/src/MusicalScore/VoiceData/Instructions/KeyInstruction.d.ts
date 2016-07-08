import { AbstractNotationInstruction } from "./AbstractNotationInstruction";
import { SourceStaffEntry } from "../SourceStaffEntry";
import { NoteEnum } from "../../../Common/DataObjects/pitch";
import { AccidentalEnum } from "../../../Common/DataObjects/pitch";
import { Pitch } from "../../../Common/DataObjects/pitch";
export declare class KeyInstruction extends AbstractNotationInstruction {
    constructor(sourceStaffEntry?: SourceStaffEntry, key?: number, mode?: KeyEnum);
    private static sharpPositionList;
    private static flatPositionList;
    private keyType;
    private mode;
    static copy(keyInstruction: KeyInstruction): KeyInstruction;
    static getNoteEnumList(instruction: KeyInstruction): NoteEnum[];
    static getAllPossibleMajorKeyInstructions(): KeyInstruction[];
    Key: number;
    Mode: KeyEnum;
    getFundamentalNotesOfAccidentals(): NoteEnum[];
    getAlterationForPitch(pitch: Pitch): AccidentalEnum;
    ToString(): string;
    OperatorEquals(key2: KeyInstruction): boolean;
    OperatorNotEqual(key2: KeyInstruction): boolean;
}
export declare class NoteEnumToHalfToneLink {
    constructor(note: NoteEnum, halftone: number);
    note: NoteEnum;
    halfTone: number;
}
export declare enum KeyEnum {
    major = 0,
    minor = 1,
    none = 2,
}
