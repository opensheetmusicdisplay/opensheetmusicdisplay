import {Note} from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { ColDirEnum } from "../Graphical/BoundingBox";

export class Glissando {

    constructor(note: Note) {
        this.AddNote(note);
        this.StartNote = note;
        this.Direction = ColDirEnum.NotYetDefined;
    }

    private notes: Note[] = [];
    public StartNote: Note;
    public EndNote: Note;
    public XMLNumber: number = 1;
    public Direction: ColDirEnum;

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
        if (this.notes.length === 2) {
            // set direction
            //   this heuristic is imprecise, better would be to check line of the staff on which note is drawn,
            //   but that info may not be available yet, and this should rarely matter.
            if (this.notes[0].Pitch.getHalfTone() < this.notes[1].Pitch.getHalfTone()) {
                this.Direction = ColDirEnum.Up;
            } else {
                this.Direction = ColDirEnum.Down;
            }
        }
    }
}
