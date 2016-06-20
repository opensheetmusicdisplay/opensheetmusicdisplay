import {GraphicalNote} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";

export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalStaffEntry) {
        super(note, parent);
    }
}
