import { GraphicalNote } from "../Graphical/GraphicalNote";
import { ClefInstruction } from "../VoiceData";

export interface IStafflineNoteCalculator {
    positionNote(graphicalNote: GraphicalNote, currentClef: ClefInstruction, stafflineCount: number): GraphicalNote;
}
