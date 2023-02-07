import Vex from "vexflow";
import VF = Vex.Flow;
import { NoteEnum } from "../../../Common";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { Label } from "../../Label";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { GraphicalLabel } from "../GraphicalLabel";
import { StaffLine } from "../StaffLine";
import { VexFlowMeasure } from "../VexFlow/VexFlowMeasure";

export class JianpuMeasure extends VexFlowMeasure {
    constructor(staff: Staff = undefined, parentSourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, parentSourceMeasure, staffLine);
        this.IsJianpuMeasure = true;
    }

    public draw(ctx: Vex.IRenderContext): void {
        //this.stave.setEndBarType(VF.Barline.type.END);
        this.stave.setContext(ctx);
        for (const config of this.stave.options.line_config) {
            config.visible = false;
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
        this.rules.RenderMeasureNumbers = false; // TODO wrong placement
        for (const se of this.staffEntries) {
            let veHeight: number = 1;
            for (const ve of se.graphicalVoiceEntries) {
                for (const note of ve.notes) {
                    note.JianpuHeight = veHeight;
                    veHeight += 2;

                    const jianpuNumber: number = this.getJianpuNumber(note.sourceNote.Pitch.FundamentalNote, this.ActiveKeyInstruction.Key);
                    const label: Label = new Label(jianpuNumber.toString(), TextAlignmentEnum.CenterBottom);
                    const gLabel: GraphicalLabel = new GraphicalLabel(label, 2, label.textAlignment, this.rules);
                    note.JianpuLabel = gLabel;
                    gLabel.PositionAndShape.Parent = se.PositionAndShape;
                    gLabel.PositionAndShape.RelativePosition.x = 0;
                    gLabel.PositionAndShape.RelativePosition.y = veHeight;
                    gLabel.setLabelPositionAndShapeBorders();
                    gLabel.PositionAndShape.calculateBoundingBox();
                    se.JianpuNoteLabels.push(gLabel);
                }
            }
        }
    }

    private getJianpuNumber(noteKey: NoteEnum, keySignatureKey: NoteEnum): number {
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
