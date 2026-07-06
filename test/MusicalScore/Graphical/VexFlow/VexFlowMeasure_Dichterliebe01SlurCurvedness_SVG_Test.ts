import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

// ── Data types ───────────────────────────────────────────────────────────────

interface SlurBezier {
    sx: number; sy: number;
    cp1x: number; cp1y: number;
    cp2x: number; cp2y: number;
    ex: number; ey: number;
}

interface TieBezier {
    sx: number; sy: number;
    cpx: number; cpy: number;  // upper-curve control point
    ex: number; ey: number;
}

interface NoteheadPos {
    x: number; y: number;
    measure: number; stave: number;
    id: string;
}

interface EnrichedSlur {
    id: string;
    measure: number; stave: number;
    bezier: SlurBezier;
    bowPx: number;
    endMeasure?: number; endStave?: number;
    get crossStaff(): boolean;
    get crossMeasure(): boolean;
    get inMeasure(): boolean;
    get inStave(): boolean;
}

interface EnrichedTie {
    id: string;
    bezier: TieBezier;
    bowPx: number;
    startMeasure?: number; startStave?: number;
    endMeasure?: number; endStave?: number;
    get crossStaff(): boolean;
    get crossMeasure(): boolean;
    get inMeasure(): boolean;
    get inStave(): boolean;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function perpDist(
    sx: number, sy: number, ex: number, ey: number,
    px: number, py: number
): number {
    const dx: number = ex - sx;
    const dy: number = ey - sy;
    const len: number = Math.sqrt(dx * dx + dy * dy) || 1;
    return Math.abs((px - sx) * dy - (py - sy) * dx) / len;
}

function tieBow(bezier: TieBezier): number {
    // Quadratic bezier: perpendicular dist from control point to chord
    return perpDist(bezier.sx, bezier.sy, bezier.ex, bezier.ey,
        bezier.cpx, bezier.cpy);
}

function slurBow(bezier: SlurBezier): number {
    // Cubic bezier: max of both control point perpendicular distances
    return Math.max(
        perpDist(bezier.sx, bezier.sy, bezier.ex, bezier.ey,
            bezier.cp1x, bezier.cp1y),
        perpDist(bezier.sx, bezier.sy, bezier.ex, bezier.ey,
            bezier.cp2x, bezier.cp2y),
    );
}

// ── SVG parsing ──────────────────────────────────────────────────────────────

function renderToSVG(scorePath: string): Promise<SVGElement> {
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
        return svg;
    });
}

function parseNoteheads(svg: SVGElement): NoteheadPos[] {
    const result: NoteheadPos[] = [];
    const groups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-stavenote']");
    for (let i: number = 0; i < groups.length; i++) {
        const el: Element = groups[i];
        const id: string = el.getAttribute("id") || "";
        const parts: string[] = id.split("-");
        if (parts.length < 6 || parts[0] !== "vf" || parts[1] !== "note") {
            continue;
        }
        const measure: number = parseInt(parts[2], 10);
        const stave: number = parseInt(parts[3], 10);
        const nhEl: Element | null = el.querySelector("[class*='vf-notehead'] text");
        if (!nhEl) { continue; }
        const xAttr: string | null = nhEl.getAttribute("x");
        const yAttr: string | null = nhEl.getAttribute("y");
        if (!xAttr || !yAttr) { continue; }
        const x: number = parseFloat(xAttr);
        const y: number = parseFloat(yAttr);
        result.push({ x, y, measure, stave, id });
    }
    // Deduplicate by (measure, stave, X-roof)
    const seen: Set<string> = new Set();
    return result.filter((n) => {
        const key: string = `${n.measure}:${n.stave}:${Math.round(n.x)}`;
        if (seen.has(key)) { return false; }
        seen.add(key);
        return true;
    });
}

function parseSlurBezier(pathEl: Element): SlurBezier | undefined {
    const d: string = pathEl.getAttribute("d") || "";
    // M sx sy C cp1x cp1y, cp2x cp2y, ex ey
    const m: RegExpMatchArray | null =
        d.match(/M([\d.]+)\s+([\d.]+)C([\d.]+)\s+([\d.]+),([\d.]+)\s+([\d.]+),([\d.]+)\s+([\d.]+)/);
    if (!m) { return undefined; }
    return {
        sx: parseFloat(m[1]), sy: parseFloat(m[2]),
        cp1x: parseFloat(m[3]), cp1y: parseFloat(m[4]),
        cp2x: parseFloat(m[5]), cp2y: parseFloat(m[6]),
        ex: parseFloat(m[7]), ey: parseFloat(m[8]),
    };
}

