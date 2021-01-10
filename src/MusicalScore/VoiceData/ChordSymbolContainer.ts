import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "../Graphical/EngravingRules";

export class ChordSymbolContainer {
    private rootPitch: Pitch;
    private chordKind: ChordSymbolEnum;
    private bassPitch: Pitch;
    private degree: Degree;
    private rules: EngravingRules;

    constructor(rootPitch: Pitch, chordKind: ChordSymbolEnum, bassPitch: Pitch, chordDegree: Degree, rules: EngravingRules) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.bassPitch = bassPitch;
        this.degree = chordDegree;
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

    public get ChordDegree(): Degree {
        return this.degree;
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
        // main Note
        let text: string = Pitch.getNoteEnumString(transposedRootPitch.FundamentalNote);
        // main alteration
        if (transposedRootPitch.Accidental !== AccidentalEnum.NONE) {
            text += this.getTextForAccidental(transposedRootPitch.Accidental);
        }
        // chord kind text
        text += chordSymbol.getTextFromChordKindEnum(chordSymbol.ChordKind);
        // degree
        if (chordSymbol.ChordDegree) {
            switch (chordSymbol.ChordDegree.text) {
                case ChordDegreeText.add:
                    text += "add";
                    text += chordSymbol.ChordDegree.value.toString();
                    break;
                case ChordDegreeText.alter:
                    if (chordSymbol.ChordDegree.alteration !== AccidentalEnum.NONE) {
                        text += this.getTextForAccidental(chordSymbol.ChordDegree.alteration);
                    }
                    text += chordSymbol.ChordDegree.value.toString();
                    break;
                case ChordDegreeText.subtract:
                    text += "(omit";
                    text += chordSymbol.ChordDegree.value.toString();
                    text += ")";
                    break;
                default:
            }
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
    Tristan
}
