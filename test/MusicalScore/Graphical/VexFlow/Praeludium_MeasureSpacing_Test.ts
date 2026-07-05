import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import * as VF from "vexflow";

interface MeasureOverflow {
    measure: number;
    noteKey: string;
    noteEndX: number;
    barlineX: number;
    overflowPx: number;
}

interface GapEntry {
    measure: number;
    fromTick: number;
    toTick: number;
    fromKeys: string;
    toKeys: string;
    tickDelta: number;
    pixelDelta: number;
    pxPer16th: number;
}

async function loadAndRender(container: HTMLElement): Promise<any> {
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const scoreDoc: Document = TestUtils.getScore("JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml");
    await osmd.load(scoreDoc);
    osmd.render();
    const gms: any = (osmd as any).graphic;
    if (!gms?.MeasureList) {throw new Error("no MeasureList");}
    return gms;
}

function collectGaps(gms: any): GapEntry[] {
    const allGaps: GapEntry[] = [];

    for (const verticalMeasureList of gms.MeasureList) {
        if (!verticalMeasureList || verticalMeasureList.length === 0) {continue;}
        for (const measure of verticalMeasureList) {
            if (!measure?.isVisible?.()) {continue;}
            const mnum: number = measure.MeasureNumber;

            interface TickX { tick: number, x: number, keys: string, rest: boolean }
            const entries: TickX[] = [];

            for (const voiceIdStr of Object.keys(measure.vfVoices ?? {})) {
                const voice: any = measure.vfVoices[Number(voiceIdStr)];
                if (!voice) {continue;}
                let tick: number = 0;
                for (const t of voice.getTickables()) {
                    const dur: number = t.getTicks?.()?.value?.() ?? 0;
                    if (!t.shouldIgnoreTicks?.()) {
                        entries.push({
                            tick,
                            x: t.getAbsoluteX(),
                            keys: t.isRest?.() ? "REST" : (t.getKeys?.()?.join(",") ?? "?"),
                            rest: !!t.isRest?.(),
                        });
                    }
                    tick += dur;
                }
            }

            // Deduplicate by tick: for each unique tick with at least one non-rest,
            // keep the minimum X among non-rests
            const tickXs: Map<number, { x: number, keys: string }> = new Map();
            for (const e of entries) {
                if (e.rest) {continue;}
                const existing: { x: number, keys: string } | undefined = tickXs.get(e.tick);
                if (!existing || e.x < existing.x) {
                    tickXs.set(e.tick, { x: e.x, keys: e.keys });
                }
            }

            const sortedTicks: number[] = Array.from(tickXs.keys()).sort((a, b) => a - b);

            for (let i: number = 1; i < sortedTicks.length; i++) {
                const fromTick: number = sortedTicks[i - 1];
                const toTick: number = sortedTicks[i];
                const td: number = toTick - fromTick;
                const from: { x: number, keys: string } = tickXs.get(fromTick)!;
                const to: { x: number, keys: string } = tickXs.get(toTick)!;
                const pd: number = to.x - from.x;
                if (td > 0) {
                    allGaps.push({
                        measure: mnum,
                        fromTick,
                        toTick,
                        fromKeys: from.keys,
                        toKeys: to.keys,
                        tickDelta: td,
                        pixelDelta: pd,
                        pxPer16th: (pd / td) * 1024,
                    });
                }
            }
        }
    }
    return allGaps;
}

