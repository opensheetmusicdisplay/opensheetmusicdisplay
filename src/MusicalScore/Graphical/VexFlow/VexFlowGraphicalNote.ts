import {GraphicalNote} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VexFlowConverter} from "./VexFlowConverter";

export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalStaffEntry, activeClef: ClefInstruction) {
        super(note, parent);
        if (note.Pitch) {
            // ToDo: don't use accidental info here - set it in factory.
            this.vfpitch = VexFlowConverter.pitch(note.Pitch, activeClef);
        } else {
            this.vfpitch = undefined;
        }
    }

    public vfpitch: [string, string, ClefInstruction];
}
