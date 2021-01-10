import {Note} from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { TieTypes } from "../../Common/Enums/";

/**
 * A [[Tie]] connects two notes of the same pitch and name, indicating that they have to be played as a single note.
 */
export class Tie {

    constructor(note: Note, type: TieTypes) {
        this.AddNote(note);
        this.type = type;
    }

    private notes: Note[] = [];
    private type: TieTypes;

    public get Notes(): Note[] {
        return this.notes;
    }

    public get Type(): TieTypes {
        return this.type;
    }

    public get StartNote(): Note {
        return this.notes[0];
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
        note.NoteTie = this;
    }
}
