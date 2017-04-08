import Vex = require("vexflow");
import {ClefEnum} from "../../VoiceData/Instructions/ClefInstruction";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {Pitch} from "../../../Common/DataObjects/Pitch";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {RhythmSymbolEnum} from "../../VoiceData/Instructions/RhythmInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {KeyEnum} from "../../VoiceData/Instructions/KeyInstruction";
import {AccidentalEnum} from "../../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../../Common/DataObjects/Pitch";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";
import {GraphicalNote} from "../GraphicalNote";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {OutlineAndFillStyleEnum} from "../DrawingEnums";

/**
 * Helper class, which contains static methods which actually convert
 * from OSMD objects to VexFlow objects.
 */
export class VexFlowConverter {
    /**
     * Mapping from numbers of alterations on the key signature to major keys
     * @type {[alterationsNo: number]: string; }
     */
    private static majorMap: {[_: number]: string; } = {
        "-1": "F", "-2": "Bb", "-3": "Eb", "-4": "Ab", "-5": "Db", "-6": "Gb", "-7": "Cb", "-8": "Fb",
        "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F#", "7": "C#", "8": "G#"
    };
    /**
     * Mapping from numbers of alterations on the key signature to minor keys
     * @type {[alterationsNo: number]: string; }
     */
    private static minorMap: {[_: number]: string; } = {
        "-1": "D", "-2": "G", "-3": "C", "-4": "F", "-5": "Bb", "-6": "Eb", "-7": "Ab", "-8": "Db",
        "0": "A", "1": "E", "2": "B", "3": "F#", "4": "C#", "5": "G#", "6": "D#", "7": "A#", "8": "E#"
    };

    /**
     * Convert a fraction to a string which represents a duration in VexFlow
     * @param fraction a fraction representing the duration of a note
     * @returns {string}
     */
    public static duration(fraction: Fraction): string {
        let dur: number = fraction.RealValue;
        if (dur >= 1) {
            return "w";
        } else if (dur < 1 && dur >= 0.5) {
            return "h";
        } else if (dur < 0.5 && dur >= 0.25) {
            return "q";
        } else if (dur < 0.25 && dur >= 0.125) {
            return "8";
        } else if (dur < 0.125 && dur >= 0.0625) {
            return "16";
        } else if (dur < 0.0625 && dur >= 0.03125) {
            return "32";
        }
        return "128";
    }

    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    public static pitch(pitch: Pitch, clef: ClefInstruction): [string, string, ClefInstruction] {
        let fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        // The octave seems to need a shift of three FIXME?
        let octave: number = pitch.Octave - clef.OctaveOffset + 3;
        let acc: string = VexFlowConverter.accidental(pitch.Accidental);
        return [fund + "n/" + octave, acc, clef];
    }

    /**
     * Converts AccidentalEnum to a string which represents an accidental in VexFlow
     * @param accidental
     * @returns {string}
     */
    public static accidental(accidental: AccidentalEnum): string {
        let acc: string;
        switch (accidental) {
            case AccidentalEnum.NONE:
                acc = "n";
                break;
            case AccidentalEnum.FLAT:
                acc = "b";
                break;
            case AccidentalEnum.SHARP:
                acc = "#";
                break;
            case AccidentalEnum.DOUBLESHARP:
                acc = "##";
                break;
            case AccidentalEnum.DOUBLEFLAT:
                acc = "bb";
                break;
            default:
        }
        return acc;
    }

    /**
     * Convert a set of GraphicalNotes to a VexFlow StaveNote
     * @param notes form a chord on the staff
     * @returns {Vex.Flow.StaveNote}
     */
    public static StaveNote(notes: GraphicalNote[]): Vex.Flow.StaveNote {
        let keys: string[] = [];
        let accidentals: string[] = [];
        let frac: Fraction = notes[0].graphicalNoteLength;
        let duration: string = VexFlowConverter.duration(frac);
        let vfClefType: string = undefined;
        let numDots: number = 0;
        for (let note of notes) {
            let res: [string, string, ClefInstruction] = (note as VexFlowGraphicalNote).vfpitch;
            if (res === undefined) {
                keys = ["b/4"];
                duration += "r";
                break;
            }
            keys.push(res[0]);
            accidentals.push(res[1]);
            if (!vfClefType) {
                let vfClef: {type: string, annotation: string} = VexFlowConverter.Clef(res[2]);
                vfClefType = vfClef.type;
            }
            if (numDots < note.numberOfDots) {
                numDots = note.numberOfDots;
            }
        }
        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            duration += "d";
        }

