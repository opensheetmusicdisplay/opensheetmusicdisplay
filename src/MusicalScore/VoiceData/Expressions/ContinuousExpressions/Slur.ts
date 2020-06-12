import {Note} from "../../Note";
import {Fraction} from "../../../../Common/DataObjects/Fraction";

export class Slur {
    constructor() {
        // ?
    }

    private startNote: Note;
    private endNote: Note;

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
