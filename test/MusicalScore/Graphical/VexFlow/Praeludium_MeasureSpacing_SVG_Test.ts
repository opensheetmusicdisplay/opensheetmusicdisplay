import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

// Browser SVG test for Praeludium measure spacing.
//
// The jsdom test (Praeludium_MeasureSpacing_Test) reads the internal model
// (stave.getModifiers().getX() / note.getAbsoluteX()). Those values can be
// stale from an earlier format phase and hide the true rendered overflow.
// This test reads the REAL rendered geometry from the SVG DOM via getBBox(),
// so it catches content that overflows the drawn barline even when the model
// says otherwise.

interface SvgNote {
    m: number;
    staff: number;
    voice: number;
    noteRight: number;
    noteLeft: number;
    noteCenter: number;
}

interface TickDatum {
    tick: number;
    rest: boolean;
}

interface Correlated {
    m: number;
    staff: number;
    voice: number;
    tick: number;
    noteRight: number;
    noteLeft: number;
    noteCenter: number;
    barlineRight: number;
}

interface RenderResult {
    svg: SVGElement;
    gms: any;
}

function renderToSVG(scorePath: string): Promise<RenderResult> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1200px";
    container.style.height = "1600px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const scoreDoc: Document = TestUtils.getScore(scorePath);
    return osmd.load(scoreDoc).then(() => {
        osmd.render();
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) { throw new Error("No SVG element after render"); }
        const gms: any = (osmd as any).graphic;
        if (!gms?.MeasureList) { throw new Error("no MeasureList"); }
        return { svg, gms };
    });
}

/**
 * Parse an "vf-note-{m}-{s}-{v}-{i}" id. NOTE: the trailing {i} is the chord
 * note index (computedSvgId), NOT a per-tickable counter — sequential notes in
 * a voice all share {i}=0, so ids are not unique. We use only m/staff/voice
 * and correlate individual notes by X-order (see parseNotePositions).
 */
function parseNoteId(id: string): { m: number, staff: number, voice: number } | undefined {
    const parts: string[] = id.split("-");
    if (parts.length < 6 || parts[0] !== "vf" || parts[1] !== "note") { return undefined; }
    const m: number = parseInt(parts[2], 10);
    const staff: number = parseInt(parts[3], 10);
    const voice: number = parseInt(parts[4], 10);
    if ([m, staff, voice].some((n) => Number.isNaN(n))) { return undefined; }
    return { m, staff, voice };
}

/**
 * True rendered notehead positions from the SVG DOM. Each vf-stavenote group
 * is one note; getBBox() gives the real glyph extent as drawn by the browser.
 * A chord's multiple noteheads are merged into one union bbox for that note.
 */
function parseNotePositions(svg: SVGElement): SvgNote[] {
    const result: SvgNote[] = [];
    const noteEls: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-stavenote']");
    for (let i: number = 0; i < noteEls.length; i++) {
        const el: Element = noteEls[i];
        const parsed: { m: number, staff: number, voice: number } | undefined =
            parseNoteId(el.getAttribute("id") || "");
        if (!parsed) { continue; }
        const nhEls: NodeListOf<Element> = el.querySelectorAll("[class*='vf-notehead']");
        let left: number = Infinity;
        let right: number = -Infinity;
        let topY: number = Infinity;
        let botY: number = -Infinity;
        for (let j: number = 0; j < nhEls.length; j++) {
            const g: SVGGraphicsElement = nhEls[j] as SVGGraphicsElement;
            if (typeof g.getBBox !== "function") { continue; }
            const box: SVGRect = g.getBBox();
            if (box.width <= 0 || box.height <= 0) { continue; }
            left = Math.min(left, box.x);
            right = Math.max(right, box.x + box.width);
            topY = Math.min(topY, box.y);
            botY = Math.max(botY, box.y + box.height);
        }
        if (!isFinite(left) || !isFinite(right)) { continue; }
        result.push({
            m: parsed.m,
            staff: parsed.staff,
            voice: parsed.voice,
            noteRight: right,
            noteLeft: left,
            noteCenter: (topY + botY) / 2,
        });
    }
    return result;
}

/**
 * Right edge of each measure's END barline, per measure+staff.
 * Both staves emit a `<g class="vf-measure" id="{m}">` group; we disambiguate
 * by reading the note ids inside the group (the staff index). The end barline
 * is the stavebarline rect with the largest X within the group.
 */
