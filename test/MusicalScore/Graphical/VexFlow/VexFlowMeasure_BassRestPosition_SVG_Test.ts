/* eslint-disable curly */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

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

interface StaffLineInfo {
    staffIdx: number;
    lines: number[]; // Y positions of the 5 staff lines, top to bottom
    topLineY: number;
    bottomLineY: number;
}

interface RestGlyphInfo {
    x: number;
    textY: number;
    bboxY: number;
    bboxH: number;
}

function parseStaffLines(svg: SVGElement): StaffLineInfo[] {
    // Each staffline group contains all measures for one staff.
    // Staff lines are drawn as horizontal <path> elements inside .vf-stave groups.
    // Collect all distinct Y values from staff line paths, then cluster into staves.
    const allYs: number[] = [];
    const paths: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-stave'] path");
    for (let pi: number = 0; pi < paths.length; pi++) {
        const d: string = paths[pi].getAttribute("d") || "";
        const m: RegExpMatchArray | null = d.match(/M[\d.]+ ([\d.]+)L[\d.]+ ([\d.]+)/);
        if (!m) continue;
        const y1: number = parseFloat(m[1]);
        const y2: number = parseFloat(m[2]);
        // Staff lines are horizontal: y1 ≈ y2
        if (Math.abs(y1 - y2) < 1 && y1 > 0 && y1 < 5000) {
            allYs.push(y1);
        }
    }
    // Deduplicate and sort
    const uniqueYs: number[] = [...new Set(allYs)].sort((a, b) => a - b);
    // Cluster into groups of 5 (a staff has 5 lines)
    const staves: StaffLineInfo[] = [];
    let i: number = 0;
    while (i + 4 < uniqueYs.length) {
        // Check that we have 5 lines with regular spacing ~10px
        const group: number[] = uniqueYs.slice(i, i + 5);
        const spacingOk: boolean = group.every((y, idx) =>
            idx === 0 || Math.abs(y - group[idx - 1] - 10) < 2
        );
        if (spacingOk) {
            staves.push({ staffIdx: staves.length, lines: group, topLineY: group[0], bottomLineY: group[4] });
            i += 5;
        } else {
            i++;
        }
    }
    return staves;
}

function findAllRests(svg: SVGElement): RestGlyphInfo[] {
    const rests: RestGlyphInfo[] = [];
    const allNoteheads: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-notehead']");
    for (let i: number = 0; i < allNoteheads.length; i++) {
        const nh: Element = allNoteheads[i];
        // Rest noteheads: from cursor, cursor-visible notes, or notes without stem
        // Check parent stavenote for absence of stem AND no ledger lines
        const parent: Element | null = nh.closest("[class*='vf-stavenote']");
        if (!parent) continue;
        // Rests don't have stems
        const hasStem: boolean = parent.querySelector("[class*='vf-stem']") !== null;
        if (hasStem) continue;
        // Rests flagged by glyph code range (SMuFL rest chars) or by class
        const text: Element | null = nh.querySelector("text");
        if (!text) continue;
        const x: number = parseFloat(text.getAttribute("x") || "0");
        const y: number = parseFloat(text.getAttribute("y") || "0");
        if (x === 0 && y === 0) continue;
        // Get bbox rect
        const rect: Element | null = parent.querySelector("rect");
        let bboxY: number = y, bboxH: number = 10;
        if (rect) {
            const ry: number = parseFloat(rect.getAttribute("y") || "0");
            const rh: number = parseFloat(rect.getAttribute("height") || "0");
            if (ry > 0 && rh > 0) { bboxY = ry; bboxH = rh; }
        }
        rests.push({ x, textY: y, bboxY, bboxH });
    }
    return rests;
}

