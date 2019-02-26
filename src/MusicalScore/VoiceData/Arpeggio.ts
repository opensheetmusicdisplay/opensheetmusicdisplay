import { VoiceEntry } from "./VoiceEntry";
import { Note } from "./Note";

export class Arpeggio {
    constructor(parentVoiceEntry: VoiceEntry, type: Vex.Flow.Stroke.Type = Vex.Flow.Stroke.Type.ARPEGGIO_DIRECTIONLESS) {
        this.parentVoiceEntry = parentVoiceEntry;
        this.type = type;
        this.notes = [];
    }

    public parentVoiceEntry: VoiceEntry;
    public notes: Note[];
    public type: Vex.Flow.Stroke.Type;

    public addNote(note: Note): void {
        this.notes.push(note);
        note.Arpeggio = this;
    }
}
