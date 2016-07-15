import Vex = require("vexflow");
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { Pitch } from "../../../Common/DataObjects/pitch";
import { Fraction } from "../../../Common/DataObjects/fraction";
import { RhythmInstruction } from "../../VoiceData/Instructions/RhythmInstruction";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { AccidentalEnum } from "../../../Common/DataObjects/pitch";
import { GraphicalNote } from "../GraphicalNote";
import { SystemLinesEnum } from "../SystemLinesEnum";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { Fonts } from "../../../Common/Enums/Fonts";
import { OutlineAndFillStyleEnum } from "../DrawingEnums";
export declare class VexFlowConverter {
    private static majorMap;
    private static minorMap;
    static duration(fraction: Fraction): string;
    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    static pitch(pitch: Pitch, clef: ClefInstruction): [string, string, ClefInstruction];
    /**
     * Converts AccidentalEnum to vexFlow accidental string
     * @param accidental
     * @returns {string}
     */
    static accidental(accidental: AccidentalEnum): string;
    static StaveNote(notes: GraphicalNote[]): Vex.Flow.StaveNote;
    static Clef(clef: ClefInstruction): string;
    static TimeSignature(rhythm: RhythmInstruction): Vex.Flow.TimeSignature;
    static keySignature(key: KeyInstruction): string;
    static line(lineType: SystemLinesEnum): any;
    static font(fontSize: number, fontStyle?: FontStyles, font?: Fonts): string;
    static style(styleId: OutlineAndFillStyleEnum): string;
}
