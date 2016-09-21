import {VoiceEntry} from "./VoiceEntry";
import {SourceStaffEntry} from "./SourceStaffEntry";

/**
 * Used for linked voices.
 */
export class StaffEntryLink {
    constructor(voiceEntry: VoiceEntry) {
        this.voiceEntry = voiceEntry;
    }

    private voiceEntry: VoiceEntry;
    private linkStaffEntries: SourceStaffEntry[] = [];

    public get GetVoiceEntry(): VoiceEntry {
        return this.voiceEntry;
    }
    public get LinkStaffEntries(): SourceStaffEntry[] {
        return this.linkStaffEntries;
    }
    public set LinkStaffEntries(value: SourceStaffEntry[]) {
        this.linkStaffEntries = value;
    }

}
