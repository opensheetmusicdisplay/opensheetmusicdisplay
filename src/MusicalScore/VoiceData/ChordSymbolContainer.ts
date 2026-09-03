import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {MusicSheetCalculator} from "../Graphical/MusicSheetCalculator";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "../Graphical/EngravingRules";
import { PlacementEnum } from "./Expressions/AbstractExpression";
import {
    SMUFL_CHORD_AUGMENTED_GLYPH,
    SMUFL_CHORD_DIMINISHED_GLYPH,
    SMUFL_CHORD_HALF_DIMINISHED_GLYPH,
    SMUFL_CHORD_MAJOR_SEVENTH_GLYPH,
} from "../../Common/DataObjects/ChordSymbolGlyphs";

export class ChordSymbolContainer {
    private components: HarmonyChordComponent[];
    private rules: EngravingRules;
    public Placement: PlacementEnum;
    public Arrangement: HarmonyArrangement;

    constructor(
        rootPitch: Pitch,
        chordKind: ChordSymbolEnum,
        bassPitch: Pitch,
        chordDegrees: Degree[],
        rules: EngravingRules,
        placement: PlacementEnum = PlacementEnum.Above,
        components?: HarmonyChordComponent[],
        arrangement: HarmonyArrangement = undefined,
        bassSeparator: HarmonySeparator = undefined,
    ) {
        this.components = components?.length > 0
            ? components
            : [new HarmonyChordComponent(rootPitch, chordKind, bassPitch, chordDegrees)];
        this.rules = rules;
        this.Placement = placement;
        this.Arrangement = arrangement ?? (this.components.length > 1
            ? HarmonyArrangement.Vertical
            : HarmonyArrangement.Diagonal);
        if (bassSeparator && this.components[0]) {
            this.components[0].BassSeparator = bassSeparator;
        }
    }

    public get RootPitch(): Pitch {
        return this.components[0]?.RootPitch;
    }

    public get ChordKind(): ChordSymbolEnum {
        return this.components[0]?.ChordKind;
    }

    public get BassPitch(): Pitch {
        return this.components[0]?.BassPitch;
    }

    public get ChordDegrees(): Degree[] {
        return this.components[0]?.ChordDegrees ?? [];
    }

    public get Components(): HarmonyChordComponent[] {
        return this.components;
    }

    public get NumeralText(): string {
        return this.components[0]?.NumeralText;
    }

    public set NumeralText(value: string) {
        if (this.components[0]) {
            this.components[0].NumeralText = value;
        }
    }

    public get BassSeparator(): HarmonySeparator {
        return this.components[0]?.BassSeparator;
    }

    public static calculateChordText(chordSymbol: ChordSymbolContainer, transposeHalftones: number, keyInstruction: KeyInstruction): string {
        const componentTexts: string[] = chordSymbol.Components.map((component: HarmonyChordComponent): string =>
            chordSymbol.calculateComponentText(component, transposeHalftones, keyInstruction),
        );
        const separator: string = chordSymbol.Arrangement === HarmonyArrangement.Vertical ? "\n" : "/";
        return componentTexts.join(separator);
    }

    public calculateComponentText(component: HarmonyChordComponent, transposeHalftones: number,
                                  keyInstruction: KeyInstruction, includeBass: boolean = true): string {
        let text: string = this.calculateUpperHarmonyText(component, transposeHalftones, keyInstruction);
        if (includeBass && component.BassPitch) {
            text += component.BassSeparator?.text ?? "/";
            text += this.calculateBassText(component, transposeHalftones, keyInstruction);
        }
        return text;
    }

