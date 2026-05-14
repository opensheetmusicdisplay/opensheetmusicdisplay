import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalWavyLine } from "../GraphicalWavyLine";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import * as VF from "vexflow";

export class VexFlowVibratoBracket extends GraphicalWavyLine {
    public startNote: VF.StemmableNote;
    public endNote: VF.StemmableNote;
    public startVfVoiceEntry: VexFlowVoiceEntry;
    public endVfVoiceEntry: VexFlowVoiceEntry;
    public line: number = 1;
    private toEndOfStopStave: boolean = false;
    public get ToEndOfStopStave(): boolean {
        return this.toEndOfStopStave;
    }

    constructor(wavyLine: WavyLine, parentBBox: BoundingBox, tabVibrato: boolean = false) {
        super(wavyLine, parentBBox);
    }

    public setStartNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.startNote = vve.vfStaveNote;
                this.startVfVoiceEntry = vve;
                return true;
            }
        }
        return false;
    }

    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.endNote = vve.vfStaveNote;
                this.endVfVoiceEntry = vve;
                const parentMeasureStaffEntries: GraphicalStaffEntry[] = this.endVfVoiceEntry.parentStaffEntry.parentMeasure.staffEntries;
                const lastStaffEntry: GraphicalStaffEntry = parentMeasureStaffEntries[parentMeasureStaffEntries.length - 1];
                this.toEndOfStopStave = (lastStaffEntry === this.endVfVoiceEntry.parentStaffEntry);
                return true;
            }
        }
        return false;
    }

    public CalculateBoundingBox(): void {
        const vfBracket: VF.VibratoBracket = this.getVibratoBracket();
        this.boundingBox.Size.height = (vfBracket as any).vibrato?.renderOptions?.width * 0.2 || 2;
    }

    public getVibratoBracket(): VF.VibratoBracket {
        const bracket: VF.VibratoBracket = new VF.VibratoBracket({
            start: this.startNote,
            stop: this.endNote,
            toEndOfStopStave: this.toEndOfStopStave
        });
        bracket.setLine(this.line);
        return bracket;
    }
}
