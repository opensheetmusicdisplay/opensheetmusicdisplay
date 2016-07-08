import { Note } from "../VoiceData/Note";
import { Fraction } from "../../Common/DataObjects/fraction";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { ClefInstruction } from "../VoiceData/Instructions/ClefInstruction";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import { Pitch } from "../../Common/DataObjects/pitch";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalObject } from "./GraphicalObject";
export declare class GraphicalNote extends GraphicalObject {
    constructor(note: Note, parent: GraphicalStaffEntry);
    sourceNote: Note;
    graphicalNoteLength: Fraction;
    parentStaffEntry: GraphicalStaffEntry;
    ParentList: GraphicalNote[];
    Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch;
}
