import {Note} from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Pitch } from "../../Common/DataObjects/Pitch";

export class Glissando {

    constructor(note: Note) {
        this.AddNote(note);
        this.StartNote = note;
    }

    private notes: Note[] = [];
    public StartNote: Note;
    public EndNote: Note;
    public XMLNumber: number = 1;

    public get Notes(): Note[] {
        return this.notes;
    }

    public get Duration(): Fraction {
        const duration: Fraction = new Fraction();
        for (const note of this.notes) {
            duration.Add(note.Length);
        }
        return duration;
    }

    public get Pitch(): Pitch {
        return this.StartNote.Pitch;
    }

    public AddNote(note: Note): void {
        this.notes.push(note);
        note.NoteGlissando = this;
    }
}
