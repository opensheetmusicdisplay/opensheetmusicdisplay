import Vex from "vexflow";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { StaffLine } from "../StaffLine";
import { VexFlowNotelessMeasure } from "./VexFlowNotelessMeasure";

// type StemmableNote = Vex.Flow.StemmableNote;

/** A GraphicalMeasure drawing a multiple-rest measure in Vexflow.
 *  Mostly copied from VexFlowMeasure.
 *  Even though most of those functions aren't needed, apparently you can't remove the layoutStaffEntry function.
 */
export class VexFlowRepeatMeasure extends VexFlowNotelessMeasure {
    private multiRestElement: any;
    private repeatNote: Vex.Flow.RepeatNote;
    private vfVoice: Vex.Flow.Voice;

    constructor(staff: Staff, sourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, sourceMeasure, staffLine);

        const repeatMeasures: number = sourceMeasure.repeatMeasures;
        if ([1, 2, 4].includes(repeatMeasures)) {
            this.repeatNote = new Vex.Flow.RepeatNote(
                `${repeatMeasures}`, {}, {});
        } else {
            this.repeatNote = new Vex.Flow.RepeatNote(
                "1", {align_center: true}, {});
            this.multiRestElement = new Vex.Flow.MultiMeasureRest(
                sourceMeasure.repeatMeasures, {
                    draw_line: false // only show number of measures above staff. needs patched multimeasurerest.js from src/VexFlowPatch
                // number_line: 3
            });
            console.log(`repeat Measures: ${repeatMeasures} in measure number ${sourceMeasure.MeasureNumber}`);
        }

        // const notes: Vex.Flow.GlyphNote[] = [this.repeatNote];
        const notes: any[] = [];
        notes.push(this.repeatNote);
        this.vfVoice = new Vex.Flow.Voice({num_beats: 1, beat_value: 4});
        this.vfVoice.addTickables(notes);
        // this.vfVoice.addTickable(this.repeatNote);

    }

    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    public draw(ctx: Vex.IRenderContext): void {
        super.draw(ctx);

        console.log("width: " + this.stave.getWidth());
        this.vfVoice.setStave(this.stave);
        // new Vex.Flow.Formatter().joinVoices([this.vfVoice]).format([this.vfVoice], Math.random() * 300);
        new Vex.Flow.Formatter().joinVoices([this.vfVoice]).format([this.vfVoice], this.stave.getWidth());
        // (<any>this.repeatNote).tickContext = { getX(): number { return 50; } };
        // this.repeatNote.preFormatted = true;
        (this.repeatNote.getGlyph() as any).scale = 1;
        this.vfVoice.draw(ctx, this.stave);
        // this.repeatNote.setVoice() = true;
        // this.repeatNote.setStave(this.stave);
        // this.repeatNote.setContext(ctx);
        // this.repeatNote.draw();

        if (this.multiRestElement) {
            this.multiRestElement.setStave(this.stave);
            this.multiRestElement.setContext(ctx);
            this.multiRestElement.draw();
        }
    }
}
