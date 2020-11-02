import { PlacementEnum } from "../Expressions/AbstractExpression";
import { Note } from "../Note";

export enum TechnicalInstructionType {
    Fingering
}
export class TechnicalInstruction {
    public type: TechnicalInstructionType;
    public value: string;
    public placement: PlacementEnum;
    public sourceNote: Note;
}
