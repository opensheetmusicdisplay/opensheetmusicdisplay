import {Pitch, AccidentalEnum} from "../../Common/DataObjects/pitch";
import {KeyInstruction} from "./Instructions/KeyInstruction";
export class ChordSymbolContainer {
    constructor(rootPitch: Pitch, chordKind: ChordSymbolEnum, bassPitch: Pitch, chordDegree: Degree, keyInstruction: KeyInstruction) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.keyInstruction = keyInstruction;
        this.bassPitch = bassPitch;
        this.degree = chordDegree;
    }
    private rootPitch: Pitch;
    private chordKind: ChordSymbolEnum;
    private bassPitch: Pitch;
    private degree: Degree;
    private keyInstruction: KeyInstruction;
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
}
export class Degree {
    constructor(value: number, alteration: AccidentalEnum, text: ChordDegreeText) {
        this.Value = value;
        this.Alteration = alteration;
        this.Text = text;
    }
    public Value: number;
    public Alteration: AccidentalEnum;
    public Text: ChordDegreeText;
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