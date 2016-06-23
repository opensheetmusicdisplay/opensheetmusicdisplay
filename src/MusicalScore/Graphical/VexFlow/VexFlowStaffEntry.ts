import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {VexFlowConverter} from "./VexFlowConverter";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);

        // Generate Vex.Flow.StaveNotes
        let vfnotes: { [id: number]: Vex.Flow.StaveNote; } = {};
        for (let note of this.notes) {
            vfnotes[note[0].sourceNote.ParentVoiceEntry.ParentVoice.VoiceId] = VexFlowConverter.StaveNote(
                note,
                (this.parentMeasure as VexFlowMeasure).octaveOffset
            );
        }
        this.vfnotes = vfnotes;
        console.log("vfnotes generated", vfnotes);
    }

    public vfnotes: { [id: number]: Vex.Flow.StaveNote; };
}
