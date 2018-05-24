import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";

export class VexFlowVoiceEntry extends GraphicalVoiceEntry {
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry) {
        super(parentVoiceEntry, parentStaffEntry);
    }

    public vfStaveNote: Vex.Flow.StemmableNote;
}
