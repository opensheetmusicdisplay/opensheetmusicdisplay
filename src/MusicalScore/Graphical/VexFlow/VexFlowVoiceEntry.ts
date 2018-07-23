import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { LyricsEntry } from "../../VoiceData/Lyrics/LyricsEntry";

export class VexFlowVoiceEntry extends GraphicalVoiceEntry {
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry) {
        super(parentVoiceEntry, parentStaffEntry);
    }

    public vfStaveNote: Vex.Flow.StemmableNote;
    public lyricsEntry: LyricsEntry;
}
