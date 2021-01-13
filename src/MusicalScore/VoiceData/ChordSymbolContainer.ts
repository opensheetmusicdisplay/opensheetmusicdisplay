import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "../Graphical/EngravingRules";

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
        // main Note
        let text: string = Pitch.getNoteEnumString(transposedRootPitch.FundamentalNote);
        // main alteration
        if (transposedRootPitch.Accidental !== AccidentalEnum.NONE) {
            text += this.getTextForAccidental(transposedRootPitch.Accidental);
        }
        // chord kind text
        text += chordSymbol.getTextFromChordKindEnum(chordSymbol.ChordKind);
        // degrees
        const adds: string[] = [];
        const alts: string[] = [];
        const subs: string[] = [];
        for (const chordDegree of chordSymbol.ChordDegrees) {
            if (chordDegree) {
                let t: string = "";
                if (chordDegree.alteration !== AccidentalEnum.NONE) {
                    t += this.getTextForAccidental(chordDegree.alteration);
                }
                t += chordDegree.value;
                switch (chordDegree.text) {
                    case ChordDegreeText.add:
                        adds.push(t);
                        break;
                    case ChordDegreeText.alter:
                        alts.push(t);
                        break;
                    case ChordDegreeText.subtract:
                        subs.push(t);
                        break;
                    default:
                }
            }
        }
        //check for an altered chord and simplify
        //in MuseScore 3, an altered chord is given #5, b9, #9 and alt b5 degrees
        //I'm just replacing all those with an "alt" designation.
        if (
            adds.indexOf("#5") >= 0 &&
            adds.indexOf("b9") >= 0 &&
            adds.indexOf("#9") >= 0 &&
            alts.indexOf("b5") >= 0
        ) {
            text += "alt";
            adds.splice(adds.indexOf("#5"), 1);
            adds.splice(adds.indexOf("b9"), 1);
            adds.splice(adds.indexOf("#9"), 1);
            alts.splice(alts.indexOf("b5"), 1);
        }
        //check for sus chords
        if (
            adds.indexOf("4") >= 0 &&
            subs.indexOf("3") >= 0
        ) {
            text += "sus4";
            adds.splice(adds.indexOf("4"), 1);
            subs.splice(subs.indexOf("3"), 1);
        }

        if (adds.length > 0) {
            text += "(" + adds.join(",") + ")";
        }
        if (alts.length > 0) {
            text += "(alt " + alts.join(",") + ")";
        }
        if (subs.length > 0) {
            text += "(omit " + subs.join(",") + ")";
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
