import {PlacementEnum, AbstractExpression} from "./abstractExpression";
import {MultiExpression} from "./multiExpression";
import {DynamicExpressionSymbolEnum} from "./dynamicExpressionSymbolEnum";

export class InstantaniousDynamicExpression extends AbstractExpression {
    constructor(dynamicExpression: string, soundDynamics: number, placement: PlacementEnum, staffNumber: number) {
        this.dynamicEnum = <DynamicEnum>Enum.Parse(/*typeof*/DynamicEnum, dynamicExpression.ToLower());
        this.soundDynamic = soundDynamics;
        this.placement = placement;
        this.staffNumber = staffNumber;
    }
    public static dynamicToRelativeVolumeDict: SortedDictionary<DynamicEnum, number> = __init(new SortedDictionary<DynamicEnum, number>(), { { DynamicEnum.ffffff, 127.0f / 127.0f },
        { DynamicEnum.fffff, 126.0f / 127.0f },
        { DynamicEnum.ffff, 125.0f / 127.0f },
        { DynamicEnum.fff, 124.0f / 127.0f },
        { DynamicEnum.ff, 108.0f / 127.0f },
        { DynamicEnum.f, 92.0f / 127.0f },
        { DynamicEnum.mf, 76.0f / 127.0f },
        { DynamicEnum.mp, 60.0f / 127.0f },
        { DynamicEnum.p, 44.0f / 127.0f },
        { DynamicEnum.pp, 28.0f / 127.0f },
        { DynamicEnum.ppp, 12.0f / 127.0f },
        { DynamicEnum.pppp, 10.0f / 127.0f },
        { DynamicEnum.ppppp, 8.0f / 127.0f },
        { DynamicEnum.pppppp, 6.0f / 127.0f },
        { DynamicEnum.sf, 0.5f },
        { DynamicEnum.sfp, 0.5f },
        { DynamicEnum.sfpp, 0.5f },
        { DynamicEnum.fp, 0.5f },
        { DynamicEnum.rf, 0.5f },
        { DynamicEnum.rfz, 0.5f },
        { DynamicEnum.sfz, 0.5f },
        { DynamicEnum.sffz, 0.5f },
        { DynamicEnum.fz, 0.5f } });
private static weight: number;
static private  listInstantaniousDynamics: Array < string >  =  __init(new Array<string>(), {
    "pppppp","ppppp","pppp","ppp","pp","p",
    "ffffff","fffff","ffff","fff","ff","f",
    "mf","mp","sf","sp","spp","fp","rf","rfz","sfz","sffz","fz" });
private multiExpression: MultiExpression;
private dynamicEnum: DynamicEnum;
private soundDynamic: number;
private placement: PlacementEnum;
private staffNumber: number;
private length: number;
public get ParentMultiExpression(): MultiExpression
{
    return this.multiExpression;
}
public set ParentMultiExpression(value: MultiExpression)
{
    this.multiExpression = value;
}
public get DynEnum(): DynamicEnum
{
    return this.dynamicEnum;
}
public set DynEnum(value: DynamicEnum)
{
    this.dynamicEnum = value;
}
public get SoundDynamic(): number
{
    return this.soundDynamic;
}
public set SoundDynamic(value: number)
{
    this.soundDynamic = value;
}
public get Placement(): PlacementEnum
{
    return this.placement;
}
public set Placement(value: PlacementEnum)
{
    this.placement = value;
}
public get StaffNumber(): number
{
    return this.staffNumber;
}
public set StaffNumber(value: number)
{
    this.staffNumber = value;
}
public get Length(): number
{
    if (Math.Abs(this.length - 0.0f) < 0.0001f)
    this.length = this.calculateLength();
    return this.length;
}
public get MidiVolume(): number
{
    return InstantaniousDynamicExpression.dynamicToRelativeVolumeDict[this.dynamicEnum] * 127f;
}
public static isInputStringInstantaniousDynamic(inputString:string): boolean
{
    if (inputString == null)
        return false;
    if (isStringInStringList(InstantaniousDynamicExpression.listInstantaniousDynamics, inputString))
        return true;
    return false;
}
public getInstantaniousDynamicSymbol(expressionSymbolEnum:DynamicExpressionSymbolEnum): FontInfo.MusicFontSymbol
{
    switch (expressionSymbolEnum) {
        case DynamicExpressionSymbolEnum.p:
            return FontInfo.MusicFontSymbol.P;
        case DynamicExpressionSymbolEnum.f:
            return FontInfo.MusicFontSymbol.F;
        case DynamicExpressionSymbolEnum.s:
            return FontInfo.MusicFontSymbol.S;
        case DynamicExpressionSymbolEnum.z:
            return FontInfo.MusicFontSymbol.Z;
        case DynamicExpressionSymbolEnum.m:
            return FontInfo.MusicFontSymbol.M;
        case DynamicExpressionSymbolEnum.r:
            return FontInfo.MusicFontSymbol.R;
        default:
            throw new ArgumentOutOfRangeException("expressionSymbolEnum");
    }
}
public getDynamicExpressionSymbol(c:string): DynamicExpressionSymbolEnum
{
    switch (c) {
        case 'p':
            return DynamicExpressionSymbolEnum.p;
        case 'f':
            return DynamicExpressionSymbolEnum.f;
        case 's':
            return DynamicExpressionSymbolEnum.s;
        case 'z':
            return DynamicExpressionSymbolEnum.z;
        case 'm':
            return DynamicExpressionSymbolEnum.m;
        case 'r':
            return DynamicExpressionSymbolEnum.r;
        default:
            throw new InvalidEnumArgumentException("unknown DynamicExpressionSymbolEnum: " + c);
    }
}
private calculateLength(): number
{
    var length: number = 0.0f;
    var dynamic: string = this.dynamicEnum.ToString();
    for (var idx: number = 0, len = dynamic.length; idx < len; ++idx) {
        var c: string = dynamic[idx];
        var dynamicExpressionSymbol: DynamicExpressionSymbolEnum = this.getDynamicExpressionSymbol(c);
        var symbol: FontInfo.MusicFontSymbol = this.getInstantaniousDynamicSymbol(dynamicExpressionSymbol);
        length += FontInfo.Info.getBoundingBox(symbol).Width;
    }
    return length;
} 
                }
export enum DynamicEnum {
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

    other = 23
}