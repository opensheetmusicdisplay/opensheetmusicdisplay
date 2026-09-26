import {Note} from "../../Note";
import { Fraction } from "../../../../Common/DataObjects/Fraction";
import { PlacementEnum } from "../AbstractExpression";

export class Slur {
    constructor() {
        // ?
    }

    private startNote: Note;
    private endNote: Note;
    public PlacementXml: PlacementEnum; // how the slur is placed in the XML
    /** Whether the slur's end isn't attached to a note: its start note also has a stop of its number that ended no earlier
     *  slur, which Dolet for Sibelius writes e.g. for a slur running into a repeat barline (#1516). While it has no end note,
     *  it's drawn to the barline if its start note is the last note of its measure, and not at all otherwise.
     *  A later stop of its number still ends it at that note (e.g. if the stop on the start note was an orphan instead).
     */
    public HasUnattachedEnd: boolean = false;

    public get StartNote(): Note {
        return this.startNote;
    }
    public set StartNote(value: Note) {
        this.startNote = value;
    }
    public get EndNote(): Note {
        return this.endNote;
    }
    public set EndNote(value: Note) {
        this.endNote = value;
    }
    public startNoteHasMoreStartingSlurs(): boolean {
        if (!this.startNote) { return false; }
        for (let idx: number = 0, len: number = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.startNote.NoteSlurs[idx];
            if (slur !== this && slur.StartNote === this.startNote) {
                return true;
            }
        }
        return false;
    }
    public endNoteHasMoreEndingSlurs(): boolean {
        if (!this.endNote) { return false; }
        for (let idx: number = 0, len: number = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.endNote.NoteSlurs[idx];
            if (slur !== this && slur.EndNote === this.endNote) {
                return true;
            }
        }
        return false;
    }
    public isCrossed(): boolean {
        if (!this.endNote) {
            return false; // no end note (yet), see HasUnattachedEnd
        }
        return (this.startNote.ParentStaffEntry.ParentStaff !== this.endNote.ParentStaffEntry.ParentStaff);
    }
    public isSlurLonger(): boolean {
        if (!this.endNote || !this.startNote) {
            return false;
        }
        const length: Fraction = Fraction.minus(this.endNote.getAbsoluteTimestamp(), this.startNote.getAbsoluteTimestamp());
        for (let idx: number = 0, len: number = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.startNote.NoteSlurs[idx];
            if (
                slur !== this
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length) === -1
            ) {
                return true;
            }
        }
        for (let idx: number = 0, len: number = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.endNote.NoteSlurs[idx];
            if (
                slur !== this
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length)
            ) {
                return true;
            }
        }
        return false;
    }
}
