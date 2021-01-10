import { GraphicalNote } from "../Graphical/GraphicalNote";

export interface IStafflineNoteCalculator {
    trackNote(graphicalNote: GraphicalNote): void;
    positionNote(graphicalNote: GraphicalNote): GraphicalNote;
    getStafflineUniquePositionCount(staffIndex: number): number;
}
