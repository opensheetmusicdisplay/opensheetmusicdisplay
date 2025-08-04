import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "../Graphical/EngravingRules";
import { PlacementEnum } from "./Expressions/AbstractExpression";

export class ChordSymbolContainer {
    private rootPitch: Pitch;
    private chordKind: ChordSymbolEnum;
    public NumeralText: string;
    private bassPitch: Pitch;
    private degrees: Degree[];
    private rules: EngravingRules;
    public Placement: PlacementEnum;

    constructor(
        rootPitch: Pitch,
        chordKind: ChordSymbolEnum,
        bassPitch: Pitch,
        chordDegrees: Degree[],
        rules: EngravingRules,
        placement: PlacementEnum = PlacementEnum.Above
    ) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.bassPitch = bassPitch;
        this.degrees = chordDegrees;
        this.rules = rules;
        this.Placement = placement;
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
        // if (!chordSymbol) { // undefined
        //     return; // handled in VexFlowGraphicalSymbolFactory.createChordSymbols
        // }
        if (chordSymbol.NumeralText !== undefined) { // if(chordSymbol.NumeralText) doesn't match empty string
            return chordSymbol.NumeralText;
        }
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
            text += chordSymbol.getTextForAccidental(transposedRootPitch.Accidental);
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
                    t += chordSymbol.getTextForAccidental(chordDegree.alteration);
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
        let chordKind: string = chordSymbol.getTextFromChordKindEnum(chordSymbol.ChordKind);
        const degreeTypeAry: string[] = ["adds", "alts", "subs"];
        const customChords: CustomChord[] = chordSymbol.rules.CustomChords;
        for (const customChord of customChords) {
            if (customChord.chordKind !== chordSymbol.chordKind) {
                continue;
            }

            let hasCustomChordDegrees: boolean = true;
            for (const degType of degreeTypeAry) {
                for (const deg of (customChord.degrees[degType] || [])) {
                    if (degrees[degType].indexOf(deg) < 0) {
                        hasCustomChordDegrees = false;
                        break;
                    }
                }
                if (!hasCustomChordDegrees) {
                    break;
                }
            }
            if (hasCustomChordDegrees) {
                for (const degType of degreeTypeAry) {
                    for (const deg of (customChord.degrees[degType] || [])) {
                        // delete degree since we don't want it displayed when the alternate name of the customChord should contain the degrees.
                        degrees[degType].splice(degrees[degType].indexOf(deg), 1);
                    }
                }
                chordKind = customChord.alternateName;
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
            text += chordSymbol.getTextForAccidental(transposedBassPitch.Accidental);
        }
        return text;
    }

    private getTextForAccidental(alteration: AccidentalEnum): string {
        const text: string = this.rules.ChordAccidentalTexts.getValue(alteration);
        return text !== undefined ? text : "";
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

export class CustomChord {
    public alternateName: string;
    public chordKind: ChordSymbolEnum;
    public degrees: DegreesInfo;

    constructor(
        alternateName: string,
        chordKind: ChordSymbolEnum,
        degrees: DegreesInfo,
    ) {
        this.alternateName = alternateName;
        this.chordKind = chordKind;
        this.degrees = degrees;
    }

    public static createCustomChord(
        altName: string,
        chordKind: ChordSymbolEnum,
        degrees: DegreesInfo,
    ): CustomChord {
        return new CustomChord(altName, chordKind, degrees);
    }

    public static renameCustomChord(
        altName: string,
        newAltName: string,
        customChords: CustomChord[],
    ): void {
        for (const customChord of customChords) {
            if (customChord.alternateName === altName) {
                customChord.alternateName = newAltName;
            }
        }
    }
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
