import { Tie } from "../VoiceData/Tie";
import { GraphicalNote } from "./GraphicalNote";
export declare class GraphicalTie {
    private tie;
    private startNote;
    private endNote;
    constructor(tie: Tie, start?: GraphicalNote, end?: GraphicalNote);
    GetTie: Tie;
    StartNote: GraphicalNote;
    EndNote: GraphicalNote;
}