function median(values: number[]): number {
    if (values.length === 0) {return 0;}
    const sorted: number[] = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

async function findOverflows(container: HTMLElement): Promise<MeasureOverflow[]> {
    const gms: any = await loadAndRender(container);
    const overflows: MeasureOverflow[] = [];

    for (const verticalMeasureList of gms.MeasureList) {
        if (!verticalMeasureList || verticalMeasureList.length === 0) {continue;}
        for (const measure of verticalMeasureList) {
            if (!measure?.isVisible?.()) {continue;}
            const stave: any = measure.getVFStave?.();
            if (!stave) {continue;}
            const endMods: any[] = stave.getModifiers?.(VF.StaveModifier.Position.END) ?? [];
            const barlineX: number = endMods.length > 0
                ? endMods[endMods.length - 1].getX()
                : -1;

            for (const voiceIdStr of Object.keys(measure.vfVoices ?? {})) {
                const voice: any = measure.vfVoices[Number(voiceIdStr)];
                if (!voice) {continue;}
                for (const tickable of voice.getTickables()) {
                    if (tickable.isRest?.()) {continue;}
                    const note: any = tickable as any;
                    const noteEndX: number = note.getAbsoluteX() + (note.getGlyphWidth?.() ?? 0);
                    if (barlineX >= 0 && noteEndX > barlineX + 1) {
                        overflows.push({
                            measure: measure.MeasureNumber,
                            noteKey: note.getKeys?.()?.join(",") ?? "?",
                            noteEndX,
                            barlineX,
                            overflowPx: noteEndX - barlineX,
                        });
                    }
                }
            }
        }
    }
    return overflows;
}

describe("Praeludium measure bounds", () => {
    let overflows: MeasureOverflow[];

    beforeAll(async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1200px";
        container.style.height = "1600px";
        overflows = await findOverflows(container);
    });

    it("no note should overflow its measure stave boundary", () => {
        const msg: string = overflows.length > 0
            ? "Overflows:\n" + overflows.map(o =>
                `  M${o.measure} ${o.noteKey}: noteEnd=${o.noteEndX.toFixed(1)} ` +
                `barline=${o.barlineX.toFixed(1)} (+${o.overflowPx.toFixed(1)}px)`
              ).join("\n")
            : "no overflows";
        expect(overflows, msg).to.deep.equal([]);
    });
});

describe("Praeludium 16th spacing", () => {
    let gaps: GapEntry[];

    beforeAll(async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1200px";
        container.style.height = "1600px";
        const gms: any = await loadAndRender(container);
        gaps = collectGaps(gms);
    });

    it("should have collected gaps", () => {
        expect(gaps.length).to.be.greaterThan(0);
    });

    it("M6 and M20 half note → dotted eighth spacing follows systematic 16th grid", () => {
        // On the bass staff, the first visible note is the half note
        // (tick 0, voice 6). The next distinct tick with a note is the
        // dotted eighth (tick 1024, voice 5). Their gap (10px per 16th in
        // current layout) should match the measure's typical 16th spacing.
        // Per-measure median normalizes across measures of different widths.
        const byMeasure: Map<number, GapEntry[]> = new Map();
        for (const g of gaps) {
            if (!byMeasure.has(g.measure)) {byMeasure.set(g.measure, []);}
            byMeasure.get(g.measure)!.push(g);
        }

        for (const m of [6, 20]) {
            const mgaps: GapEntry[] = byMeasure.get(m) ?? [];
            const localMedian: number = mgaps.length > 0 ? median(mgaps.map(g => g.pxPer16th)) : 0;
            // Find gaps starting at tick 0 (the half note → next note in bass)
            const fromZero: GapEntry[] = mgaps.filter(g => g.fromTick === 0);
            for (const g of fromZero) {
                const ratio: number = localMedian > 0 ? g.pxPer16th / localMedian : 1;
                expect(ratio,
                    `M${g.measure} tick ${g.fromTick}→${g.toTick} ` +
                    `${g.fromKeys}→${g.toKeys}: ${g.pxPer16th.toFixed(1)} px/16th ` +
                    `(measure median=${localMedian.toFixed(1)}, ratio=${ratio.toFixed(2)})`
                ).to.be.within(0.33, 2.5);
            }
        }
    });

    it("no 1-sixteenth gap should be more than 3x another in same measure", () => {
        // Within a measure, all 1-tick (1024) gaps should be roughly similar.
        // Accidentals and softmax weighting cause moderate variation (up to 2.1x).
        // 3x catches the old bug where notes were uniformly crammed.
        const byMeasure: Map<number, GapEntry[]> = new Map();
        for (const g of gaps) {
            if (g.tickDelta !== 1024) {continue;}
            if (!byMeasure.has(g.measure)) {byMeasure.set(g.measure, []);}
            byMeasure.get(g.measure)!.push(g);
        }

        const failures: string[] = [];
        for (const [m, mgaps] of byMeasure) {
            if (mgaps.length < 2) {continue;}
            const vals: number[] = mgaps.map(g => g.pxPer16th).sort((a, b) => a - b);
            const minV: number = vals[0];
            const maxV: number = vals[vals.length - 1];
            const ratio: number = minV > 0 ? maxV / minV : Infinity;
            if (ratio > 3.0) {
                failures.push(
                    `M${m}: 1-tick gaps range ${minV.toFixed(1)}–${maxV.toFixed(1)} px/16th ` +
                    `(max/min=${ratio.toFixed(2)})`
                );
            }
        }
        expect(failures, "Excessive 1-tick gap variation:\n" + failures.join("\n")).to.deep.equal([]);
    });
});
