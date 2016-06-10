import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalNote} from "./GraphicalNote";
export class GraphicalStaffEntryLink {
    private staffEntryLink: StaffEntryLink;
    private graphicalLinkedStaffEntries: GraphicalStaffEntry[] = [];
    constructor(staffEntryLink: StaffEntryLink) {
        this.staffEntryLink = staffEntryLink;
        this.initialize();
    }
    public get GetStaffEntryLink(): StaffEntryLink {
        return this.staffEntryLink;
    }
    public get GraphicalLinkedStaffEntries(): GraphicalStaffEntry[] {
        return this.graphicalLinkedStaffEntries;
    }
    public set GraphicalLinkedStaffEntries(value: GraphicalStaffEntry[]) {
        this.graphicalLinkedStaffEntries = value;
    }
    public isFilled(): boolean {
        for (let i: number = 0; i < this.graphicalLinkedStaffEntries.length; i++) {
            if (this.graphicalLinkedStaffEntries[i] === undefined)
                return false;
        }
        return true;
    }
    public getLinkedStaffEntriesGraphicalNotes(graphicalStaffEntry: GraphicalStaffEntry): GraphicalNote[] {
        if (this.graphicalLinkedStaffEntries.indexOf(graphicalStaffEntry) !== -1) {
            let notes: GraphicalNote[] = [];
            for (let idx: number = 0, len: number = this.graphicalLinkedStaffEntries.length; idx < len; ++idx) {
                let graphicalLinkedStaffEntry: GraphicalStaffEntry = this.graphicalLinkedStaffEntries[idx];
                for (let idx2: number = 0, len2: number = graphicalLinkedStaffEntry.Notes.length; idx2 < len2; ++idx2) {
                    let graphicalNotes: GraphicalNote[] = graphicalLinkedStaffEntry.Notes[idx2];
                    for (let idx3: number = 0, len3: number = graphicalNotes.length; idx3 < len3; ++idx3) {
                        let graphicalNote: GraphicalNote = graphicalNotes[idx3];
                        if (graphicalNote.SourceNote.ParentStaffEntry.Link !== undefined && graphicalNote.SourceNote.ParentVoiceEntry === this.staffEntryLink.GetVoiceEntry)
                            notes.push(graphicalNote);
                    }
                }
            }
            return notes;
        }
        return undefined;
    }
    private initialize(): void {
        for (let idx: number = 0, len: number = this.staffEntryLink.LinkStaffEntries.length; idx < len; ++idx) {
            this.graphicalLinkedStaffEntries.push(undefined);
        }
    }
}