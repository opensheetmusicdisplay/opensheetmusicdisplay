import { Note } from "./Note";
export declare class Beam {
    private notes;
    private extendedNoteList;
    Notes: Note[];
    ExtendedNoteList: Note[];
    addNoteToBeam(note: Note): void;
}
export declare enum BeamEnum {
    BeamNone = -1,
    BeamBegin = 0,
    BeamContinue = 1,
    BeamEnd = 2,
    BeamForward = 3,
    BeamBackward = 4,
}
