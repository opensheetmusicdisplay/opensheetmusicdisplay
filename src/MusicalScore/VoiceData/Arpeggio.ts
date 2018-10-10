import { VoiceEntry } from "./VoiceEntry";
import { Note } from "./Note";

/** Type and direction of an Arpeggio.
 * The values should correspond to Vex.Flow.Strokes.Type values.
 * Somehow they don't correspond to Vexflow code, but they were confirmed to work, for whatever reason.
 * For now, we only support one Arpeggio per VoiceEntry.
 */
export enum ArpeggioType {
    BRUSH_DOWN = 2,
    BRUSH_UP = 1,
    ROLL_DOWN = 4, // Arpeggio with downwards arrow
    ROLL_UP = 3, // Arpeggio with upwards arrow
    RASQUEDO_DOWN = 5, // this is UP, can't find a value for DOWN that works in Vexflow right now
    RASQUEDO_UP = 5,
    ARPEGGIO_DIRECTIONLESS = 7 // currently not supported in Vexflow
}

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
