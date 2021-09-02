import Vex from "vexflow";
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
import log from "loglevel";
import { ArticulationEnum, StemDirectionType, VoiceEntry } from "../../VoiceData/VoiceEntry";
import { SystemLinePosition } from "../SystemLinePosition";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { OrnamentEnum, OrnamentContainer } from "../../VoiceData/OrnamentContainer";
import { Notehead, NoteHeadShape } from "../../VoiceData/Notehead";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { EngravingRules } from "../EngravingRules";
import { Note } from "../../../MusicalScore/VoiceData/Note";
import StaveNote = Vex.Flow.StaveNote;
import { ArpeggioType } from "../../VoiceData/Arpeggio";
import { TabNote } from "../../VoiceData/TabNote";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { Articulation } from "../../VoiceData/Articulation";

/**
 * Helper class, which contains static methods which actually convert
 * from OSMD objects to VexFlow objects.
 */
export class VexFlowConverter {
    /**
     * Mapping from numbers of alterations on the key signature to major keys
     * @type {[alterationsNo: number]: string; }
     */
    private static majorMap: {[_: number]: string } = {
        "-1": "F", "-2": "Bb", "-3": "Eb", "-4": "Ab", "-5": "Db", "-6": "Gb", "-7": "Cb", "-8": "Fb",
        "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B", "6": "F#", "7": "C#", "8": "G#"
    };
    /**
     * Mapping from numbers of alterations on the key signature to minor keys
     * @type {[alterationsNo: number]: string; }
     */
    private static minorMap: {[_: number]: string } = {
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

      if (dur === 2) { // Breve
        return "1/2";
      }
      // TODO consider long (dur=4) and maxima (dur=8), though Vexflow doesn't seem to support them
      if (dur >= 1) {
          return "w";
      } else if (dur < 1 && dur >= 0.5) {
        // change to the next higher straight note to get the correct note display type
        if (isTuplet && dur > 0.5) {
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
    public static pitch(pitch: Pitch, isRest: boolean, clef: ClefInstruction,
                        notehead: Notehead = undefined): [string, string, ClefInstruction] {
        //FIXME: The octave seems to need a shift of three?
        //FIXME: Also rests seem to use different offsets depending on the clef.
        let fixmeOffset: number = 3;
        if (isRest) {
            fixmeOffset = 0;
            if (clef.ClefType === ClefEnum.F) {
                fixmeOffset = 2;
            }
            if (clef.ClefType === ClefEnum.C) {
                fixmeOffset = 2;
            }
            // TODO the pitch for rests will be the start position, for eights rests it will be the bottom point
            // maybe we want to center on the display position instead of having the bottom there?
        }
        const fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        const acc: string = Pitch.accidentalVexflow(pitch.Accidental);
        const octave: number = pitch.Octave - clef.OctaveOffset + fixmeOffset;
        let noteheadCode: string = "";
        if (notehead) {
            noteheadCode = this.NoteHeadCode(notehead);
        }
        return [fund + "n/" + octave + noteheadCode, acc, clef];
    }

    public static restToNotePitch(pitch: Pitch, clefType: ClefEnum): Pitch {
        let octave: number = pitch.Octave;
        // offsets see pitch()
        switch (clefType) {
            case ClefEnum.C:
            case ClefEnum.F: {
                octave += 2;
                break;
            }
            case ClefEnum.G:
            default:
        }

        return new Pitch(pitch.FundamentalNote, octave, AccidentalEnum.NONE);
    }

    /** returns the Vexflow code for a note head. Some are still unsupported, see Vexflow/tables.js */
    public static NoteHeadCode(notehead: Notehead): string {
        const codeStart: string = "/";
        const codeFilled: string = notehead.Filled ? "2" : "1"; // filled/unfilled notehead code in most vexflow glyphs
        switch (notehead.Shape) {
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
        // if (gve.octaveShiftValue !== OctaveEnum.NONE) { // gves with accidentals in octave shift brackets can be unsorted
        gve.sortForVexflow(); // also necessary for some other cases, see test_sorted_notes... sample
        //   sort and reverse replace the array anyways, so we might as well directly sort them reversely for now.
        //   otherwise we should copy the array, see the commented GraphicalVoiceEntry.sortedNotesCopyForVexflow()
        //   another alternative: don't sort gve notes, instead collect and sort tickables in an array,
        //     then iterate over the array by addTickable() in VexFlowMeasure.graphicalMeasureCreatedCalculations()
        const notes: GraphicalNote[] = gve.notes;
        // for (const note of gve.notes) { // debug
        //     const pitch: Pitch = note.sourceNote.Pitch;
        //     console.log('note: ' + pitch?.ToString() + ', halftone: ' + pitch?.getHalfTone());
        // }
        const rules: EngravingRules = gve.parentStaffEntry.parentMeasure.parentSourceMeasure.Rules;

        const baseNote: GraphicalNote = notes[0];
        let keys: string[] = [];
        const accidentals: string[] = [];
        const baseNoteLength: Fraction = baseNote.graphicalNoteLength;
        const isTuplet: boolean = baseNote.sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.duration(baseNoteLength, isTuplet);
        if (baseNote.sourceNote.TypeLength !== undefined && baseNote.sourceNote.TypeLength !== baseNoteLength) {
            duration = VexFlowConverter.duration(baseNote.sourceNote.TypeLength, isTuplet);
        }
        let vfClefType: string = undefined;
        let numDots: number = baseNote.numberOfDots;
        let alignCenter: boolean = false;
        let xShift: number = 0;
        let slashNoteHead: boolean = false;
        let isRest: boolean = false;
        for (const note of notes) {
            if (numDots < note.numberOfDots) {
                numDots = note.numberOfDots;
            }

            // if it is a rest:
            if (note.sourceNote.isRest()) {
                isRest = true;
                if (note.sourceNote.Pitch) {
                    const restVfPitch: [string, string, ClefInstruction] = (note as VexFlowGraphicalNote).vfpitch;
                    keys = [restVfPitch[0]];
                    break;
                } else {
                    keys = ["b/4"]; // default placement

                    // pause rest encircled by two beamed notes: place rest just below previous note
                    const pauseVoiceEntry: VoiceEntry = note.parentVoiceEntry?.parentVoiceEntry;
                    if (pauseVoiceEntry) {
                        const neighborGSEs: GraphicalStaffEntry[] = note.parentVoiceEntry?.parentStaffEntry.parentMeasure.staffEntries;
                        let previousVoiceEntry: VoiceEntry, followingVoiceEntry: VoiceEntry;
                        let pauseVEIndex: number = -1;
                        for (let i: number = 0; i < neighborGSEs.length; i++) {
                            if (neighborGSEs[i]?.graphicalVoiceEntries[0].parentVoiceEntry === pauseVoiceEntry) {
                                pauseVEIndex = i;
                                break;
                            }
                        }
                        if (pauseVEIndex >= 1 && (neighborGSEs.length - 1) >= (pauseVEIndex + 1)) {
                            previousVoiceEntry = neighborGSEs[pauseVEIndex - 1]?.graphicalVoiceEntries[0]?.parentVoiceEntry;
                            followingVoiceEntry = neighborGSEs[pauseVEIndex + 1]?.graphicalVoiceEntries[0]?.parentVoiceEntry;
                            if (previousVoiceEntry && followingVoiceEntry) {
                                const previousNote: Note = previousVoiceEntry.Notes[0];
                                const followingNote: Note = followingVoiceEntry.Notes[0];
                                if (previousNote.NoteBeam?.Notes.includes(followingNote)) {
                                    const previousNotePitch: Pitch = previousVoiceEntry.Notes.last().Pitch;
                                    const clef: ClefInstruction = (note as VexFlowGraphicalNote).Clef();
                                    const vfpitch: [string, string, ClefInstruction] = VexFlowConverter.pitch(
                                        VexFlowConverter.restToNotePitch(previousNotePitch.getTransposedPitch(-2), clef.ClefType),
                                        false, clef, undefined);
                                    keys = [vfpitch[0]];
                                }
                            }
                        }
                    }
                }
                // TODO do collision checking, place rest e.g. either below staff (A3, for stem direction below voice) or above (C5)
                // if it is a full measure rest:
                //   (a whole rest note signifies a whole measure duration, unless the time signature is longer than 4 quarter notes, e.g. 6/4 or 3/2.
                //   Note: this should not apply to most pickup measures, e.g. with an 8th pickup measure in a 3/4 time signature)
                // const measureDuration: number = note.sourceNote.SourceMeasure.Duration.RealValue;
                const isWholeMeasureRest: boolean =  baseNoteLength.RealValue === note.sourceNote.SourceMeasure.ActiveTimeSignature.RealValue;
                if (isWholeMeasureRest) {
                    keys = ["d/5"];
                    duration = "w";
                    numDots = 0;
                    // If it's a whole rest we want it smack in the middle. Apparently there is still an issue in vexflow:
                    // https://github.com/0xfe/vexflow/issues/579 The author reports that he needs to add some negative x shift
                    // if the measure has no modifiers.
                    alignCenter = true;
                    xShift = rules.WholeRestXShiftVexflow * unitInPixels; // TODO find way to make dependent on the modifiers
                    // affects VexFlowStaffEntry.calculateXPosition()
                }
                if (note.sourceNote.ParentStaff.Voices.length > 1) {
                    let visibleVoiceEntries: number = 0;
                    //Find all visible voice entries (don't want invisible rests/notes causing visible shift)
                    for (let idx: number = 0; idx < note.sourceNote.ParentStaffEntry.VoiceEntries.length ; idx++) {
                        if (note.sourceNote.ParentStaffEntry.VoiceEntries[idx].Notes[0].PrintObject) {
                            visibleVoiceEntries++;
                        }
                    }
                    //If we have more than one visible voice entry, shift the rests so no collision occurs
                    if (visibleVoiceEntries > 1) {
                        switch (note.sourceNote.ParentVoiceEntry?.ParentVoice?.VoiceId) {
                            case 1:
                                keys = ["e/5"];
                                break;
                            case 2:
                                keys = ["f/4"];
                                break;
                            default:
                                break;
                        }
                    }
                }
                break;
            }

            if (note.sourceNote.Notehead) {
                if (note.sourceNote.Notehead.Shape === NoteHeadShape.SLASH) {
                    slashNoteHead = true;
                    // if we have slash heads and other heads in the voice entry, this will create the same head for all.
                    // same problem with numDots. The slash case should be extremely rare though.
                }
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
        if (isRest) {
            // "r" has to be put after the "d"s for rest notes.
            duration += "r";
        }

        let vfnote: Vex.Flow.StaveNote;

        const vfnoteStruct: any = {
            align_center: alignCenter,
            auto_stem: true,
            clef: vfClefType,
            duration: duration,
            keys: keys,
            slash: gve.parentVoiceEntry.GraceNoteSlash,
        };

        const firstNote: Note = gve.notes[0].sourceNote;
        if (firstNote.IsCueNote) {
            vfnoteStruct.glyph_font_scale = Vex.Flow.DEFAULT_NOTATION_FONT_SCALE * Vex.Flow.GraceNote.SCALE;
            vfnoteStruct.stroke_px = Vex.Flow.GraceNote.LEDGER_LINE_OFFSET;
        }

        if (gve.parentVoiceEntry.IsGrace || gve.notes[0].sourceNote.IsCueNote) {
            vfnote = new Vex.Flow.GraceNote(vfnoteStruct);
        } else {
            vfnote = new Vex.Flow.StaveNote(vfnoteStruct);
        }

        // Annotate GraphicalNote with which line of the staff it appears on
        vfnote.getKeyProps().forEach(({ line }, i) => gve.notes[i].staffLine = line);

        if (rules.LedgerLineWidth || rules.LedgerLineStrokeStyle) {
            // FIXME should probably use vfnote.setLedgerLineStyle. this doesn't seem to do anything.
            // however, this is also set in VexFlowVoiceEntry.color() anyways.
            if (!((vfnote as any).ledgerLineStyle)) {
                (vfnote as any).ledgerLineStyle = {};
            }
            if (rules.LedgerLineWidth) {
                (vfnote as any).ledgerLineStyle.lineWidth = rules.LedgerLineWidth;
            }
            if (rules.LedgerLineStrokeStyle) {
                (vfnote as any).ledgerLineStyle.strokeStyle = rules.LedgerLineStrokeStyle;
            }
        }

        if (rules.ColoringEnabled) {
            const defaultColorStem: string = rules.DefaultColorStem;
            let stemColor: string = gve.parentVoiceEntry.StemColor;
            if (!stemColor && defaultColorStem) {
                stemColor = defaultColorStem;
            }
            const stemStyle: Object = { fillStyle: stemColor, strokeStyle: stemColor };

            if (stemColor) {
                gve.parentVoiceEntry.StemColor = stemColor;
                vfnote.setStemStyle(stemStyle);
                if (vfnote.flag && rules.ColorFlags) {
                    vfnote.setFlagStyle(stemStyle);
                }
            }
        }

        vfnote.x_shift = xShift;

        if (gve.parentVoiceEntry.IsGrace && gve.notes[0].sourceNote.NoteBeam) {
            // Vexflow seems to have issues with wanted stem direction for beamed grace notes,
            // when the stem is connected to a beamed main note (e.g. Haydn Concertante bar 57)
            gve.parentVoiceEntry.WantedStemDirection = gve.notes[0].sourceNote.NoteBeam.Notes[0].ParentVoiceEntry.WantedStemDirection;
        }
        if (gve.parentVoiceEntry) {
            const wantedStemDirection: StemDirectionType = gve.parentVoiceEntry.WantedStemDirection;
            switch (wantedStemDirection) {
                case(StemDirectionType.Up):
                    vfnote.setStemDirection(Vex.Flow.Stem.UP);
                    gve.parentVoiceEntry.StemDirection = StemDirectionType.Up;
                    break;
                case (StemDirectionType.Down):
                    vfnote.setStemDirection(Vex.Flow.Stem.DOWN);
                    gve.parentVoiceEntry.StemDirection = StemDirectionType.Down;
                    break;
                default:
            }
        }

        // add accidentals
        for (let i: number = 0, len: number = notes.length; i < len; i += 1) {
            (notes[i] as VexFlowGraphicalNote).setIndex(vfnote, i);
            if (accidentals[i]) {
                if (accidentals[i] === "###") { // triple sharp
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

            // add Tremolo strokes (only single note tremolos for now, Vexflow doesn't have beams for two-note tremolos yet)
            const tremoloStrokes: number = notes[i].sourceNote.TremoloStrokes;
            if (tremoloStrokes > 0) {
                const tremolo: Vex.Flow.Tremolo = new Vex.Flow.Tremolo(tremoloStrokes);
                (tremolo as any).extra_stroke_scale = rules.TremoloStrokeScale;
                (tremolo as any).y_spacing_scale = rules.TremoloYSpacingScale;
                vfnote.addModifier(i, tremolo);
            }
        }

        // half note tremolo: set notehead to half note (Vexflow otherwise takes the notehead from duration) (Hack)
        if (firstNote.Length.RealValue === 0.25 && firstNote.Notehead && firstNote.Notehead.Filled === false) {
            const keyProps: Object[] = vfnote.getKeyProps();
            for (let i: number = 0; i < keyProps.length; i++) {
                (<any>keyProps[i]).code = "v81";
            }
        }

        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            vfnote.addDotToAll();
        }
        return vfnote;
    }

    public static generateArticulations(vfnote: Vex.Flow.StemmableNote, articulations: Articulation[],
                                        rules: EngravingRules): void {
        if (!vfnote || vfnote.getAttribute("type") === "GhostNote") {
            return;
        }

        for (const articulation of articulations) {
            let vfArtPosition: number = Vex.Flow.Modifier.Position.ABOVE;

            if (vfnote.getStemDirection() === Vex.Flow.Stem.UP) {
                vfArtPosition = Vex.Flow.Modifier.Position.BELOW;
            }
            let vfArt: Vex.Flow.Articulation = undefined;
            const articulationEnum: ArticulationEnum = articulation.articulationEnum;
            if (rules.ArticulationPlacementFromXML) {
                if (articulation.placement === PlacementEnum.Above) {
                    vfArtPosition = Vex.Flow.Modifier.Position.ABOVE;
                } else if (articulation.placement === PlacementEnum.Below) {
                    vfArtPosition = Vex.Flow.Modifier.Position.BELOW;
                } // else if undefined: don't change
            }
            switch (articulationEnum) {
                case ArticulationEnum.accent: {
                    vfArt = new Vex.Flow.Articulation("a>");
                    break;
                }
                case ArticulationEnum.downbow: {
                    vfArt = new Vex.Flow.Articulation("am");
                    if (articulation.placement === undefined) { // downbow/upbow should be above by default
                        vfArtPosition = Vex.Flow.Modifier.Position.ABOVE;
                    }
                    break;
                }
                case ArticulationEnum.fermata: {
                    vfArt = new Vex.Flow.Articulation("a@a");
                    vfArtPosition = Vex.Flow.Modifier.Position.ABOVE;
                    break;
                }
                case ArticulationEnum.marcatodown: {
                    vfArt = new Vex.Flow.Articulation("a|"); // Vexflow only knows marcato up, so we use a down stroke here.
                    break;
                }
                case ArticulationEnum.marcatoup: {
                    vfArt = new Vex.Flow.Articulation("a^");
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
                case ArticulationEnum.naturalharmonic: {
                    vfArt = new Vex.Flow.Articulation("ah");
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
                    if (articulation.placement === undefined) { // downbow/upbow should be above by default
                        vfArtPosition = Vex.Flow.Modifier.Position.ABOVE;
                    }
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
            if (vfArt) {
                vfArt.setPosition(vfArtPosition);
                (vfnote as StaveNote).addModifier(0, vfArt);
            }
        }
    }

    public static generateOrnaments(vfnote: Vex.Flow.StemmableNote, oContainer: OrnamentContainer): void {
        let vfPosition: number = Vex.Flow.Modifier.Position.ABOVE;
        if (oContainer.placement === PlacementEnum.Below) {
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
                vfOrna = new Vex.Flow.Ornament("mordent"); // Vexflow uses baroque, not MusicXML definition
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.InvertedTurn: {
                vfOrna = new Vex.Flow.Ornament("turn_inverted");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Mordent: {
                vfOrna = new Vex.Flow.Ornament("mordent_inverted");
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
        if (vfOrna) {
            if (oContainer.AccidentalBelow !== AccidentalEnum.NONE) {
                vfOrna.setLowerAccidental(Pitch.accidentalVexflow(oContainer.AccidentalBelow));
            }
            if (oContainer.AccidentalAbove !== AccidentalEnum.NONE) {
                vfOrna.setUpperAccidental(Pitch.accidentalVexflow(oContainer.AccidentalAbove));
            }
            vfOrna.setPosition(vfPosition); // Vexflow draws it above right now in any case, never below
            (vfnote as StaveNote).addModifier(0, vfOrna);
        }
    }

    public static StrokeTypeFromArpeggioType(arpeggioType: ArpeggioType): Vex.Flow.Stroke.Type {
        switch (arpeggioType) {
            case ArpeggioType.ARPEGGIO_DIRECTIONLESS:
                return Vex.Flow.Stroke.Type.ARPEGGIO_DIRECTIONLESS;
            case ArpeggioType.BRUSH_DOWN:
                return Vex.Flow.Stroke.Type.BRUSH_UP; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.BRUSH_UP:
                return Vex.Flow.Stroke.Type.BRUSH_DOWN; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.RASQUEDO_DOWN:
                return Vex.Flow.Stroke.Type.RASQUEDO_UP;
            case ArpeggioType.RASQUEDO_UP:
                return Vex.Flow.Stroke.Type.RASQUEDO_DOWN;
            case ArpeggioType.ROLL_DOWN:
                return Vex.Flow.Stroke.Type.ROLL_UP; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.ROLL_UP:
                return Vex.Flow.Stroke.Type.ROLL_DOWN; // TODO somehow up and down are mixed up in Vexflow right now
            default:
                return Vex.Flow.Stroke.Type.ARPEGGIO_DIRECTIONLESS;
        }
    }

    /**
     * Convert a set of GraphicalNotes to a VexFlow StaveNote
     * @param notes form a chord on the staff
     * @returns {Vex.Flow.StaveNote}
     */
    public static CreateTabNote(gve: GraphicalVoiceEntry): Vex.Flow.TabNote {
        const tabPositions: {str: number, fret: number}[] = [];
        const notes: GraphicalNote[] = gve.notes.reverse();
        const tabPhrases: { type: number, text: string, width: number }[] = [];
        const frac: Fraction = gve.notes[0].graphicalNoteLength;
        const isTuplet: boolean = gve.notes[0].sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.duration(frac, isTuplet);
        let numDots: number = 0;
        let tabVibrato: boolean = false;
        for (const note of gve.notes) {
            const tabNote: TabNote = note.sourceNote as TabNote;
            const tabPosition: {str: number, fret: number} = {str: tabNote.StringNumberTab, fret: tabNote.FretNumber};
            tabPositions.push(tabPosition);
            if (tabNote.BendArray) {
                tabNote.BendArray.forEach( function( bend: {bendalter: number, direction: string} ): void {
                    let phraseText: string;
                    const phraseStep: number = bend.bendalter - tabPosition.fret;
                    if (phraseStep > 1) {
                        phraseText = "Full";
                    } else if (phraseStep === 1) {
                        phraseText = "1/2";
                    } else {
                        phraseText = "1/4";
                    }
                    if (bend.direction === "up") {
                        tabPhrases.push({type: Vex.Flow.Bend.UP, text: phraseText, width: 10});
                    } else {
                        tabPhrases.push({type: Vex.Flow.Bend.DOWN, text: phraseText, width: 10});
                    }
                });
            }

            if (tabNote.VibratoStroke) {
                tabVibrato = true;
            }

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

        for (let i: number = 0, len: number = notes.length; i < len; i += 1) {
            (notes[i] as VexFlowGraphicalNote).setIndex(vfnote, i);
        }

        tabPhrases.forEach(function(phrase: { type: number, text: string, width: number }): void {
            if (phrase.type === Vex.Flow.Bend.UP) {
                vfnote.addModifier (new Vex.Flow.Bend(phrase.text, false));
            } else {
                vfnote.addModifier (new Vex.Flow.Bend(phrase.text, true));
            }
        });
        if (tabVibrato) {
            vfnote.addModifier(new Vex.Flow.Vibrato());
        }

        return vfnote;
    }

    /**
     * Convert a ClefInstruction to a string represention of a clef type in VexFlow.
     *
     * @param clef The OSMD object to be converted representing the clef
     * @param size The VexFlow size to be used. Can be `default` or `small`.
     * As soon as #118 is done, this parameter will be dispensable.
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
                // only used currently for creating the notes in the normal stave: There we need a normal treble clef
                type = "treble";
                break;
            default:
                log.info("bad clef type: " + clef.ClefType);
                type = "treble";
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
        if (!key) {
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
                return Vex.Flow.StaveConnector.type.THIN_DOUBLE;
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
    public static font(fontSize: number, fontStyle: FontStyles = FontStyles.Regular,
                       font: Fonts = Fonts.TimesNewRoman, rules: EngravingRules, fontFamily: string = undefined): string {
        let style: string = "normal";
        let weight: string = "normal";
        let family: string = `'${rules.DefaultFontFamily}'`; // default "'Times New Roman'"

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

        switch (font) { // currently not used
            case Fonts.Kokila:
                // TODO Not Supported
                break;
            default:
        }

        if (fontFamily && fontFamily !== "default") {
            family = `'${fontFamily}'`;
        }

        return style + " " + weight + " " + Math.floor(fontSize) + "px " + family;
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