    public calculateUpperHarmonyText(component: HarmonyChordComponent, transposeHalftones: number,
                                     keyInstruction: KeyInstruction): string {
        if (component.NumeralText !== undefined) {
            return component.NumeralText;
        }
        let transposedRootPitch: Pitch = component.RootPitch;
        if (MusicSheetCalculator.transposeCalculator) {
            transposedRootPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                component.RootPitch,
                keyInstruction,
                transposeHalftones
            );
        }
        if (component.ChordKind === ChordSymbolEnum.none) {
            return this.getTextFromChordKindEnum(component.ChordKind);
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

        for (const chordDegree of component.ChordDegrees) {
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
        let chordKind: string = this.getTextFromChordKindEnum(component.ChordKind);
        const degreeTypeAry: string[] = ["adds", "alts", "subs"];
        const customChords: CustomChord[] = this.rules.CustomChords;
        for (const customChord of customChords) {
            if (customChord.chordKind !== component.ChordKind) {
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

        return text;
    }

    public calculateBassText(component: HarmonyChordComponent, transposeHalftones: number,
                             keyInstruction: KeyInstruction): string {
        if (!component.BassPitch) {
            return "";
        }
        let transposedBassPitch: Pitch = component.BassPitch;
        if (MusicSheetCalculator.transposeCalculator) {
            transposedBassPitch = MusicSheetCalculator.transposeCalculator.transposePitch(
                component.BassPitch,
                keyInstruction,
                transposeHalftones
            );
        }
        return Pitch.getNoteEnumString(transposedBassPitch.FundamentalNote) +
            this.getTextForAccidental(transposedBassPitch.Accidental);
    }

    private getTextForAccidental(alteration: AccidentalEnum): string {
        const text: string = this.rules.ChordAccidentalTexts.getValue(alteration);
        return text !== undefined ? text : "";
    }

    private getTextFromChordKindEnum(kind: ChordSymbolEnum): string {
        const configured: string = this.rules.ChordSymbolLabelTexts.getValue(kind) ?? "";
        switch (kind) {
            case ChordSymbolEnum.augmented:
            case ChordSymbolEnum.augmentedseventh:
                return configured.replace(/^(?:aug|\+)/i, SMUFL_CHORD_AUGMENTED_GLYPH);
            case ChordSymbolEnum.diminished:
            case ChordSymbolEnum.diminishedseventh:
                return configured.replace(/^(?:dim|o|°)/i, SMUFL_CHORD_DIMINISHED_GLYPH);
            case ChordSymbolEnum.halfdiminished:
                return configured.replace(/^(?:ø|0|half-diminished)/i, SMUFL_CHORD_HALF_DIMINISHED_GLYPH);
            case ChordSymbolEnum.majorseventh:
            case ChordSymbolEnum.majorninth:
            case ChordSymbolEnum.major11th:
            case ChordSymbolEnum.major13th:
                return configured.replace(/^(?:major|maj|△)/i, SMUFL_CHORD_MAJOR_SEVENTH_GLYPH);
            default:
                return configured;
        }
    }

}

export class HarmonyChordComponent {
    public RootPitch: Pitch;
    public ChordKind: ChordSymbolEnum;
    public BassPitch: Pitch;
    public ChordDegrees: Degree[];
    public NumeralText: string;
    public BassArrangement: HarmonyBassArrangement;
    public BassSeparator: HarmonySeparator;

    constructor(
        rootPitch: Pitch,
        chordKind: ChordSymbolEnum,
        bassPitch: Pitch,
        chordDegrees: Degree[] = [],
        numeralText: string = undefined,
        bassArrangement: HarmonyBassArrangement = undefined,
        bassSeparator: HarmonySeparator = undefined,
    ) {
        this.RootPitch = rootPitch;
        this.ChordKind = chordKind;
        this.BassPitch = bassPitch;
        this.ChordDegrees = chordDegrees;
        this.NumeralText = numeralText;
        this.BassArrangement = bassArrangement;
        this.BassSeparator = bassSeparator;
    }
}

export enum HarmonyArrangement {
    Horizontal = "horizontal",
    Vertical = "vertical",
    Diagonal = "diagonal",
}

export enum HarmonyBassArrangement {
    Horizontal = "horizontal",
    Vertical = "vertical",
    Diagonal = "diagonal",
}

export interface HarmonySeparator {
    text?: string;
    explicit: boolean;
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
