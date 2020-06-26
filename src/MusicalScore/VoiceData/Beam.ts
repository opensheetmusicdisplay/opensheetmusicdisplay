import {Note} from "./Note";

/**
 * A [[Beam]] - the bar grouping multiple consecutive [[Note]]s.
 */
export class Beam {

    private notes: Note[] = [];
    private extendedNoteList: Note[] = [];

    public get Notes(): Note[] {
        return this.notes;
    }
    public set Notes(value: Note[]) {
        this.notes = value;
    }
    public get ExtendedNoteList(): Note[] {
        return this.extendedNoteList;
    }
    public set ExtendedNoteList(value: Note[]) {
        this.extendedNoteList = value;
    }

    /**
     * Perform all the appropriate actions for adding a singleNote to the Beam.
     * @param note
     */
    public addNoteToBeam(note: Note): void {
        if (note) {
            note.NoteBeam = this;
            this.notes.push(note);
            this.extendedNoteList.push(note);
        }
    }

}

export enum BeamEnum {
    BeamNone = -1,
    BeamBegin = 0,
    BeamContinue = 1,
    BeamEnd = 2,
    BeamForward = 3,
    BeamBackward = 4,
}
