/** Lay out a same-string bend and its hidden, parenthesized continuation within one measure.
 * Ordinary bends, chords, rearticulated notes, and system crossings keep VexFlow's normal drawing.
 * This affects engraving only; it does not infer or change playback attacks.
 */
export function configureTabBendLayout(gve: any, vfNote: any): void {
    const modifiers: any[] = vfNote.getModifiers().filter((modifier: any) => modifier.getCategory() === "bends");
    if (gve.notes.length !== 1 || modifiers.length !== 1) { return; }
    const bend: any = modifiers[0];
    const originalDraw: () => void = bend.draw.bind(bend);
    bend.draw = (): void => {
        const entries: any[] = gve.parentStaffEntry.parentMeasure.staffEntries
            .flatMap((entry: any) => entry.graphicalVoiceEntries)
            .filter((entry: any) => entry.parentVoiceEntry.ParentVoice === gve.parentVoiceEntry.ParentVoice);
        const index: number = entries.indexOf(gve);
        const pairs: any[] = [];
        for (let i: number = 0; i + 1 < entries.length; i++) {
            const start: any = entries[i];
            const release: any = entries[i + 1];
            if (start.notes.length !== 1 || release.notes.length !== 1) { continue; }
            const a: any = start.notes[0].sourceNote;
            const b: any = release.notes[0].sourceNote;
            if (a.BendArray?.length !== 1 || b.BendArray?.length !== 1 || a.BendArray[0].direction !== "up" ||
                b.BendArray[0].direction !== "down" || b.FretVisible !== false || !b.FretParentheses ||
                a.StringNumberTab !== b.StringNumberTab || a.FretNumber !== b.FretNumber ||
                Math.abs(a.BendArray[0].bendalter) !== Math.abs(b.BendArray[0].bendalter) ||
                start.parentVoiceEntry.IsGrace || release.parentVoiceEntry.IsGrace) { continue; }
            const end: any = entries.slice(i + 2).find((entry: any) => entry.notes.length === 1 && entry.notes[0].vfnote?.[0]?.getTickContext?.());
            if (!end || end.notes[0].sourceNote.StringNumberTab !== a.StringNumberTab ||
                end.notes[0].sourceNote.FretNumber !== a.FretNumber) { continue; }
            pairs.push({start, release, end, startIndex: i});
        }
        const pair: any = pairs.find((candidate: any) => candidate.startIndex === index || candidate.startIndex + 1 === index);
        if (!pair) { originalDraw(); return; }
        if (pair.release === gve) { return; } // the starting modifier draws the entire span
        const target: any = pair.release.notes[0].vfnote?.[0];
        const endNote: any = pair.end.notes[0].vfnote?.[0];
        if (!target || !endNote) { originalDraw(); return; }
        const x: number = vfNote.getModifierStartXY(2, 0).x + 3;
        const peakX: number = target.getAbsoluteX() + target.glyph.getWidth() / 2;
        const endX: number = endNote.getAbsoluteX() - 3;
        const y: number = vfNote.getYs()[0] + 0.5;
        const top: number = vfNote.getStave().getYForTopText(bend.text_line) + 3;
        if (![x, peakX, endX, y, top].every(Number.isFinite) || peakX <= x || endX <= peakX) {
            originalDraw(); return;
        }
        const ctx: any = bend.context;
        ctx.openGroup?.("tab-bend-span");
        ctx.save();
        ctx.setStrokeStyle(bend.render_options.line_style);
        ctx.setFillStyle(bend.render_options.line_style);
        ctx.setLineWidth(bend.render_options.line_width);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(peakX, y, peakX, top);
        ctx.quadraticCurveTo(endX, top, endX, y);
        ctx.stroke();
        for (const [arrowX, arrowY, direction] of [[peakX, top, 1], [endX, y, -1]]) {
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 4, arrowY + direction * 4);
            ctx.lineTo(arrowX + 4, arrowY + direction * 4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.setRawFont(bend.font);
        const label: string = bend.phrase[0].text;
        ctx.fillText(label, peakX - ctx.measureText(label).width / 2, top - 4);
        ctx.restore();
        ctx.closeGroup?.();
        bend.setRendered();
    };
}
