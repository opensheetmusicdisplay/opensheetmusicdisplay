import { PlacementEnum } from "../Expressions/AbstractExpression";
import { Note } from "../Note";

export enum TechnicalInstructionType {
    Fingering,
    String,
}
export class TechnicalInstruction {
    public type: TechnicalInstructionType;
    public value: string;
    public placement: PlacementEnum;
    public sourceNote: Note;
    /** To be able to set fontFamily for fingerings, e.g. (after load, before render):
     * osmd.cursor.GNotesUnderCursor()[0].parentVoiceEntry.parentVoiceEntry.TechnicalInstructions[0].fontFamily = "Comic Sans MS"
     * Note that staffEntry.FingeringInstructions is only created during render(),
     *   so it's no use setting it there before render.
     */
    public fontFamily: string;
}
