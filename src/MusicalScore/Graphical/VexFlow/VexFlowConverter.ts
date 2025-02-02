import Vex from "vexflow";
import VF = Vex.Flow;
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
import StaveNote = VF.StaveNote;
import { ArpeggioType } from "../../VoiceData/Arpeggio";
import { TabNote } from "../../VoiceData/TabNote";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { Staff } from "../../VoiceData/Staff";

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
     * Convert a fraction to Vexflow string durations.
     * A duration like 5/16 (5 16th notes) can't be represented by a single (dotted) note,
     *   so we need to return multiple durations (e.g. for 5/16th ghost notes).
     * Currently, for a dotted quarter ghost note, we return a quarter and an eighth ghost note.
     *   We could return a dotted quarter instead, but then the code would need to distinguish between
     *   notes that can be represented as dotted notes and notes that can't, which would complicate things.
     *   We could e.g. add a parameter "allowSingleDottedNote" which makes it possible to return single dotted notes instead.
     * But currently, this is only really used for Ghost notes, so it doesn't make a difference visually.
     *   (for other uses like StaveNotes, we calculate the dots separately)
     * @param fraction a fraction representing the duration of a note
     * @returns {string[]} Vexflow note type strings (e.g. "h" = half note)
     */
    public static durations(fraction: Fraction, isTuplet: boolean): string[] {
        const durations: string[] = [];
        const remainingFraction: Fraction = fraction.clone();
        while (remainingFraction.RealValue > 0.0001) { // essentially > 0, but using a small delta to prevent infinite loop
            const dur: number = remainingFraction.RealValue;
            // TODO consider long (dur=4) and maxima (dur=8), though Vexflow doesn't seem to support them
            if (dur >= 2) { // Breve
                durations.push("1/2");
                remainingFraction.Sub(new Fraction(2, 1));
            } else if (dur >= 1) {
                durations.push("w");
                remainingFraction.Sub(new Fraction(1, 1));
            } else if (dur < 1 && dur >= 0.5) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.5) {
                    return ["w"];
                } else {
                    durations.push("h");
                    remainingFraction.Sub(new Fraction(1, 2));
                }
            } else if (dur < 0.5 && dur >= 0.25) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.25) {
                    return ["h"];
                } else {
                    durations.push("q");
                    remainingFraction.Sub(new Fraction(1, 4));
                }
            } else if (dur < 0.25 && dur >= 0.125) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.125) {
                    return ["q"];
                } else {
                    durations.push("8");
                    remainingFraction.Sub(new Fraction(1, 8));
                }
            } else if (dur < 0.125 && dur >= 0.0625) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.0625) {
                    return ["8"];
                } else {
                    durations.push("16");
                    remainingFraction.Sub(new Fraction(1, 16));
                }
            } else if (dur < 0.0625 && dur >= 0.03125) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.03125) {
                    return ["16"];
                } else {
                    durations.push("32");
                    remainingFraction.Sub(new Fraction(1, 32));
                }
            } else if (dur < 0.03125 && dur >= 0.015625) {
                // change to the next higher straight note to get the correct note display type
                if (isTuplet && dur > 0.015625) {
                    return ["32"];
                } else {
                    durations.push("64");
                    remainingFraction.Sub(new Fraction(1, 64));
                }
            } else {
                if (isTuplet) {
                    return ["64"];
                } else {
                    durations.push("128");
                    remainingFraction.Sub(new Fraction(1, 128));
                }
            }
        }
        //   if (isTuplet) {
        //     dots = 0; // TODO (different) calculation?
        //   } else {
        //     dots = fraction.calculateNumberOfNeededDots();
        //   }
        return durations;
    }

    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    public static pitch(pitch: Pitch, isRest: boolean, clef: ClefInstruction,
                        notehead: Notehead = undefined, octaveOffsetGiven: number = undefined): [string, string, ClefInstruction] {
        //FIXME: The octave seems to need a shift of three?
        //FIXME: Also rests seem to use different offsets depending on the clef.
        let octaveOffset: number = octaveOffsetGiven;
        if (octaveOffsetGiven === undefined) {
            octaveOffset = 3;
        }
        if (isRest && octaveOffsetGiven === undefined) {
            octaveOffset = 0;
            if (clef.ClefType === ClefEnum.F) {
                octaveOffset = 2;
            }
            if (clef.ClefType === ClefEnum.C) {
                octaveOffset = 2;
            }
            // TODO the pitch for rests will be the start position, for eights rests it will be the bottom point
            // maybe we want to center on the display position instead of having the bottom there?
        }
        const fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        const acc: string = Pitch.accidentalVexflow(pitch.Accidental);
        const octave: number = pitch.Octave - clef.OctaveOffset + octaveOffset;
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
            case NoteHeadShape.TRIANGLE_INVERTED:
                return codeStart + "TI";
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

    public static GhostNotes(frac: Fraction): VF.GhostNote[] {
        const ghostNotes: VF.GhostNote[] = [];
        const durations: string[] = VexFlowConverter.durations(frac, false);
        for (const duration of durations) {
            ghostNotes.push(new VF.GhostNote({
                duration: duration,
                //dots: dots
            }));
        }
        return ghostNotes;
    }

    /**
     * Convert a GraphicalVoiceEntry to a VexFlow StaveNote
     * @param gve the GraphicalVoiceEntry which can hold a note or a chord on the staff belonging to one voice
     * @returns {VF.StaveNote}
     */
    public static StaveNote(gve: GraphicalVoiceEntry): VF.StaveNote {
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
        const durations: string[] = VexFlowConverter.durations(baseNoteLength, isTuplet);
        let duration: string = durations[0];
        if (baseNote.sourceNote.TypeLength !== undefined &&
            baseNote.sourceNote.TypeLength !== baseNoteLength &&
            baseNote.sourceNote.TypeLength.RealValue !== 0) {
            duration = VexFlowConverter.durations(baseNote.sourceNote.TypeLength, isTuplet)[0];
            baseNote.numberOfDots = baseNote.sourceNote.DotsXml;
        }
        let vfClefType: string = undefined;
        let numDots: number = baseNote.numberOfDots;
        let alignCenter: boolean = false;
        let xShift: number = 0;
        let isRest: boolean = false;
        let restYPitch: Pitch;
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
                                        false, clef);
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
                const isWholeMeasureRest: boolean = note.sourceNote.IsWholeMeasureRest ||
                    baseNoteLength.RealValue === note.sourceNote.SourceMeasure.ActiveTimeSignature.RealValue;
                if (isWholeMeasureRest) {
                    keys = ["d/5"];
                    if (gve.parentStaffEntry.parentMeasure.ParentStaff.StafflineCount === 1) {
                        keys = ["b/4"];
                    }
                    duration = "w";
                    numDots = 0;
                    // If it's a whole rest we want it smack in the middle. Apparently there is still an issue in vexflow:
                    // https://github.com/0xfe/vexflow/issues/579 The author reports that he needs to add some negative x shift
                    // if the measure has no modifiers.
                    alignCenter = true;
                    xShift = rules.WholeRestXShiftVexflow * unitInPixels; // TODO find way to make dependent on the modifiers
                    // affects VexFlowStaffEntry.calculateXPosition()
                }
                //If we have more than one visible voice entry, shift the rests so no collision occurs
                if (note.sourceNote.ParentStaff.Voices.length > 1) {
                    const staffGves: GraphicalVoiceEntry[] = note.parentVoiceEntry.parentStaffEntry.graphicalVoiceEntries;
                    //Find all visible voice entries (don't want invisible rests/notes causing visible shift)
                    const restVoiceId: number = note.parentVoiceEntry.parentVoiceEntry.ParentVoice.VoiceId;
                    let maxHalftone: number;
                    let linesShift: number;
                    for (const staffGve of staffGves) {
                        for (const gveNote of staffGve.notes) {
                            if (gveNote === note || gveNote.sourceNote.isRest() || !gveNote.sourceNote.PrintObject) {
                                continue;
                            }
                            // unfortunately, we don't have functional note bounding boxes at this point,
                            //   so we have to infer the note positions and sizes manually.
                            const wantedStemDirection: StemDirectionType = gveNote.parentVoiceEntry.parentVoiceEntry.WantedStemDirection;
                            const isUpperVoiceRest: boolean = restVoiceId === 1 || restVoiceId === 5;
                            const lineShiftDirection: number = isUpperVoiceRest ? 1 : -1; // voice 1: put rest above (-y). other voices: below
                            const gveNotePitch: Pitch = gveNote.sourceNote.Pitch;
                            const noteHalftone: number = gveNotePitch.getHalfTone();
                            const newHigh: boolean = lineShiftDirection === 1 && noteHalftone > maxHalftone;
                            const newLow: boolean = lineShiftDirection === -1 && noteHalftone < maxHalftone;
                            if (!maxHalftone || newHigh || newLow) {
                                maxHalftone = noteHalftone;
                                linesShift = 0;
                                // add stem length if necessary
                                if (isUpperVoiceRest && wantedStemDirection === StemDirectionType.Up) {
                                    linesShift += 7; // rest should be above notes with up stem
                                } else if (!isUpperVoiceRest && wantedStemDirection === StemDirectionType.Down) {
                                    linesShift += 7; // rest should be below notes with down stem
                                } else if (isUpperVoiceRest) {
                                    linesShift += 1;
                                } else {
                                    linesShift += 2;
                                }
                                if (!duration.includes("8")) { // except for 8th rests, rests are middle-aligned in vexflow (?)
                                    //linesShift += 3;
                                    if (wantedStemDirection === StemDirectionType.Up && lineShiftDirection === -1) {
                                        linesShift += 1; // quarter rests need a little more below upwards stems. over downwards stems it's fine.
                                    }
                                }
                                if (gveNote.sourceNote.NoteBeam) {
                                    linesShift += 1; // TODO this is of course rather a workaround, but the beams aren't completed yet here.
                                    // instead, we could calculate how many lines are between the notes of the beam,
                                    //   and which stem of which note is longer, so its rest needs that many lines more.
                                    //   this is more of "reverse engineering" or rather "advance engineering" the graphical notes,
                                    //   which are unfortunately not built/drawn yet here.
                                }
                                if (duration.includes("w")) {
                                    linesShift /= 2; // TODO maybe a different fix, whole notes may need another look
                                }
                                linesShift += (Math.ceil(rules.RestCollisionYPadding) * 0.5); // 0.5 is smallest unit
                                linesShift *= lineShiftDirection;
                                note.lineShift = linesShift;
                            }
                        }
                    }
                    if (maxHalftone > 0) {
                        let octaveOffset: number = 3;
                        const restClefInstruction: ClefInstruction = (note as VexFlowGraphicalNote).Clef();
                        switch (restClefInstruction.ClefType) {
                            case ClefEnum.F:
                                octaveOffset = 5;
                                break;
                            case ClefEnum.C:
                                octaveOffset = 4;
                                // if (restClefInstruction.Line == 4) // tenor clef quarter rests can be off
                                break;
                            default:
                                break;
                        }
                        restYPitch = Pitch.fromHalftone(maxHalftone);
                        keys = [VexFlowConverter.pitch(restYPitch, true, restClefInstruction, undefined, octaveOffset)[0]];
                    }
                }
                // vfClefType seems to be undefined for rest notes, but setting it seems to break rest positioning.
                // if (!vfClefType) {
                //     const clef = (note as VexFlowGraphicalNote).Clef();
                //     const vexClef: any = VexFlowConverter.Clef(clef);
                //     vfClefType = vexClef.type;
                // }
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
        if (notes.length === 1 && notes[0].sourceNote.Notehead?.Shape === NoteHeadShape.SLASH) {
            //if there are multiple note heads, all of them will be slash note head if done like this
            //  -> see note_type = "s" below
            duration += "s"; // we have to specify a slash note head like this in Vexflow
        }
        if (isRest) {
            // "r" has to be put after the "d"s for rest notes.
            duration += "r";
        }

        let vfnote: VF.StaveNote;
        const vfnoteStruct: any = {
            align_center: alignCenter,
            auto_stem: true,
            clef: vfClefType,
            duration: duration,
            keys: keys,
            slash: gve.GraceSlash,
        };

        const firstNote: Note = gve.notes[0].sourceNote;
        if (firstNote.IsCueNote) {
            vfnoteStruct.glyph_font_scale = VF.DEFAULT_NOTATION_FONT_SCALE * VF.GraceNote.SCALE;
            vfnoteStruct.stroke_px = VF.GraceNote.LEDGER_LINE_OFFSET;
        }

        if (gve.parentVoiceEntry.IsGrace || gve.notes[0].sourceNote.IsCueNote) {
            vfnote = new VF.GraceNote(vfnoteStruct);
        } else {
            vfnote = new VF.StaveNote(vfnoteStruct);
            (vfnote as any).stagger_same_whole_notes = rules.StaggerSameWholeNotes;
            //   it would be nice to only save this once, not for every note, but has to be accessible in stavenote.js
            const lyricsEntries: GraphicalLyricEntry[] = gve.parentStaffEntry.LyricsEntries;

            let nextOrCloseNoteHasLyrics: boolean = true;
            let extraExistingPadding: number = 0;
            if (lyricsEntries.length > 0 &&
                rules.RenderLyrics &&
                rules.LyricsUseXPaddingForLongLyrics
            ) { // if these conditions don't apply, we don't need the following calculation
                // don't add padding if next note or close note (within quarter distance) has no lyrics
                //   usually checking the last note is enough, but
                //   sometimes you get e.g. a 16th with lyrics, one without lyrics, then one with lyrics again,
                //   easily causing an overlap as well
                //   the overlap is fixed by measure elongation, but leads to huge measures (see EngravingRule MaximumLyricsElongationFactor)
                const startingGMeasure: GraphicalMeasure = gve.parentStaffEntry.parentMeasure;
                const startingSEIndex: number = startingGMeasure.staffEntries.indexOf(gve.parentStaffEntry);
                // const staffEntries: VoiceEntry[] = gve.parentVoiceEntry.ParentVoice.VoiceEntries;
                //   unfortunately the voice entries apparently don't include rests, so they would be ignored
                const staffEntriesToCheck: GraphicalStaffEntry [] = [];
                for (let seIndex: number = startingSEIndex + 1; seIndex < startingGMeasure.staffEntries.length; seIndex++) {
                    const se: GraphicalStaffEntry = startingGMeasure.staffEntries[seIndex];
                    if (se.graphicalVoiceEntries[0]) {
                        staffEntriesToCheck.push(se);
                    }
                }
                // // also check next measure:
                // //   problem: hard to get the next measure object here. (might need to put .nextMeasure into GraphicalMeasure)
                // const stafflineMeasures: GraphicalMeasure[] = startingGMeasure.ParentStaffLine.Measures;
                // const measureIndexInStaffline: number = stafflineMeasures.indexOf(startingGMeasure);
                // if (measureIndexInStaffline + 1 < stafflineMeasures.length) {
                //     const nextMeasure: GraphicalMeasure = stafflineMeasures[measureIndexInStaffline + 1];
                //     for (const se of nextMeasure.staffEntries) {
                //         staffEntriesToCheck.push(se);
                //     }
                // }
                let totalDistanceFromFirstNote: Fraction;
                let lastTimestamp: Fraction = gve.parentStaffEntry.relInMeasureTimestamp.clone();
                for (const currentSE of staffEntriesToCheck) {
                    const currentTimestamp: Fraction = currentSE.relInMeasureTimestamp.clone();
                    totalDistanceFromFirstNote = Fraction.minus(currentTimestamp, gve.parentVoiceEntry.Timestamp);
                    if (totalDistanceFromFirstNote.RealValue > 0.25) { // more than a quarter note distance: don't add padding
                        nextOrCloseNoteHasLyrics = false;
                        break;
                    }
                    if (currentSE.LyricsEntries.length > 0) {
                        // nextOrCloseNoteHasLyrics = true;
                        break;
                    }
                    const lastDistanceCovered: Fraction = Fraction.minus(currentTimestamp, lastTimestamp);
                    extraExistingPadding += lastDistanceCovered.RealValue * 32; // for every 8th note in between (0.125), we need around 4 padding less (*4*8)
                    lastTimestamp = currentTimestamp;
                }
                // if the for loop ends without breaking, we are at measure end and assume we need padding
            }
            if (rules.RenderLyrics &&
                rules.LyricsUseXPaddingForLongLyrics &&
                lyricsEntries.length > 0 &&
                nextOrCloseNoteHasLyrics) {
                // VexFlowPatch: add padding to the right for large lyrics,
                //   so that measure doesn't need to be enlarged too much for spacing

                let hasShortNotes: boolean = false;
                let padding: number = 0;
                for (const note of notes) {
                    if (note.sourceNote.Length.RealValue <= 0.125) { // 8th or shorter
                        hasShortNotes = true;
                        // if (note.sourceNote.Length.RealValue <= 0.0625) { // 16th or shorter
                        //     padding += 0.0; // unnecessary by now. what rather needs more padding is eighth notes now.
                        // }
                        break;
                    }
                }

                let addPadding: boolean = false;
                for (const lyricsEntry of lyricsEntries) {
                    const widthThreshold: number = rules.LyricsXPaddingWidthThreshold;
                    // letters like i and l take less space, so we should use the visual width and not number of characters
                    let currentLyricsWidth: number = lyricsEntry.GraphicalLabel.PositionAndShape.Size.width;
                    if (lyricsEntry.hasDashFromLyricWord()) {
                        currentLyricsWidth += 0.5;
                    }
                    if (currentLyricsWidth > widthThreshold) {
                        padding += currentLyricsWidth - widthThreshold;
                        // if (currentLyricsWidth > 4) {
                        //     padding *= 1.15; // only maybe needed if LyricsXPaddingFactorForLongLyrics < 1
                        // }
                        // check if we need padding because next staff entry also has long lyrics or it's the last note in the measure
                        const currentStaffEntry: GraphicalStaffEntry = gve.parentStaffEntry;
                        const measureStaffEntries: GraphicalStaffEntry[] = currentStaffEntry.parentMeasure.staffEntries;
                        const currentStaffEntryIndex: number = measureStaffEntries.indexOf(currentStaffEntry);
                        const isLastNoteInMeasure: boolean = currentStaffEntryIndex === measureStaffEntries.length - 1;
                        if (isLastNoteInMeasure) {
                            extraExistingPadding += rules.LyricsXPaddingReductionForLastNoteInMeasure; // need less padding
                        }
                        if (!hasShortNotes) {
                            extraExistingPadding += rules.LyricsXPaddingReductionForLongNotes; // quarter or longer notes need less padding
                        }
                        if (rules.LyricsXPaddingForLastNoteInMeasure || !isLastNoteInMeasure) {
                            if (currentLyricsWidth > widthThreshold + extraExistingPadding) {
                                addPadding = true;
                                padding -= extraExistingPadding; // we don't need to add the e.g. 1.2 we already get from measure end padding
                                // for last note in the measure, this is usually not necessary,
                                //   but in rare samples with quite long text on the last note it is.
                            }
                        }
                        break; // TODO take the max padding across verses
                    }
                    // for situations unlikely to cause overlap we shouldn't add padding,
                    //   e.g. Brooke West sample (OSMD Function Test Chord Symbols) - width ~3.1 in measure 11 on 'ling', no padding needed.
                    //   though Beethoven - Geliebte has only 8ths in measure 2 and is still problematic,
                    //   so unfortunately we can't just check if the next note is 16th or less.
                }
                if (addPadding) {
                    (vfnote as any).paddingRight = 10 * rules.LyricsXPaddingFactorForLongLyrics * padding;
                }
            }
        }
        const lineShift: number = gve.notes[0].lineShift;
        if (lineShift !== 0) {
            vfnote.getKeyProps()[0].line += lineShift;
        }
        // check for slash noteheads (among other noteheads)
        if (notes.length > 1) {
            // for a single note, we can use duration += "s" (see above).
            //   If we use the below solution for a single note as well, the notehead sometimes goes over the stem.
            for (let n: number = 0; n < notes.length; n++) {
                const note: VexFlowGraphicalNote = notes[n] as VexFlowGraphicalNote;
                if (note.sourceNote.Notehead?.Shape === NoteHeadShape.SLASH) {
                    (vfnote as any).note_heads[n].note_type = "s"; // slash notehead
                }
            }
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
                //gve.parentVoiceEntry.StemColor = stemColor; // this shouldn't be set by DefaultColorStem
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
                    vfnote.setStemDirection(VF.Stem.UP);
                    gve.parentVoiceEntry.StemDirection = StemDirectionType.Up;
                    break;
                case (StemDirectionType.Down):
                    vfnote.setStemDirection(VF.Stem.DOWN);
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
                    vfnote.addAccidental(i, new VF.Accidental("##"));
                    vfnote.addAccidental(i, new VF.Accidental("#"));
                    continue;
                } else if (accidentals[i] === "bbs") { // triple flat
                    vfnote.addAccidental(i, new VF.Accidental("bb"));
                    vfnote.addAccidental(i, new VF.Accidental("b"));
                    continue;
                }
                vfnote.addAccidental(i, new VF.Accidental(accidentals[i])); // normal accidental
            }

            // add Tremolo strokes (only single note tremolos for now, Vexflow doesn't have beams for two-note tremolos yet)
            const tremoloStrokes: number = notes[i].sourceNote.TremoloStrokes;
            if (tremoloStrokes > 0) {
                const tremolo: VF.Tremolo = new VF.Tremolo(tremoloStrokes);
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
        // too early for this to be set, unless we read the custom notehead from XML, so this might be useful in future:
        //   (currently, custom notehead is set in VexFlowVoiceEntry.applyCustomNoteheads(), which happens after load(), unlike this)
        // for (let i: number = 0; i < notes.length; i++) {
        //     const note: VexFlowGraphicalNote = notes[i] as VexFlowGraphicalNote;
        //     if (note.sourceNote.CustomNoteheadVFCode) {
        //         // (vfnote as any).customGlyphs[i] = note.CustomNoteheadVFCode;
        //         const keyProps: Object[] = vfnote.getKeyProps();
        //         (<any>keyProps[i]).code = note.sourceNote.CustomNoteheadVFCode;
        //     }
        // }

        for (let i: number = 0, len: number = numDots; i < len; ++i) {
            vfnote.addDotToAll();
        }
        return vfnote;
    }

    public static generateArticulations(vfnote: VF.StemmableNote, gNote: GraphicalNote,
                                        rules: EngravingRules): void {
        if (!vfnote || vfnote.getAttribute("type") === "GhostNote") {
            return;
        }

        for (const articulation of gNote.sourceNote.ParentVoiceEntry.Articulations) {
            let vfArtPosition: number = VF.Modifier.Position.ABOVE;

            if (vfnote.getStemDirection() === VF.Stem.UP) {
                vfArtPosition = VF.Modifier.Position.BELOW;

                // if rules.ArticulationAboveNoteForStemUp set:
                // set accents (>/^) and other articulations above note instead of below (if conditions met).
                //   Applies to accents (>/^), staccato (.), pizzicato (+), mainly (in our samples).
                //   Note that this can look bad for some piano score in the left hand,
                //   which we try to check below, though some xmls make it hard to detect the left hand
                //   by using one piano instrument per staffline instead of uniting both hands in one instrument. (e.g. An die Musik)
                if (rules.ArticulationAboveNoteForStemUp) {
                    const parentMeasure: GraphicalMeasure = gNote.parentVoiceEntry.parentStaffEntry.parentMeasure;
                    const parentStaff: Staff = parentMeasure?.ParentStaff;
                    const staves: Staff[] = parentStaff?.ParentInstrument.Staves;
                    // if not piano left hand / last staffline of system:
                    if (staves.length === 1 ||
                        staves.length === 2 && parentStaff !== staves[1]) {
                            // don't do this for piano left hand. See Schubert An die Musik left hand: looks bad with accents below
                            vfArtPosition = VF.Modifier.Position.ABOVE;
                    }
                    // this "piano left hand check" could be extended to also match old scores using 1 instrument per hand,
                    //   but this can get complicated especially if there's also e.g. a voice instrument above. (e.g. Schubert An die Musik)
                }
            }
            let vfArt: VF.Articulation = undefined;
            const articulationEnum: ArticulationEnum = articulation.articulationEnum;
            if (rules.ArticulationPlacementFromXML) {
                if (articulation.placement === PlacementEnum.Above) {
                    vfArtPosition = VF.Modifier.Position.ABOVE;
                } else if (articulation.placement === PlacementEnum.Below) {
                    vfArtPosition = VF.Modifier.Position.BELOW;
                } // else if undefined: don't change
            }
            switch (articulationEnum) {
                case ArticulationEnum.accent: {
                    vfArt = new VF.Articulation("a>");
                    const slurs: Slur[] = gNote.sourceNote.NoteSlurs;
                    for (const slur of slurs) {
                        if (slur.StartNote === gNote.sourceNote) { // && slur.PlacementXml === articulation.placement
                            if (slur.PlacementXml === PlacementEnum.Above) {
                                vfArt.setYShift(-rules.SlurStartArticulationYOffsetOfArticulation * 10);
                            } else if (slur.PlacementXml === PlacementEnum.Below) {
                                vfArt.setYShift(rules.SlurStartArticulationYOffsetOfArticulation * 10);
                            }
                        }
                    }
                    break;
                }
                case ArticulationEnum.breathmark: {
                    vfArt = new VF.Articulation("abr");
                    if (articulation.placement === PlacementEnum.Above) {
                        vfArtPosition = VF.Modifier.Position.ABOVE;
                    }
                    (vfArt as any).breathMarkDistance = rules.BreathMarkDistance; // default 0.8 = 80% towards next note or staff end
                    break;
                }
                case ArticulationEnum.downbow: {
                    vfArt = new VF.Articulation("am");
                    if (articulation.placement === undefined) { // downbow/upbow should be above by default
                        vfArtPosition = VF.Modifier.Position.ABOVE;
                        articulation.placement = PlacementEnum.Above;
                    }
                    break;
                }
                case ArticulationEnum.fermata: {
                    vfArt = new VF.Articulation("a@a");
                    vfArtPosition = VF.Modifier.Position.ABOVE;
                    articulation.placement = PlacementEnum.Above;
                    break;
                }
                case ArticulationEnum.marcatodown: {
                    vfArt = new VF.Articulation("a|"); // Vexflow only knows marcato up, so we use a down stroke here.
                    break;
                }
                case ArticulationEnum.marcatoup: {
                    vfArt = new VF.Articulation("a^");
                    // according to Gould - Behind Bars, Marcato should always be above the staff, regardless of stem direction.
                    vfArtPosition = VF.Modifier.Position.ABOVE;
                    // alternative: place close to note (below staff if below 3rd line). looks strange though, see test_marcato_position
                    // if (rules.PositionMarcatoCloseToNote) {
                    //     const noteLine: number = vfnote.getLineNumber();
                    //     if (noteLine > 3) {
                    //         vfArtPosition = VF.Modifier.Position.ABOVE;
                    //     } else {
                    //         vfArtPosition = VF.Modifier.Position.BELOW;
                    //     }
                    //     //console.log("measure " + gNote.parentVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber + ", line " + noteLine);
                    // }
                    break;
                }
                case ArticulationEnum.invertedfermata: {
                    const pve: VoiceEntry = gNote.sourceNote.ParentVoiceEntry;
                    const sourceNote: Note = gNote.sourceNote;
                    // find inverted fermata, push it to last voice entry in staffentry list,
                    //   so that it doesn't overlap notes (gets displayed right below higher note)
                    //   TODO this could maybe be moved elsewhere or done more elegantly,
                    //     but on the other hand here it only gets checked if we have an inverted fermata anyways, seems efficient.
                    if (pve !== sourceNote.ParentVoiceEntry.ParentSourceStaffEntry.VoiceEntries.last()) {
                        pve.Articulations = pve.Articulations.slice(pve.Articulations.indexOf(articulation));
                        pve.ParentSourceStaffEntry.VoiceEntries.last().Articulations.push(articulation);
                        continue;
                    }
                    vfArt = new VF.Articulation("a@u");
                    vfArtPosition = VF.Modifier.Position.BELOW;
                    articulation.placement = PlacementEnum.Below;
                    break;
                }
                case ArticulationEnum.lefthandpizzicato: {
                    vfArt = new VF.Articulation("a+");
                    break;
                }
                case ArticulationEnum.naturalharmonic: {
                    vfArt = new VF.Articulation("ah");
                    break;
                }
                case ArticulationEnum.snappizzicato: {
                    vfArt = new VF.Articulation("ao");
                    break;
                }
                case ArticulationEnum.staccatissimo: {
                    vfArt = new VF.Articulation("av");
                    break;
                }
                case ArticulationEnum.staccato: {
                    vfArt = new VF.Articulation("a.");
                    break;
                }
                case ArticulationEnum.tenuto: {
                    vfArt = new VF.Articulation("a-");
                    break;
                }
                case ArticulationEnum.upbow: {
                    vfArt = new VF.Articulation("a|");
                    if (articulation.placement === undefined) { // downbow/upbow should be above by default
                        vfArtPosition = VF.Modifier.Position.ABOVE;
                        articulation.placement = PlacementEnum.Above;
                    }
                    break;
                }
                case ArticulationEnum.strongaccent: {
                    vfArt = new VF.Articulation("a^");
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

    public static generateOrnaments(vfnote: VF.StemmableNote, oContainer: OrnamentContainer): void {
        let vfPosition: number = VF.Modifier.Position.ABOVE;
        if (oContainer.placement === PlacementEnum.Below) {
            vfPosition = VF.Modifier.Position.BELOW;
        }

        let vfOrna: VF.Ornament = undefined;
        switch (oContainer.GetOrnament) {
            case OrnamentEnum.DelayedInvertedTurn: {
                vfOrna = new VF.Ornament("turn_inverted");
                vfOrna.setDelayed(true);
                break;
            }
            case OrnamentEnum.DelayedTurn: {
                vfOrna = new VF.Ornament("turn");
                vfOrna.setDelayed(true);
                break;
            }
            case OrnamentEnum.InvertedMordent: {
                vfOrna = new VF.Ornament("mordent"); // Vexflow uses baroque, not MusicXML definition
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.InvertedTurn: {
                vfOrna = new VF.Ornament("turn_inverted");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Mordent: {
                vfOrna = new VF.Ornament("mordent_inverted");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Trill: {
                vfOrna = new VF.Ornament("tr");
                vfOrna.setDelayed(false);
                break;
            }
            case OrnamentEnum.Turn: {
                vfOrna = new VF.Ornament("turn");
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

    public static StrokeTypeFromArpeggioType(arpeggioType: ArpeggioType): VF.Stroke.Type {
        switch (arpeggioType) {
            case ArpeggioType.ARPEGGIO_DIRECTIONLESS:
                return VF.Stroke.Type.ARPEGGIO_DIRECTIONLESS;
            case ArpeggioType.BRUSH_DOWN:
                return VF.Stroke.Type.BRUSH_UP; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.BRUSH_UP:
                return VF.Stroke.Type.BRUSH_DOWN; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.RASQUEDO_DOWN:
                return VF.Stroke.Type.RASQUEDO_UP;
            case ArpeggioType.RASQUEDO_UP:
                return VF.Stroke.Type.RASQUEDO_DOWN;
            case ArpeggioType.ROLL_DOWN:
                return VF.Stroke.Type.ROLL_UP; // TODO somehow up and down are mixed up in Vexflow right now
            case ArpeggioType.ROLL_UP:
                return VF.Stroke.Type.ROLL_DOWN; // TODO somehow up and down are mixed up in Vexflow right now
            default:
                return VF.Stroke.Type.ARPEGGIO_DIRECTIONLESS;
        }
    }

    /**
     * Convert a set of GraphicalNotes to a VexFlow StaveNote
     * @param notes form a chord on the staff
     * @returns {VF.StaveNote}
     */
    public static CreateTabNote(gve: GraphicalVoiceEntry): VF.TabNote {
        const tabPositions: {str: number, fret: number}[] = [];
        const notes: GraphicalNote[] = gve.notes.reverse();
        const tabPhrases: { type: number, text: string, width: number }[] = [];
        const frac: Fraction = gve.notes[0].graphicalNoteLength;
        const isTuplet: boolean = gve.notes[0].sourceNote.NoteTuplet !== undefined;
        let duration: string = VexFlowConverter.durations(frac, isTuplet)[0];
        let numDots: number = 0;
        let tabVibrato: boolean = false;
        const rules: EngravingRules = gve.parentStaffEntry.parentMeasure.parentSourceMeasure.Rules;
        let isXNotehead: boolean = false;
        for (const note of gve.notes) {
            const tabNote: TabNote = note.sourceNote as TabNote;
            let tabPosition: {str: number, fret: number} = {str: tabNote.StringNumberTab, fret: tabNote.FretNumber};
            if (!(note.sourceNote instanceof TabNote)) {
                log.info(`invalid tab note: ${note.sourceNote.Pitch.ToString()} in measure ${gve.parentStaffEntry.parentMeasure.MeasureNumber}` +
                    ", likely missing XML string+fret number.");
                tabPosition = {str: 1, fret: 0}; // random safe values, otherwise it's both undefined for invalid notes
            }
            if (rules.TabUseXNoteheadShapeForTabNote && note.sourceNote.Notehead?.Shape === NoteHeadShape.X) {
                (tabPosition as any).fret = "x";
                isXNotehead = true;
            }
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
                        tabPhrases.push({type: VF.Bend.UP, text: phraseText, width: 10});
                    } else {
                        tabPhrases.push({type: VF.Bend.DOWN, text: phraseText, width: 10});
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

        const vfnote: VF.TabNote = new VF.TabNote({
            duration: duration,
            positions: tabPositions,
        });
        if (isXNotehead) {
            // (vfnote as any).render_options.fretScale = rules.TabXNoteheadScale; // doesn't work, is overwritten later
            (vfnote as any).render_options.scale = rules.TabXNoteheadScale; // VexFlowPatch
            (vfnote as any).render_options.TabUseXNoteheadAlternativeGlyph = rules.TabUseXNoteheadAlternativeGlyph; // VexFlowPatch
            vfnote.updateWidth(); // use .scale, update glyph
        }
        if (rules.UsePageBackgroundColorForTabNotes) {
            (vfnote as any).BackgroundColor = rules.PageBackgroundColor; // may be undefined
        }
        // this fixes background color for rects around tab numbers if PageBackgroundColor set or transparent color unsupported.

        for (let i: number = 0, len: number = notes.length; i < len; i += 1) {
            (notes[i] as VexFlowGraphicalNote).setIndex(vfnote, i);
        }

        tabPhrases.forEach(function(phrase: { type: number, text: string, width: number }): void {
            if (phrase.type === VF.Bend.UP) {
                vfnote.addModifier (new VF.Bend(phrase.text, false));
            } else {
                vfnote.addModifier (new VF.Bend(phrase.text, true));
            }
        });
        if (tabVibrato) {
            vfnote.addModifier(new VF.Vibrato());
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
     * @returns {VF.TimeSignature}
     * @constructor
     */
    public static TimeSignature(rhythm: RhythmInstruction): VF.TimeSignature {
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
        return new VF.TimeSignature(timeSpec);
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
                    return VF.StaveConnector.type.SINGLE;
                }
                return VF.StaveConnector.type.SINGLE_RIGHT;
            case SystemLinesEnum.DoubleThin:
                return VF.StaveConnector.type.THIN_DOUBLE;
            case SystemLinesEnum.ThinBold:
                return VF.StaveConnector.type.BOLD_DOUBLE_RIGHT;
            case SystemLinesEnum.BoldThinDots:
                return VF.StaveConnector.type.BOLD_DOUBLE_LEFT;
            case SystemLinesEnum.DotsThinBold:
                return VF.StaveConnector.type.BOLD_DOUBLE_RIGHT;
            case SystemLinesEnum.DotsBoldBoldDots:
                return VF.StaveConnector.type.BOLD_DOUBLE_RIGHT;
            case SystemLinesEnum.None:
                return VF.StaveConnector.type.NONE;
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


