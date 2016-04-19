export class Beam {
    private notes: List<Note> = new List<Note>();
    private extendedNoteList: List<Note> = new List<Note>();
    public get Notes(): List<Note> {
        return this.notes;
    }
    public set Notes(value: List<Note>) {
        this.notes = value;
    }
    public get ExtendedNoteList(): List<Note> {
        return this.extendedNoteList;
    }
    public set ExtendedNoteList(value: List<Note>) {
        this.extendedNoteList = value;
    }
    public addNoteToBeam(note: Note): void {
        if (note !== undefined) {
            note.NoteBeam = this;
            this.notes.Add(note);
            this.extendedNoteList.Add(note);
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
