import { VoiceEntry } from "./VoiceEntry";
import { Note } from "./Note";

export class Arpeggio {
    constructor(parentVoiceEntry: VoiceEntry, type: string) {
        this.parentVoiceEntry = parentVoiceEntry;
        this.type = type;
        this.notes = [];
    }

    public parentVoiceEntry: VoiceEntry;
    public notes: Note[];
    public type: string;

    public addNote(note: Note): void {
        this.notes.push(note);
        note.Arpeggio = this;
    }
}
