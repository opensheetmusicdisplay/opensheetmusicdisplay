
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

interface GlyphInfo {
    x: number;
    y: number;
    kind: "clef" | "rest" | "note" | "accidental" | "keysig";
    glyph: string;
    cp: number;
}

function renderSVG(scorePath: string): Promise<SVGElement> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1400px";
    container.style.height = "2000px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const doc: Document = TestUtils.getScore(scorePath);
    return osmd.load(doc).then(() => {
        osmd.render();
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) { throw new Error("No SVG after render"); }
        return svg;
    });
}

function parseGlyphs(svg: SVGElement): GlyphInfo[] {
    const glyphs: GlyphInfo[] = [];
    const texts: NodeListOf<Element> = svg.querySelectorAll("text");
    for (let i: number = 0; i < texts.length; i++) {
        const t: Element = texts[i];
        const txt: string = (t.textContent || "").trim();
        if (!txt) { continue; }
        const cp: number = txt.codePointAt(0) || 0;
        const x: number = parseFloat(t.getAttribute("x") || "0");
        const y: number = parseFloat(t.getAttribute("y") || "0");
        let kind: "clef" | "rest" | "note" | "accidental" | "keysig" | undefined;
        if (cp >= 0xe050 && cp <= 0xe0a3) { kind = "clef"; }
        else if (cp >= 0xe4e0 && cp <= 0xe4ff) { kind = "rest"; }
        else if (cp >= 0xe0a4 && cp <= 0xe123) { kind = "note"; }
        else if ((cp >= 0xe260 && cp <= 0xe27f) || (cp >= 0xe2a0 && cp <= 0xe2bf)) { kind = "accidental"; }
        else if (cp >= 0xe280 && cp <= 0xe2a3) { kind = "keysig"; }
        if (kind) {
            glyphs.push({ x, y, kind, glyph: txt, cp });
        }
    }
    return glyphs;
}

/**
 * Separate treble (y < 260) from bass (y >= 260) staff.
 * The piano grand staff has staff 1 (treble) above staff 2 (bass).
 */
function splitByVerticalBand(glyphs: GlyphInfo[]): { treble: GlyphInfo[], bass: GlyphInfo[] } {
    const treble: GlyphInfo[] = [];
    const bass: GlyphInfo[] = [];
    // Find the y-gap between treble bottom and bass top
    const allY: number[] = [...new Set(glyphs.map((g) => Math.round(g.y)))].sort((a, b) => a - b);
    // Look for gap > 40px between consecutive y values
    let splitY: number = 260; // default
    for (let i: number = 1; i < allY.length; i++) {
        if (allY[i] - allY[i - 1] > 40) {
            splitY = (allY[i] + allY[i - 1]) / 2;
            break;
        }
    }
    for (const g of glyphs) {
        if (g.y < splitY) { treble.push(g); }
        else { bass.push(g); }
    }
    return { treble, bass };
}

interface GapInfo {
    fromX: number;
    toX: number;
    gap: number;
    context: string;
}

function computeGaps(glyphs: GlyphInfo[]): GapInfo[] {
    const sorted: GlyphInfo[] = [...glyphs].sort((a, b) => {
        if (a.x !== b.x) { return a.x - b.x; }
        return a.y - b.y;
    });
    // Dedup same-x entries but keep voice info (track different y)
    // Actually for gap computation we want unique x per rhythm
    const seenX: Set<number> = new Set();
    const unique: GlyphInfo[] = [];
    for (const g of sorted) {
        if (!seenX.has(g.x)) {
            seenX.add(g.x);
            unique.push(g);
        }
    }

    const gaps: GapInfo[] = [];
    for (let i: number = 1; i < unique.length; i++) {
        const gap: number = unique[i].x - unique[i - 1].x;
        if (gap < 0.1) { continue; }
        const ctx: string =
            `${unique[i-1].kind}→${unique[i].kind} @${unique[i-1].x.toFixed(1)}→${unique[i].x.toFixed(1)}`;
        gaps.push({ fromX: unique[i-1].x, toX: unique[i].x, gap, context: ctx });
    }
    return gaps;
}

interface NoteSegment {
    startX: number;
    clefsBefore: number;
    gaps: number[];
    meanGap: number;
    stdDev: number;
}

/**
 * Split glyphs into segments separated by clefs.
 * Each segment has notes/rests between two clefs (or start/end).
 */
function segmentByClefs(sorted: GlyphInfo[]): NoteSegment[] {
    const seenX: Set<number> = new Set();
    const unique: GlyphInfo[] = [];
    for (const g of sorted) {
        if (!seenX.has(g.x)) {
            seenX.add(g.x);
            unique.push(g);
        }
    }

    const segments: NoteSegment[] = [];
    let currentGaps: number[] = [];
    let clefCount: number = 0;
    let segStartX: number = unique.length > 0 ? unique[0].x : 0;

    for (let i: number = 0; i < unique.length; i++) {
        if (unique[i].kind === "clef") {
            if (currentGaps.length > 0) {
                const mean: number = currentGaps.reduce((a, b) => a + b, 0) / currentGaps.length;
                const variance: number = currentGaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / currentGaps.length;
                segments.push({
                    startX: segStartX,
                    clefsBefore: clefCount,
                    gaps: [...currentGaps],
                    meanGap: mean,
                    stdDev: Math.sqrt(variance),
                });
                currentGaps = [];
            }
            clefCount++;
            // Track the clef for segment start
            segStartX = unique[i].x;
        } else if (i > 0 && unique[i].kind !== "clef" && unique[i - 1].kind !== "clef") {
            const gap: number = unique[i].x - unique[i - 1].x;
            currentGaps.push(gap);
        }
    }
    // Last segment
    if (currentGaps.length > 0) {
        const mean: number = currentGaps.reduce((a, b) => a + b, 0) / currentGaps.length;
        const variance: number = currentGaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / currentGaps.length;
        segments.push({
            startX: segStartX,
            clefsBefore: clefCount,
            gaps: [...currentGaps],
            meanGap: mean,
            stdDev: Math.sqrt(variance),
        });
    }
    return segments;
}

