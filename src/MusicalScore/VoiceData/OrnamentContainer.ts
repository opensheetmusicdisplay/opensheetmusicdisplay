import { AccidentalEnum } from "../../Common/DataObjects/Pitch";
import { PlacementEnum } from "./Expressions/AbstractExpression";

export class OrnamentContainer {

    constructor(ornament: OrnamentEnum) {
        this.ornament = ornament;
    }

    private ornament: OrnamentEnum;
    public placement: PlacementEnum = PlacementEnum.Above;
    private accidentalAbove: AccidentalEnum = AccidentalEnum.NONE;
    private accidentalBelow: AccidentalEnum = AccidentalEnum.NONE;
    private vexflowOrnament: string;

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
    public get VexflowOrnament(): string {
        return this.vexflowOrnament;
    }
    public set VexflowOrnament(value: string) {
        this.vexflowOrnament = value;
    }

}

export enum OrnamentEnum {
    Trill,
    LongTrill,
    Turn,
    InvertedTurn,
    DelayedTurn,
    DelayedInvertedTurn,
    Mordent,
    InvertedMordent,
    LongMordent,
    LongInvertedMordent,
    UpPrall,
    DownPrall,
    PrallUp,
    PrallDown,
    UpMordent,
    DownMordent,
    LinePrall,
    PrallPrall
}