        let vfnote: Vex.Flow.StaveNote = new Vex.Flow.StaveNote({
            auto_stem: true,
            clef: vfClefType,
            duration: duration,
            duration_override: {
                denominator: frac.Denominator,
                numerator: frac.Numerator,
            },
            keys: keys,
        });

        for (let i: number = 0, len: number = notes.length; i < len; i += 1) {
            (notes[i] as VexFlowGraphicalNote).setIndex(vfnote, i);
            if (accidentals[i]) {
                vfnote.addAccidental(i, new Vex.Flow.Accidental(accidentals[i]));
            }
        }
        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            vfnote.addDotToAll();
        }

        return vfnote;
    }

    /**
     * Convert a ClefInstruction to a string representing a clef type in VexFlow
     * @param clef
     * @returns {string}
     * @constructor
     */
    public static Clef(clef: ClefInstruction): {type: string, annotation: string} {
        let type: string;
        let annotation: string = undefined;

        switch (clef.ClefType) {
            case ClefEnum.G:
                type = "treble";
                break;
            case ClefEnum.F:
                type = "bass";
                break;
            case ClefEnum.C:
                type = "alto";
                break;
            case ClefEnum.percussion:
                type = "percussion";
                break;
            case ClefEnum.TAB:
                type = "tab";
                break;
            default:
        }

        switch (clef.OctaveOffset) {
            case 1:
                annotation = "8va";
                break;
            case -1:
                annotation = "8vb";
                break;
            default:
        }
        return {type, annotation};
    }

    /**
     * Convert a RhythmInstruction to a VexFlow TimeSignature object
     * @param rhythm
     * @returns {Vex.Flow.TimeSignature}
     * @constructor
     */
    public static TimeSignature(rhythm: RhythmInstruction): Vex.Flow.TimeSignature {
        let timeSpec: string;
        switch (rhythm.SymbolEnum) {
            case RhythmSymbolEnum.NONE:
                timeSpec = rhythm.Rhythm.Numerator + "/" + rhythm.Rhythm.Denominator;
                break;
            case RhythmSymbolEnum.COMMON:
                timeSpec = "C";
                break;
            case RhythmSymbolEnum.CUT:
                timeSpec = "C|";
                break;
            default:
        }
        return new Vex.Flow.TimeSignature(timeSpec);
    }

    /**
     * Convert a KeyInstruction to a string representing in VexFlow a key
     * @param key
     * @returns {string}
     */
    public static keySignature(key: KeyInstruction): string {
        if (key === undefined) {
            return undefined;
        }
        let ret: string;
        switch (key.Mode) {
            case KeyEnum.minor:
                ret = VexFlowConverter.minorMap[key.Key] + "m";
                break;
            case KeyEnum.major:
                ret = VexFlowConverter.majorMap[key.Key];
                break;
            case KeyEnum.none:
            default:
                ret = "C";
        }
        return ret;
    }

    /**
     * Converts a lineType to a VexFlow StaveConnector type
     * @param lineType
     * @returns {any}
     */
    public static line(lineType: SystemLinesEnum): any {
        // TODO Not all line types are correctly mapped!
        switch (lineType) {
            case SystemLinesEnum.SingleThin:
                return Vex.Flow.StaveConnector.type.SINGLE;
            case SystemLinesEnum.DoubleThin:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum.ThinBold:
                return Vex.Flow.StaveConnector.type.SINGLE;
            case SystemLinesEnum.BoldThinDots:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum.DotsThinBold:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum.DotsBoldBoldDots:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum.None:
                return Vex.Flow.StaveConnector.type.NONE;
            default:
        }
    }

    /**
     * Construct a string which can be used in a CSS font property
     * @param fontSize
     * @param fontStyle
     * @param font
     * @returns {string}
     */
    public static font(fontSize: number, fontStyle: FontStyles = FontStyles.Regular, font: Fonts = Fonts.TimesNewRoman): string {
        let style: string = "normal";
        let weight: string = "normal";
        let family: string = "'Times New Roman'";

        switch (fontStyle) {
            case FontStyles.Bold:
                weight = "bold";
                break;
            case FontStyles.Italic:
                style = "italic";
                break;
            case FontStyles.BoldItalic:
                style = "italic";
                weight = "bold";
                break;
            case FontStyles.Underlined:
                // TODO
                break;
            default:
                break;
        }

        switch (font) {
            case Fonts.Kokila:
                // TODO Not Supported
                break;
            default:
        }


        return  style + " " + weight + " " + Math.floor(fontSize) + "px " + family;
    }

    /**
     * Convert OutlineAndFillStyle to CSS properties
     * @param styleId
     * @returns {string}
     */
    public static style(styleId: OutlineAndFillStyleEnum): string {
        // TODO To be implemented
        return "lightgreen";
    }
}