function parseSlurs(svg: SVGElement): EnrichedSlur[] {
    const result: EnrichedSlur[] = [];
    const groups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-curve']");
    for (let i: number = 0; i < groups.length; i++) {
        const g: Element = groups[i];
        const id: string = g.getAttribute("id") || "";
        // id = vf-note-{measure}-{stave}-{voice}-{index}-slur
        const parts: string[] = id.split("-");
        const measure: number = parseInt(parts[2], 10);
        const stave: number = parseInt(parts[3], 10);
        const pathEl: Element | null = g.querySelector("path");
        if (!pathEl) { continue; }
        const bezier: SlurBezier | undefined = parseSlurBezier(pathEl);
        if (!bezier) { continue; }
        result.push({
            id, measure, stave, bezier,
            bowPx: slurBow(bezier),
            get crossStaff(): boolean { return this.stave !== this.endStave; },
            get crossMeasure(): boolean { return this.measure !== this.endMeasure; },
            get inMeasure(): boolean { return !this.crossMeasure; },
            get inStave(): boolean { return !this.crossStaff; },
        });
    }
    return result;
}

function parseTieBezier(pathEl: Element): TieBezier | undefined {
    const d: string = pathEl.getAttribute("d") || "";
    // M sx sy Q cpx cpy, ex ey Q cpx cpy2, sx sy Z
    const m: RegExpMatchArray | null =
        d.match(/M([\d.]+)\s+([\d.]+)Q([\d.]+)\s+([\d.]+),([\d.]+)\s+([\d.]+)/);
    if (!m) { return undefined; }
    return {
        sx: parseFloat(m[1]), sy: parseFloat(m[2]),
        cpx: parseFloat(m[3]), cpy: parseFloat(m[4]),
        ex: parseFloat(m[5]), ey: parseFloat(m[6]),
    };
}

function parseTies(svg: SVGElement): EnrichedTie[] {
    const result: EnrichedTie[] = [];
    // Ties can be StaveTie or subclasses like TabTie
    const groups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-stavetie']");
    for (let i: number = 0; i < groups.length; i++) {
        const g: Element = groups[i];
        const id: string = g.getAttribute("id") || `tie-${i}`;
        // May have multiple paths (one per tie in a chord). Parse each.
        const pathEls: NodeListOf<Element> =
            g.querySelectorAll("path");
        for (let j: number = 0; j < pathEls.length; j++) {
            const bezier: TieBezier | undefined = parseTieBezier(pathEls[j]);
            if (!bezier) { continue; }
            const tieId: string = pathEls.length > 1
                ? `${id}[${j}]` : id;
            result.push({
                id: tieId, bezier, bowPx: tieBow(bezier),
                get crossStaff(): boolean {
                    return this.startStave !== undefined &&
                        this.endStave !== undefined &&
                        this.startStave !== this.endStave;
                },
                get crossMeasure(): boolean {
                    return this.startMeasure !== undefined &&
                        this.endMeasure !== undefined &&
                        this.startMeasure !== this.endMeasure;
                },
                get inMeasure(): boolean { return !this.crossMeasure; },
                get inStave(): boolean { return !this.crossStaff; },
            });
        }
    }
    return result;
}

/**
 * Match notehead closest to (tx, ty) within tolerances.
 * Uses combined X+Y score (X weighted ~3× Y) to prefer same-stave matches
 * where Y distance is naturally small, while still allowing cross-staff
 * matches when X proximity is strong on another stave.
 */
function matchNotehead(
    noteheads: NoteheadPos[], tx: number, ty: number,
    xTol: number, yTol: number
): NoteheadPos | undefined {
    let best: NoteheadPos | undefined;
    let bestScore: number = Infinity;
    for (const nh of noteheads) {
        const dx: number = Math.abs(nh.x - tx);
        const dy: number = Math.abs(nh.y - ty);
        if (dx > xTol || dy > yTol) { continue; }
        const score: number = dx + dy * 0.3;
        if (score < bestScore) {
            bestScore = score;
            best = nh;
        }
    }
    return best;
}

function classifySlurs(
    slurs: EnrichedSlur[], noteheads: NoteheadPos[]
): void {
    const XTOL: number = 50;
    const YTOL: number = 80; // generous per-stave Y tolerance
    for (const s of slurs) {
        // Match end notehead using combined X+Y proximity.
        // This naturally prefers same-stave noteheads (closer Y) while
        // still matching cross-staff when X strongly favors another stave.
        const endNh: NoteheadPos | undefined =
            matchNotehead(noteheads, s.bezier.ex, s.bezier.ey, XTOL, YTOL);
        if (endNh) {
            (s as any).endStave = endNh.stave;
            (s as any).endMeasure = endNh.measure;
        }
    }
}

