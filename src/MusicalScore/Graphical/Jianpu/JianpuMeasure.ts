import Vex from "vexflow";
import VF = Vex.Flow;
import { NoteEnum, PointF2D } from "../../../Common";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { Label } from "../../Label";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { GraphicalLabel } from "../GraphicalLabel";
import { StaffLine } from "../StaffLine";
import { VexFlowMeasure } from "../VexFlow/VexFlowMeasure";
import { Note } from "../../VoiceData/Note";
import { GraphicalLine } from "../GraphicalLine";
import { NoteType } from "../../VoiceData/NoteType";

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
            if (!this.DrawOuterStafflines || (i > 0 && i < virtualStafflines)) {
                this.stave.options.line_config[i].visible = false;
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
        this.createLabels();
        if (!this.FormatJianpuClef && !this.FormatJianpuTimeSignature) {
            this.beginInstructionsWidth = 0;
        }
    }

    private createJianpuNotes(): void {
        for (const se of this.staffEntries) {
            for (const ve of se.graphicalVoiceEntries) {
                for (const note of ve.notes) {
                    if (false) {
                        console.log(note);
                    }

                    // console.log("active key: ");
                    // console.dir(this.ActiveKeyInstruction);
                }
            }
        }
    }

    private createLabels(): void {
        for (const se of this.staffEntries) {
            let veHeight: number = 1;
            se.JianpuNoteLines = []; // reset, e.g. to avoid doubling after re-render
            se.JianpuNoteLabels = []; // reset, e.g. to avoid doubling after re-render
            for (const ve of se.graphicalVoiceEntries) {
                for (const note of ve.notes) {
                    note.JianpuHeight = veHeight;
                    veHeight += 2;

                    // create Jianpu number label
                    const jianpuNumber: number = this.getJianpuNumber(note.sourceNote, this.ActiveKeyInstruction.Key);
                    const label: Label = new Label(jianpuNumber.toString(), TextAlignmentEnum.CenterBottom);
                    const gLabel: GraphicalLabel = new GraphicalLabel(label, 2, label.textAlignment, this.rules);
                    note.JianpuLabel = gLabel;
                    gLabel.PositionAndShape.Parent = se.PositionAndShape;
                    gLabel.PositionAndShape.RelativePosition.x = 0;
                    gLabel.PositionAndShape.RelativePosition.y = veHeight;
                    gLabel.setLabelPositionAndShapeBorders();
                    gLabel.PositionAndShape.calculateBoundingBox();
                    se.JianpuNoteLabels.push(gLabel);

                    // create "underscores" (notelength indicator <= 8th)
                    note.JianpuLines = []; // reset
                    const noteType: NoteType = note.sourceNote.NoteTypeXml;
                    let underlineAddedHeight: number = 0;
                    if (noteType > NoteType.UNDEFINED && noteType <= NoteType.EIGHTH) {
                        const numberOfUnderlines: number = NoteType.EIGHTH - noteType + 1;
                        for (let i: number = 1; i <= numberOfUnderlines; i++) {
                            // const startX: number = note.JianpuLabel.PositionAndShape.AbsolutePosition.x; // doesn't exist yet?
                            // const startY: number = note.JianpuLabel.PositionAndShape.AbsolutePosition.y + veHeight;
                            // somehow the staffentry relativeposition is not correct here yet -> added in VexFlowMusicSheetDrawer.drawStaffEntry()
                            //   compare with glissStartNote.PositionAndShape etc handling in GraphicalGlissando
                            // const startX: number = note.PositionAndShape.RelativePosition.x
                            //   + note.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                            //   + note.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                            //   + this.rules.JianpuNoteLengthLinesXOffset;
                            const startX: number = this.rules.JianpuUnderlineXOffset;
                            //   + note.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine.PositionAndShape.RelativePosition.x
                            const startY: number = veHeight;

                            const startPoint: PointF2D = new PointF2D(startX, startY);
                            const endPoint: PointF2D = new PointF2D(startX + 1, startY);
                            const line: GraphicalLine = new GraphicalLine(startPoint, endPoint, this.rules.JianpuUnderlineWidth);
                            note.JianpuLines.push(line);
                            se.JianpuNoteLines.push(line);
                            // we could also create labels instead of lines ("_"), but would be harder to control positioning, bounding box, width, length, etc.

                            veHeight += this.rules.JianpuUnderlineYDistance;
                            underlineAddedHeight += this.rules.JianpuUnderlineYDistance;
                        }
                        veHeight -= this.rules.JianpuUnderlineYDistance; // remove last offset of for loop that wasn't used
                        //underlineAddedHeight -= this.rules.JianpuUnderlineYDistance;
                    }

                    if (note.sourceNote.isRest()) {
                        continue; // no octave dots for rest notes
                    }
                    const jianpuDotValue: number = note.sourceNote.Pitch.Octave - 1;
                    const textHeight: number = 2;
                    if (jianpuDotValue > 0 || jianpuDotValue < 0) {
                        const totalDots: number = Math.abs(jianpuDotValue);
                        const sign: number = Math.sign(jianpuDotValue); // shift upwards for above, downwards for below
                        const dotLabel: Label = new Label("•", TextAlignmentEnum.CenterBottom);
                        const gDotLabel: GraphicalLabel = new GraphicalLabel(dotLabel, textHeight, dotLabel.textAlignment, this.rules);
                        gDotLabel.PositionAndShape.Parent = gLabel.PositionAndShape;
                        gDotLabel.PositionAndShape.RelativePosition.x = 0.1;
                        gDotLabel.PositionAndShape.RelativePosition.y = -sign * // minus is up
                            (gLabel.PositionAndShape.Size.height + this.rules.JianpuOctaveDotYOffset + underlineAddedHeight);
                        //gDotLabel.PositionAndShape.BorderMarginTop = 0.1;
                        gDotLabel.setLabelPositionAndShapeBorders();
                        gDotLabel.PositionAndShape.calculateBoundingBox();
                        se.JianpuNoteLabels.push(gDotLabel);
                        let previousLabel: GraphicalLabel = gDotLabel;
                        for (let i: number = 2; i <= totalDots; i++) {
                            const stackedDotLabel: Label = new Label("•", TextAlignmentEnum.CenterBottom);
                            const stackedGDotLabel: GraphicalLabel = new GraphicalLabel(stackedDotLabel, textHeight, stackedDotLabel.textAlignment, this.rules);
                            stackedGDotLabel.PositionAndShape.Parent = previousLabel.PositionAndShape;
                            stackedGDotLabel.PositionAndShape.RelativePosition.x = 0;
                            previousLabel.PositionAndShape.Size.height *= 0.4; // TODO somehow the bounding boxes are way too large for the dots
                            stackedGDotLabel.PositionAndShape.RelativePosition.y = -sign * previousLabel.PositionAndShape.Size.height;
                            //stackedGDotLabel.PositionAndShape.BorderMarginTop = 0.1;
                            //stackedGDotLabel.PositionAndShape.BorderMarginBottom = 0.1;
                            stackedGDotLabel.setLabelPositionAndShapeBorders();
                            stackedGDotLabel.PositionAndShape.calculateBoundingBox();
                            previousLabel = stackedGDotLabel;
                            se.JianpuNoteLabels.push(stackedGDotLabel);
                        }
                        previousLabel.PositionAndShape.Size.height *= 0.5;
                        // TODO octave below: last octave dot bounding box too small (though probably no problem)
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
                console.log("error TODO");
                return 1;
        }
    }
}
