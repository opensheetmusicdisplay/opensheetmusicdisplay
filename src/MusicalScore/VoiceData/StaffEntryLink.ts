export class StaffEntryLink {
    constructor(voiceEntry: VoiceEntry) {
        this.voiceEntry = voiceEntry;
    }
    private voiceEntry: VoiceEntry;
    private linkStaffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
    public get GetVoiceEntry(): VoiceEntry {
        return this.voiceEntry;
    }
    public get LinkStaffEntries(): List<SourceStaffEntry> {
        return this.linkStaffEntries;
    }
    public set LinkStaffEntries(value: List<SourceStaffEntry>) {
        this.linkStaffEntries = value;
    }
}