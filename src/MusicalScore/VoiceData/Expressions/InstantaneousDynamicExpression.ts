import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {MultiExpression} from "./MultiExpression";
import {DynamicExpressionSymbolEnum} from "./DynamicExpressionSymbolEnum";
//import {ArgumentOutOfRangeException} from "../../Exceptions";
import {InvalidEnumArgumentException} from "../../Exceptions";
import * as log from "loglevel";

export class InstantaneousDynamicExpression extends AbstractExpression {
    constructor(dynamicExpression: string, soundDynamics: number, placement: PlacementEnum, staffNumber: number) {
        super(placement);
        this.dynamicEnum = DynamicEnum[dynamicExpression.toLowerCase()];
        this.soundDynamic = soundDynamics;
        this.staffNumber = staffNumber;
    }
    public static dynamicToRelativeVolumeDict: { [_: string]: number; } = {
        "f": 92.0 / 127.0,
        "ff": 108.0 / 127.0,
        "fff": 124.0 / 127.0,
        "ffff": 125.0 / 127.0,
        "fffff": (126.0 / 127.0) ,
        "ffffff": (127.0 / 127.0),
        "fp": 0.5,
        "fz": 0.5,
        "mf": 76.0 / 127.0,
        "mp": 60.0 / 127.0,
        "p": 44.0 / 127.0,
        "pp": 28.0 / 127.0,
        "ppp": 12.0 / 127.0,
        "pppp": 10.0 / 127.0,
        "ppppp": 8.0 / 127.0,
        "pppppp": 6.0 / 127.0,
        "rf": 0.5,
        "rfz": 0.5,
        "sf": 0.5,
        "sff": 0.5,
        "sffz": 0.5,
        "sfp": 0.5,
        "sfpp": 0.5,
        "sfz": 0.5
    };

    //private static weight: number;
    private static listInstantaneousDynamics: string[] =  [
        "pppppp", "ppppp", "pppp", "ppp", "pp", "p",
        "ffffff", "fffff", "ffff", "fff", "ff", "f",
        "mf", "mp", "sf", "sff", "sp", "spp", "fp", "rf", "rfz", "sfz", "sffz", "fz",
    ];

    private multiExpression: MultiExpression;
    private dynamicEnum: DynamicEnum;
    private soundDynamic: number;
    private staffNumber: number;
    private length: number;

    public get ParentMultiExpression(): MultiExpression {
        return this.multiExpression;
    }
    public set ParentMultiExpression(value: MultiExpression) {
        this.multiExpression = value;
    }
    public get DynEnum(): DynamicEnum {
        return this.dynamicEnum;
    }
    public set DynEnum(value: DynamicEnum) {
        this.dynamicEnum = value;
    }
    public get SoundDynamic(): number {
        return this.soundDynamic;
    }
    public set SoundDynamic(value: number) {
        this.soundDynamic = value;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get Length(): number {
        if (Math.abs(this.length) < 0.0001) {
            this.length = this.calculateLength();
        }
        return this.length;
    }
    public get MidiVolume(): number {
        return InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[this.dynamicEnum] * 127;
    }
    public static isInputStringInstantaneousDynamic(inputString: string): boolean {
        if (inputString === undefined) { return false; }
        return InstantaneousDynamicExpression.isStringInStringList(InstantaneousDynamicExpression.listInstantaneousDynamics, inputString);
    }

    //public getInstantaneousDynamicSymbol(expressionSymbolEnum:DynamicExpressionSymbolEnum): FontInfo.MusicFontSymbol {
    //    switch (expressionSymbolEnum) {
    //        case DynamicExpressionSymbolEnum.p:
    //            return FontInfo.MusicFontSymbol.P;
    //        case DynamicExpressionSymbolEnum.f:
    //            return FontInfo.MusicFontSymbol.F;
    //        case DynamicExpressionSymbolEnum.s:
    //            return FontInfo.MusicFontSymbol.S;
    //        case DynamicExpressionSymbolEnum.z:
    //            return FontInfo.MusicFontSymbol.Z;
    //        case DynamicExpressionSymbolEnum.m:
    //            return FontInfo.MusicFontSymbol.M;
    //        case DynamicExpressionSymbolEnum.r:
    //            return FontInfo.MusicFontSymbol.R;
    //        default:
    //            throw new ArgumentOutOfRangeException("expressionSymbolEnum");
    //    }
    //}
    public getDynamicExpressionSymbol(c: string): DynamicExpressionSymbolEnum  {
        switch (c) {
            case "p":
                return DynamicExpressionSymbolEnum.p;
            case "f":
                return DynamicExpressionSymbolEnum.f;
            case "s":
                return DynamicExpressionSymbolEnum.s;
            case "z":
                return DynamicExpressionSymbolEnum.z;
            case "m":
                return DynamicExpressionSymbolEnum.m;
            case "r":
                return DynamicExpressionSymbolEnum.r;
            default:
                throw new InvalidEnumArgumentException("unknown DynamicExpressionSymbolEnum: " + c);
        }
    }
    private calculateLength(): number {
        //let length: number = 0.0;
        //let dynamic: string = DynamicEnum[this.dynamicEnum];
        //for (let idx: number = 0, len: number = dynamic.length; idx < len; ++idx) {
        //    let c: string = dynamic[idx];
        //    let dynamicExpressionSymbol: DynamicExpressionSymbolEnum = this.getDynamicExpressionSymbol(c);
        //    let symbol: FontInfo.MusicFontSymbol = this.getInstantaneousDynamicSymbol(dynamicExpressionSymbol);
        //    length += FontInfo.Info.getBoundingBox(symbol).Width;
        //}
        //return length;
        log.debug("[Andrea] instantaneousDynamicExpression: not implemented: calculateLength!");
        return 0.0;
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
    sff = 15,
    sfp = 16,
    sfpp = 17,
    fp = 18,
    rf = 19,
    rfz = 20,
    sfz = 21,
    sffz = 22,
    fz = 23,
    other = 24
}
