import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalWavyLine } from "../GraphicalWavyLine";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import Vex from "vexflow";

export class VexFlowVibratoBracket extends GraphicalWavyLine {
    /** Defines the note where the bracket starts */
    public startNote: Vex.Flow.StemmableNote;
    /** Defines the note where the bracket ends */
    public endNote: Vex.Flow.StemmableNote;
    public startVfVoiceEntry: VexFlowVoiceEntry;
    public endVfVoiceEntry: VexFlowVoiceEntry;
    //Line where vexflow renders the bracket. VF default is 1
    public line: number = 1;
    private isVibrato: boolean = false;
    private toEndOfStopStave: boolean = false;
    public get ToEndOfStopStave(): boolean {
        return this.toEndOfStopStave;
    }

    constructor(wavyLine: WavyLine, parentBBox: BoundingBox, tabVibrato: boolean = false) {
        super(wavyLine, parentBBox);
        this.isVibrato = tabVibrato;
    }

    /**
     * Set a start note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the start note
     */
     public setStartNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.startNote = vve.vfStaveNote;
                this.startVfVoiceEntry = vve;
                return true;
            }
        }
        return false; // couldn't find a startNote
    }

    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        // this is duplicate code from setStartNote, but if we make one general method, we add a lot of branching.
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.endNote = vve.vfStaveNote;
                this.endVfVoiceEntry = vve;
                const parentMeasureStaffEntries: GraphicalStaffEntry[] = this.endVfVoiceEntry.parentStaffEntry.parentMeasure.staffEntries;
                const lastStaffEntry: GraphicalStaffEntry = parentMeasureStaffEntries[parentMeasureStaffEntries.length - 1];
                //If this is the last staff entry of the stave (measure), render line to end of measure
                this.toEndOfStopStave = (lastStaffEntry === this.endVfVoiceEntry.parentStaffEntry);
                return true;
            }
        }
        return false; // couldn't find an endNote
    }

    public CalculateBoundingBox(): void {
        const vfBracket: any = this.getVibratoBracket();
        //Double the height of the wave, coverted to units
        this.boundingBox.Size.height = vfBracket.render_options.wave_height * 0.2;
    }

    public getVibratoBracket(): Vex.Flow.VibratoBracket {
		const bracket: Vex.Flow.VibratoBracket = new Vex.Flow.VibratoBracket({
			start: this.startNote,
			stop: this.endNote,
            toEndOfStopStave: this.toEndOfStopStave
		});
        bracket.setLine(this.line);
        if (this.isVibrato) {
			//Render options for vibrato style
			(bracket as any).render_options.vibrato_width = 20;
		} else {
			(bracket as any).render_options.wave_girth = 4;
		}
		return bracket;
    }
}
