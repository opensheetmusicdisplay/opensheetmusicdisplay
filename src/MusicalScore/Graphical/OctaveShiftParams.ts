import {Fraction} from "../../Common/DataObjects/Fraction";
import {OctaveShift} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";

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
