import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "../Graphical/EngravingRules";
import { CustomChordKind } from "./CustomChordKind";

export class ChordSymbolContainer {
    private rootPitch: Pitch;
    private chordKind: ChordSymbolEnum;
    private bassPitch: Pitch;
    private degrees: Degree[];
    private rules: EngravingRules;

    constructor(
        rootPitch: Pitch,
        chordKind: ChordSymbolEnum,
        bassPitch: Pitch,
        chordDegrees: Degree[],
        rules: EngravingRules
    ) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.bassPitch = bassPitch;
        this.degrees = chordDegrees;
        this.rules = rules;
    }

    public get RootPitch(): Pitch {
        return this.rootPitch;
    }

    public get ChordKind(): ChordSymbolEnum {
        return this.chordKind;
    }

    public get BassPitch(): Pitch {
        return this.bassPitch;
    }

    public get ChordDegrees(): Degree[] {
        return this.degrees;
    }

    public static calculateChordText(chordSymbol: ChordSymbolContainer, transposeHalftones: number, keyInstruction: KeyInstruction): string {
        let transposedRootPitch: Pitch = chordSymbol.RootPitch;

        if (MusicSheetCalculator.transposeCalculator) {
            transposedRootPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                chordSymbol.RootPitch,
                keyInstruction,
                transposeHalftones
            );
        }
        if (chordSymbol.ChordKind === ChordSymbolEnum.none) {
            return chordSymbol.getTextFromChordKindEnum(chordSymbol.ChordKind);
        }
        // main Note
        let text: string = Pitch.getNoteEnumString(transposedRootPitch.FundamentalNote);
        // main alteration
        if (transposedRootPitch.Accidental !== AccidentalEnum.NONE) {
            text += this.getTextForAccidental(transposedRootPitch.Accidental);
        }

        // degrees
        const degrees: DegreesInfo = {
            adds: [],
            alts: [],
            subs: [],
        };

        for (const chordDegree of chordSymbol.ChordDegrees) {
            if (chordDegree) {
                let t: string = "";
                if (chordDegree.alteration !== AccidentalEnum.NONE) {
                    t += this.getTextForAccidental(chordDegree.alteration);
                }
                t += chordDegree.value;
                switch (chordDegree.text) {
                    case ChordDegreeText.add:
                        degrees.adds.push(t);
                        break;
                    case ChordDegreeText.alter:
                        degrees.alts.push(t);
                        break;
                    case ChordDegreeText.subtract:
                        degrees.subs.push(t);
                        break;
                    default:
                }
            }
        }

        // chord kind text
        // I'm going to store this in a variable for now so I can evaluate it with the degrees
        let chordKind: string = chordSymbol.getTextFromChordKindEnum(chordSymbol.ChordKind);
        const degreeTypeAry: string[] = ["adds", "alts", "subs"];

        const customChordKinds: CustomChordKind[] = chordSymbol.rules.CustomChordKinds;

        for (const customKind of customChordKinds) {
            if (
                customKind.chordKind !== chordSymbol.chordKind
            ) {
                continue;
            }

            let check: boolean = true;

            for (const degType of degreeTypeAry) {
                for (const deg of (customKind[degType] || [])) {
                    if (degrees[degType].indexOf(deg) < 0) {
                        check = false;
                        break;
                    }
                }
                if (check === false) {
                    break;
                }
            }
            if (check) {
                for (const degType of degreeTypeAry) {
                    for (const deg of (customKind[degType] || [])) {
                        degrees[degType].splice(degrees[degType].indexOf(deg), 1);
                    }
                }
                chordKind = customKind.alternateName;
            }
        }

        text += chordKind;

        if (degrees.adds.length > 0) {
            text += "(" + degrees.adds.join(",") + ")";
        }
        if (degrees.alts.length > 0) {
            text += "(alt " + degrees.alts.join(",") + ")";
        }
        if (degrees.subs.length > 0) {
            text += "(omit " + degrees.subs.join(",") + ")";
        }

        // bass
        if (chordSymbol.BassPitch) {
            let transposedBassPitch: Pitch = chordSymbol.BassPitch;
            if (MusicSheetCalculator.transposeCalculator) {
                transposedBassPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                    chordSymbol.BassPitch,
                    keyInstruction,
                    transposeHalftones
                );
            }
            text += "/";
            text += Pitch.getNoteEnumString(transposedBassPitch.FundamentalNote);
            text += this.getTextForAccidental(transposedBassPitch.Accidental);
        }
        console.log(text);
        return text;
    }

    private static getTextForAccidental(alteration: AccidentalEnum): string {
        let text: string = "";
        switch (alteration) {
            case AccidentalEnum.DOUBLEFLAT:
                text += "bb";
                break;
            case AccidentalEnum.FLAT:
                text += "b";
                break;
            case AccidentalEnum.SHARP:
                text += "#";
                break;
            case AccidentalEnum.DOUBLESHARP:
                text += "x";
                break;
            default:
        }
        return text;
    }

    private getTextFromChordKindEnum(kind: ChordSymbolEnum): string {
        return this.rules.ChordSymbolLabelTexts.getValue(kind) ?? "";
    }

}

export class Degree {
    constructor(value: number, alteration: AccidentalEnum, text: ChordDegreeText) {
        this.value = value;
        this.alteration = alteration;
        this.text = text;
    }

    public value: number;
    public alteration: AccidentalEnum;
    public text: ChordDegreeText;
}

export interface DegreesInfo {
    adds?: string[];
    alts?: string[];
    subs?: string[];
}

export enum ChordDegreeText {
    add,
    alter,
    subtract
}

export enum ChordSymbolEnum {
    major,
    minor,
    augmented,
    diminished,
    dominant,
    majorseventh,
    minorseventh,
    diminishedseventh,
    augmentedseventh,
    halfdiminished,
    majorminor,
    majorsixth,
    minorsixth,
    dominantninth,
    majorninth,
    minorninth,
    dominant11th,
    major11th,
    minor11th,
    dominant13th,
    major13th,
    minor13th,
    suspendedsecond,
    suspendedfourth,
    Neapolitan,
    Italian,
    French,
    German,
    pedal,
    power,
    Tristan,
    none
}
