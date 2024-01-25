import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { Note } from "../../VoiceData/Note";
import { AccidentalEnum } from "../../../Common/DataObjects/Pitch";
import { BoundingBox } from "../BoundingBox";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // if there is a in-measure clef given before this staffEntry,
    // it will be converted to a VF.ClefNote and assigned to this variable:
    public vfClefBefore: VF.ClefNote;

    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positions.
     * It is also needed to be done after formatting!
     */
    public calculateXPosition(): void {
        const stave: VF.Stave = (this.parentMeasure as VexFlowMeasure).getVFStave();

        // sets the vexflow x positions back into the bounding boxes of the staff entries in the osmd object model.
        // The positions are needed for cursor placement and mouse/tap interactions
        let lastBorderLeft: number = 0;
        for (const gve of this.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            if (gve.vfStaveNote) {
                gve.vfStaveNote.setStave(stave);
                if (!gve.vfStaveNote.preFormatted) {
                    continue;
                }
                gve.applyBordersFromVexflow();
                let isSecondaryWholeRest: boolean = false;
                let bboxToAdjust: BoundingBox = this.PositionAndShape;
                if (gve.notes[0].sourceNote.isWholeRest() && !this.hasOnlyRests()) {
                    isSecondaryWholeRest = true;
                    // continue; // also an option (simpler), but makes the voice entry bounding boxes very wrong (shifted)
                    bboxToAdjust = gve.PositionAndShape;
                    // don't use a whole rest's position for the staffentry.x if we also have a normal note in another voice (#1267)
                    //   a more ideal solution would probably be to give a secondary whole note its own staffentry and staffentry position,
                    //   since it's so different from a normal note which is also the first note of the measure.
                    //   But we probably have some code that assumes there's only one staffentry per staff per timestamp.
                    //   "A [[SourceStaffEntry]] is a container spanning all the [[VoiceEntry]]s at one timestamp for one [[StaffLine]]"
                }
                if (this.parentMeasure.ParentStaff.isTab) {
                    // the x-position could be finetuned for the cursor.
                    // somehow, gve.vfStaveNote.getBoundingBox() is null for a TabNote (which is a StemmableNote).
                    bboxToAdjust.RelativePosition.x = (gve.vfStaveNote.getAbsoluteX() + (<any>gve.vfStaveNote).glyph.getWidth()) / unitInPixels;
                } else {
                    bboxToAdjust.RelativePosition.x = gve.vfStaveNote.getBoundingBox().getX() / unitInPixels;
                    if (isSecondaryWholeRest) {
                        bboxToAdjust.RelativePosition.x -= stave.getNoteStartX() / unitInPixels;
                        bboxToAdjust.RelativePosition.x -= 1.3;
                        // fix whole rest bounding box for these cases, slightly hacky admittedly, probably depends on WholeRestXShiftVexflow
                    }
                }
                const sourceNote: Note = gve.notes[0].sourceNote;
                if (sourceNote.isRest() && sourceNote.Length.RealValue === this.parentMeasure.parentSourceMeasure.ActiveTimeSignature.RealValue) {
                    // whole rest: length = measure length. (4/4 in a 4/4 time signature, 3/4 in a 3/4 time signature, 1/4 in a 1/4 time signature, etc.)
                    // see Note.isWholeRest(), which is currently not safe
                    bboxToAdjust.RelativePosition.x +=
                        this.parentMeasure.parentSourceMeasure.Rules.WholeRestXShiftVexflow - 0.1; // xShift from VexFlowConverter
                    gve.PositionAndShape.BorderLeft = -0.7;
                    gve.PositionAndShape.BorderRight = 0.7;
                }
                if (gve.PositionAndShape.BorderLeft < lastBorderLeft) {
                    lastBorderLeft = gve.PositionAndShape.BorderLeft;
                }
            }
        }
        this.PositionAndShape.RelativePosition.x -= lastBorderLeft;
        // TODO sometimes subtracting lastBorderLeft fixes the x-position for lyrics spacing, sometimes it makes it wrong
        //   e.g. wrong for Beethoven Geliebte measure 1 ("auf - dem", distance < width of "auf"), correct for measure 3 ("spä - hend")
        //   this leads to a (lyrics) measure elongation of ~1.3 for measure 1, though it doesn't need any elongation (should be factor 1)
        this.PositionAndShape.calculateBoundingBox();
    }

    public setMaxAccidentals(): number {
        for (const gve of this.graphicalVoiceEntries) {
            for (const note of gve.notes) {
                if (note.DrawnAccidental !== AccidentalEnum.NONE) {
                    //TODO continue checking for double accidentals in other notes?
                    return this.MaxAccidentals = 1;
                }
                // live calculation if the note was changed:
                // let pitch: Pitch = note.sourceNote.Pitch;
                // pitch = (note as VexFlowGraphicalNote).drawPitch(pitch);
                // if (pitch) {
                //     const accidental: AccidentalEnum = pitch.Accidental;
                //     if (accidental !== AccidentalEnum.NONE) {
                //         this.maxAccidentals = 1;
                //         return this.maxAccidentals;
                //     }
                // }
            }
        }
        return this.MaxAccidentals = 0;
    }

    // should be called after VexFlowConverter.StaveNote
    public setModifierXOffsets(): void {
        let notes: GraphicalNote[] = [];
        for (const gve of this.graphicalVoiceEntries) {
            notes = notes.concat(gve.notes);
        }
        const staffLines: number[] = notes.map(n => n.staffLine);
        const stringNumberOffsets: number[] = this.calculateModifierXOffsets(staffLines, 1);
        const fingeringOffsets: number[] = this.calculateModifierXOffsets(staffLines, 0.5);
        notes.forEach((note, i) => {
            note.baseFingeringXOffset = fingeringOffsets[i];
            note.baseStringNumberXOffset = stringNumberOffsets[i];
        });
    }

    /**
     * Calculate x offsets for overlapping string and fingering modifiers in a chord.
     */
    private calculateModifierXOffsets(staffLines: number[], collisionDistance: number): number[] {
        const offsets: number[] = [];
        for (let i: number = 0; i < staffLines.length; i++) {
            let offset: number = 0;
            let collisionFound: boolean = true;
            while (collisionFound) {
                for (let j: number = i; j >= 0; j--) {
                    const lineDiff: number = Math.abs(staffLines[i] - staffLines[j]);
                    if (lineDiff <= collisionDistance && offset === offsets[j]) {
                        offset++;
                        collisionFound = true;
                        break;
                    }
                    collisionFound = false;
                }
            }
            offsets.push(offset);
        }
        return offsets;
    }

}
