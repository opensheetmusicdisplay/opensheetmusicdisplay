import {Fraction} from "../../Common/DataObjects/fraction";
import {OctaveShift} from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
export class OctaveShiftParams {
    constructor(openOctaveShift: OctaveShift, absoluteStartTimestamp: Fraction, absoluteEndTimestamp: Fraction) {
        this.GetOpenOctaveShift = openOctaveShift;
        this.GetAbsoluteStartTimestamp = absoluteStartTimestamp;
        this.GetAbsoluteEndTimestamp = absoluteEndTimestamp;
    }
    public GetOpenOctaveShift: OctaveShift;
    public GetAbsoluteStartTimestamp: Fraction;
    public GetAbsoluteEndTimestamp: Fraction;
}