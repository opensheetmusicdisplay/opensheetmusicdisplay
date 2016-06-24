import {GraphicalNote} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VexFlowConverter} from "./VexFlowConverter";

export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalStaffEntry, activeClef: ClefInstruction) {
        super(note, parent);
        if (note.Pitch) {
            this.vfpitch = VexFlowConverter.pitch(note.Pitch, activeClef);
        } else {
            this.vfpitch = undefined;
        }
    }

    public vfpitch: [string, string, ClefInstruction];
}