function classifyTies(
    ties: EnrichedTie[], noteheads: NoteheadPos[]
): void {
    const XTOL: number = 50;
    const YTOL: number = 80;
    for (const t of ties) {
        const startNh: NoteheadPos | undefined =
            matchNotehead(noteheads, t.bezier.sx, t.bezier.sy, XTOL, YTOL);
        if (startNh) {
            t.startStave = startNh.stave;
            t.startMeasure = startNh.measure;
        }
        const endNh: NoteheadPos | undefined =
            matchNotehead(noteheads, t.bezier.ex, t.bezier.ey, XTOL, YTOL);
        if (endNh) {
            t.endStave = endNh.stave;
            t.endMeasure = endNh.measure;
        }
    }
}

// ── Reporter ─────────────────────────────────────────────────────────────────

function categorizeTable<T extends { crossStaff: boolean, crossMeasure: boolean }>(
    label: string, items: T[], idFn: (t: T) => string,
    bowFn: (t: T) => number, extra?: (t: T) => string
): void {
    const xStaff: T[] = items.filter((t) => t.crossStaff);
    const xMeasure: T[] = items.filter((t) => t.crossMeasure);
    const inMeasure: T[] = items.filter((t) => t.inMeasure);
    const inStave: T[] = items.filter((t) => t.inStave);
    const unmatched: T[] = items.filter((t) => isNaN(bowFn(t)) || bowFn(t) <= 0);

    const lines: string[] = [];
    lines.push(`\n=== ${label}: ${items.length} total ===`);
    lines.push(`  Cross-staff:  ${xStaff.length}`);
    lines.push(`  Cross-measure: ${xMeasure.length}`);
    lines.push(`  In-measure:   ${inMeasure.length}`);
    lines.push(`  In-stave:     ${inStave.length}`);
    lines.push(`  Zero/low bow: ${unmatched.length}`);

    if (xStaff.length > 0) {
        lines.push(`\n  ── Cross-staff ${label} ──`);
        for (const s of xStaff) {
            const e: string = extra ? extra(s) : "";
            lines.push(`    ${idFn(s).padEnd(36)} bow=${bowFn(s).toFixed(1)}px${e}`);
        }
    }

    if (xMeasure.length > 0) {
        lines.push(`\n  ── Cross-measure ${label} ──`);
        for (const s of xMeasure) {
            const e: string = extra ? extra(s) : "";
            lines.push(`    ${idFn(s).padEnd(36)} bow=${bowFn(s).toFixed(1)}px${e}`);
        }
    }

    // All slurs/ties sorted by bow ascending (flat ones first)
    const sorted: T[] = [...items].sort((a, b) => bowFn(a) - bowFn(b));
    lines.push(`\n  ── All ${label} sorted by bow (flat→curved) ──`);
    for (const s of sorted) {
        const e: string = extra ? extra(s) : "";
        lines.push(`    bow=${bowFn(s).toFixed(1).padStart(7)}px  ${idFn(s).padEnd(36)}${e}`);
    }

    console.log(lines.join("\n"));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Dichterliebe01 slur curvedness SVG", () => {
    let noteheads: NoteheadPos[];
    let slurs: EnrichedSlur[];
    let ties: EnrichedTie[];

    beforeAll(function (): Promise<void> {
        return renderToSVG("Dichterliebe01.xml").then((svg: SVGElement) => {
            noteheads = parseNoteheads(svg);
            slurs = parseSlurs(svg);
            ties = parseTies(svg);
            classifySlurs(slurs, noteheads);
            classifyTies(ties, noteheads);
            // Slurs already have measure/stave from their ID, but need end
            // info from notehead matching (set in classifySlurs above).
        });
    });

    it("reports categorized slur curvedness", () => {
            categorizeTable<EnrichedSlur>(
            "Slurs", slurs,
            (s) => `${s.id} [M${s.measure}.S${s.stave}]`,
            (s) => s.bowPx,
            (s) => {
                const cls: string = s.endStave !== undefined
                    ? `${s.crossMeasure ? "×M" : "=M"}${s.crossStaff ? "×S" : "=S"}`
                    : "?";
                const b: SlurBezier = s.bezier;
                return ` ${cls} cp1=(${b.cp1x.toFixed(0)},${b.cp1y.toFixed(0)}) cp2=(${b.cp2x.toFixed(0)},${b.cp2y.toFixed(0)})`;
            },
        );
        expect(slurs.length).to.be.greaterThan(0,
            `expected slurs, got ${slurs.length}`);
    });

    it("reports categorized tie curvedness", () => {
            categorizeTable<EnrichedTie>(
            "Ties", ties,
            (t) => {
                const loc: string = t.startMeasure !== undefined
                    ? `[M${t.startMeasure}.S${t.startStave}]`
                    : "[unmatched]";
                return `${t.id} ${loc}`;
            },
            (t) => t.bowPx,
            (t) => t.endMeasure !== undefined
                ? ` → ${t.crossMeasure ? "×M" : "=M"}${t.crossStaff ? "×S" : "=S"}`
                : " end.unmatched",
        );
        expect(ties.length).to.be.greaterThan(0,
            `expected ties, got ${ties.length}`);
    });

    it("all slurs have positive bowPx", () => {
        const flat: EnrichedSlur[] = slurs.filter((s) => s.bowPx <= 0);
        expect(flat).to.deep.equal([],
            `${flat.length} slurs have zero/negative bowPx:\n` +
            flat.map((s) => `  ${s.id} bow=${s.bowPx.toFixed(1)}`).join("\n"));
    });

    it("all ties have positive bowPx", () => {
        const flat: EnrichedTie[] = ties.filter((t) => t.bowPx <= 0);
        expect(flat).to.deep.equal([],
            `${flat.length} ties have zero/negative bowPx:\n` +
            flat.map((t) => `  ${t.id} bow=${t.bowPx.toFixed(1)}`).join("\n"));
    });

    it("dumps control points for M0-M1 and M22 slurs", () => {
        const targets: number[] = [0, 1, 22];
        let total: number = 0;
        for (const t of targets) {
            const ms: EnrichedSlur[] = slurs
                .filter((s) => s.measure === t || s.endMeasure === t);
            total += ms.length;
            console.log(`\n=== M${t} slurs (${ms.length}) ===`);
            for (const s of ms) {
                const b: SlurBezier = s.bezier;
                const cls: string = `${s.crossMeasure ? "×M" : "=M"}${s.crossStaff ? "×S" : "=S"}`;
                console.log(
                    `  ${s.id} [M${s.measure}.S${s.stave}] → ` +
                    `end=M${s.endMeasure ?? "?"}.S${s.endStave ?? "?"} ` +
                    `bow=${s.bowPx.toFixed(1)}px ${cls}`
                );
                console.log(
                    `    start=(${b.sx.toFixed(1)},${b.sy.toFixed(1)}) ` +
                    `cp1=(${b.cp1x.toFixed(1)},${b.cp1y.toFixed(1)}) ` +
                    `cp2=(${b.cp2x.toFixed(1)},${b.cp2y.toFixed(1)}) ` +
                    `end=(${b.ex.toFixed(1)},${b.ey.toFixed(1)})`
                );
                const d1: number = perpDist(b.sx, b.sy, b.ex, b.ey, b.cp1x, b.cp1y);
                const d2: number = perpDist(b.sx, b.sy, b.ex, b.ey, b.cp2x, b.cp2y);
                console.log(
                    `    cp1Perp=${d1.toFixed(1)}px cp2Perp=${d2.toFixed(1)}px` +
                    `  chordLen=${Math.hypot(b.ex - b.sx, b.ey - b.sy).toFixed(0)}px`
                );
            }
        }
        expect(total).to.be.greaterThan(0,
            `expected slurs in M0/M1/M22, got ${total}`);
    });

    it("finds cross-staff slurs", () => {
        const cs: EnrichedSlur[] = slurs.filter((s) => s.crossStaff);
        expect(cs.length).to.be.greaterThan(0,
            `expected cross-staff slurs, got ${cs.length}`);
    });

    it("finds cross-measure slurs", () => {
        const cm: EnrichedSlur[] = slurs.filter((s) => s.crossMeasure);
        expect(cm.length).to.be.greaterThan(0,
            `expected cross-measure slurs, got ${cm.length}`);
    });

    it("finds in-measure slurs", () => {
        const im: EnrichedSlur[] = slurs.filter((s) => s.inMeasure);
        expect(im.length).to.be.greaterThan(0,
            `expected in-measure slurs, got ${im.length}`);
    });

    it("finds in-stave slurs", () => {
        const is: EnrichedSlur[] = slurs.filter((s) => s.inStave);
        expect(is.length).to.be.greaterThan(0,
            `expected in-stave slurs, got ${is.length}`);
    });
});
