import {AccidentalEnum} from "../../Common/DataObjects/Pitch";

export class OrnamentContainer {

    constructor(ornament: OrnamentEnum) {
        this.ornament = ornament;
    }

    private ornament: OrnamentEnum;
    private accidentalAbove: AccidentalEnum = AccidentalEnum.NONE;
    private accidentalBelow: AccidentalEnum = AccidentalEnum.NONE;

    public get GetOrnament(): OrnamentEnum {
        return this.ornament;
    }
    public get AccidentalAbove(): AccidentalEnum {
        return this.accidentalAbove;
    }
    public set AccidentalAbove(value: AccidentalEnum) {
        this.accidentalAbove = value;
    }
    public get AccidentalBelow(): AccidentalEnum {
        return this.accidentalBelow;
    }
    public set AccidentalBelow(value: AccidentalEnum) {
        this.accidentalBelow = value;
    }

}

export enum OrnamentEnum {
    Trill,
    Turn,
    InvertedTurn,
    DelayedTurn,
    DelayedInvertedTurn,
    Mordent,
    InvertedMordent
}
