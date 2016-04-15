export class OrnamentContainer {
    constructor(ornament: OrnamentEnum) {
        this.ornament = ornament;
    }
    private ornament: OrnamentEnum;
    private accidentalAbove: AccEnum = AccEnum.NONE;
    private accidentalBelow: AccEnum = AccEnum.NONE;
    public get GetOrnament(): OrnamentEnum {
        return this.ornament;
    }
    public get AccidentalAbove(): AccEnum {
        return this.accidentalAbove;
    }
    public set AccidentalAbove(value: AccEnum) {
        this.accidentalAbove = value;
    }
    public get AccidentalBelow(): AccEnum {
        return this.accidentalBelow;
    }
    public set AccidentalBelow(value: AccEnum) {
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