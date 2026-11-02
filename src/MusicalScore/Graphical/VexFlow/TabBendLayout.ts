import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { TabNote } from "../../VoiceData/TabNote";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";

export interface TabBendPhrase {
    type: number;
    text: string;
    width?: number;
    draw_width?: number;
}

/** Runtime methods/properties missing from the VexFlow 1.x declarations. */
interface TabBendNote extends VF.TabNote {
    getModifiers(): VF.Modifier[];
    getGlyph(): VF.Glyph & {getWidth(): number};
    tabFretNumbersSuppressed?: boolean;
}

/** Format semitone intervals consistently for ordinary bends and pre-bends. */
export function formatTabBendInterval(semitones: number): string {
    const tones: number = Math.abs(semitones) / 2;
    if (tones === 1) {
        return "Full";
    }
    if (Number.isInteger(tones)) {
        return String(tones);
    }
    const quarters: number = Math.round(tones * 4);
    if (Math.abs(quarters / 4 - tones) >= 1e-8) {
        return String(tones);
    }
    const remainder: number = quarters % 4;
    return (quarters >= 4 ? `${Math.floor(quarters / 4)} ` : "") + (remainder === 2 ? "1/2" : `${remainder}/4`);
}

function noteAt(entry: GraphicalVoiceEntry): TabBendNote {
    return (entry as VexFlowVoiceEntry)?.vfStaveNote as TabBendNote;
}

function sourceAt(entry: GraphicalVoiceEntry): TabNote {
    return entry?.notes.length === 1 ? entry.notes[0].sourceNote as TabNote : undefined;
}

function bendAt(entry: GraphicalVoiceEntry): TabBend {
    return noteAt(entry)?.getModifiers().find(modifier => modifier instanceof TabBend) as TabBend;
}

/** Future measures still use temporary stave coordinates until their own draw call. */
function laidOutX(entry: GraphicalVoiceEntry): number {
    const note: TabBendNote = noteAt(entry);
    const measure: VexFlowMeasure = entry.parentStaffEntry.parentMeasure as VexFlowMeasure;
    return note.getAbsoluteX() + measure.PositionAndShape.AbsolutePosition.x * unitInPixels +
        measure.getVFStave().getNoteStartX() - measure.getVFStave().getX() - note.getStave().getNoteStartX();
}

/** A VexFlow bend with note/tie-aware geometry. Unhandled gestures retain VexFlow's drawing. */
export class TabBend extends VF.Bend {
    // These fields exist on VexFlow's Bend but are omitted from its 1.x type declarations.
    declare public phrase: TabBendPhrase[];
    declare public font: string;
    declare public text_line: number;
    declare public render_options: {line_style: string, line_width: number};
    declare public setRendered: () => void;
    private entry: VexFlowVoiceEntry;
    private combinedRelease: TabBend;

    constructor(entry: VexFlowVoiceEntry, phrases: TabBendPhrase[]) {
        // VexFlow computes width and draw_width when width is omitted; its declaration incorrectly requires width.
        super("", false, phrases as {type: number, text: string, width: number}[]);
        this.entry = entry;
    }

    public draw(): void {
        this.combinedRelease = undefined;
        const note: TabBendNote = this.getNote() as TabBendNote;
        const entries: GraphicalVoiceEntry[] = this.entry.parentStaffEntry.parentMeasure.staffEntries
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries)
            .filter(voiceEntry => voiceEntry.parentVoiceEntry.ParentVoice === this.entry.parentVoiceEntry.ParentVoice);
        const index: number = entries.indexOf(this.entry);
        if (bendAt(entries[index - 1])?.combinedRelease === this) {
            return;
        }
        if (!this.drawHiddenRelease(note, entries, index)) {
            super.draw();
        }
    }

    private withContext(group: string, draw: (context: Vex.IRenderContext) => void): void {
        const context: Vex.IRenderContext = this.getContext();
        context.openGroup(group);
        context.save();
        try {
            context.setStrokeStyle(this.render_options.line_style);
            context.setFillStyle(this.render_options.line_style);
            context.setLineWidth(this.render_options.line_width);
            draw(context);
            this.setRendered();
        } finally {
            context.restore();
            context.closeGroup();
        }
    }

    private arrow(context: Vex.IRenderContext, x: number, y: number, direction: number): void {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 4, y + direction * 5);
        context.lineTo(x + 4, y + direction * 5);
        context.closePath();
        context.fill();
    }

    private label(context: Vex.IRenderContext, text: string, x: number, top: number): void {
        context.setRawFont(this.font);
        context.fillText(text, x - context.measureText(text).width / 2, top - 4);
    }

    private drawHiddenRelease(note: TabBendNote, entries: GraphicalVoiceEntry[], index: number): boolean {
        const release: GraphicalVoiceEntry = entries[index + 1];
        const first: TabNote = sourceAt(this.entry);
        const last: TabNote = sourceAt(release);
        if (!first || !last || first.BendArray?.length !== 1 || last.BendArray?.length !== 1 ||
            first.BendArray[0].direction !== "up" || last.BendArray[0].direction !== "down" ||
            last.FretVisible !== false || !last.FretParentheses || first.StringNumberTab !== last.StringNumberTab ||
            first.FretNumber !== last.FretNumber || Math.abs(first.BendArray[0].bendalter) !== Math.abs(last.BendArray[0].bendalter) ||
            this.entry.parentVoiceEntry.IsGrace || release.parentVoiceEntry.IsGrace) {
            return false;
        }
        const end: GraphicalVoiceEntry = entries.slice(index + 2).find(voiceEntry =>
            voiceEntry.notes.length === 1 && noteAt(voiceEntry)?.getTickContext());
        const endSource: TabNote = sourceAt(end);
        if (!endSource || endSource.StringNumberTab !== first.StringNumberTab || endSource.FretNumber !== first.FretNumber) {
            return false;
        }
        const x: number = note.getModifierStartXY(VF.Modifier.Position.RIGHT, 0).x + 3;
        const peakX: number = laidOutX(release) + noteAt(release).getGlyph().getWidth() / 2;
        const endX: number = laidOutX(end) - 3;
        const y: number = note.getYs()[0] + 0.5;
        const top: number = note.getStave().getYForTopText(this.text_line) + 3;
        if (![x, peakX, endX, y, top].every(Number.isFinite) || peakX <= x || endX <= peakX) {
            return false;
        }
        this.withContext("tab-bend-span", context => {
            context.beginPath();
            context.moveTo(x, y);
            context.quadraticCurveTo(peakX, y, peakX, top);
            context.quadraticCurveTo(endX, top, endX, y);
            context.stroke();
            this.arrow(context, peakX, top, 1);
            this.arrow(context, endX, y, -1);
            this.label(context, this.phrase[0].text, peakX, top);
        });
        this.combinedRelease = bendAt(release);
        return true;
    }
}