function parseBarlines(svg: SVGElement): Map<string, number> {
    const map: Map<string, number> = new Map();
    const measureEls: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-measure']");
    for (let i: number = 0; i < measureEls.length; i++) {
        const el: Element = measureEls[i];
        const idAttr: string = el.getAttribute("id") || "";
        const m: number = parseInt(idAttr, 10);
        if (Number.isNaN(m)) { continue; }

        // Staff index: read any note id inside this measure group.
        let staff: number = -1;
        const noteEl: Element | null = el.querySelector("[class*='vf-stavenote']");
        if (noteEl) {
            const parsed: { m: number, staff: number, voice: number } | undefined =
                parseNoteId(noteEl.getAttribute("id") || "");
            if (parsed) { staff = parsed.staff; }
        }
        if (staff < 0) { continue; }

        // End barline = stavebarline rect with the largest X in this group.
        const barlineRects: NodeListOf<Element> = el.querySelectorAll("[class*='vf-stavebarline'] rect");
        let maxRight: number = -Infinity;
        for (let j: number = 0; j < barlineRects.length; j++) {
            const rect: Element = barlineRects[j];
            const x: number = parseFloat(rect.getAttribute("x") || "NaN");
            const w: number = parseFloat(rect.getAttribute("width") || "0");
            if (Number.isNaN(x)) { continue; }
            maxRight = Math.max(maxRight, x + w);
        }
        if (!isFinite(maxRight)) { continue; }

        const key: string = `${m}/${staff}`;
        const existing: number | undefined = map.get(key);
        // A measure group can appear once per system line; keep the max.
        if (existing === undefined || maxRight > existing) {
            map.set(key, maxRight);
        }
    }
    return map;
}

/**
 * Ordered tick positions per (measure, staff, voice), INCLUDING rests. VF5
 * renders a rest as its own vf-stavenote group, so the SVG note count matches
 * the tickable count only if rests are kept here too. We accumulate
 * getTicks().value() for the start tick; the array order is left-to-right, so
 * it zips 1:1 against the SVG notes of the same (m, staff, voice) sorted by X.
 * Rests are flagged so the assertions can skip them after correlation.
 */
function collectTickData(gms: any): Map<string, TickDatum[]> {
    const map: Map<string, TickDatum[]> = new Map();
    for (const verticalMeasureList of gms.MeasureList) {
        if (!verticalMeasureList || verticalMeasureList.length === 0) { continue; }
        for (const measure of verticalMeasureList) {
            if (!measure?.isVisible?.()) { continue; }
            const m: number = measure.MeasureNumber;
            const staff: number = measure.ParentStaff?.idInMusicSheet ?? -1;
            for (const voiceIdStr of Object.keys(measure.vfVoices ?? {})) {
                const voiceId: number = Number(voiceIdStr);
                const voice: any = measure.vfVoices[voiceId];
                if (!voice) { continue; }
                const key: string = `${m}-${staff}-${voiceId}`;
                const list: TickDatum[] = [];
                let tick: number = 0;
                for (const t of voice.getTickables()) {
                    const dur: number = t.getTicks?.()?.value?.() ?? 0;
                    if (!t.shouldIgnoreTicks?.()) {
                        list.push({ tick, rest: !!t.isRest?.() });
                    }
                    tick += dur;
                }
                map.set(key, list);
            }
        }
    }
    return map;
}

/**
 * Merge SVG note geometry with model tick data + measure barline.
 * SVG note ids collapse sequential notes (all {i}=0), so we correlate by
 * X-order within each (m, staff, voice): sort SVG notes left→right and zip
 * against the model's ordered non-rest tick list.
 */
function correlate(
    svgNotes: SvgNote[], tickMap: Map<string, TickDatum[]>, barlines: Map<string, number>
): Correlated[] {
    const byVoice: Map<string, SvgNote[]> = new Map();
    for (const n of svgNotes) {
        const key: string = `${n.m}-${n.staff}-${n.voice}`;
        if (!byVoice.has(key)) { byVoice.set(key, []); }
        byVoice.get(key)!.push(n);
    }

    const out: Correlated[] = [];
    for (const [key, notes] of byVoice) {
        const ticks: TickDatum[] | undefined = tickMap.get(key);
        if (!ticks) { continue; }
        notes.sort((a, b) => a.noteLeft - b.noteLeft);
        // Zip 1:1 only when the SVG note count matches the tickable count;
        // a mismatch means the ordering can't be trusted, so skip that voice
        // rather than produce misaligned (garbage/negative) correlations.
        if (notes.length !== ticks.length) { continue; }
        for (let i: number = 0; i < notes.length; i++) {
            if (ticks[i].rest) { continue; }
            const n: SvgNote = notes[i];
            const barlineRight: number | undefined = barlines.get(`${n.m}/${n.staff}`);
            if (barlineRight === undefined) { continue; }
            out.push({
                m: n.m,
                staff: n.staff,
                voice: n.voice,
                tick: ticks[i].tick,
                noteRight: n.noteRight,
                noteLeft: n.noteLeft,
                noteCenter: n.noteCenter,
                barlineRight,
            });
        }
    }
    return out;
}

interface Gap {
    m: number;
    staff: number;
    voice: number;
    fromTick: number;
    toTick: number;
    tickDelta: number;
    fromRest: boolean; // origin tickable is a rest (ghost 16th)
    pxPer16th: number;
    /** px/16th of the immediately following gap (same voice), or undefined. */
    nextPxPer16th?: number;
}

