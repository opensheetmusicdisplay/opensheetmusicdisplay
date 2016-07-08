import { AccidentalEnum } from "../../Common/DataObjects/pitch";
export declare class OrnamentContainer {
    constructor(ornament: OrnamentEnum);
    private ornament;
    private accidentalAbove;
    private accidentalBelow;
    GetOrnament: OrnamentEnum;
    AccidentalAbove: AccidentalEnum;
    AccidentalBelow: AccidentalEnum;
}
export declare enum OrnamentEnum {
    Trill = 0,
    Turn = 1,
    InvertedTurn = 2,
    DelayedTurn = 3,
    DelayedInvertedTurn = 4,
    Mordent = 5,
    InvertedMordent = 6,
}
