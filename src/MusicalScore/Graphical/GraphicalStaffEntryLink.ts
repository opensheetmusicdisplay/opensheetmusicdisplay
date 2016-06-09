import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalNote} from "./GraphicalNote";
export class GraphicalStaffEntryLink {
    private staffEntryLink: StaffEntryLink;
    private graphicalLinkedStaffEntries: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
    constructor(staffEntryLink: StaffEntryLink) {
        this.staffEntryLink = staffEntryLink;
        this.initialize();
    }
    public get GetStaffEntryLink(): StaffEntryLink {
        return this.staffEntryLink;
    }
    public get GraphicalLinkedStaffEntries(): List<GraphicalStaffEntry> {
        return this.graphicalLinkedStaffEntries;
    }
    public set GraphicalLinkedStaffEntries(value: List<GraphicalStaffEntry>) {
        this.graphicalLinkedStaffEntries = value;
    }
    public isFilled(): boolean {
        for (var i: number = 0; i < this.graphicalLinkedStaffEntries.Count; i++) {
            if (this.graphicalLinkedStaffEntries[i] == null)
                return false;
        }
        return true;
    }
    public getLinkedStaffEntriesGraphicalNotes(graphicalStaffEntry: GraphicalStaffEntry): List<GraphicalNote> {
        if (this.graphicalLinkedStaffEntries.Contains(graphicalStaffEntry)) {
            var notes: List<GraphicalNote> = new List<GraphicalNote>();
            for (var idx: number = 0, len = this.graphicalLinkedStaffEntries.Count; idx < len; ++idx) {
                var graphicalLinkedStaffEntry: GraphicalStaffEntry = this.graphicalLinkedStaffEntries[idx];
                for (var idx2: number = 0, len2 = graphicalLinkedStaffEntry.Notes.Count; idx2 < len2; ++idx2) {
                    var graphicalNotes: List<GraphicalNote> = graphicalLinkedStaffEntry.Notes[idx2];
                    for (var idx3: number = 0, len3 = graphicalNotes.Count; idx3 < len3; ++idx3) {
                        var graphicalNote: GraphicalNote = graphicalNotes[idx3];
                        if (graphicalNote.SourceNote.ParentStaffEntry.Link != null && graphicalNote.SourceNote.ParentVoiceEntry == this.staffEntryLink.GetVoiceEntry)
                            notes.Add(graphicalNote);
                    }
                }
            }
            return notes;
        }
        return null;
    }
    private initialize(): void {
        for (var idx: number = 0, len = this.staffEntryLink.LinkStaffEntries.Count; idx < len; ++idx) {
            this.graphicalLinkedStaffEntries.Add(null);
        }
    }
}