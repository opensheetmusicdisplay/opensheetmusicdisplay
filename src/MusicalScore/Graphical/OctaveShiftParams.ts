import {Fraction} from "../../Common/DataObjects/fraction";
import {OctaveShift} from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";

export class OctaveShiftParams {
    constructor(openOctaveShift: OctaveShift, absoluteStartTimestamp: Fraction, absoluteEndTimestamp: Fraction) {
        this.getOpenOctaveShift = openOctaveShift;
        this.getAbsoluteStartTimestamp = absoluteStartTimestamp;
        this.getAbsoluteEndTimestamp = absoluteEndTimestamp;
    }
    public getOpenOctaveShift: OctaveShift;
    public getAbsoluteStartTimestamp: Fraction;
    public getAbsoluteEndTimestamp: Fraction;
}
