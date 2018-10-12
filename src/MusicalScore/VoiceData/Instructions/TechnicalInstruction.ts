import { PlacementEnum } from "../Expressions/AbstractExpression";

export enum TechnicalInstructionType {
    Fingering
}
export class TechnicalInstruction {
    public type: TechnicalInstructionType;
    public value: string;
    public placement: PlacementEnum;
}
