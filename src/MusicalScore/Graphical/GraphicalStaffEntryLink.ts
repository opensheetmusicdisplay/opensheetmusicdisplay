import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalNote} from "./GraphicalNote";

/**
 * The graphical counterpart of a [[StaffEntryLink]].
 * Used for linked voices.
 */
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
            if (!this.graphicalLinkedStaffEntries[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Return all the [[GraphicalNote]]s that correspond to the [[LinkedVoiceEntry]] (the one saved in [[StaffEntryLink]]).
     * @param graphicalStaffEntry
     * @returns {any}
     */
    public getLinkedStaffEntriesGraphicalNotes(graphicalStaffEntry: GraphicalStaffEntry): GraphicalNote[] {
        if (this.graphicalLinkedStaffEntries.indexOf(graphicalStaffEntry) !== -1) {
            const notes: GraphicalNote[] = [];
            for (let idx: number = 0, len: number = this.graphicalLinkedStaffEntries.length; idx < len; ++idx) {
                const graphicalLinkedStaffEntry: GraphicalStaffEntry = this.graphicalLinkedStaffEntries[idx];
                for (const gve of graphicalLinkedStaffEntry.graphicalVoiceEntries) {
                    for (const graphicalNote of gve.notes) {
                        if (graphicalNote.sourceNote.ParentStaffEntry.Link
                            && graphicalNote.sourceNote.ParentVoiceEntry === this.staffEntryLink.GetVoiceEntry) {
                            notes.push(graphicalNote);
                        }
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
