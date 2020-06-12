import { GraphicalNote } from "../Graphical/GraphicalNote";

export interface IStafflineNoteCalculator {
    trackNote(graphicalNote: GraphicalNote, staffIndex: number): void;
    positionNote(graphicalNote: GraphicalNote, staffIndex: number): GraphicalNote;
    getStafflineUniquePositionCount(staffIndex: number): number;
}
