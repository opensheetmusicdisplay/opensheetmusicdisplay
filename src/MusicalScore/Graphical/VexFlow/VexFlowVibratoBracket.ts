import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalWavyLine } from "../GraphicalWavyLine";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import * as VF from "vexflow";

const LEGACY_WAVE_HEIGHT: number = 6;
const LEGACY_VIBRATO_WIDTH: number = 20;

export class VexFlowVibratoBracket extends GraphicalWavyLine {
    /** Defines the note where the bracket starts */
    public startNote: VF.StemmableNote;
    /** Defines the note where the bracket ends */
    public endNote: VF.StemmableNote;
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
        // Preserve the legacy OSMD/VexFlow wavy-line headroom until the Stage 2
        // skyline reconciliation is complete.
        this.boundingBox.Size.height = LEGACY_WAVE_HEIGHT * 0.2;
    }

    public getVibratoBracket(): VF.VibratoBracket {
        const bracketData: { start?: VF.Note | null, stop?: VF.Note | null } = {
            start: this.startNote,
            stop: this.endNote,
        };
        const bracket: VF.VibratoBracket = new VF.VibratoBracket(bracketData);
        bracket.setLine(this.line);
        this.installLegacyCompatibility(bracket as any);
        return bracket;
    }

    private installLegacyCompatibility(bracket: any): void {
        bracket.render_options ??= {
            harsh: false,
            vibrato_width: LEGACY_VIBRATO_WIDTH,
            wave_height: LEGACY_WAVE_HEIGHT,
            wave_width: 4,
            wave_girth: 2,
        };
        bracket.render_options.wave_height = LEGACY_WAVE_HEIGHT;
        if (this.isVibrato) {
            bracket.render_options.vibrato_width = LEGACY_VIBRATO_WIDTH;
        } else {
            bracket.render_options.wave_girth = 4;
        }

        bracket.draw = (): void => {
            const ctx: VF.RenderContext = bracket.checkContext();
            bracket.setRendered();

            const startNote: VF.StemmableNote | undefined = this.startNote;
            const endNote: VF.StemmableNote | undefined = this.endNote;
            const y: number =
                startNote?.checkStave?.().getYForTopText(this.line) ??
                endNote?.checkStave?.().getYForTopText(this.line) ??
                0;

            const startNoteHeadBeginX: number | undefined = (startNote as any)?.getNoteHeadBeginX?.();
            const startX: number = startNote
                ? (startNoteHeadBeginX ?? startNote.getAbsoluteX()) + this.getTrillOffset(startNote)
                : (endNote?.checkStave?.().getTieStartX() ?? 0);

            const stopX: number = endNote
                ? (this.toEndOfStopStave
                    ? endNote.checkStave().getTieEndX() - 10
                    : endNote.getAbsoluteX() + endNote.getWidth())
                : ((startNote?.checkStave?.().getTieEndX() ?? 0) - 10);

            const vibratoWidth: number = Math.max(0, stopX - startX);
            bracket.render_options.vibrato_width = vibratoWidth;
            bracket.vibrato?.setVibratoWidth?.(vibratoWidth);
            bracket.vibrato?.renderText?.(ctx, startX, y);
        };
    }

    private getTrillOffset(note: VF.StemmableNote): number {
        const modifiers: any[] = (note as any).modifiers ?? note.getModifiers?.() ?? [];
        for (const modifier of modifiers) {
            const modifierType: string | undefined = modifier?.type ?? modifier?.getAttribute?.("type");
            if (modifierType === "tr") {
                return modifier.getWidth?.() ?? modifier.glyph?.bbox?.w ?? 0;
            }
        }
        return 0;
    }
}
