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
import * as log from "loglevel";
import { ArticulationEnum, StemDirectionType } from "../../VoiceData/VoiceEntry";
import { SystemLinePosition } from "../SystemLinePosition";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { OrnamentEnum, OrnamentContainer } from "../../VoiceData/OrnamentContainer";
import { NoteHead, NoteHeadShape } from "../../VoiceData/NoteHead";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { EngravingRules } from "../EngravingRules";

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
    public static pitch(note: VexFlowGraphicalNote, pitch: Pitch): [string, string, ClefInstruction] {
        const fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        const acc: string = VexFlowConverter.accidental(pitch.Accidental);
        // The octave seems to need a shift of three FIXME?
        const octave: number = pitch.Octave - note.Clef().OctaveOffset + 3;
        const noteHead: NoteHead = note.sourceNote.NoteHead;
        let noteHeadCode: string = "";
        if (noteHead !== undefined) {
            noteHeadCode = this.NoteHeadCode(noteHead);
        }
        return [fund + "n/" + octave + noteHeadCode, acc, note.Clef()];
    }

    /** returns the Vexflow code for a note head. Some are still unsupported, see Vexflow/tables.js */
    public static NoteHeadCode(noteHead: NoteHead): string {
        const codeStart: string = "/";
        const codeFilled: string = noteHead.Filled ? "2" : "1"; // filled/unfilled notehead code in most vexflow glyphs
        switch (noteHead.Shape) {
            case NoteHeadShape.NORMAL:
                return "";
            case NoteHeadShape.DIAMOND:
                return codeStart + "D" + codeFilled;
            case NoteHeadShape.TRIANGLE:
                return codeStart + "T" + codeFilled;
            case NoteHeadShape.X:
                return codeStart + "X" + codeFilled;
            case NoteHeadShape.CIRCLEX:
                return codeStart + "X3";
            case NoteHeadShape.RECTANGLE:
                return codeStart + "R" + codeFilled;
            case NoteHeadShape.SQUARE:
                return codeStart + "S" + codeFilled;
            case NoteHeadShape.SLASH:
                return ""; // slash is specified at end of duration string in Vexflow
            default:
                return "";
        }
    }

    /**
     * Converts AccidentalEnum to a string which represents an accidental in VexFlow
     * @param accidental
     * @returns {string}
     */
    public static accidental(accidental: AccidentalEnum): string {
        let acc: string;
        switch (accidental) {
            case AccidentalEnum.NATURAL:
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
            case AccidentalEnum.TRIPLESHARP:
                acc = "++";
                break;
            case AccidentalEnum.DOUBLEFLAT:
                acc = "bb";
                break;
            case AccidentalEnum.TRIPLEFLAT:
                acc = "bbs"; // there is no "bbb" in VexFlow yet, unfortunately.
                break;
            case AccidentalEnum.QUARTERTONESHARP:
                acc = "+";
                break;
            case AccidentalEnum.QUARTERTONEFLAT:
                acc = "d";
                break;
            default:
        }
        return acc;
    }

    public static GhostNote(frac: Fraction): Vex.Flow.GhostNote {
        return new Vex.Flow.GhostNote({
            duration: VexFlowConverter.duration(frac, false),
        });
    }

    /**
     * Convert a GraphicalVoiceEntry to a VexFlow StaveNote
     * @param gve the GraphicalVoiceEntry which can hold a note or a chord on the staff belonging to one voice
     * @returns {Vex.Flow.StaveNote}
     */
    public static StaveNote(gve: GraphicalVoiceEntry): Vex.Flow.StaveNote {
        // sort notes
        /* seems unnecessary for now
        if (gve.octaveShiftValue !== undefined && gve.octaveShiftValue !== OctaveEnum.NONE) {
            gve.sort(); // gves with accidentals in octave shift brackets can be unsorted
        } */
        // VexFlow needs the notes ordered vertically in the other direction:
        const notes: GraphicalNote[] = gve.notes.reverse();

        const baseNote: GraphicalNote = notes[0];
        let keys: string[] = [];
        const accidentals: string[] = [];
        const frac: Fraction = baseNote.graphicalNoteLength;
        const isTuplet: boolean = baseNote.sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.duration(frac, isTuplet);
        let vfClefType: string = undefined;
        let numDots: number = baseNote.numberOfDots;
        let alignCenter: boolean = false;
        let xShift: number = 0;
        let slashNoteHead: boolean = false;
        for (const note of notes) {
            if (numDots < note.numberOfDots) {
                numDots = note.numberOfDots;
            }
            if (note.sourceNote.NoteHead) {
                if (note.sourceNote.NoteHead.Shape === NoteHeadShape.SLASH) {
                    slashNoteHead = true;
                    // if we have slash heads and other heads in the voice entry, this will create the same head for all.
                    // same problem with numDots. The slash case should be extremely rare though.
                }
            }
            // if it is a rest:
            if (note.sourceNote.isRest()) {
                keys = ["b/4"];
                // if it is a full measure rest:
                if (note.parentVoiceEntry.parentStaffEntry.parentMeasure.parentSourceMeasure.Duration.RealValue <= frac.RealValue) {
                    keys = ["d/5"];
                    duration = "w";
                    numDots = 0;
                    // If it's a whole rest we want it smack in the middle. Apparently there is still an issue in vexflow:
                    // https://github.com/0xfe/vexflow/issues/579 The author reports that he needs to add some negative x shift
                    // if the measure has no modifiers.
                    alignCenter = true;
                    xShift = EngravingRules.Rules.WholeRestXShiftVexflow * unitInPixels; // TODO find way to make dependent on the modifiers
                    // affects VexFlowStaffEntry.calculateXPosition()
                }
                duration += "r";
                break;
            }
            const pitch: [string, string, ClefInstruction] = (note as VexFlowGraphicalNote).vfpitch;
            keys.push(pitch[0]);
            accidentals.push(pitch[1]);
            if (!vfClefType) {
                const vfClef: {type: string, annotation: string} = VexFlowConverter.Clef(pitch[2]);
                vfClefType = vfClef.type;
            }
        }

        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            duration += "d";
        }
        if (slashNoteHead) {
            duration += "s"; // we have to specify a slash note head like this in Vexflow
        }

        let vfnote: Vex.Flow.StaveNote;
        const vfnoteStruct: Object = {
            align_center: alignCenter,
            auto_stem: true,
            clef: vfClefType,
            duration: duration,
            keys: keys,
            slash: gve.parentVoiceEntry.GraceNoteSlash,
        };

        if (gve.notes[0].sourceNote.IsCueNote) {
            (<any>vfnoteStruct).glyph_font_scale = Vex.Flow.DEFAULT_NOTATION_FONT_SCALE * Vex.Flow.GraceNote.SCALE;
            (<any>vfnoteStruct).stroke_px = Vex.Flow.GraceNote.LEDGER_LINE_OFFSET;
        }

        if (gve.parentVoiceEntry.IsGrace || gve.notes[0].sourceNote.IsCueNote) {
            vfnote = new Vex.Flow.GraceNote(vfnoteStruct);
        } else {
            vfnote = new Vex.Flow.StaveNote(vfnoteStruct);
        }

        vfnote.x_shift = xShift;

        if (gve.parentVoiceEntry !== undefined) {
            const wantedStemDirection: StemDirectionType = gve.parentVoiceEntry.WantedStemDirection;
            switch (wantedStemDirection) {
                case(StemDirectionType.Up):
                    vfnote.setStemDirection(Vex.Flow.Stem.UP);
                    break;
                case (StemDirectionType.Down):
                    vfnote.setStemDirection(Vex.Flow.Stem.DOWN);
                    break;
                default:
            }
        }

        // add accidentals
        for (let i: number = 0, len: number = notes.length; i < len; i += 1) {
            (notes[i] as VexFlowGraphicalNote).setIndex(vfnote, i);
            if (accidentals[i]) {
                if (accidentals[i] === "++") { // triple sharp
                    vfnote.addAccidental(i, new Vex.Flow.Accidental("##"));
                    vfnote.addAccidental(i, new Vex.Flow.Accidental("#"));
                    continue;
                } else if (accidentals[i] === "bbs") { // triple flat
                    vfnote.addAccidental(i, new Vex.Flow.Accidental("bb"));
                    vfnote.addAccidental(i, new Vex.Flow.Accidental("b"));
                    continue;
                }
                vfnote.addAccidental(i, new Vex.Flow.Accidental(accidentals[i])); // normal accidental
            }
        }
        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            vfnote.addDotToAll();
        }
        return vfnote;
    }

    public static generateArticulations(vfnote: Vex.Flow.StemmableNote, articulations: ArticulationEnum[]): void {
        if (vfnote === undefined) {
            return; // needed because grace notes after main note currently not implemented. maybe safer in any case
        }
        // Articulations:
        let vfArtPosition: number = Vex.Flow.Modifier.Position.ABOVE;

        if (vfnote.getStemDirection() === Vex.Flow.Stem.UP) {
            vfArtPosition = Vex.Flow.Modifier.Position.BELOW;
        }

        for (const articulation of articulations) {
            // tslint:disable-next-line:switch-default
            let vfArt: Vex.Flow.Articulation = undefined;
            switch (articulation) {
                case ArticulationEnum.accent: {
                    vfArt = new Vex.Flow.Articulation("a>");
                    break;
                }
                case ArticulationEnum.downbow: {
                    vfArt = new Vex.Flow.Articulation("am");
                    break;
                }
                case ArticulationEnum.fermata: {
                    vfArt = new Vex.Flow.Articulation("a@a");
                    vfArtPosition = Vex.Flow.Modifier.Position.ABOVE;
                    break;
                }
                case ArticulationEnum.invertedfermata: {
                    vfArt = new Vex.Flow.Articulation("a@u");
                    vfArtPosition = Vex.Flow.Modifier.Position.BELOW;
                    break;
                }
                case ArticulationEnum.lefthandpizzicato: {
                    vfArt = new Vex.Flow.Articulation("a+");
                    break;
                }
                case ArticulationEnum.snappizzicato: {
                    vfArt = new Vex.Flow.Articulation("ao");
                    break;
                }
                case ArticulationEnum.staccatissimo: {
                    vfArt = new Vex.Flow.Articulation("av");
                    break;
                }
                case ArticulationEnum.staccato: {
                    vfArt = new Vex.Flow.Articulation("a.");
                    break;
                }
                case ArticulationEnum.tenuto: {
                    vfArt = new Vex.Flow.Articulation("a-");
                    break;
                }
                case ArticulationEnum.upbow: {
                    vfArt = new Vex.Flow.Articulation("a|");
                    break;
                }
                case ArticulationEnum.strongaccent: {
                    vfArt = new Vex.Flow.Articulation("a^");
                    break;
                }
                default: {
                    break;
                }
            }
            if (vfArt !== undefined) {
                vfArt.setPosition(vfArtPosition);
                vfnote.addModifier(0, vfArt);
            }
        }
    }

    public static generateOrnaments(vfnote: Vex.Flow.StemmableNote, oContainer: OrnamentContainer): void {
        let vfPosition: number = Vex.Flow.Modifier.Position.ABOVE;
        if (vfnote.getStemDirection() === Vex.Flow.Stem.UP) {
            vfPosition = Vex.Flow.Modifier.Position.BELOW;
        }

        let vfOrna: Vex.Flow.Ornament = undefined;
        switch (oContainer.GetOrnament) {
            case OrnamentEnum.DelayedInvertedTurn: {
                vfOrna = new Vex.Flow.Ornament("turn_inverted");
                vfOrna.setDelayed(true);
                break;
            }
            case OrnamentEnum.DelayedTurn: {
                vfOrna = new Vex.Flow.Ornament("turn");
                vfOrna.setDelayed(true);
                break;
            }
            case OrnamentEnum.InvertedMordent: {
                vfOrna = new Vex.Flow.Ornament("mordent_inverted");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.InvertedTurn: {
                vfOrna = new Vex.Flow.Ornament("turn_inverted");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Mordent: {
                vfOrna = new Vex.Flow.Ornament("mordent");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Trill: {
                vfOrna = new Vex.Flow.Ornament("tr");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Turn: {
                vfOrna = new Vex.Flow.Ornament("turn");
                vfOrna.setDelayed(false);
                break;
            }
            default: {
                log.warn("unhandled OrnamentEnum type: " + oContainer.GetOrnament);
                return;
            }
        }
        if (vfOrna !== undefined) {
            if (oContainer.AccidentalBelow !== AccidentalEnum.NONE) {
                vfOrna.setLowerAccidental(this.accidental(oContainer.AccidentalBelow));
            }
            if (oContainer.AccidentalAbove !== AccidentalEnum.NONE) {
                vfOrna.setUpperAccidental(this.accidental(oContainer.AccidentalAbove));
            }
            vfOrna.setPosition(vfPosition);
            vfnote.addModifier(0, vfOrna);
        }
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
            log.warn(`Invalid VexFlow clef size "${size}" specified. Using "default".`);
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
                        log.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
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
                      log.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
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
                      log.error(`Clef ${ClefEnum[clef.ClefType]} on line ${clef.Line} not supported by VexFlow. Using default value "${type}".`);
                }
                break;

            // Percussion Clef
            case ClefEnum.percussion:
                type = "percussion";
                break;

            // TAB Clef
            case ClefEnum.TAB:
                type = "tab";
                break;
            default:
        }

        // annotations in vexflow don't allow bass and 8va. No matter the offset :(
        if (clef.OctaveOffset === 1 && type !== "bass" ) {
            annotation = "8va";
        } else if (clef.OctaveOffset === -1) {
            annotation = "8vb";
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
            // some XMLs don't have the mode set despite having a key signature.
            case KeyEnum.none:
                ret = VexFlowConverter.majorMap[key.Key];
                break;
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
    public static line(lineType: SystemLinesEnum, linePosition: SystemLinePosition): any {
        switch (lineType) {
            case SystemLinesEnum.SingleThin:
                if (linePosition === SystemLinePosition.MeasureBegin) {
                    return Vex.Flow.StaveConnector.type.SINGLE;
                }
                return Vex.Flow.StaveConnector.type.SINGLE_RIGHT;
            case SystemLinesEnum.DoubleThin:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum.ThinBold:
                return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_RIGHT;
            case SystemLinesEnum.BoldThinDots:
                return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_LEFT;
            case SystemLinesEnum.DotsThinBold:
                return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_RIGHT;
            case SystemLinesEnum.DotsBoldBoldDots:
                return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_RIGHT;
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

export enum VexFlowRepetitionType {
    NONE = 1,         // no coda or segno
    CODA_LEFT = 2,    // coda at beginning of stave
    CODA_RIGHT = 3,   // coda at end of stave
    SEGNO_LEFT = 4,   // segno at beginning of stave
    SEGNO_RIGHT = 5,  // segno at end of stave
    DC = 6,           // D.C. at end of stave
    DC_AL_CODA = 7,   // D.C. al coda at end of stave
    DC_AL_FINE = 8,   // D.C. al Fine end of stave
    DS = 9,           // D.S. at end of stave
    DS_AL_CODA = 10,  // D.S. al coda at end of stave
    DS_AL_FINE = 11,  // D.S. al Fine at end of stave
    FINE = 12,        // Fine at end of stave
}

export enum VexFlowBarlineType {
    SINGLE = 1,
    DOUBLE = 2,
    END = 3,
    REPEAT_BEGIN = 4,
    REPEAT_END = 5,
    REPEAT_BOTH = 6,
    NONE = 7,
}

