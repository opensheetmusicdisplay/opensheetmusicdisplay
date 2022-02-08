import { VoiceEntry } from "./VoiceEntry";
import { Note } from "./Note";

export class Arpeggio {
    constructor(parentVoiceEntry: VoiceEntry, type: ArpeggioType = ArpeggioType.ARPEGGIO_DIRECTIONLESS) {
        this.parentVoiceEntry = parentVoiceEntry;
        this.type = type;
        this.notes = [];
    }

    public parentVoiceEntry: VoiceEntry;
    public notes: Note[];
    public type: ArpeggioType;

    public addNote(note: Note): void {
        this.notes.push(note);
        note.Arpeggio = this;
    }
}

/** Corresponds to VF.Stroke.Type for now. But we don't want VexFlow as a dependency here. */
export enum ArpeggioType {
    BRUSH_DOWN = 1,
    BRUSH_UP,
    ROLL_DOWN,
    ROLL_UP,
    RASQUEDO_DOWN,
    RASQUEDO_UP,
    ARPEGGIO_DIRECTIONLESS
}
