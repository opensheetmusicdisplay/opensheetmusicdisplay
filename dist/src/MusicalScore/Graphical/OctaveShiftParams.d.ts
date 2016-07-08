import { Fraction } from "../../Common/DataObjects/fraction";
import { OctaveShift } from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
export declare class OctaveShiftParams {
    constructor(openOctaveShift: OctaveShift, absoluteStartTimestamp: Fraction, absoluteEndTimestamp: Fraction);
    getOpenOctaveShift: OctaveShift;
    getAbsoluteStartTimestamp: Fraction;
    getAbsoluteEndTimestamp: Fraction;
}
