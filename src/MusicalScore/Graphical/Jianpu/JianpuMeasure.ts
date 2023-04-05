import Vex from "vexflow";
import VF = Vex.Flow;
import { NoteEnum } from "../../../Common/DataObjects/Pitch";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { Label } from "../../Label";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { GraphicalLabel } from "../GraphicalLabel";
import { StaffLine } from "../StaffLine";
import { VexFlowMeasure } from "../VexFlow/VexFlowMeasure";
import { Note } from "../../VoiceData/Note";
import { NoteType } from "../../VoiceData/NoteType";
import { GraphicalRectangle } from "../GraphicalRectangle";
import { OutlineAndFillStyleEnum } from "../DrawingEnums";
import { BoundingBox } from "../BoundingBox";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";

export class JianpuMeasure extends VexFlowMeasure {
    /** Whether to draw the outer lines of the staffline (2 of 5), e.g. for the Skybottomline to work. */
    public DrawOuterStafflines: boolean = false;

    constructor(staff: Staff = undefined, parentSourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, parentSourceMeasure, staffLine);
        this.IsJianpuMeasure = true;
    }

    public draw(ctx: Vex.IRenderContext): void {
        //this.stave.setEndBarType(VF.Barline.type.END);
        this.stave.setContext(ctx);
        //this.stave.setBegBarType(VF.Barline.type.NONE);
        const virtualStafflines: number = this.stave.options.line_config.length;
        for (let i: number = 0; i < virtualStafflines; i++) {
            if (!this.DrawOuterStafflines || (i > 0 && i < virtualStafflines - 1)) {
                this.stave.options.line_config[i].visible = false;
                // if DrawOuterStafflines, then only the first and last line are visible, not those in-between
                //   (if !DrawOuterStafflines, all lines are invisible)
            }
        }
        const modifiers: VF.StaveModifier[] = this.stave.getModifiers();
        for (let i: number = 0; i < modifiers.length; i++) {
            const modifier: VF.StaveModifier = modifiers[i];
            if (modifier.getCategory() === "clefs") {
                if (this.FormatJianpuClef) {
                    (modifier as any).visible = false;
                } else {
                    modifiers.splice(i, 1);
                }
            }
            if (modifier.getCategory() === "timesignatures") {
                if (this.FormatJianpuTimeSignature) {
                    (modifier as any).visible = false; // TODO handle in timesignature.js
                } else {
                    modifiers.splice(i, 1); // don't draw
                }
            }
        }
        // // Draw the modifiers (bar lines, coda, segno, repeat brackets, etc.)
        // for (let i = 0; i < this.modifiers.length; i++) {
        //     // Only draw modifier if it has a draw function
        //     if (typeof this.modifiers[i].draw === 'function') {
        //     this.modifiers[i].applyStyle(this.context);
        //     this.modifiers[i].draw(this, this.getModifierXShift(i));
        //     this.modifiers[i].restoreStyle(this.context);
        //     }
        // }
        // this.stave.drawVerticalBar(this.stave.getX() + this.stave.getWidth());
        this.stave.draw();
        // for (const se of this.staffEntries) {
        //     for (const ve of se.graphicalVoiceEntries) {
        //         for (const note of ve.notes) {
        //             if (false) {
        //                 console.log(note);
        //             }
        //         }
        //     }
        // }
    }

    public override calculateYLayout(): void {
        this.createJianpuNotes();
        if (!this.FormatJianpuClef && !this.FormatJianpuTimeSignature) {
            this.beginInstructionsWidth = 0;
        }
    }

    private createJianpuNotes(): void {
        for (let seIndex: number = 0; seIndex < this.staffEntries.length; seIndex++) {
            const se: GraphicalStaffEntry = this.staffEntries[seIndex];
            se.JianpuNoteLines = []; // reset, e.g. to avoid doubling after re-render
            se.JianpuNoteLabels = []; // reset, e.g. to avoid doubling after re-render
            se.JianpuNoteRectangles = [];
            se.PositionAndShape.ChildElements = [];
            let previousProcessedVoiceEntry: GraphicalVoiceEntry;
            let nextNoteMargin: number = 0;
            let numberOfNotesInStaffEntry: number = 0;
            let extraVeNotesTotal: number = 0; // extra notes past one per voice entry
            for (const ve of se.graphicalVoiceEntries) {
                numberOfNotesInStaffEntry += ve.notes.length;
                extraVeNotesTotal += Math.max(0, ve.notes.length - 1); // for all notes in addition to the first, add surplus (yShift).
            }
            const verticalShiftStaffentry: number = 3 - extraVeNotesTotal; // for a 3 note chord, shift by -2 compared to only one not per voice entry
            //let verticalShiftStaffentry: number = 3 - (se.graphicalVoiceEntries.length - 1);
            se.PositionAndShape.RelativePosition.y = verticalShiftStaffentry; // vertical shift of all of the labels in the measure
            // currently, for 2 simultaneous notes, the bottom one is always in the middle of the staff
            const fontSizeShrinkFactor: number = Math.pow(0.8, -1 + numberOfNotesInStaffEntry); // 100% for 1 note, *x% for each additional note
            const fontSize: number = 2 * fontSizeShrinkFactor;
            for (const ve of se.graphicalVoiceEntries) {
                ve.PositionAndShape.Parent = se.PositionAndShape;
                ve.PositionAndShape.ChildElements = [];
                //ve.PositionAndShape.calculateBoundingBox(); // just returns immediately when there are no childelements
                ve.PositionAndShape = new BoundingBox(ve, se.PositionAndShape); // reset Size.height etc on re-render
                if (previousProcessedVoiceEntry) {
                    ve.PositionAndShape.RelativePosition.y = previousProcessedVoiceEntry.PositionAndShape.Size.height + nextNoteMargin;
                    se.PositionAndShape.RelativePosition.y -= previousProcessedVoiceEntry.PositionAndShape.Size.height + nextNoteMargin;
                    nextNoteMargin = 0;
                } else {
                    ve.PositionAndShape.RelativePosition.y = 0;
                }
                let lastBbox: BoundingBox;
                let previousProcessedNote: GraphicalNote;
                for (let noteIndex: number = ve.notes.length - 1; noteIndex >= 0; noteIndex--) {
                    const note: GraphicalNote = ve.notes[noteIndex];
                    note.JianpuLabel = null;
                    note.JianpuLines = [];
                    note.JianpuRectangles = [];

                    let noteGLabelXShift: number = 0;
                    if (seIndex === 0 && se.graphicalVoiceEntries.length === 1
                        && ve.notes.length === 1 && ve.notes[0].sourceNote.isWholeRest()) {
                        // single whole rest measure: move start of note to 0, so that dashes fit
                        // se.PositionAndShape.RelativePosition.x = 0;
                        noteGLabelXShift = this.getVFStave().getNoteStartX() / this.rules.SamplingUnit - se.PositionAndShape.RelativePosition.x
                            + this.rules.JianpuWholeMeasureRestXShift;
                        // probably more elegant would be to get the staffentry to be at the right x position,
                        //   but it's somehow shifted for whole measure rests even with the alignedCenter = false fix in VexFlowConverter.
                    }

                    // create Jianpu number label
                    const jianpuNumber: number = this.getJianpuNumber(note.sourceNote, this.ActiveKeyInstruction.KeyNoteEnum);
                    // TODO: respect in-measure key changes
                    const noteLabel: Label = new Label(jianpuNumber.toString(), TextAlignmentEnum.CenterBottom);
                    const noteGLabel: GraphicalLabel = new GraphicalLabel(noteLabel, fontSize, noteLabel.textAlignment, this.rules);
                    note.JianpuLabel = noteGLabel;
                    noteGLabel.PositionAndShape.Parent = ve.PositionAndShape;
                    noteGLabel.PositionAndShape.RelativePosition.x = noteGLabelXShift;
                    noteGLabel.PositionAndShape.RelativePosition.y = 0;
                    if (previousProcessedNote) {
                        noteGLabel.PositionAndShape.RelativePosition.y = ve.PositionAndShape.Size.height + nextNoteMargin;
                        nextNoteMargin = 0;
                    } else {
                        nextNoteMargin = 0;
                    }
                    noteGLabel.setLabelPositionAndShapeBorders();
                    se.JianpuNoteLabels.push(noteGLabel);
                    lastBbox = noteGLabel.PositionAndShape;

                    // create "underscores" (notelength indicator <= 8th)
                    note.JianpuLines = []; // reset
                    const noteType: NoteType = note.sourceNote.NoteTypeXml;
                    let addedYPositionBelow: number = 0;
                    if (noteType > NoteType.UNDEFINED && noteType <= NoteType.EIGHTH) {
                        const numberOfUnderlines: number = NoteType.EIGHTH - noteType + 1;
                        for (let i: number = 1; i <= numberOfUnderlines; i++) {
                            ve.PositionAndShape.calculateBoundingBox();
                            const startX: number = 0;
                            const startY: number = 0; // offset to note

                            const startPoint: PointF2D = new PointF2D(startX, startY);
                            //const endPoint: PointF2D = new PointF2D(startX + 1, startY); // for GraphicalLine
                            const endPoint: PointF2D = new PointF2D(startX + 1, startY + this.rules.JianpuUnderlineWidth / 2);
                            const rectangle: GraphicalRectangle = new GraphicalRectangle(
                                startPoint, endPoint, ve.PositionAndShape, OutlineAndFillStyleEnum.BaseWritingColor);
                            rectangle.PositionAndShape.RelativePosition.x = this.rules.JianpuUnderlineXOffset;
                            // if (lastBbox.DataObject === noteGLabel) { // irrelevant for now, since we start at 0 = directly under note
                            rectangle.PositionAndShape.RelativePosition.y = addedYPositionBelow;
                            addedYPositionBelow += rectangle.PositionAndShape.BorderBottom + this.rules.JianpuUnderlineWidth * 2.5; // + margin
                            //const line: GraphicalLine = new GraphicalLine(startPoint, endPoint, this.rules.JianpuUnderlineWidth);
                            note.JianpuRectangles.push(rectangle);
                            se.JianpuNoteRectangles.push(rectangle);
                            rectangle.PositionAndShape.calculateBoundingBox();
                            ve.PositionAndShape.calculateBoundingBox();
                            lastBbox = rectangle.PositionAndShape;
                        }
                    }

                    if (note.sourceNote.isRest()) {
                        previousProcessedNote = note;
                        continue; // no octave dots for rest notes
                    }
                    const jianpuDotValue: number = note.sourceNote.Pitch.Octave - 1;
                    const textHeight: number = 2;
                    let dotAddedHeight: number = 0;
                    if (jianpuDotValue > 0 || jianpuDotValue < 0) {
                        const totalDots: number = Math.abs(jianpuDotValue);
                        const sign: number = -Math.sign(jianpuDotValue); // shift upwards for above, downwards for below
                        const dotLabel: Label = new Label("•", TextAlignmentEnum.CenterBottom);
                        const gDotLabel: GraphicalLabel = new GraphicalLabel(dotLabel, textHeight, dotLabel.textAlignment, this.rules);
                        ve.PositionAndShape.calculateBoundingBox();
                        gDotLabel.PositionAndShape.Parent = ve.PositionAndShape;
                        gDotLabel.setLabelPositionAndShapeBorders(); // get Size.height
                        gDotLabel.PositionAndShape.RelativePosition.x = 0.1;
                        let baseHeightUnsigned: number = noteGLabel.PositionAndShape.Size.height;
                        if (jianpuDotValue < 0) { // height after underlines (only use for dots below)
                            baseHeightUnsigned = addedYPositionBelow + gDotLabel.PositionAndShape.Size.height; // 2nd part = margin
                        }
                        dotAddedHeight += sign * (baseHeightUnsigned +
                            (this.rules.JianpuOctaveDotYOffset * Math.pow(fontSizeShrinkFactor, 3)));
                            // somehow the note label height shrinks faster than offset*fontSizeShrinkFactor
                        gDotLabel.PositionAndShape.RelativePosition.y = dotAddedHeight;
                        gDotLabel.setLabelPositionAndShapeBorders();
                        //gDotLabel.PositionAndShape.calculateBoundingBox();
                        lastBbox = gDotLabel.PositionAndShape;
                        se.JianpuNoteLabels.push(gDotLabel);
                        let previousLabel: GraphicalLabel = gDotLabel;
                        for (let i: number = 2; i <= totalDots; i++) {
                            const stackedDotLabel: Label = new Label("•", TextAlignmentEnum.CenterBottom);
                            const stackedGDotLabel: GraphicalLabel = new GraphicalLabel(stackedDotLabel, textHeight, stackedDotLabel.textAlignment, this.rules);
                            // ve.PositionAndShape.calculateBoundingBox();
                            previousLabel.PositionAndShape.Size.height *= 0.4; // TODO somehow the bounding boxes are way too large for the dots
                            dotAddedHeight += sign * lastBbox.Size.height;
                            stackedGDotLabel.PositionAndShape.RelativePosition.y = dotAddedHeight;
                            stackedGDotLabel.PositionAndShape.RelativePosition.x = lastBbox.RelativePosition.x;
                            stackedGDotLabel.PositionAndShape.Parent = ve.PositionAndShape;
                            stackedGDotLabel.setLabelPositionAndShapeBorders();
                            //stackedGDotLabel.PositionAndShape.calculateBoundingBox();
                            previousLabel = stackedGDotLabel;
                            se.JianpuNoteLabels.push(stackedGDotLabel);
                            lastBbox = stackedGDotLabel.PositionAndShape;
                        }
                        previousLabel.PositionAndShape.Size.height *= 0.5;
                        // TODO octave below: last octave dot bounding box too small (though probably no problem)
                    }
                    if (jianpuDotValue === 0) {
                        nextNoteMargin += this.rules.JianpuNoteYMarginMinimum;
                    }
                    previousProcessedNote = note;
                    const childIndex: number = ve.PositionAndShape.ChildElements.indexOf(note.PositionAndShape);
                    if (childIndex >= 0) {
                        ve.PositionAndShape.ChildElements.splice(childIndex, 1);
                    }
                    ve.PositionAndShape.calculateBoundingBox(); // necessary to get a margin between multiple notes in one voice entry
                    // note.PositionAndShape.calculateBoundingBox();
                }
                previousProcessedVoiceEntry = ve;
                ve.PositionAndShape.calculateBoundingBox();
            }
            // se.PositionAndShape.calculateBoundingBox();
        }
    }

    // create dashes for note length: half = -, whole = ---
    public calculateNoteLengthDashes(): void {
        for (let seIndex: number = 0; seIndex < this.staffEntries.length; seIndex++) {
            const se: GraphicalStaffEntry = this.staffEntries[seIndex];
            se.JianpuNoteLengthDashRectangles = [];
            for (let veIndex: number = 0; veIndex < se.graphicalVoiceEntries.length; veIndex++) {
                const ve: GraphicalVoiceEntry = se.graphicalVoiceEntries[veIndex];
                for (let noteIndex: number = ve.notes.length - 1; noteIndex >= 0; noteIndex--) {
                    const note: GraphicalNote = ve.notes[noteIndex];
                    if (note.sourceNote.Length.RealValue < 0.5) {
                        continue; // dashes only for half note or longer
                    }
                    let numberOfDashes: number = 1;
                    if (note.sourceNote.Length.RealValue === 1) {
                        numberOfDashes = 3;
                    }
                    const noteGLabel: GraphicalLabel = note.JianpuLabel;
                    const dashRelativeHeight: number = noteGLabel.PositionAndShape.RelativePosition.y - noteGLabel.PositionAndShape.Size.height * 0.5;
                    let dashIntervalEndX: number = this.PositionAndShape.Size.width; // end of measure if in last staffentry
                    if (seIndex < this.staffEntries.length - 1) { // not the last staffentry -> go until next note/staffentry x position
                        dashIntervalEndX = this.staffEntries[seIndex + 1].PositionAndShape.RelativePosition.x;
                    }
                    const dashesStartX: number = se.PositionAndShape.RelativePosition.x + noteGLabel.PositionAndShape.RelativePosition.x;
                    // noteGLabel x position is shifted for whole measure rests
                    const totalDashInterval: number = dashIntervalEndX - dashesStartX;
                    const singleDashInterval: number = totalDashInterval / numberOfDashes;
                    const dashWidth: number = singleDashInterval * 0.3;
                    let dashIntervalStartX: number = noteGLabel.PositionAndShape.RelativePosition.x;
                    for (let dashIndex: number = 0; dashIndex < numberOfDashes; dashIndex++) {
                        const dashStartX: number = dashIntervalStartX + singleDashInterval * 0.5 - dashWidth * 0.5; // e.g. 0.25 with totalDashInterval 0.5
                        const dashEndX: number = dashStartX + dashWidth;
                        const dashRectStart: PointF2D = new PointF2D(dashStartX, dashRelativeHeight);
                        const dashRectEnd: PointF2D = new PointF2D(dashEndX, dashRelativeHeight + this.rules.JianpuNoteLengthDashWidth);
                        const dashRect: GraphicalRectangle = new GraphicalRectangle(
                            dashRectStart, dashRectEnd, undefined, OutlineAndFillStyleEnum.BaseWritingColor);
                        dashRect.PositionAndShape.calculateBoundingBox();
                        se.JianpuNoteLengthDashRectangles.push(dashRect);
                        dashIntervalStartX += singleDashInterval;
                    }
                }
            }
        }
    }

    private getJianpuNumber(note: Note, keySignatureKey: NoteEnum): number {
        if (note.isRest()) {
            return 0;
        }
        const noteKey: number = note.Pitch.FundamentalNote;
        let scaleNumber: number = this.keyToScaleNumber(noteKey);
        // move back one number for every key past C
        scaleNumber -= (this.keyToScaleNumber(keySignatureKey) - 1);
        if (scaleNumber < 1) {
            scaleNumber += 7;
        }
        return scaleNumber;
        //return (this.keyToScaleNumber(noteKey) - this.keyToScaleNumber(keySignatureKey) - 1) % 8;
    }

    private keyToScaleNumber(key: NoteEnum): number {
        switch (key) {
            case NoteEnum.C:
                return 1;
            case NoteEnum.D:
                return 2;
            case NoteEnum.E:
                return 3;
            case NoteEnum.F:
                return 4;
            case NoteEnum.G:
                return 5;
            case NoteEnum.A:
                return 6;
            case NoteEnum.B:
                return 7;
            default:
                console.log("error: invalid key (Jianpu keyToNumber)");
                return 0;
        }
    }

    // public override correctNotePositions(): void {
    //     // do nothing. don't take VexFlowGraphicalNote positions.
    // }
}
