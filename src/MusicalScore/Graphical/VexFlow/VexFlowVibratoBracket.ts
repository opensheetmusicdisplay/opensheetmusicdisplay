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
    /** The voice entry after the end note in its voice, which the bracket ends in front of when it covers the end note's
     *  whole duration (see coverEndNoteDuration()). */
    public nextVfVoiceEntry: VexFlowVoiceEntry;
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
        const vve: VexFlowVoiceEntry = this.findNoteVoiceEntry(graphicalStaffEntry);
        if (!vve) {
            return false; // couldn't find a startNote
        }
        this.startNote = vve.vfStaveNote;
        this.startVfVoiceEntry = vve;
        return true;
    }

    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        const vve: VexFlowVoiceEntry = this.findNoteVoiceEntry(graphicalStaffEntry);
        if (!vve) {
            return false; // couldn't find an endNote
        }
        this.endNote = vve.vfStaveNote;
        this.endVfVoiceEntry = vve;
        const parentMeasureStaffEntries: GraphicalStaffEntry[] = vve.parentStaffEntry.parentMeasure.staffEntries;
        const lastStaffEntry: GraphicalStaffEntry = parentMeasureStaffEntries[parentMeasureStaffEntries.length - 1];
        //If this is the last staff entry of the stave (measure), render line to end of measure
        this.toEndOfStopStave = (lastStaffEntry === vve.parentStaffEntry);
        return true;
    }

    /**
     * Lets the bracket cover the whole duration of its end note: it ends in front of the next note in the end note's voice,
     * or at the end of the measure if the end note is the last one of its voice there.
     * Otherwise it ends at the end of the end note. A bracket that starts and stops at the same note then ends left of the end
     * of the note's trill mark, where its wavy line starts, so it is drawn as a stub or not at all.
     */
    public coverEndNoteDuration(): void {
        this.nextVfVoiceEntry = this.findNextVoiceEntryInVoice(this.endVfVoiceEntry);
        this.toEndOfStopStave = !this.nextVfVoiceEntry;
    }

    /**
     * Finds the voice entry that follows a voice entry in its voice and measure. Grace notes before a main note are skipped:
     * the main note is found instead, its left edge includes them. Grace notes after the voice entry's note count, e.g. a
     * Nachschlag ending a trill, which shares the note's staff entry.
     * @param voiceEntry the voice entry to find the next one of
     */
    private findNextVoiceEntryInVoice(voiceEntry: VexFlowVoiceEntry): VexFlowVoiceEntry {
        const staffEntries: GraphicalStaffEntry[] = voiceEntry.parentStaffEntry.parentMeasure.staffEntries;
        let isAfterVoiceEntry: boolean = false;
        for (let i: number = staffEntries.indexOf(voiceEntry.parentStaffEntry); i < staffEntries.length; i++) {
            for (const gve of staffEntries[i].graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                if (gve === voiceEntry) {
                    isAfterVoiceEntry = true;
                    continue;
                }
                const isGraceBeforeMainNote: boolean = gve.parentVoiceEntry.IsGrace && !gve.parentVoiceEntry.GraceAfterMainNote &&
                    !gve.isStandAloneGrace;
                if (isAfterVoiceEntry && gve.vfStaveNote && !isGraceBeforeMainNote &&
                    gve.parentVoiceEntry.ParentVoice === voiceEntry.parentVoiceEntry.ParentVoice) {
                    return gve;
                }
            }
        }
        return undefined;
    }

    /**
     * Finds the voice entry of the note in a staff entry that the wavy line attaches to: the first one with a Vexflow note,
     * preferring a main note to a grace note. Grace notes before their main note share its staff entry and come first,
     * e.g. an acciaccatura before a trill, but the trill mark and its wavy line belong to the main note.
     * @param graphicalStaffEntry the staff entry that holds the note
     */
    private findNoteVoiceEntry(graphicalStaffEntry: GraphicalStaffEntry): VexFlowVoiceEntry {
        if (!graphicalStaffEntry) {
            // e.g. an empty measure in the drawing range, or an IsExtraGraphicalMeasure, has no staff entries
            return undefined;
        }
        let firstGraceVoiceEntry: VexFlowVoiceEntry;
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (!vve?.vfStaveNote) {
                continue;
            }
            if (!vve.parentVoiceEntry.IsGrace) {
                return vve;
            }
            firstGraceVoiceEntry ??= vve; // used if the staff entry has only grace notes
        }
        return firstGraceVoiceEntry;
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
            toEndOfStopStave: this.toEndOfStopStave,
            stopBeforeNote: this.nextVfVoiceEntry?.vfStaveNote
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
