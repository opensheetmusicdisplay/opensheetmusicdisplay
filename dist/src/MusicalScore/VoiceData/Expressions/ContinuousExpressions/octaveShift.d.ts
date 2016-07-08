import { MultiExpression } from "../multiExpression";
export declare class OctaveShift {
    constructor(type: string, octave: number);
    private octaveValue;
    private staffNumber;
    private startMultiExpression;
    private endMultiExpression;
    Type: OctaveEnum;
    StaffNumber: number;
    ParentStartMultiExpression: MultiExpression;
    ParentEndMultiExpression: MultiExpression;
    private setOctaveShiftValue(type, octave);
}
export declare enum OctaveEnum {
    VA8 = 0,
    VB8 = 1,
    MA15 = 2,
    MB15 = 3,
    NONE = 4,
}
