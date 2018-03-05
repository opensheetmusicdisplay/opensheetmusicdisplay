import Vex = require("vexflow");
import { Staff } from "../../VoiceData/Staff";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowStaffEntry } from "./VexFlowStaffEntry";
import { GraphicalNote } from "../GraphicalNote";
import { VexFlowConverter } from "./VexFlowConverter";
import { StaffLine } from "../StaffLine";

export class VexFlowTabMeasure extends VexFlowMeasure {
    constructor(staff: Staff, sourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, sourceMeasure, staffLine);
    }

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        // Take into account some space for the begin and end lines of the stave
        // Will be changed when repetitions will be implemented
        //this.beginInstructionsWidth = 20 / UnitInPixels;
        //this.endInstructionsWidth = 20 / UnitInPixels;
        this.stave = new Vex.Flow.TabStave(0, 0, 0, {
            space_above_staff_ln: 0,
            space_below_staff_ln: 0,
        });
        this.updateInstructionWidth();
    }

    public staffMeasureCreatedCalculations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow Notes:
            const gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            for (const voiceID in gnotes) {
                if (gnotes.hasOwnProperty(voiceID)) {
                    const vfnote: Vex.Flow.TabNote = VexFlowConverter.CreateTabNote(gnotes[voiceID]);
                    // add VexFlow Notes to VexFlow Voice:
                    graphicalStaffEntry.vfNotes[voiceID] = vfnote;
                }
            }
        }

        this.finalizeTuplets();

        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            const gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            // create vex flow voices and add tickables to it:
            const vfVoices: { [voiceID: number]: Vex.Flow.Voice; } = this.vfVoices;
            for (const voiceID in gnotes) {
                if (gnotes.hasOwnProperty(voiceID)) {
                    if (!(voiceID in vfVoices)) {
                        vfVoices[voiceID] = new Vex.Flow.Voice({
                            beat_value: this.parentSourceMeasure.Duration.Denominator,
                            num_beats: this.parentSourceMeasure.Duration.Numerator,
                            resolution: Vex.Flow.RESOLUTION,
                        }).setMode(Vex.Flow.Voice.Mode.SOFT);
                    }

                    vfVoices[voiceID].addTickable(graphicalStaffEntry.vfNotes[voiceID]);
                }
            }
        }
    }
}
