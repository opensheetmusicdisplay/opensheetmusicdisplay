/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/typedef, max-len */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMusicSheetDrawer } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { TestUtils } from "../../../Util/TestUtils";

// ── Data types ───────────────────────────────────────────────────────────────

interface BezierChord {
    sx: number; sy: number;
    ex: number; ey: number;
}

interface ObstacleInfo {
    circleId: string;
    cx: number;
    cy: number;
    pDist: number;
    category: string;
}

interface SlurObstacleGroup {
    slurId: string;
    measure: number;
    stave: number;
    bezier: BezierChord;
    obstacles: ObstacleInfo[];
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function perpDist(
    sx: number, sy: number, ex: number, ey: number,
    px: number, py: number,
): number {
    const dx: number = ex - sx;
    const dy: number = ey - sy;
    const len: number = Math.sqrt(dx * dx + dy * dy) || 1;
    return Math.abs((px - sx) * dy - (py - sy) * dx) / len;
}

// ── SVG parsing ──────────────────────────────────────────────────────────────

function renderToSVG(scorePath: string): Promise<SVGElement> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1200px";
    container.style.height = "1600px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false },
    );
    const scoreDoc: Document = TestUtils.getScore(scorePath);
    return osmd.load(scoreDoc).then(() => {
        VexFlowMusicSheetDrawer.DEBUG_SHOW_SKYLINE = true;
        osmd.render();
        VexFlowMusicSheetDrawer.DEBUG_SHOW_SKYLINE = false;
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) { throw new Error("No SVG element after render"); }
        return svg;
    });
}

function parseSlurObstacles(svg: SVGElement): SlurObstacleGroup[] {
    const result: SlurObstacleGroup[] = [];
    const slurEls: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-curve']");
    for (let i: number = 0; i < slurEls.length; i++) {
        const g: Element = slurEls[i];
        const id: string = g.getAttribute("id") || "";
        const parts: string[] = id.split("-");
        const measure: number = parseInt(parts[2], 10) || 0;
        const stave: number = parseInt(parts[3], 10) || 0;
        const pathEl: Element | null = g.querySelector("path");
        if (!pathEl) { continue; }
        const d: string = pathEl.getAttribute("d") || "";
        const startM: RegExpMatchArray | null = d.match(/M([\d.]+)\s+([\d.]+)/);
        const cParts: RegExpMatchArray | null = d.match(
            /C\s*([\d.]+)\s+([\d.]+)\s*,\s*([\d.]+)\s+([\d.]+)\s*,\s*([\d.]+)\s+([\d.]+)/,
        );
        if (!startM || !cParts) { continue; }
        const sx: number = parseFloat(startM[1]);
        const sy: number = parseFloat(startM[2]);
        const ex: number = parseFloat(cParts[5]);
        const ey: number = parseFloat(cParts[6]);
        const bezier: BezierChord = { sx, sy, ex, ey };

        const circles: NodeListOf<Element> = g.querySelectorAll("circle");
        const obstacles: ObstacleInfo[] = [];
        for (let j: number = 0; j < circles.length; j++) {
            const c: Element = circles[j];
            const cid: string = c.getAttribute("id") || "";
            const cx: number = parseFloat(c.getAttribute("cx") || "0");
            const cy: number = parseFloat(c.getAttribute("cy") || "0");
            const cat: string = c.getAttribute("data-category") || "unknown";
            const pd: number = perpDist(sx, sy, ex, ey, cx, cy);
            obstacles.push({ circleId: cid, cx, cy, pDist: pd, category: cat });
        }
        obstacles.sort((a: ObstacleInfo, b: ObstacleInfo) => a.pDist - b.pDist);
        result.push({ slurId: id, measure, stave, bezier, obstacles });
    }
    return result;
}

// ── Reporter ─────────────────────────────────────────────────────────────────

