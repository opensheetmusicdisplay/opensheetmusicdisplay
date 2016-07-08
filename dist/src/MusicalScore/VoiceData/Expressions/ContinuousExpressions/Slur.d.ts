import { Note } from "../../Note";
export declare class Slur {
    constructor();
    private startNote;
    private endNote;
    StartNote: Note;
    EndNote: Note;
    startNoteHasMoreStartingSlurs(): boolean;
    endNoteHasMoreEndingSlurs(): boolean;
    isCrossed(): boolean;
    isSlurLonger(): boolean;
}
