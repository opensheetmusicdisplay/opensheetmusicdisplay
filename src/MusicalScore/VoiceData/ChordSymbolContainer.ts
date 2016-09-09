import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";

export class ChordSymbolContainer {
    private rootPitch: Pitch;
    private chordKind: ChordSymbolEnum;
    private bassPitch: Pitch;
    private degree: Degree;
    private keyInstruction: KeyInstruction;

    constructor(rootPitch: Pitch, chordKind: ChordSymbolEnum, bassPitch: Pitch, chordDegree: Degree, keyInstruction: KeyInstruction) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.keyInstruction = keyInstruction;
        this.bassPitch = bassPitch;
        this.degree = chordDegree;
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

    public get KeyInstruction(): KeyInstruction {
        return this.keyInstruction;
    }

    public static calculateChordText(chordSymbol: ChordSymbolContainer, transposeHalftones: number): string {
        let transposedRootPitch: Pitch = chordSymbol.RootPitch;
        if (MusicSheetCalculator.transposeCalculator !== undefined) {
            transposedRootPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                chordSymbol.RootPitch,
                chordSymbol.KeyInstruction,
                transposeHalftones
            );
        }
        let text: string = Pitch.getNoteEnumString(transposedRootPitch.FundamentalNote);
        if (transposedRootPitch.Accidental !== AccidentalEnum.NONE) {
            text += this.getTextForAccidental(transposedRootPitch.Accidental);
        }
        text += ChordSymbolContainer.getTextFromChordKindEnum(chordSymbol.ChordKind);
        if (chordSymbol.BassPitch !== undefined) {
            let transposedBassPitch: Pitch = chordSymbol.BassPitch;
            if (MusicSheetCalculator.transposeCalculator !== undefined) {
                transposedBassPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                    chordSymbol.BassPitch,
                    chordSymbol.KeyInstruction,
                    transposeHalftones
                );
            }
            text += "/";
            text += Pitch.getNoteEnumString(transposedBassPitch.FundamentalNote);
            text += this.getTextForAccidental(transposedBassPitch.Accidental);
        }
        if (chordSymbol.ChordDegree !== undefined) {
            switch (chordSymbol.ChordDegree.text) {
                case ChordDegreeText.add:
                    text += "add";
                    break;
                case ChordDegreeText.alter:
                    text += "alt";
                    break;
                case ChordDegreeText.subtract:
                    text += "sub";
                    break;
                default:
            }
            text += chordSymbol.ChordDegree.value;
            if (chordSymbol.ChordDegree.alteration !== AccidentalEnum.NONE) {
                text += ChordSymbolContainer.getTextForAccidental(chordSymbol.ChordDegree.alteration);
            }
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

    private static getTextFromChordKindEnum(kind: ChordSymbolEnum): string {
        let text: string = "";
        switch (kind) {
            case ChordSymbolEnum.major:
                break;
            case ChordSymbolEnum.minor:
                text += "m";
                break;
            case ChordSymbolEnum.augmented:
                text += "aug";
                break;
            case ChordSymbolEnum.diminished:
                text += "dim";
                break;
            case ChordSymbolEnum.dominant:
                text += "7";
                break;
            case ChordSymbolEnum.majorseventh:
                text += "maj7";
                break;
            case ChordSymbolEnum.minorseventh:
                text += "m7";
                break;
            case ChordSymbolEnum.diminishedseventh:
                text += "dim7";
                break;
            case ChordSymbolEnum.augmentedseventh:
                text += "aug7";
                break;
            case ChordSymbolEnum.halfdiminished:
                text += "m7b5";
                break;
            case ChordSymbolEnum.majorminor:
                text += "";
                break;
            case ChordSymbolEnum.majorsixth:
                text += "maj6";
                break;
            case ChordSymbolEnum.minorsixth:
                text += "m6";
                break;
            case ChordSymbolEnum.dominantninth:
                text += "9";
                break;
            case ChordSymbolEnum.majorninth:
                text += "maj9";
                break;
            case ChordSymbolEnum.minorninth:
                text += "m9";
                break;
            case ChordSymbolEnum.dominant11th:
                text += "11";
                break;
            case ChordSymbolEnum.major11th:
                text += "maj11";
                break;
            case ChordSymbolEnum.minor11th:
                text += "m11";
                break;
            case ChordSymbolEnum.dominant13th:
                text += "13";
                break;
            case ChordSymbolEnum.major13th:
                text += "maj13";
                break;
            case ChordSymbolEnum.minor13th:
                text += "m13";
                break;
            case ChordSymbolEnum.suspendedsecond:
                text += "sus2";
                break;
            case ChordSymbolEnum.suspendedfourth:
                text += "sus4";
                break;
            case ChordSymbolEnum.Neapolitan:
            case ChordSymbolEnum.Italian:
            case ChordSymbolEnum.French:
            case ChordSymbolEnum.German:
            case ChordSymbolEnum.pedal:
            case ChordSymbolEnum.power:
            case ChordSymbolEnum.Tristan:
                break;
            default:
                break;
        }
        return text;
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
