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
import {OutlineAndFillStyleEnum, OUTLINE_AND_FILL_STYLE_DICT} from "../DrawingEnums";
import {Logging} from "../../../Common/Logging";
import { TabNote } from "../../VoiceData/TabNote";

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
    public static duration(fraction: Fraction, isTuplet: boolean): string {
      const dur: number = fraction.RealValue;

      if (dur >= 1) {
          return "w";
      } else if (dur < 1 && dur >= 0.5) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet) {
          return "w";
        }
        return "h";
      } else if (dur < 0.5 && dur >= 0.25) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.25) {
          return "h";
        }
        return "q";
      } else if (dur < 0.25 && dur >= 0.125) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.125) {
          return "q";
        }
        return "8";
      } else if (dur < 0.125 && dur >= 0.0625) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.0625) {
          return "8";
        }
        return "16";
      } else if (dur < 0.0625 && dur >= 0.03125) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.03125) {
          return "16";
        }
        return "32";
      } else if (dur < 0.03125 && dur >= 0.015625) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.015625) {
          return "32";
        }
        return "64";
      }

      if (isTuplet) {
        return "64";
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
        const fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        // The octave seems to need a shift of three FIXME?
        const octave: number = pitch.Octave - clef.OctaveOffset + 3;
        const acc: string = VexFlowConverter.accidental(pitch.Accidental);
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
    public static CreateStaveNote(notes: GraphicalNote[]): Vex.Flow.StaveNote {
        let keys: string[] = [];
        const accidentals: string[] = [];
        const frac: Fraction = notes[0].graphicalNoteLength;
        const isTuplet: boolean = notes[0].sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.duration(frac, isTuplet);
        let vfClefType: string = undefined;
        let numDots: number = 0;
        for (const note of notes) {
            const pitch: [string, string, ClefInstruction] = (note as VexFlowGraphicalNote).vfpitch;
            if (pitch === undefined) { // if it is a rest:
              keys = ["b/4"];
              duration += "r";
              break;
            }
            keys.push(pitch[0]);
            accidentals.push(pitch[1]);
            if (!vfClefType) {
                const vfClef: {type: string, annotation: string} = VexFlowConverter.Clef(pitch[2]);
                vfClefType = vfClef.type;
            }
            if (numDots < note.numberOfDots) {
                numDots = note.numberOfDots;
            }
        }
        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            duration += "d";
        }

        const vfnote: Vex.Flow.StaveNote = new Vex.Flow.StaveNote({
            auto_stem: true,
            clef: vfClefType,
            duration: duration,
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
     * Convert a set of GraphicalNotes to a VexFlow StaveNote
     * @param notes form a chord on the staff
     * @returns {Vex.Flow.StaveNote}
     */
    public static CreateTabNote(notes: GraphicalNote[]): Vex.Flow.TabNote {
        const tabPositions: {}[] = [];
        const frac: Fraction = notes[0].graphicalNoteLength;
        const isTuplet: boolean = notes[0].sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.duration(frac, isTuplet);
        let numDots: number = 0;
        for (const note of notes) {
            const tabNote: TabNote = note.sourceNote as TabNote;
            const tabPosition: {str: string, fret: string} = {str: tabNote.StringNumber.toString(), fret: tabNote.FretNumber.toString()};
            tabPositions.push(tabPosition);
            if (numDots < note.numberOfDots) {
                numDots = note.numberOfDots;
            }
        }
        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            duration += "d";
        }
        const vfnote: Vex.Flow.TabNote = new Vex.Flow.TabNote({
            duration: duration,
            positions: tabPositions,
        });

        return vfnote;
    }

    /**
     * Convert a ClefInstruction to a string represention of a clef type in VexFlow.
     *
     * @param clef The OSMD object to be converted representing the clef
     * @param size The VexFlow size to be used. Can be `default` or `small`. As soon as
     *             #118 is done, this parameter will be dispensable.
     * @returns    A string representation of a VexFlow clef
     * @see        https://github.com/0xfe/vexflow/blob/master/src/clef.js
     * @see        https://github.com/0xfe/vexflow/blob/master/tests/clef_tests.js
     */
    public static Clef(clef: ClefInstruction, size: string = "default"): { type: string, size: string, annotation: string } {
        let type: string;
        let annotation: string;

        // Make sure size is either "default" or "small"
        if (size !== "default" && size !== "small") {
            Logging.warn(`Invalid VexFlow clef size "${size}" specified. Using "default".`);
            size = "default";
        }

        /*
         * For all of the following conversions, OSMD uses line numbers 1-5 starting from
         * the bottom, while VexFlow uses 0-4 starting from the top.
         */
        switch (clef.ClefType) {

            // G Clef
            case ClefEnum.G:
                switch (clef.Line) {
                    case 1:
                        type = "french"; // VexFlow line 4
                        break;
                    case 2:
                        type = "treble"; // VexFlow line 3
                        break;
                    default:
                        type = "treble";
                        Logging.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
                }
                break;

            // F Clef
            case ClefEnum.F:
                switch (clef.Line) {
                  case 4:
                      type = "bass"; // VexFlow line 1
                      break;
                  case 3:
                      type = "baritone-f"; // VexFlow line 2
                      break;
                  case 5:
                      type = "subbass"; // VexFlow line 0
                      break;
                  default:
                      type = "bass";
                      Logging.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
                }
                break;

            // C Clef
            case ClefEnum.C:
                switch (clef.Line) {
                  case 3:
                      type = "alto"; // VexFlow line 2
                      break;
                  case 4:
                      type = "tenor"; // VexFlow line 1
                      break;
                  case 1:
                      type = "soprano"; // VexFlow line 4
                      break;
                  case 2:
                      type = "mezzo-soprano"; // VexFlow line 3
                      break;
                  default:
                      type = "alto";
                      Logging.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
                }
                break;

            // Percussion Clef
            case ClefEnum.percussion:
                type = "percussion";
                break;

            // TAB Clef
            case ClefEnum.TAB:
                type = "french";
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
        return { type, size, annotation };
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
        const family: string = "'Times New Roman'";

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
     * Converts the style into a string that VexFlow RenderContext can understand
     * as the weight of the font
     */
    public static fontStyle(style: FontStyles): string {
        switch (style) {
            case FontStyles.Bold:
                return "bold";
            case FontStyles.Italic:
                return "italic";
            case FontStyles.BoldItalic:
                return "italic bold";
            default:
                return "normal";
        }
    }

    /**
     * Convert OutlineAndFillStyle to CSS properties
     * @param styleId
     * @returns {string}
     */
    public static style(styleId: OutlineAndFillStyleEnum): string {
        const ret: string = OUTLINE_AND_FILL_STYLE_DICT.getValue(styleId);
        return ret;
    }
}