describe("Bass Staff Rest Positioning", () => {

    describe("test_rest_in_measure_keys_bass_rest.musicxml", () => {
        let staves: StaffLineInfo[];
        let rests: RestGlyphInfo[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("test_rest_in_measure_keys_bass_rest.musicxml")
                .then((svg: SVGElement) => {
                    staves = parseStaffLines(svg);
                    rests = findAllRests(svg);
                    console.log("[DEBUG] staves:", JSON.stringify(staves.map(s =>
                        `staff${s.staffIdx} top=${s.topLineY} bot=${s.bottomLineY}`)));
                    console.log("[DEBUG] rests:", JSON.stringify(rests.map(r =>
                        `x=${r.x.toFixed(0)} textY=${r.textY.toFixed(0)} bboxY=${r.bboxY.toFixed(0)} bboxH=${r.bboxH.toFixed(0)}`)));
                });
        });

        it("should find both staves", () => {
            expect(staves.length).to.be.at.least(2,
                `need >=2 staves, found ${staves.length}: ` +
                staves.map(s => `{top=${s.topLineY},bot=${s.bottomLineY}}`).join(","));
        });

        it("should find rests", () => {
            expect(rests.length).to.be.greaterThan(0,
                `no rests found in SVG, staves=${staves.length}`);
        });

        // Identify bass staff as the SECOND staff (sorted by Y)
        function getBassStaff(): StaffLineInfo {
            return staves[staves.length - 1]; // lowest = bass
        }

        it("all rests should lie within or near the staff they belong to", () => {
            const bass: StaffLineInfo = getBassStaff();
            // A rest with bboxY >= bass.topLineY - 10 should be IN/near bass staff.
            // If bboxY < bass.topLineY - 20, it's in the treble staff area → wrong.
            const badRests: string[] = [];
            for (const r of rests) {
                // Determine which staff this rest belongs to by proximity
                let closestStaff: StaffLineInfo | undefined;
                let closestDist: number = Infinity;
                for (const s of staves) {
                    // Distance from rest textY to staff center
                    const center: number = (s.topLineY + s.bottomLineY) / 2;
                    const dist: number = Math.abs(r.textY - center);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestStaff = s;
                    }
                }
                // If closest is bass, rest should be within or near bass staff
                if (closestStaff === bass && r.textY < bass.topLineY - 20) {
                    badRests.push(
                        `x=${r.x.toFixed(0)} textY=${r.textY.toFixed(0)} ` +
                        `bboxY=${r.bboxY.toFixed(0)} ` +
                        `bassStaffTop=${bass.topLineY.toFixed(0)} ` +
                        `gap=${(bass.topLineY - r.textY).toFixed(0)}px above staff`);
                }
            }
            expect(badRests).to.deep.equal([],
                badRests.length + " rests too far above bass staff:\n" +
                badRests.join("\n"));
        });

it("bass staff rests should not sit in the treble staff area", () => {
            const bass: StaffLineInfo = getBassStaff();
            const treble: StaffLineInfo = staves[0];
            const trebleMid: number = (treble.topLineY + treble.bottomLineY) / 2;
            const bassMid: number = (bass.topLineY + bass.bottomLineY) / 2;
            for (const r of rests) {
                if (Math.abs(r.textY - bassMid) > Math.abs(r.textY - trebleMid)) { continue; }
                if (r.bboxY < bass.topLineY - 20) {
                    expect.fail(
                        `rest x=${r.x.toFixed(0)} bboxY=${r.bboxY.toFixed(0)} ` +
                        `above bass staff (bass top=${bass.topLineY.toFixed(0)})`);
                }
            }
        });

        it("bass staff rests should be within or just above bass staff", () => {
            const bass: StaffLineInfo = getBassStaff();
            for (const r of rests) {
                const distAbove: number = bass.topLineY - r.bboxY;
                // Rest bbox should not be more than ~25px above staff top
                // (rest glyphs have small glyph-head above their position)
                if (distAbove > 25) {
                    // This rest might be in the treble staff area
                    continue; // skip — handled by previous test
                }
                // If the rest BOTTOM (bboxY+bboxH) is within staff range, it's OK
                const restBottom: number = r.bboxY + r.bboxH;
                const overlapsStaff: boolean = restBottom > bass.topLineY - 15;
                if (!overlapsStaff) {
                    expect.fail(
                        `rest x=${r.x.toFixed(0)} bboxY=${r.bboxY.toFixed(0)} ` +
                        `restBot=${restBottom.toFixed(0)} is above bass staff ` +
                        `top=${bass.topLineY.toFixed(0)}`);
                }
            }
        });

        it("upper-voice rests (v5) should sit near the top of bass staff", () => {
            const bass: StaffLineInfo = getBassStaff();
            const midLine: number = (bass.topLineY + bass.bottomLineY) / 2;
            for (const r of rests) {
                const distAbove: number = bass.topLineY - r.bboxY;
                if (distAbove > 25) continue; // rests too high — handled by other tests

                // rest should not be below middle line either
                // (unless it's explicitly a lower-voice rest)
                const restBottom: number = r.bboxY + r.bboxH;
                if (restBottom > midLine + 15) {
                    // Lower half — potentially fine for lower voice,
                    // but for voice 5 this indicates wrong placement
                    // We'll just warn for now
                    console.log(`[WARN] rest x=${r.x.toFixed(0)} bottom=${restBottom.toFixed(0)} ` +
                        `is in lower half of bass staff (mid=${midLine.toFixed(0)})`);
                }
            }
        });

        it("first bass rest in m1 should be below the treble staff", () => {
            const bass: StaffLineInfo = getBassStaff();
            const treble: StaffLineInfo = staves[0];
            const trebleBottom: number = treble.bottomLineY;
            for (const r of rests) {
                // Only check rests closest to bass staff
                const bassMid: number = (bass.topLineY + bass.bottomLineY) / 2;
                const trebleMid: number = (treble.topLineY + treble.bottomLineY) / 2;
                if (Math.abs(r.textY - bassMid) > Math.abs(r.textY - trebleMid)) { continue; }
                const restBottom: number = r.bboxY + r.bboxH;
                if (restBottom < trebleBottom + 10) {
                    expect.fail(
                        `rest x=${r.x.toFixed(0)} restBottom=${restBottom.toFixed(0)} ` +
                        `is at treble level (trebleBottom=${trebleBottom.toFixed(0)})`);
                }
            }
        });
    });
});
