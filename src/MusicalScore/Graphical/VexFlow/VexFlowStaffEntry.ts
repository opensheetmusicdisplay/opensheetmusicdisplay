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
import { VexFlowKeySignatureNote } from "./VexFlowKeySignatureNote";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // if there is a in-measure clef given before this staffEntry,
    // it will be converted to a VF.ClefNote and assigned to this variable:
    public vfClefBefore: VF.ClefNote;
    public vfKeys: VexFlowKeySignatureNote[] = [];
    public vfInStaffInstructionNote: VF.GhostNote;

    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positions.
     * It is also needed to be done after formatting!
     */
    public calculateXPosition(): void {
        const stave: VF.Stave = (this.parentMeasure as VexFlowMeasure).getVFStave();

        if (this.graphicalVoiceEntries.length === 0 && this.vfInStaffInstructionNote) {
            this.PositionAndShape.RelativePosition.x = this.vfInStaffInstructionNote.getAbsoluteX() / unitInPixels;
            this.PositionAndShape.BorderLeft = -this.vfInStaffInstructionNote.getWidth() / unitInPixels;
        }

        // sets the vexflow x positions back into the bounding boxes of the staff entries in the osmd object model.
        // The positions are needed for cursor placement and mouse/tap interactions
        let lastBorderLeft: number = 0;
        // grace notes after their main note, and stand-alone grace notes that no main note follows (VexFlowVoiceEntry.isStandAloneGrace)
        const isGraceWithoutMainNote: (gve: VexFlowVoiceEntry) => boolean = (gve: VexFlowVoiceEntry): boolean =>
            gve.parentVoiceEntry?.GraceAfterMainNote || gve.isStandAloneGrace;
        // a staff entry of stand-alone grace notes only (e.g. in a measure of only grace notes, split off to break the system
        //   inside a cadenza) has no main note to take its position from: its first grace note gives it.
        const positioningGraceEntry: VexFlowVoiceEntry = (this.graphicalVoiceEntries as VexFlowVoiceEntry[]).every(isGraceWithoutMainNote) ?
            this.graphicalVoiceEntries[0] as VexFlowVoiceEntry : undefined;
        // grace notes are drawn as small notes beside their main note: left of it (in a GraceNoteGroup), or right of it
        //   (grace notes after their main note, e.g. a Nachschlag ending a trill, which share the main note's staff entry,
        //   see InstrumentReader.attachGraceNotesAfterMainNote). They must neither set the staff entry's x position (cursor position)
        //   nor widen its bounding box (slur endpoints). They are placed where they are drawn afterwards (positionGraceEntries()).
        const graceEntries: VexFlowVoiceEntry[] = [];
        for (const gve of this.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            if (gve.vfStaveNote) {
                gve.vfStaveNote.setStave(stave);
                if (!gve.vfStaveNote.preFormatted) {
                    continue;
                }
                if (gve.parentVoiceEntry?.IsGrace && gve !== positioningGraceEntry) {
                    graceEntries.push(gve);
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
                    if (gve.vfStaveNote.isCenterAligned()) {
                        bboxToAdjust.RelativePosition.x +=
                            this.parentMeasure.parentSourceMeasure.Rules.WholeRestXShiftVexflow - 0.1; // xShift from VexFlowConverter
                    }
                    gve.PositionAndShape.BorderLeft = -0.7;
                    gve.PositionAndShape.BorderRight = 0.7;
                }
                // Not for a TAB note: its voice entry has no borders from Vexflow (see applyBordersFromVexflow()), only those of its
                //   bounding box, which spans its notes, left of it at the centres of the fret numbers (positionNotesAtNoteHeads(),
                //   of the last layout pass). The staff entry stays at the right end of the fret numbers.
                if (!(gve.vfStaveNote instanceof VF.TabNote) && gve.PositionAndShape.BorderLeft < lastBorderLeft) {
                    lastBorderLeft = gve.PositionAndShape.BorderLeft;
                }
            }
        }
        this.PositionAndShape.RelativePosition.x -= lastBorderLeft;
        // TODO sometimes subtracting lastBorderLeft fixes the x-position for lyrics spacing, sometimes it makes it wrong
        //   e.g. wrong for Beethoven Geliebte measure 1 ("auf - dem", distance < width of "auf"), correct for measure 3 ("spä - hend")
        //   this leads to a (lyrics) measure elongation of ~1.3 for measure 1, though it doesn't need any elongation (should be factor 1)
        this.positionGraceEntries(graceEntries);
        // before calculating the bounding box, which spans the notes (they would have their positions from the last render)
        this.positionNotesAtNoteHeads();
        // the bounding box without the grace notes (see above)
        if (graceEntries.length === 0) {
            this.PositionAndShape.calculateBoundingBox(); // (no copy of the child elements without them needed, for every staff entry)
        } else {
            const childElements: BoundingBox[] = this.PositionAndShape.ChildElements;
            this.PositionAndShape.ChildElements = childElements.filter(
                (child: BoundingBox) => !graceEntries.some((gve: VexFlowVoiceEntry) => gve.PositionAndShape === child));
            this.PositionAndShape.calculateBoundingBox();
            this.PositionAndShape.ChildElements = childElements;
        }
    }

    /**
     * Places the voice entries of grace notes where Vexflow draws them, relative to the staff entry (see calculateXPosition()),
     * like the voice entries that give the staff entry its position. Otherwise they would be at the main note's position,
     * and e.g. a click on the main note could find its grace note instead (GraphicalMusicSheet.GetNearestVoiceEntry()).
     */
    private positionGraceEntries(graceEntries: VexFlowVoiceEntry[]): void {
        if (graceEntries.length === 0) {
            return;
        }
        // Vexflow places the notes of a GraceNoteGroup left of their main note only when drawing the group
        //   (Modifier.alignSubNotesWithNote()). Do it now to know where they are drawn (drawing does it again, with the same result).
        for (const gve of this.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            const vfNote: any = gve.vfStaveNote;
            if (!vfNote?.preFormatted) {
                continue;
            }
            for (const modifier of vfNote.modifiers ?? []) {
                if (modifier instanceof VF.GraceNoteGroup) {
                    (modifier as any).alignSubNotesWithNote((modifier as any).getGraceNotes(), vfNote);
                }
            }
        }
        const isTab: boolean = this.parentMeasure.ParentStaff.isTab;
        for (const gve of graceEntries) {
            let x: number; // relative to the measure, like the staff entry's position in calculateXPosition()
            if (isTab) {
                x = (gve.vfStaveNote.getAbsoluteX() + (<any>gve.vfStaveNote).glyph.getWidth()) / unitInPixels;
            } else {
                gve.applyBordersFromVexflow();
                x = gve.vfStaveNote.getBoundingBox().getX() / unitInPixels - gve.PositionAndShape.BorderLeft;
            }
            gve.PositionAndShape.RelativePosition.x = x - this.PositionAndShape.RelativePosition.x;
        }
    }

    /**
     * Places the notes where they are drawn, relative to their voice entries: at the centres of their note heads, or of their
     * fret numbers in a TAB staff. That's where e.g. a click finds them (GraphicalMusicSheet.GetNearestNote()), and where slurs
     * start and end (GraphicalSlur.calculateStartAndEnd()).
     * The staff entry (e.g. for the cursor) and its voice entries can be elsewhere (see calculateXPosition(), positionGraceEntries()):
     * - in the middle of a Vexflow note's width, which includes e.g. the flag of an unbeamed note with its stem up (so it's at the
     *   right edge of the note head), or a note head displaced beside the others (e.g. of a second in a chord),
     * - moved by the widest left border of its voice entries, e.g. of another voice's note with an accidental, or which Vexflow
     *   moves aside so that the voices' notes don't overlap (x shift),
     * - at the right end of the widest fret number of a TAB chord.
     * The notes' y: see VexFlowMeasure.correctNotePositions().
     * Also sets the centre of the column of note heads of each voice entry (GraphicalVoiceEntry.noteHeadsCenterX).
     */
    private positionNotesAtNoteHeads(): void {
        // the note heads of each voice entry that aren't displaced beside the others (Vexflow doesn't displace the first head it
        //   draws, so every chord has such heads): their left edge and the width of the widest one, in pixels, relative to the
        //   measure like the positions of the Vexflow notes here
        const headColumns: { gve: VexFlowVoiceEntry, voiceEntryX: number, left: number, width: number }[] = [];
        for (const gve of this.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            gve.noteHeadsCenterX = undefined;
            const vfNote: any = gve.vfStaveNote;
            if (!vfNote?.preFormatted) {
                continue;
            }
            // relative to the measure, like the positions of the Vexflow notes here
            const voiceEntryX: number = this.PositionAndShape.RelativePosition.x + gve.PositionAndShape.RelativePosition.x;
            let headColumn: { gve: VexFlowVoiceEntry, voiceEntryX: number, left: number, width: number };
            for (const note of gve.notes as VexFlowGraphicalNote[]) {
                const head: { x: number, width: number } = note.sourceNote.isRest() ? undefined : VexFlowStaffEntry.drawnHead(vfNote, note);
                if (head === undefined) {
                    continue;
                }
                note.PositionAndShape.RelativePosition.x = (head.x + head.width / 2) / unitInPixels - voiceEntryX;
                if (!vfNote.note_heads?.[note.vfnoteIndex]?.isDisplaced()) {
                    if (!headColumn) {
                        headColumn = { gve, voiceEntryX, left: head.x, width: head.width };
                        headColumns.push(headColumn);
                    }
                    headColumn.width = Math.max(headColumn.width, head.width);
                }
            }
        }
        // The heads of voices that aren't moved aside from each other are drawn in one column, aligned at their left edges,
        //   e.g. a whole note and a quarter note: its centre is that of its widest head. (Voices moved apart are about a head apart.)
        for (const headColumn of headColumns) {
            let width: number = headColumn.width;
            for (const other of headColumns) {
                if (Math.abs(other.left - headColumn.left) < 1) {
                    width = Math.max(width, other.width);
                }
            }
            headColumn.gve.noteHeadsCenterX = (headColumn.left + width / 2) / unitInPixels - headColumn.voiceEntryX;
        }
    }

    /** The x (in pixels) at which Vexflow draws the note's head, or a TAB note's fret number, and its width. */
    private static drawnHead(vfNote: any, note: VexFlowGraphicalNote): { x: number, width: number } {
        if (vfNote instanceof VF.TabNote) {
            // TabNote.drawPositions() centres the fret numbers of a chord on the width of its widest fret number
            return { x: vfNote.getAbsoluteX(), width: (vfNote as any).glyph.getWidth() };
        }
        const noteHead: any = vfNote.note_heads?.[note.vfnoteIndex];
        if (!noteHead) {
            return undefined;
        }
        // StaveNote.draw() sets this x, from which a displaced note head (e.g. of a second in a chord) is drawn beside the others
        noteHead.setX(vfNote.getNoteHeadBeginX());
        return { x: noteHead.getAbsoluteX(), width: noteHead.getWidth() };
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
        // Grace notes are at different horizontal positions than other notes,
        // so we calculate collision offsets separately for each grace note voice entry.
        // Non-grace notes at the same timestamp share the same X position, so they're grouped together.
        const nonGraceNotes: GraphicalNote[] = [];

        for (const gve of this.graphicalVoiceEntries) {
            const isGrace: boolean = gve.parentVoiceEntry?.IsGrace ?? false;
            if (isGrace) {
                this.applyModifierOffsets(gve.notes);
            } else {
                nonGraceNotes.push(...gve.notes);
            }
        }

        this.applyModifierOffsets(nonGraceNotes);
    }

    private applyModifierOffsets(notes: GraphicalNote[]): void {
        if (notes.length === 0) {
            return;
        }
        const staffLines: number[] = notes.map(n => n.staffLine);
        const fingeringOffsets: number[] = this.calculateModifierXOffsets(staffLines, 0.5);
        const stringNumberOffsets: number[] = this.calculateModifierXOffsets(staffLines, 1);
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
