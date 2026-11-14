import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {MultiExpression} from "./MultiExpression";
import {DynamicExpressionSymbolEnum} from "./DynamicExpressionSymbolEnum";
//import {ArgumentOutOfRangeException} from "../../Exceptions";
import {InvalidEnumArgumentException} from "../../Exceptions";
import { log } from "../../../Common/Logging";
import { SourceMeasure } from "../SourceMeasure";
import { Fraction } from "../../../Common/DataObjects/Fraction";

export class InstantaneousDynamicExpression extends AbstractExpression {
    constructor(dynamicExpression: string, soundDynamics: number, placement: PlacementEnum, staffNumber: number,
                measure: SourceMeasure, dynamicEnum?: DynamicEnum) {
        super(placement);
        this.parentMeasure = measure;
        this.dynamicExpression = dynamicExpression;
        this.dynamicEnum = dynamicEnum ?? InstantaneousDynamicExpression.dynamicEnumFromText(dynamicExpression);
        this.soundDynamic = soundDynamics;
        this.staffNumber = staffNumber;
    }

    private multiExpression: MultiExpression;
    private dynamicExpression: string;
    private dynamicEnum: DynamicEnum;
    private soundDynamic: number;
    private staffNumber: number;
    private length: number;
    public InMeasureTimestamp: Fraction;

    public get ParentMultiExpression(): MultiExpression {
        return this.multiExpression;
    }
    public set ParentMultiExpression(value: MultiExpression) {
        this.multiExpression = value;
    }
    /** The marking as written, e.g. "sfmp" for <sf/><mp/>, "ffz" or "cresc." from <other-dynamics>. This is what gets rendered. */
    public get DynamicExpression(): string {
        return this.dynamicExpression;
    }
    public set DynamicExpression(value: string) {
        this.dynamicExpression = value;
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
        return this.Volume * 127;
    }

    /** The relative volume (0 to 1) of this marking, from its OSMD instance's table (EngravingRules.DynamicToRelativeVolumeDict,
     *  e.g. osmd.EngravingRules.DynamicToRelativeVolumeDict.setValue(DynamicEnum.p, 0.3)). Undefined for a marking created
     *  without a measure (and so without rules), which the MusicXML reader doesn't do.
     */
    public get Volume(): number {
        return this.parentMeasure?.Rules?.DynamicToRelativeVolumeDict.getValue(this.dynamicEnum);
    }

    public static isInputStringInstantaneousDynamic(inputString: string): boolean {
        if (!inputString) { return false; }
        return InstantaneousDynamicExpression.isStringInStringList(InstantaneousDynamicExpression.listInstantaneousDynamics, inputString);
    }

    /**
     * The playback dynamic (DynEnum) for the text of a marking, or undefined if the text doesn't denote one:
     * - the whole text, if it is a known dynamic: "sfz", "MF", "pf"
     * - for a plain sequence of dynamics letters, the longest known dynamic it starts with, i.e. the first symbol of a
     *   combined marking: "sfmp" -> sf, "ffz" -> ff (also how Finale, Sibelius and MuseScore write these in <other-dynamics>)
     * - for a text, its leading dynamic word: "f con fuoco" -> f, "p dolce" -> p. A dynamic letter that merely starts a
     *   longer word doesn't count ("fine", "forte", "pesante"), nor does a text not starting with a dynamic ("cresc.", "più f").
     */
    public static dynamicEnumFromText(text: string): DynamicEnum {
        const normalized: string = text?.trim().toLowerCase();
        if (!normalized) {
            return undefined;
        }
        if (!InstantaneousDynamicExpression.knownDynamicNames) {
            // built lazily: DynamicEnum is declared after this class in the module, so it isn't available while the
            //   class's statics are initialized
            InstantaneousDynamicExpression.knownDynamicNames = Object.keys(DynamicEnum)
                .filter((key: string): boolean => isNaN(Number(key)) && key !== "other")
                .sort((a: string, b: string): number => b.length - a.length); // longest first: "sff" before "sf" before... ("s" is none)
        }
        const leadingDynamic: string = InstantaneousDynamicExpression.knownDynamicNames.find(
            (name: string): boolean => normalized.startsWith(name));
        if (!leadingDynamic) {
            return undefined;
        }
        const rest: string = normalized.substring(leadingDynamic.length);
        const isSymbolSequence: boolean = /^[pfmsrzn]+$/.test(normalized);
        if (rest.length === 0 || isSymbolSequence || !/^[a-zà-ÿ]/.test(rest)) {
            return DynamicEnum[leadingDynamic];
        }
        return undefined; // the dynamic letter(s) just start a longer word, e.g. "fine"
    }

    /** All known dynamics (the DynamicEnum names except "other"), longest first. See dynamicEnumFromText(). */
    private static knownDynamicNames: string[];

    //private static weight: number;
    private static listInstantaneousDynamics: string[] =  [
        "pppppp", "ppppp", "pppp", "ppp", "pp", "p",
        "ffffff", "fffff", "ffff", "fff", "ff", "f",
        "mf", "mp", "sf", "sff", "sp", "spp", "fp", "rf", "rfz", "sfz", "sffz", "fz",
        "pf", "sfzp", "n", // MusicXML 4.0
    ];

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
    other = 24,
    // added in MusicXML 4.0:
    /** poco forte */
    pf = 25,
    /** sforzando-piano */
    sfzp = 26,
    /** niente */
    n = 27
}

