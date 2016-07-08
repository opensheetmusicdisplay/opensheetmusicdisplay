import Vex = require("vexflow");
import { GraphicalNote } from "../GraphicalNote";
import { Note } from "../../VoiceData/Note";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { Pitch } from "../../../Common/DataObjects/pitch";
export declare class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalStaffEntry, activeClef: ClefInstruction);
    vfpitch: [string, string, ClefInstruction];
    private vfnote;
    private clef;
    setPitch(pitch: Pitch): void;
    /**
     * Set the corresponding VexFlow StaveNote together with its index
     * @param note
     * @param index
     */
    setIndex(note: Vex.Flow.StaveNote, index: number): void;
}