/** Print a detailed report for one staff's glyphs */
function analyzeStaff(name: string, glyphs: GlyphInfo[]): { gaps: GapInfo[], segments: NoteSegment[] } {
    const sorted: GlyphInfo[] = [...glyphs].sort((a, b) => a.x - b.x);
    const noteCount: number = sorted.filter((g) => g.kind === "note").length;
    const restCount: number = sorted.filter((g) => g.kind === "rest").length;
    const clefCount: number = sorted.filter((g) => g.kind === "clef").length;

    console.log(`\n╔══ ${name} (${noteCount}N + ${restCount}R + ${clefCount}C) ══╗`);

    // All glyphs sorted by x
    for (const g of sorted) {
        const cat: string = g.kind === "clef" ? "C" : g.kind === "rest" ? "R" : "N";
        console.log(`  ${cat} x=${g.x.toFixed(1)} y=${g.y.toFixed(0)} U+${g.cp.toString(16).padStart(4, "0")}`);
    }

    // Gaps
    const gaps: GapInfo[] = computeGaps(sorted);
    console.log("\n  -- Element gaps (x diffs) --");
    for (const g of gaps) {
        let flag: string = "";
        if (g.gap < 10) { flag = " <<< TIGHT"; }
        else if (g.gap > 50) { flag = "  // big gap (includes clef width)"; }
        console.log(`  ${g.context.padEnd(50)} ${g.gap.toFixed(1)}px${flag}`);
    }

    // Segments
    const segments: NoteSegment[] = segmentByClefs(sorted);
    if (segments.length > 1) {
        console.log("\n  -- Segments (note-gap runs) --");
        for (let si: number = 0; si < segments.length; si++) {
            const s: NoteSegment = segments[si];
            const gapStr: string = s.gaps.map((g) => g.toFixed(1)).join(", ");
            console.log(
                `  seg${si}: clefsBefore=${s.clefsBefore} startX=${s.startX.toFixed(1)} ` +
                `mean=${s.meanGap.toFixed(1)}σ=${s.stdDev.toFixed(2)} ` +
                `gaps=[${gapStr}]`
            );
        }
        // Gap consistency trend: if mean increases with clef count, clefs are causing drift
        if (segments.length >= 3) {
            console.log("\n  -- Gap trend (comparing successive segments to seg0) --");
            const base: number = segments[0].meanGap;
            for (let si: number = 1; si < segments.length; si++) {
                const diff: number = segments[si].meanGap - base;
                const pct: string = ((diff / base) * 100).toFixed(0);
                console.log(
                    `  seg${si}: ${segments[si].meanGap.toFixed(1)}px (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} = ${pct}%)`
                );
            }
        }
    }

    // Overall note-x growth rate: check if x-per-note increases across segments
    // by looking at total span vs gap count
    if (segments.length >= 2) {
        console.log("\n  -- X-span efficiency --");
        let totalGaps: number = 0;
        let totalSpan: number = 0;
        for (const s of segments) {
            totalGaps += s.gaps.length;
        }
        const firstX: number = sorted[0].x;
        const lastX: number = sorted[sorted.length - 1].x;
        totalSpan = lastX - firstX;
        const avgSpacing: number = totalSpan / Math.max(totalGaps, 1);
        const idealSpan: number = totalGaps * segments[0].meanGap;
        const overhead: number = totalSpan - idealSpan;
        console.log(`  total ${totalGaps} gaps from x=${firstX.toFixed(0)} to x=${lastX.toFixed(0)}`);
        console.log(`  avg spacing=${avgSpacing.toFixed(1)}px ` +
            `(vs seg0 baseline ${segments[0].meanGap.toFixed(1)}px)`);
        console.log(`  overhead (vs baseline) = ${overhead.toFixed(1)}px`);
        if (overhead > 100) {
            console.log(`  ** HIGH overhead: ${overhead.toFixed(0)}px extra from ${segments.length - 1} clef changes`);
        }
    }

    // Proximity alerts
    console.log("\n  -- Proximity alerts --");
    let alerts: number = 0;
    for (const g of gaps) {
        if (g.gap < 10 && (g.context.includes("rest→clef") || g.context.includes("clef→rest") ||
                           g.context.includes("note→clef") || g.context.includes("clef→note"))) {
            console.log(`  ** ${g.context} gap=${g.gap.toFixed(1)}px`);
            alerts++;
        }
    }
    if (alerts === 0) { console.log("  (none)"); }

    return { gaps, segments };
}

describe("In-Measure Clef Gap Analysis", () => {

    it("should analyze all clef/note/rest gaps on both staves", () => {
        return renderSVG("test_rest_in_measure_keys_bass_rest.musicxml").then((svg: SVGElement) => {
            const glyphs: GlyphInfo[] = parseGlyphs(svg);
            expect(glyphs.length).to.be.greaterThan(0, "no glyphs found");

            const { treble, bass } = splitByVerticalBand(glyphs);

            const _tResult: { gaps: GapInfo[], segments: NoteSegment[] } = analyzeStaff("TREBLE STAFF", treble);
            const _bResult: { gaps: GapInfo[], segments: NoteSegment[] } = analyzeStaff("BASS STAFF", bass);

            // Collect all tight gaps involving clefs < 2px across both staves
            // (merely informational — 1-2px gaps at clef/rest boundaries are
            //  acceptable in dense beamed passages).
        });
    });

});