/**
 * Consecutive-tickable gaps per (measure, staff, voice), keeping rests as
 * position anchors so the ghost-16th slot is measured. Each gap records
 * whether its origin is a rest, plus the following gap's px/16th so the
 * ghost-16th (post-rest 1024-tick) over-spacing can be compared to the real
 * note spacing that follows it.
 */
function computeGaps(
    svgNotes: SvgNote[], tickMap: Map<string, TickDatum[]>
): Gap[] {
    const byVoice: Map<string, SvgNote[]> = new Map();
    for (const n of svgNotes) {
        const key: string = `${n.m}-${n.staff}-${n.voice}`;
        if (!byVoice.has(key)) { byVoice.set(key, []); }
        byVoice.get(key)!.push(n);
    }

    const gaps: Gap[] = [];
    for (const [key, notes] of byVoice) {
        const ticks: TickDatum[] | undefined = tickMap.get(key);
        if (!ticks || notes.length !== ticks.length) { continue; }
        notes.sort((a, b) => a.noteLeft - b.noteLeft);
        const voiceGaps: Gap[] = [];
        for (let i: number = 1; i < notes.length; i++) {
            const td: number = ticks[i].tick - ticks[i - 1].tick;
            if (td <= 0) { continue; }
            const pd: number = notes[i].noteLeft - notes[i - 1].noteLeft;
            voiceGaps.push({
                m: notes[i].m,
                staff: notes[i].staff,
                voice: notes[i].voice,
                fromTick: ticks[i - 1].tick,
                toTick: ticks[i].tick,
                tickDelta: td,
                fromRest: ticks[i - 1].rest,
                pxPer16th: (pd / td) * 1024,
            });
        }
        for (let i: number = 0; i < voiceGaps.length; i++) {
            voiceGaps[i].nextPxPer16th = voiceGaps[i + 1]?.pxPer16th;
        }
        gaps.push(...voiceGaps);
    }
    return gaps;
}

describe("Praeludium measure spacing (SVG)", () => {
    let correlated: Correlated[];
    let gaps: Gap[];

    beforeAll(function (): Promise<void> {
        return renderToSVG("JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml").then((r: RenderResult) => {
            const svgNotes: SvgNote[] = parseNotePositions(r.svg);
            const tickMap: Map<string, TickDatum[]> = collectTickData(r.gms);
            const barlines: Map<string, number> = parseBarlines(r.svg);
            correlated = correlate(svgNotes, tickMap, barlines);
            gaps = computeGaps(svgNotes, tickMap);
        });
    });

    it("should correlate SVG notes with model ticks", () => {
        expect(correlated.length).to.be.greaterThan(0,
            "no notes correlated between SVG and model");
    });

    // Test A: no rendered notehead overflows its measure's END barline.
    // Same rule for ALL measures — M6/M20 are not exceptions. Tolerance is 0:
    // once the ghost-16th over-spacing (Test B) is fixed, no content should
    // sit past the barline.
    it("no notehead overflows its measure barline (all measures)", () => {
        const overflows: string[] = [];
        for (const c of correlated) {
            if (c.noteRight > c.barlineRight) {
                overflows.push(
                    `M${c.m} staff${c.staff} tick${c.tick}: ` +
                    `noteRight=${c.noteRight.toFixed(1)} > ` +
                    `barlineRight=${c.barlineRight.toFixed(1)} ` +
                    `(+${(c.noteRight - c.barlineRight).toFixed(1)}px)`
                );
            }
        }
        expect(overflows, "Rendered overflows:\n" + overflows.join("\n")).to.deep.equal([]);
    });

    // Test B: the ghost 16th rest at each half-note boundary (beat 1→1.25 and
    // beat 3→3.25) is over-allocated space. Each such gap (a 1024-tick gap
    // whose origin is a rest) is drawn ~1.87× wider per-16th than the real
    // note gap that follows it. A short ghost 16th must NOT be wider per-tick
    // than the longer notes after it: assert px/16th ≤ 1.2× the next gap.
    // This detects all ~66 occurrences across the score.
    it("ghost 16th rest is not over-spaced vs following notes (all measures)", () => {
        const RATIO_MAX: number = 1.2;
        const failures: string[] = [];
        for (const g of gaps) {
            if (!g.fromRest || g.tickDelta !== 1024) { continue; }
            if (g.nextPxPer16th === undefined || g.nextPxPer16th <= 0) { continue; }
            const ratio: number = g.pxPer16th / g.nextPxPer16th;
            if (ratio > RATIO_MAX) {
                failures.push(
                    `M${g.m} staff${g.staff} voice${g.voice} ` +
                    `tick ${g.fromTick}→${g.toTick}: ` +
                    `${g.pxPer16th.toFixed(1)} px/16th vs next ` +
                    `${g.nextPxPer16th.toFixed(1)} px/16th (ratio=${ratio.toFixed(2)})`
                );
            }
        }
        expect(failures,
            `${failures.length} over-spaced ghost 16ths:\n` + failures.join("\n")
        ).to.deep.equal([]);
    });
});
