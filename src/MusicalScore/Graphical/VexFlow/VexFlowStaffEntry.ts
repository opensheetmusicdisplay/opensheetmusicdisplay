import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {GraphicalNote} from "../GraphicalNote";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // The Graphical Notes belonging to this StaffEntry, sorted by voiceID
    public graphicalNotes: { [voiceID: number]: GraphicalNote[]; } = {};
    // The corresponding VexFlow.StaveNotes
    public vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = {};
}