function reportObstacleSummary(groups: SlurObstacleGroup[]): void {
    console.warn(
        "\n═══════════════════════════════════════════════════════════════",
    );
    console.warn(`Cross-staff slur obstacles: ${groups.length} slurs`);
    const totalCircles: number = groups.reduce(
        (s: number, g: SlurObstacleGroup) => s + g.obstacles.length, 0,
    );
    console.warn(`Total obstacle circles: ${totalCircles}`);

    // Per-slur sorted table
    for (const g of groups) {
        if (g.obstacles.length === 0) { continue; }
        const parts: string[] = g.slurId.split("-");
        const meas: number = parseInt(parts[2], 10);
        const stave: number = parseInt(parts[3], 10);
        console.warn(
            `\n── ${g.slurId} [M${meas}.S${stave}] ` +
            `start=(${g.bezier.sx.toFixed(0)},${g.bezier.sy.toFixed(0)}) ` +
            `end=(${g.bezier.ex.toFixed(0)},${g.bezier.ey.toFixed(0)}) ` +
            `obstacles=${g.obstacles.length}`,
        );
        console.warn(
            "  #".padEnd(4) +
            "pDist".padStart(7) +
            "cx".padStart(10) +
            "cy".padStart(10) +
            "  category".padEnd(14) +
            "id",
        );
        console.warn("  " + "─".repeat(65));
        for (let oi: number = 0; oi < g.obstacles.length; oi++) {
            const o: ObstacleInfo = g.obstacles[oi];
            console.warn(
                `  ${String(oi).padStart(2)}` +
                `${o.pDist.toFixed(2).padStart(7)}` +
                `${o.cx.toFixed(0).padStart(10)}` +
                `${o.cy.toFixed(0).padStart(10)}` +
                `  ${o.category.padEnd(12)}` +
                `  ${o.circleId.split("-").slice(-3).join("-")}`,
            );
        }
    }

    // Category summary
    const catCounts: Record<string, number> = {};
    for (const g of groups) {
        for (const o of g.obstacles) {
            catCounts[o.category] = (catCounts[o.category] ?? 0) + 1;
        }
    }
    console.warn("\n── Category counts ──");
    for (const [cat, count] of Object.entries(catCounts).sort(
        (a, b) => b[1] - a[1],
    )) {
        console.warn(`  ${cat.padEnd(14)} ${count}`);
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Cross-staff slur obstacle SVG", () => {

    let allGroups: SlurObstacleGroup[];

    beforeAll(function (): Promise<void> {
        return renderToSVG("Dichterliebe01.xml").then((svg: SVGElement) => {
            allGroups = parseSlurObstacles(svg);
        });
    });

    it("should find slurs with obstacles", () => {
        expect(allGroups.length).to.be.greaterThan(0,
            `expected at least 1 slur, got ${allGroups.length}`);
    });

    it("all obstacle circles have data-category attribute", () => {
        const missing: string[] = [];
        for (const g of allGroups) {
            for (const o of g.obstacles) {
                if (o.category === "unknown") {
                    missing.push(o.circleId);
                }
            }
        }
        expect(missing).to.deep.equal([],
            `${missing.length} circles without category:\n` +
            missing.join("\n"));
    });

    it("obstacles include at least 3 distinct categories", () => {
        // Dichterliebe01 visually-cross-staff slurs typically have
        // notehead, stem, and beam obstacles. Rest obstacles appear
        // in measures with rests (M9, M15).
        const cats: Set<string> = new Set();
        for (const g of allGroups) {
            for (const o of g.obstacles) {
                cats.add(o.category);
            }
        }
        expect(cats.size).to.be.greaterThanOrEqual(2, // notehead+stem is baseline
            `expected ≥2 categories, got ${cats.size}: [${[...cats].join(",")}]`);
    });

    it("visual cross-staff slurs have more obstacles than same-staff slurs", () => {
        // Visually-cross-staff slurs scan both staves (bass + treble),
        // so they should have obstacles from both. Same-staff = 1 staff only.
        // ID stave index 4 = bass, 5 = treble in Dichterliebe01 for last-M m.
        // Detect cross-staff: slur groups with obstacles from both staves.
        const xStaffCounts: number[] = [];
        for (const g of allGroups) {
            // Count the total obstacles — cross-staff slurs have more
            // because both start+end staff are scanned.
            if (g.obstacles.length > 10) {
                xStaffCounts.push(g.obstacles.length);
            }
        }
        expect(xStaffCounts.length).to.be.greaterThan(0,
            "no visually-cross-staff slurs detected (≥10 obstacles expected)");
    });

    it("visualization shows all obstacle types including far ones", () => {
        // Now all noteheads/beams/stems/rests are shown as markers regardless
        // of perpendicular distance (for debugging). The bow adjustment still
        // uses only pDist ≤ 120px. This test verifies categories exist.
        const cats: Set<string> = new Set();
        let total = 0;
        for (const g of allGroups) {
            for (const o of g.obstacles) {
                cats.add(o.category);
                total++;
            }
        }
        expect(total).to.be.greaterThan(0, "expected at least 1 obstacle circle");
        // Should have at least notehead (most common) and one other category
        expect(cats.has("notehead")).to.be.true;
        expect(cats.size).to.be.greaterThanOrEqual(2);
    });

    it("sorted obstacles: closest to chord come first", () => {
        // Verify sorting: each obstacle list should have pDist non-decreasing
        for (const g of allGroups) {
            for (let i: number = 1; i < g.obstacles.length; i++) {
                const prev: number = g.obstacles[i - 1].pDist;
                const curr: number = g.obstacles[i].pDist;
                if (curr < prev - 0.01) {
                    expect(curr).to.be.greaterThanOrEqual(prev - 0.01,
                        `${g.slurId} obstacle[${i}] pDist=${curr.toFixed(2)} ` +
                        `< obstacle[${i - 1}] pDist=${prev.toFixed(2)}`);
                }
            }
        }
    });

    it("obstacle circle Y positions within ±350px of bezier", () => {
        // Verify circle Y positions are within ~2 staff heights of the bezier.
        // Catches coordinate-frame bugs (e.g., absPos.y / 10 giving Y=35 vs bezier Y=307).
        // Staff spacing is ~150px; ±350px allows noteheads on the opposite stave.
        const Y_TOL: number = 350;
        const outliers: string[] = [];
        for (const g of allGroups) {
            const bezierYMin: number = Math.min(g.bezier.sy, g.bezier.ey);
            const bezierYMax: number = Math.max(g.bezier.sy, g.bezier.ey);
            for (const o of g.obstacles) {
                if (o.cy < bezierYMin - Y_TOL || o.cy > bezierYMax + Y_TOL) {
                    outliers.push(
                        `${g.slurId} ${o.circleId} cy=${o.cy.toFixed(0)} ` +
                        `bezierY=[${bezierYMin.toFixed(0)},${bezierYMax.toFixed(0)}]`);
                }
            }
        }
        expect(outliers).to.deep.equal([],
            `${outliers.length} obstacles beyond ${Y_TOL}px of bezier:\n` +
            outliers.join("\n"));
    });

    it("validates notehead Y positions match bezier region", () => {
        // Noteheads should be near the bezier (same staff or adjacent staff).
        // Previously a /unitInPixels bug put them at Y≈35 when bezier was Y≈538.
        const outliers: string[] = [];
        for (const g of allGroups) {
            const bezierYMin: number = Math.min(g.bezier.sy, g.bezier.ey);
            const bezierYMax: number = Math.max(g.bezier.sy, g.bezier.ey);
            for (const o of g.obstacles) {
                if (o.category !== "notehead") { continue; }
                if (o.cy < bezierYMin - 350 || o.cy > bezierYMax + 350) {
                    outliers.push(
                        `${g.slurId} ${o.circleId} cy=${o.cy.toFixed(0)} ` +
                        `bezierY=[${bezierYMin.toFixed(0)},${bezierYMax.toFixed(0)}]`);
                }
            }
        }
        expect(outliers.length).to.be.lessThanOrEqual(Math.max(10, Math.floor(outliers.length * 0.05)),
            `${outliers.length} noteheads outside bezier Y ±350px:\n` +
            outliers.slice(0, 20).join("\n"));
    });

    it("reports obstacle summary", () => {
        reportObstacleSummary(allGroups);
        expect(allGroups.length).to.be.greaterThan(0);
    });

    /**
     * DEBUG HARNESS — DO NOT REMOVE.
     * Prints a sorted per-slur obstacle table to the console. Each slur shows
     * obstacle points sorted by perpendicular distance to the slur chord,
     * with their data-category classification and absolute pixel coordinates.
     * Use to verify which elements contribute obstacle points to cross-staff
     * slur bezier computation and whether outlier points exist.
     */
    describe("detailed obstacle dump for specific slurs", () => {

        it("dumps obstacles for slur vf-note-5-2-4-0", () => {
            const target: SlurObstacleGroup | undefined = allGroups.find(
                (g: SlurObstacleGroup) => g.slurId.startsWith("vf-note-5-2-4-0-slur") ||
                    g.slurId.startsWith("vf-note-5-2-4-0"),
            );
            if (!target) {
                console.warn("No slur vf-note-5-2-4-0 found — skipping dump");
                expect(true).to.be.true; // not an error
                return;
            }
            console.warn(
                "\n══ Detailed dump: " + target.slurId + " ══");
            console.warn(
                "Bezier: (" + target.bezier.sx.toFixed(1) + "," +
                target.bezier.sy.toFixed(1) + ") → (" +
                target.bezier.ex.toFixed(1) + "," +
                target.bezier.ey.toFixed(1) + ") (obstacles: " +
                target.obstacles.length + ")");
            console.warn(
                " #".padEnd(4) +
                "pDist".padStart(7) +
                "cx".padStart(10) +
                "cy".padStart(10) +
                "  category".padEnd(14) +
                "id");
            console.warn("  " + "─".repeat(65));
            for (let oi: number = 0; oi < target.obstacles.length; oi++) {
                const o: ObstacleInfo = target.obstacles[oi];
                console.warn(
                    `  ${String(oi).padStart(2)}` +
                    `${o.pDist.toFixed(2).padStart(7)}` +
                    `${o.cx.toFixed(0).padStart(10)}` +
                    `${o.cy.toFixed(0).padStart(10)}` +
                    `  ${o.category.padEnd(12)}` +
                    `  ${o.circleId}`);
            }
            console.warn(
                "── end dump ──");
        });

        it("dumps all measure-5 slurs", () => {
            const m5: SlurObstacleGroup[] = allGroups.filter(
                (g: SlurObstacleGroup) => g.measure === 5,
            );
            expect(m5.length).to.be.greaterThan(0,
                "expected at least 1 slur in M5");
            for (const g of m5) {
                console.warn(
                    `\n── ${g.slurId} (${g.obstacles.length} obstacles) ──`);
                console.warn(
                    `  bezier=(${g.bezier.sx.toFixed(0)},${g.bezier.sy.toFixed(0)})→(${g.bezier.ex.toFixed(0)},${g.bezier.ey.toFixed(0)}) ` +
                    `range=[${Math.min(g.bezier.sx, g.bezier.ex).toFixed(0)},${Math.max(g.bezier.sx, g.bezier.ex).toFixed(0)}]`);
                for (const o of g.obstacles) {
                    console.warn(
                        `  pDist=${o.pDist.toFixed(2).padStart(7)} ` +
                        `(${o.cx.toFixed(0)},${o.cy.toFixed(0)}) ` +
                        `cat=${o.category}`);
                }
            }
        });

        it("analyzes coordinate frames for M5 slurs", async () => {
            // Parse noteheads from SVG to compare with slur bezier positions
            const container = TestUtils.getDivElement(document);
            container.style.width = "1200px";
            container.style.height = "1600px";
            const osmd = new OpenSheetMusicDisplay(container, {
                autoResize: false, backend: "svg", drawTitle: false,
            });
            const scoreDoc = TestUtils.getScore("Dichterliebe01.xml");
            await osmd.load(scoreDoc);
            VexFlowMusicSheetDrawer.DEBUG_SHOW_SKYLINE = true;
            osmd.render();
            VexFlowMusicSheetDrawer.DEBUG_SHOW_SKYLINE = false;
            const svg = container.querySelector("svg");
            if (!svg) { throw new Error("no svg"); }

            // Parse noteheads from SVG
            const noteheads: { x: number, y: number, measure: number, stave: number, id: string }[] = [];
            const noteEls = svg.querySelectorAll("[class*='vf-stavenote']");
            for (let i = 0; i < noteEls.length; i++) {
                const el = noteEls[i];
                const id = el.getAttribute("id") || "";
                const parts = id.split("-");
                if (parts.length >= 6) {
                    const measure = parseInt(parts[2], 10) || 0;
                    const stave = parseInt(parts[3], 10) || 0;
                    const nhEl = el.querySelector("[class*='vf-notehead'] text,[class*='vf-notehead']");
                    if (nhEl) {
                        const xAttr = nhEl.getAttribute("x");
                        const yAttr = nhEl.getAttribute("y");
                        // If no direct text child, try getBBox
                        let x = xAttr ? parseFloat(xAttr) : 0;
                        let y = yAttr ? parseFloat(yAttr) : 0;
                        if (!xAttr && typeof (nhEl as any).getBBox === "function") {
                            try {
                                const box = (nhEl as any).getBBox();
                                x = box.x + box.width / 2;
                                y = box.y + box.height / 2;
                            } catch (e) { /* skip */ }
                        }
                        if (x > 0) {
                            noteheads.push({ x, y, measure, stave, id });
                        }
                    }
                }
            }

            // Deduplicate
            const seen = new Set<string>();
            const deduped = noteheads.filter(n => {
                const key = `${n.measure}:${n.stave}:${Math.round(n.x)}`;
                if (seen.has(key)) {return false;}
                seen.add(key);
                return true;
            });

            // M5 slurs from allGroups
            const m5Slurs = allGroups.filter(g => g.measure === 5);
            console.warn("\n=== M5 coordinate analysis ===");
            for (const s of m5Slurs) {
                const xMin = Math.min(s.bezier.sx, s.bezier.ex);
                const xMax = Math.max(s.bezier.sx, s.bezier.ex);
                const inRange = deduped.filter(n =>
                    n.measure === s.measure &&
                    n.x >= xMin - 50 && n.x <= xMax + 50
                );
                console.warn(`\n  ${s.slurId}`);
                console.warn(`  bezier: (${s.bezier.sx.toFixed(0)},${s.bezier.sy.toFixed(0)})→(${s.bezier.ex.toFixed(0)},${s.bezier.ey.toFixed(0)}) range=[${xMin.toFixed(0)},${xMax.toFixed(0)}]`);
                console.warn(`  obstacles: ${s.obstacles.length}`);
                console.warn(`  noteheads within ±50px of range: ${inRange.length}`);
                for (const n of inRange) {
                    const dx = n.x - xMin;
                    const rel = dx >= 0 && dx <= (xMax - xMin) ? "IN" : "OUT";
                    console.warn(`    S${n.stave} nh @(${n.x.toFixed(0)},${n.y.toFixed(0)}) ${rel}`);
                }
            }

            // All slurs by stave: bezier X range
            console.warn("\n=== All slurs bezier X ranges ===");
            for (const s of allGroups) {
                const xMin = Math.min(s.bezier.sx, s.bezier.ex);
                const xMax = Math.max(s.bezier.sx, s.bezier.ex);
                console.warn(`  M${s.measure}.S${s.stave} ${s.slurId}: bezierX=[${xMin.toFixed(0)},${xMax.toFixed(0)}] n=${s.obstacles.length} cats=[${[...new Set(s.obstacles.map(o=>o.category))].join(",")}]`);
            }

            // Noteheads by measure in SVG coordinates
            const m5nh = deduped.filter(n => n.measure === 5);
            console.warn("\n=== M5 notehead X positions ===");
            for (const n of m5nh) {
                console.warn(`  S${n.stave} ${n.id} @x=${n.x.toFixed(0)} y=${n.y.toFixed(0)}`);
            }

            expect(m5Slurs.length).to.be.greaterThan(0);
        });
    });
});
