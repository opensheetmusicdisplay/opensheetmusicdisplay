import { PlacementEnum, AbstractExpression } from "./abstractExpression";
import { MultiExpression } from "./multiExpression";
import { DynamicExpressionSymbolEnum } from "./dynamicExpressionSymbolEnum";
export declare class InstantaniousDynamicExpression extends AbstractExpression {
    constructor(dynamicExpression: string, soundDynamics: number, placement: PlacementEnum, staffNumber: number);
    static dynamicToRelativeVolumeDict: {
        [_: string]: number;
    };
    private static listInstantaniousDynamics;
    private multiExpression;
    private dynamicEnum;
    private soundDynamic;
    private placement;
    private staffNumber;
    private length;
    ParentMultiExpression: MultiExpression;
    DynEnum: DynamicEnum;
    SoundDynamic: number;
    Placement: PlacementEnum;
    StaffNumber: number;
    Length: number;
    MidiVolume: number;
    static isInputStringInstantaniousDynamic(inputString: string): boolean;
    getDynamicExpressionSymbol(c: string): DynamicExpressionSymbolEnum;
    private calculateLength();
}
export declare enum DynamicEnum {
    pppppp = 0,
    ppppp = 1,
    pppp = 2,
    ppp = 3,
    pp = 4,
    p = 5,
    mp = 6,
    mf = 7,
    f = 8,
    ff = 9,
    fff = 10,
    ffff = 11,
    fffff = 12,
    ffffff = 13,
    sf = 14,
    sfp = 15,
    sfpp = 16,
    fp = 17,
    rf = 18,
    rfz = 19,
    sfz = 20,
    sffz = 21,
    fz = 22,
    other = 23,
}
