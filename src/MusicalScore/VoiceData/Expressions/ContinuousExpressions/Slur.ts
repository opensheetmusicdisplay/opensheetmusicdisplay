import {Note} from "../../Note";
import {Fraction} from "../../../../Common/DataObjects/fraction";

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
        if (this.startNote == null) { return false; }
        for (var idx: number = 0, len = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            var slur: Slur = this.startNote.NoteSlurs[idx];
            if (slur != this && slur.StartNote == this.startNote) {
                return true;
            }
        }
        return false;
    }
    public endNoteHasMoreEndingSlurs(): boolean {
        if (this.endNote == null) { return false; }
        for (var idx: number = 0, len = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            var slur: Slur = this.endNote.NoteSlurs[idx];
            if (slur != this && slur.EndNote == this.endNote) {
                return true;
            }
        }
        return false;
    }
    public isCrossed(): boolean {
        return (this.startNote.ParentStaffEntry.ParentStaff !== this.endNote.ParentStaffEntry.ParentStaff);
    }
    public isSlurLonger(): boolean {
        if (this.endNote === null || this.startNote === null) {
            return false;
        }
        var length: Fraction = Fraction.minus(this.endNote.getAbsoluteTimestamp(), this.startNote.getAbsoluteTimestamp());
        for (var idx: number = 0, len = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            var slur: Slur = this.startNote.NoteSlurs[idx];
            if (
                slur != this
                && slur.EndNote != null
                && slur.StartNote != null
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length) == -1
            ) {
                return true;
            }
        }
        for (var idx: number = 0, len = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            var slur: Slur = this.endNote.NoteSlurs[idx];
            if (
                slur != this
                && slur.EndNote != null
                && slur.StartNote != null
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length)
            ) {
                return true;
            }
        }
        return false;
    }
}