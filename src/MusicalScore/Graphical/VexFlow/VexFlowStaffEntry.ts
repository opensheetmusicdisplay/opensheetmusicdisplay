import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {VexFlowConverter} from "./VexFlowConverter";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);

        // Generate Vex.Flow.StaveNotes
        let vfnotes: { [id: number]: Vex.Flow.StaveNote; } = {};
        for (let voiceEntry of this.sourceStaffEntry.VoiceEntries) {
            vfnotes[voiceEntry.ParentVoice.VoiceId] = VexFlowConverter.StaveNote(voiceEntry);
        }
        this.vfnotes = vfnotes;
        console.log("vfnotes generated", vfnotes, this.sourceStaffEntry.VoiceEntries);
    }

    public vfnotes: { [id: number]: Vex.Flow.StaveNote; };
}
