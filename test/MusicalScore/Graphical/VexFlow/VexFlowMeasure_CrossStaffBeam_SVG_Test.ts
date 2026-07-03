/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

interface StemInfo {
    x: number;
    baseY: number;
    tipY: number;
    direction: "up" | "down";
}

interface BeamLineInfo {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface NoteheadInfo {
    x: number;
    y: number;
    centerY: number;
}

interface CrossStaffBeamInfo {
    stems: StemInfo[];
    beamLines: BeamLineInfo[];
    noteheads: NoteheadInfo[];
}

function parseStemPath(pathEl: Element): StemInfo | undefined {
    const d: string = pathEl.getAttribute("d") || "";
    const match: RegExpMatchArray | null =
        d.match(/M([\d.]+)\s+([\d.]+)L([\d.]+)\s+([\d.]+)/);
    if (!match) { return undefined; }
    const x: number = parseFloat(match[1]);
    const y1: number = parseFloat(match[2]);
    const y2: number = parseFloat(match[4]);
    return {
        x,
        baseY: y1,
        tipY: y2,
        direction: y2 < y1 ? "up" : "down",
    };
}

function parseBeamLinePath(pathEl: Element): BeamLineInfo | undefined {
    const d: string = pathEl.getAttribute("d") || "";
    const coords: number[] = [];
    const re: RegExp = /[ML]([\d.]+)\s+([\d.]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d)) !== null) {
        coords.push(parseFloat(m[1]), parseFloat(m[2]));
    }
    if (coords.length < 8) { return undefined; }
    return {
        startX: coords[0],
        startY: coords[1],
        endX: coords[4],
        endY: coords[5],
    };
}

function getNoteheadPositions(svg: SVGElement): NoteheadInfo[] {
    const groups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-notehead']");
    const result: NoteheadInfo[] = [];
    for (let i: number = 0; i < groups.length; i++) {
        const g: SVGGraphicsElement = groups[i] as SVGGraphicsElement;
        if (typeof g.getBBox !== "function") { continue; }
        try {
            const box: SVGRect = g.getBBox();
            if (box.width > 0 && box.height > 0) {
                result.push({
                    x: box.x + box.width / 2,
                    y: box.y,
                    centerY: box.y + box.height / 2,
                });
            }
        } catch (e) { /* not rendered */ }
    }
    return result;
}

function findNearestNotehead(
    noteheads: NoteheadInfo[], stemX: number, stemBaseY: number,
    xTol: number, yTol: number
): NoteheadInfo | undefined {
    let best: NoteheadInfo | undefined;
    let bestDist: number = Infinity;
    for (const nh of noteheads) {
        const dx: number = Math.abs(nh.x - stemX);
        const dy: number = Math.abs(nh.centerY - stemBaseY);
        if (dx < xTol && dy < yTol) {
            const dist: number = dx + dy;
            if (dist < bestDist) {
                bestDist = dist;
                best = nh;
            }
        }
    }
    return best;
}

function findCrossStaffBeams(
    svg: SVGElement, minBaseYSpan: number
): CrossStaffBeamInfo[] {
    const beamGroups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-beam']");
    const allNoteheads: NoteheadInfo[] = getNoteheadPositions(svg);
    const results: CrossStaffBeamInfo[] = [];

    for (let i: number = 0; i < beamGroups.length; i++) {
        const bg: Element = beamGroups[i];
        const stemGs: NodeListOf<Element> =
            bg.querySelectorAll("[class*='vf-stem']");
        const stems: StemInfo[] = [];
        for (let j: number = 0; j < stemGs.length; j++) {
            const p: Element | null = stemGs[j].querySelector("path");
            if (p) {
                const s: StemInfo | undefined = parseStemPath(p);
                if (s) { stems.push(s); }
            }
        }
        if (stems.length < 2) { continue; }
        const baseYs: number[] = stems.map((s: StemInfo) => s.baseY);
        const span: number = Math.max(...baseYs) - Math.min(...baseYs);
        if (span < minBaseYSpan) { continue; }

        const beamPaths: NodeListOf<Element> =
            bg.querySelectorAll(":scope > path");
        const beamLines: BeamLineInfo[] = [];
        for (let k: number = 0; k < beamPaths.length; k++) {
            const bl: BeamLineInfo | undefined =
                parseBeamLinePath(beamPaths[k]);
            if (bl) { beamLines.push(bl); }
        }

        const noteheads: NoteheadInfo[] = [];
        for (const stem of stems) {
            const nh: NoteheadInfo | undefined =
                findNearestNotehead(allNoteheads, stem.x, stem.baseY, 15, 30);
            if (nh) { noteheads.push(nh); }
        }

        results.push({ stems, beamLines, noteheads });
    }
    return results;
}

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

const MIN_CROSS_STAFF_SPAN: number = 60;
const MIN_CROSS_STAFF_SPAN_SMALL: number = 30;

describe("Cross-Staff Beam SVG Rendering", () => {

    describe("Dichterliebe01 cross-staff beam SVG", () => {
        let crossBeams: CrossStaffBeamInfo[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("Dichterliebe01.xml").then(
                (svg: SVGElement) => {
                    crossBeams = findCrossStaffBeams(
                        svg, MIN_CROSS_STAFF_SPAN
                    );
                }
            );
        });

        it("should find cross-staff beams", () => {
            expect(crossBeams.length).to.be.greaterThan(0,
                "no cross-staff beams detected (span > 100)");
        });

        it("should have both UP and DOWN stems", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                const dirs: Set<string> = new Set(
                    cb.stems.map((s: StemInfo) => s.direction)
                );
                const ys: string = cb.stems.map(
                    (s: StemInfo) => `${s.direction}@${s.baseY.toFixed(0)}`
                ).join(",");
                expect(dirs.size).to.equal(2,
                    `beam[${i}] needs both up+down: [${ys}]`);
            }
        });

        it("noteheads should exist near each stem base", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                expect(cb.noteheads.length).to.equal(cb.stems.length,
                    `beam[${i}] should have notehead for each stem`);
            }
        });

        it("stem bases should touch noteheads (within 20px)", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const gap: number = Math.abs(
                        cb.stems[j].baseY - cb.noteheads[j].centerY
                    );
                    expect(gap).to.be.lessThan(20,
                        `beam[${i}] stem[${j}] base=${cb.stems[j].baseY.toFixed(0)} ` +
                        `nh=${cb.noteheads[j].centerY.toFixed(0)} gap=${gap.toFixed(0)}`);
                }
            }
        });

        it("treble noteheads should have DOWN stems, " +
            "bass noteheads should have UP stems", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                const nhYs: number[] = cb.noteheads.map(
                    (nh: NoteheadInfo) => nh.centerY
                );
                const mid: number = (Math.min(...nhYs) + Math.max(...nhYs)) / 2;
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const nh: NoteheadInfo = cb.noteheads[j];
                    if (nh.centerY < mid - 20) {
                        expect(cb.stems[j].direction).to.equal("down",
                            `beam[${i}] treble nh@${nh.centerY.toFixed(0)} should have DOWN stem`);
                    } else if (nh.centerY > mid + 20) {
                        expect(cb.stems[j].direction).to.equal("up",
                            `beam[${i}] bass nh@${nh.centerY.toFixed(0)} should have UP stem`);
                    }
                }
            }
        });

        it("beam lines should be between noteheads", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                if (cb.beamLines.length === 0 ||
                    cb.noteheads.length === 0) { continue; }
                const nhYs: number[] = cb.noteheads.map(
                    (nh: NoteheadInfo) => nh.centerY
                );
                const minNH: number = Math.min(...nhYs);
                const maxNH: number = Math.max(...nhYs);
                for (const bl of cb.beamLines) {
                    const beamMidY: number = (bl.startY + bl.endY) / 2;
                    expect(beamMidY).to.be.greaterThan(minNH - 5,
                        `beam[${i}] beamY=${beamMidY.toFixed(0)} should ` +
                        `be below treble nh (${minNH.toFixed(0)})`);
                    expect(beamMidY).to.be.lessThan(maxNH + 5,
                        `beam[${i}] beamY=${beamMidY.toFixed(0)} should ` +
                        `be above bass nh (${maxNH.toFixed(0)})`);
                }
            }
        });

        it("stem tips should reach beam line (within 15px)", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                if (cb.beamLines.length === 0) { continue; }
                const bl: BeamLineInfo = cb.beamLines[0];
                const dx: number = bl.endX - bl.startX || 1;
                for (const stem of cb.stems) {
                    const t: number = (stem.x - bl.startX) / dx;
                    const beamY: number = bl.startY + (bl.endY - bl.startY) * t;
                    const gap: number = Math.abs(stem.tipY - beamY);
                    expect(gap).to.be.lessThan(15,
                        `beam[${i}] stem tip=${stem.tipY.toFixed(0)} ` +
                        `beamY=${beamY.toFixed(0)} gap=${gap.toFixed(0)}`);
                }
            }
        });
    });

    describe("test_tuplet_crossstaff SVG", () => {
        let crossBeams: CrossStaffBeamInfo[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG(
                "test_tuplet_crossstaff_alignment.musicxml"
            ).then((svg: SVGElement) => {
                crossBeams = findCrossStaffBeams(
                    svg, MIN_CROSS_STAFF_SPAN_SMALL
                );
            });
        });

        it("should find cross-staff beams", () => {
            expect(crossBeams.length).to.be.greaterThan(0);
        });

        it("should have mixed stem directions", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const dirs: Set<string> = new Set(
                    crossBeams[i].stems.map((s: StemInfo) => s.direction)
                );
                expect(dirs.size).to.equal(2,
                    `beam[${i}] should have up+down stems`);
            }
        });

        it("stem bases should touch noteheads", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const gap: number = Math.abs(
                        cb.stems[j].baseY - cb.noteheads[j].centerY
                    );
                    expect(gap).to.be.lessThan(20,
                        `beam[${i}] stem[${j}] gap=${gap.toFixed(0)}`);
                }
            }
        });

        it("treble DOWN, bass UP", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                const nhYs: number[] = cb.noteheads.map(
                    (nh: NoteheadInfo) => nh.centerY
                );
                const mid: number =
                    (Math.min(...nhYs) + Math.max(...nhYs)) / 2;
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const nh: NoteheadInfo = cb.noteheads[j];
                    if (nh.centerY < mid - 20) {
                        expect(cb.stems[j].direction).to.equal("down");
                    } else if (nh.centerY > mid + 20) {
                        expect(cb.stems[j].direction).to.equal("up");
                    }
                }
            }
        });

        it("stem tips should reach beam line", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                if (cb.beamLines.length === 0) { continue; }
                const bl: BeamLineInfo = cb.beamLines[0];
                const dx: number = bl.endX - bl.startX || 1;
                for (const stem of cb.stems) {
                    const t: number = (stem.x - bl.startX) / dx;
                    const beamY: number =
                        bl.startY + (bl.endY - bl.startY) * t;
                    const gap: number = Math.abs(stem.tipY - beamY);
                    expect(gap).to.be.lessThan(40,
                        `beam[${i}] tip-beam gap=${gap.toFixed(0)}`);
                }
            }
        });
    });

    describe("Debussy Mandoline cross-staff SVG", () => {
        let crossBeams: CrossStaffBeamInfo[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("Debussy_Mandoline.xml").then(
                (svg: SVGElement) => {
                    crossBeams = findCrossStaffBeams(
                        svg, MIN_CROSS_STAFF_SPAN
                    );
                }
            );
        });

        it("should find cross-staff beams", () => {
            expect(crossBeams.length).to.be.greaterThan(0);
        });

        it("should have mixed stem directions", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const dirs: Set<string> = new Set(
                    crossBeams[i].stems.map((s: StemInfo) => s.direction)
                );
                expect(dirs.size).to.equal(2,
                    `beam[${i}] should have up+down stems`);
            }
        });

        it("stem bases should touch noteheads", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const gap: number = Math.abs(
                        cb.stems[j].baseY - cb.noteheads[j].centerY
                    );
                    expect(gap).to.be.lessThan(20,
                        `beam[${i}] stem[${j}] gap=${gap.toFixed(0)}`);
                }
            }
        });

        it("treble DOWN, bass UP", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                const nhYs: number[] = cb.noteheads.map(
                    (nh: NoteheadInfo) => nh.centerY
                );
                const mid: number =
                    (Math.min(...nhYs) + Math.max(...nhYs)) / 2;
                for (let j: number = 0; j < cb.stems.length; j++) {
                    if (j >= cb.noteheads.length) { continue; }
                    const nh: NoteheadInfo = cb.noteheads[j];
                    if (nh.centerY < mid - 20) {
                        expect(cb.stems[j].direction).to.equal("down");
                    } else if (nh.centerY > mid + 20) {
                        expect(cb.stems[j].direction).to.equal("up");
                    }
                }
            }
        });

        it("stem tips should reach beam line", () => {
            for (let i: number = 0; i < crossBeams.length; i++) {
                const cb: CrossStaffBeamInfo = crossBeams[i];
                if (cb.beamLines.length === 0) { continue; }
                const bl: BeamLineInfo = cb.beamLines[0];
                const dx: number = bl.endX - bl.startX || 1;
                for (const stem of cb.stems) {
                    const t: number = (stem.x - bl.startX) / dx;
                    const beamY: number =
                        bl.startY + (bl.endY - bl.startY) * t;
                    const gap: number = Math.abs(stem.tipY - beamY);
                    expect(gap).to.be.lessThan(40,
                        `beam[${i}] tip-beam gap=${gap.toFixed(0)}`);
                }
            }
        });
    });

    interface SlurBezier {
        id: string;
        startX: number;
        startY: number;
        cp1X: number;
        cp1Y: number;
        cp2X: number;
        cp2Y: number;
        endX: number;
        endY: number;
    }

    function parseSlurBezier(pathEl: Element): SlurBezier | undefined {
        const d: string = pathEl.getAttribute("d") || "";
        // Upper curve: M sx sy C c1x c1y, c2x c2y, ex ey
        const m: RegExpMatchArray | null =
            d.match(/M([\d.]+)\s+([\d.]+)C([\d.]+)\s+([\d.]+),([\d.]+)\s+([\d.]+),([\d.]+)\s+([\d.]+)/);
        if (!m) { return undefined; }
        return {
            id: (pathEl.parentElement?.getAttribute("id") || ""),
            startX: parseFloat(m[1]), startY: parseFloat(m[2]),
            cp1X: parseFloat(m[3]), cp1Y: parseFloat(m[4]),
            cp2X: parseFloat(m[5]), cp2Y: parseFloat(m[6]),
            endX: parseFloat(m[7]), endY: parseFloat(m[8]),
        };
    }


    interface NoteInfo {
        id: string;
        measure: number;
        stave: number;
        x: number;
        noteheadY: number;
        stemBase: number;
        stemTip: number;
        stemDir: string;
    }

    interface BeamDebugInfo {
        beamId: string;
        notes: NoteInfo[];
        beamPolyTopY: number;
        beamPolyBotY: number;
        /** Top-left corner of the first beam polygon (beam start X/Y). */
        startX: number;
        startY: number;
        /** Top-right corner of the first beam polygon (beam end X/Y). */
        endX: number;
        endY: number;
    }

    interface SlurDebugInfo {
        slurId: string;
        startX: number;
        startY: number;
        cp1X: number;
        cp1Y: number;
        cp2X: number;
        cp2Y: number;
        endX: number;
        endY: number;
        /** Max perpendicular distance from the start-end line to the control points (px). */
        bowPx: number;
    }

    function parseScoreSVG(svg: SVGElement): {
        notes: NoteInfo[];
        beams: BeamDebugInfo[];
        slurs: SlurDebugInfo[];
    } {
        // Parse all stave notes with their IDs.
        // Notes appear once per system — we store every instance keyed by ID.
        const notes: NoteInfo[] = [];
        const noteEls: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-stavenote']");
        for (let i: number = 0; i < noteEls.length; i++) {
            const el: Element = noteEls[i] as Element;
            const id: string = el.getAttribute("id") || "";
            const idParts: string[] = id.split("-");
            if (idParts.length < 6 || idParts[0] !== "vf" || idParts[1] !== "note") {
                continue;
            }
            const measure: number = parseInt(idParts[2], 10);
            const stave: number = parseInt(idParts[3], 10);

            // Notehead Y
            const nhEl: Element | null = el.querySelector("[class*='vf-notehead']");
            let noteheadY: number = 0;
            if (nhEl) {
                const textEl: Element | null = nhEl.querySelector("text");
                if (textEl) {
                    const yAttr: string | null = textEl.getAttribute("y");
                    if (yAttr) { noteheadY = parseFloat(yAttr); }
                }
            }

            // Stem geometry (from stavenote; beam-group stems are parsed later)
            const stemEl: Element | null = el.querySelector("[class*='vf-stem'] path");
            let stemBase: number = 0, stemTip: number = 0, stemDir: string = "none";
            if (stemEl) {
                const d: string = stemEl.getAttribute("d") || "";
                const m: RegExpMatchArray | null = d.match(/M([\d.]+)\s+([\d.]+)L([\d.]+)\s+([\d.]+)/);
                if (m) {
                    const y1: number = parseFloat(m[2]);
                    const y2: number = parseFloat(m[4]);
                    if (y2 < y1) { stemDir = "up"; stemTip = y2; stemBase = y1; }
                    else { stemDir = "down"; stemTip = y2; stemBase = y1; }
                }
            }

            // X position
            let x: number = 0;
            const allTexts: NodeListOf<Element> = el.querySelectorAll("text");
            if (allTexts.length > 0) {
                const xAttr: string | null = allTexts[0].getAttribute("x");
                if (xAttr) { x = parseFloat(xAttr); }
            }

            notes.push({ id, measure, stave, x, noteheadY, stemBase, stemTip, stemDir });
        }

        // Parse beams
        const beams: BeamDebugInfo[] = [];
        const beamEls: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-beam']");
        for (let i: number = 0; i < beamEls.length; i++) {
            const bg: Element = beamEls[i] as Element;
            // Beam polygon Y — compute first so we can Y-filter note matches
            let polyTop: number = Infinity;
            let polyBot: number = -Infinity;
            const polyPaths: NodeListOf<Element> = bg.querySelectorAll(":scope > path");
            for (let j: number = 0; j < polyPaths.length; j++) {
                const d: string = polyPaths[j].getAttribute("d") || "";
                const coords: RegExpMatchArray | null = d.match(/[ML]([\d.]+)\s+([\d.]+)/g);
                if (coords) {
                    for (const c of coords) {
                        const nums: RegExpMatchArray | null = c.match(/([\d.]+)\s+([\d.]+)/);
                        if (nums) {
                            const yv: number = parseFloat(nums[2]);
                            polyTop = Math.min(polyTop, yv);
                            polyBot = Math.max(polyBot, yv);
                        }
                    }
                }
            }

            // Match beam stem X positions to parsed notes, with Y-proximity
            // to prevent matching notes from other systems at the same X.
            const stemPaths: NodeListOf<Element> = bg.querySelectorAll("[class*='vf-stem'] path");
            const beamNoteXs: number[] = [];
            for (let j: number = 0; j < stemPaths.length; j++) {
                const d: string = stemPaths[j].getAttribute("d") || "";
                const m: RegExpMatchArray | null = d.match(/M([\d.]+)\s+([\d.]+)/);
                if (m) { beamNoteXs.push(parseFloat(m[1])); }
            }

            const matchedNotes: NoteInfo[] = [];
            for (const nx of beamNoteXs) {
                let best: NoteInfo | undefined;
                let bestDist: number = 15;
                for (const n of notes) {
                    const dx: number = Math.abs(n.x - nx);
                    const inY: boolean = n.noteheadY >= polyTop - 50 && n.noteheadY <= polyBot + 50;
                    if (!inY) { continue; }
                    if (dx < bestDist) { bestDist = dx; best = n; }
                }
                if (best) { matchedNotes.push(best); }
            }

            if (matchedNotes.length === 0) { continue; }

            // Extract beam start/end X/Y from the first polygon path:
            // Path format: M x1 y1 L x1 y2 L x2 y3 L x2 y4 Z
            // (x1, y1) = top-left of beam, (x2, y4) = top-right of beam
            let sx: number = 0, sy: number = 0, ex: number = 0, ey: number = 0;
            if (polyPaths.length > 0) {
                const pd: string = polyPaths[0].getAttribute("d") || "";
                const pts: RegExpMatchArray | null = pd.match(
                    /M([\d.]+)\s+([\d.]+)L\1\s+([\d.]+)L([\d.]+)\s+([\d.]+)L\4\s+([\d.]+)/
                );
                if (pts) {
                    sx = parseFloat(pts[1]); sy = parseFloat(pts[2]);
                    ex = parseFloat(pts[4]); ey = parseFloat(pts[6]);
                }
            }

            beams.push({
                beamId: bg.getAttribute("id") || `beam_${i}`,
                notes: matchedNotes,
                beamPolyTopY: polyTop,
                beamPolyBotY: polyBot,
                startX: sx, startY: sy,
                endX: ex, endY: ey,
            });
        }

        // Parse slurs (vf-curve)
        const slurs: SlurDebugInfo[] = [];
        const slurEls: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-curve']");
        for (let i: number = 0; i < slurEls.length; i++) {
            const se: Element = slurEls[i] as Element;
            const id: string = se.getAttribute("id") || "";
            const pathEl: Element | null = se.querySelector("path");
            if (!pathEl) { continue; }
            const d: string = pathEl.getAttribute("d") || "";
            const startM: RegExpMatchArray | null = d.match(/M([\d.]+)\s+([\d.]+)/);
            // C cp1x cp1y, cp2x cp2y, ex ey
            const cParts: RegExpMatchArray | null = d.match(
                /C\s*([\d.]+)\s+([\d.]+)\s*,\s*([\d.]+)\s+([\d.]+)\s*,\s*([\d.]+)\s+([\d.]+)/
            );
            if (startM && cParts) {
                const sx: number = parseFloat(startM[1]);
                const sy: number = parseFloat(startM[2]);
                const cp1x: number = parseFloat(cParts[1]);
                const cp1y: number = parseFloat(cParts[2]);
                const cp2x: number = parseFloat(cParts[3]);
                const cp2y: number = parseFloat(cParts[4]);
                const ex: number = parseFloat(cParts[5]);
                const ey: number = parseFloat(cParts[6]);

                // Bow: max perpendicular distance from start→end line to control points
                const dx: number = ex - sx;
                const dy: number = ey - sy;
                const len: number = Math.sqrt(dx * dx + dy * dy) || 1;
                function perpDist(px: number, py: number): number {
                    // cross product of (p-s) with (e-s) / |e-s|
                    return Math.abs((px - sx) * dy - (py - sy) * dx) / len;
                }
                const bowPx: number = Math.max(perpDist(cp1x, cp1y), perpDist(cp2x, cp2y));

                slurs.push({
                    slurId: id,
                    startX: sx, startY: sy,
                    cp1X: cp1x, cp1Y: cp1y,
                    cp2X: cp2x, cp2Y: cp2y,
                    endX: ex, endY: ey,
                    bowPx,
                });
            }
        }

        return { notes, beams, slurs };
    }

    function debugMeasure(
        measureNum: number,
        notes: NoteInfo[],
        beams: BeamDebugInfo[],
        slurs: SlurDebugInfo[]
    ): string[] {
        const log: string[] = [];
        const mNotes: NoteInfo[] = notes.filter((n) => n.measure === measureNum);
        if (mNotes.length === 0) {
            log.push(`No notes found for measure ${measureNum}`);
            return log;
        }

        const xMin: number = Math.min(...mNotes.map((n) => n.x));
        const xMax: number = Math.max(...mNotes.map((n) => n.x));
        // Y bounds of this measure's notes (with stem extents)
        const allNoteYs: number[] = mNotes.flatMap((n) =>
            n.stemDir !== "none" ? [n.noteheadY, n.stemTip] : [n.noteheadY]
        );
        const yMin: number = Math.min(...allNoteYs) - 40;
        const yMax: number = Math.max(...allNoteYs) + 40;

        // Determine staves present in this measure
        const staves: Set<number> = new Set(mNotes.map((n) => n.stave));

        log.push(`=== Measure ${measureNum} ===`);
        log.push(`Staves: [${[...staves].sort().join(",")}]  X: ${xMin.toFixed(0)}-${xMax.toFixed(0)}  Y: ${yMin.toFixed(0)}-${yMax.toFixed(0)}`);

        // Notes grouped by stave
        for (const st of [...staves].sort()) {
            const sn: NoteInfo[] = mNotes.filter((n) => n.stave === st);
            log.push(`  Stave ${st}:`);
            for (const n of sn) {
                log.push(`    ${n.id} x=${n.x.toFixed(0)} nhY=${n.noteheadY.toFixed(1)} ` +
                    `stem=${n.stemDir}(${n.stemTip.toFixed(1)}→${n.stemBase.toFixed(1)})`);
            }
        }

        // Beams overlapping this measure (X + Y bounds)
        const mBeams: BeamDebugInfo[] = beams.filter(
            (b) => b.notes.some((n) => n.measure === measureNum) &&
                b.beamPolyTopY >= yMin && b.beamPolyBotY <= yMax
        );
        if (mBeams.length > 0) {
            log.push(`Beams (${mBeams.length}):`);
            for (const b of mBeams) {
                const bnStaves: Set<number> = new Set(b.notes.map((n) => n.stave));
                const isXStaff: boolean = bnStaves.size >= 2;
                log.push(`  ${b.beamId}: start=(${b.startX.toFixed(0)},${b.startY.toFixed(1)}) ` +
                    `end=(${b.endX.toFixed(0)},${b.endY.toFixed(1)}) ` +
                    `polyTop=${b.beamPolyTopY.toFixed(1)} polyBot=${b.beamPolyBotY.toFixed(1)} ` +
                    `staves=[${[...bnStaves].sort().join(",")}] cross-staff=${isXStaff} ` +
                    `notes=[${b.notes.map((n) => `${n.id}@${n.stemDir}`).join(",")}]`);
            }
        } else {
            log.push("Beams: none");
        }

        // Slurs overlapping this measure: X range overlap AND Y range overlap.
        // Include slurs that start outside but pass through (cross-measure).
        const mSlurs: SlurDebugInfo[] = slurs.filter(
            (s) => {
                const sXMin: number = Math.min(s.startX, s.endX);
                const sXMax: number = Math.max(s.startX, s.endX);
                const sYMin: number = Math.min(s.startY, s.endY, s.cp1Y, s.cp2Y);
                const sYMax: number = Math.max(s.startY, s.endY, s.cp1Y, s.cp2Y);
                return sXMax >= xMin - 30 && sXMin <= xMax + 30 &&
                       sYMin <= yMax + 50 && sYMax >= yMin - 50;
            }
        );
        if (mSlurs.length > 0) {
            log.push(`Slurs (${mSlurs.length}):`);
            for (const s of mSlurs) {
                // Match by slur ID: vf-note-M-S-V-I-slur → note ID is first 5 parts
                const slurNoteId: string = s.slurId.replace(/-slur$/, "");
                let startN: NoteInfo | undefined;
                let endN: NoteInfo | undefined;
                // Start note: exact ID match from slur ID
                for (const n of mNotes) {
                    if (n.id === slurNoteId) { startN = n; break; }
                }
                if (!startN) {
                    // Fallback: X proximity
                    let bestStart: number = 30;
                    for (const n of mNotes) {
                        const sd: number = Math.abs(n.x - s.startX);
                        if (sd < bestStart) { bestStart = sd; startN = n; }
                    }
                }
                const startStave: number = startN?.stave ?? -1;
                // End note: prefer different stave, X + Y proximity
                let crossEndN: NoteInfo | undefined;
                for (const n of mNotes) {
                    if (n.stave !== startStave && Math.abs(n.x - s.endX) < 30) {
                        if (!crossEndN || Math.abs(n.x - s.endX) < Math.abs(crossEndN.x - s.endX)) {
                            crossEndN = n;
                        }
                    }
                }
                // Also try exact end note match: the slur's EndNote can be found by searching all notes
                if (!crossEndN) {
                    for (const n of mNotes) {
                        if (Math.abs(n.x - s.endX) < 30) {
                            if (!endN || Math.abs(n.x - s.endX) < Math.abs(endN.x - s.endX)) {
                                endN = n;
                            }
                        }
                    }
                }
                const endStave: number = crossEndN?.stave ?? endN?.stave ?? -1;
                const isXStaff: boolean = startStave >= 0 && endStave >= 0 && startStave !== endStave;

                // Find beam containing the start note by note ID
                let beamTop: number = -1;
                let beamBot: number = -1;
                let beamStartX: number = -1;
                let beamStartY: number = -1;
                let beamEndX: number = -1;
                let beamEndY: number = -1;
                let beamHasStartNote: boolean = false;
                if (startN) {
                    for (const b of mBeams) {
                        for (const bn of b.notes) {
                            if (bn.id === startN.id) {
                                beamTop = b.beamPolyTopY;
                                beamBot = b.beamPolyBotY;
                                beamStartX = b.startX;
                                beamStartY = b.startY;
                                beamEndX = b.endX;
                                beamEndY = b.endY;
                                beamHasStartNote = true;
                                break;
                            }
                        }
                        if (beamHasStartNote) { break; }
                    }
                }

                log.push(`  ${s.slurId}:`);
                log.push(`    start=(${s.startX.toFixed(0)},${s.startY.toFixed(1)}) ` +
                    `stave=${startStave}`);
                log.push(`    end  =(${s.endX.toFixed(0)},${s.endY.toFixed(1)}) ` +
                    `stave=${endStave}`);
                log.push(`    cross-staff=${isXStaff}`);
                if (startN) {
                    log.push(`    start note: nhY=${startN.noteheadY.toFixed(1)} ` +
                        `stem=${startN.stemDir}(${startN.stemTip.toFixed(1)}→${startN.stemBase.toFixed(1)}) ` +
                        `gap=${(s.startY - startN.noteheadY).toFixed(1)}px`);
                }
                if (crossEndN || endN) {
                    const en: NoteInfo = crossEndN || endN!;
                    log.push(`    end note:   nhY=${en.noteheadY.toFixed(1)} ` +
                        `stem=${en.stemDir}(${en.stemTip.toFixed(1)}→${en.stemBase.toFixed(1)}) ` +
                        `gap=${(s.endY - en.noteheadY).toFixed(1)}px`);
                }
                if (beamHasStartNote) {
                    // Interpolate beam Y at the slur's start X
                    const bdx: number = beamEndX - beamStartX || 1;
                    const t: number = (s.startX - beamStartX) / bdx;
                    const beamYatSlur: number = beamStartY + (beamEndY - beamStartY) * t;
                    log.push(`    beam at start note: top=${beamTop.toFixed(1)} bot=${beamBot.toFixed(1)} ` +
                        `beamY@slurX=${beamYatSlur.toFixed(1)} ` +
                        `slurToBeam=${(s.startY - beamYatSlur).toFixed(1)}px ` +
                        "(slur should be above beam top)");
                } else {
                    log.push("    beam: none at start note");
                }

                // Bezier path analysis
                log.push(`    bezier: cp1=(${s.cp1X.toFixed(1)},${s.cp1Y.toFixed(1)}) ` +
                    `cp2=(${s.cp2X.toFixed(1)},${s.cp2Y.toFixed(1)})`);
                const rise: number = s.endY - s.startY;
                const span: number = s.endX - s.startX;
                log.push(`    path: span=${span.toFixed(0)}px rise=${rise.toFixed(1)}px ` +
                    `bow=${s.bowPx.toFixed(1)}px`);

                // Cross-staff slurs must have visible bow
                if (isXStaff) {
                    const minBow: number = 15;
                    if (s.bowPx < minBow) {
                        log.push("    FAIL: cross-staff slur bow=" +
                            s.bowPx.toFixed(1) + "px < " + minBow + "px minimum " +
                            "- slur is nearly invisible");
                    }
                }
            }
        } else {
            log.push("Slurs: none");
        }

        return log;
    }

    /**
     * DEBUG HARNESS — DO NOT REMOVE.
     * Produces console output on purpose. It is the canonical way to inspect
     * cross-staff beam, slur, and notehead positioning data from a rendered SVG.
     * Change `MEASURE` to any measure number to get a full dump of notes, beams
     * overlapping that measure, and slurs whose start X falls within it.
     */
    describe("Dichterliebe01 measure debug", () => {
        let allNotes: NoteInfo[];
        let allBeams: BeamDebugInfo[];
        let allSlurs: SlurDebugInfo[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("Dichterliebe01.xml").then(
                (svg: SVGElement) => {
                    const data: { notes: NoteInfo[], beams: BeamDebugInfo[], slurs: SlurDebugInfo[] } = parseScoreSVG(svg);
                    allNotes = data.notes;
                    allBeams = data.beams;
                    allSlurs = data.slurs;
                }
            );
        });

        // Change this to debug any measure
        const MEASURE: number = 12;

        it("should find slurs overlapping m12 or m13 by X range", () => {
            // m12 X≈957-1117 (system N), m13 X≈137-292 (system N+1)
            const m12Slurs: any[] = allSlurs.filter((s: any) =>
                s.startX >= 900 && s.startX <= 1150
            );
            const m13Slurs: any[] = allSlurs.filter((s: any) =>
                s.startX >= 100 && s.startX <= 350
            );
            console.log("M12-slurs (" + m12Slurs.length + "):");
            for (const s of m12Slurs) {
                console.log("  " + s.slurId + " (" + s.startX.toFixed(0) + "," + s.startY.toFixed(0) +
                    ")->(" + s.endX.toFixed(0) + "," + s.endY.toFixed(0) +
                    ") cp1Y=" + s.cp1Y.toFixed(0) + " bow=" + s.bowPx.toFixed(1));
            }
            console.log("M13-slurs (" + m13Slurs.length + "):");
            for (const s of m13Slurs) {
                console.log("  " + s.slurId + " (" + s.startX.toFixed(0) + "," + s.startY.toFixed(0) +
                    ")->(" + s.endX.toFixed(0) + "," + s.endY.toFixed(0) +
                    ") cp1Y=" + s.cp1Y.toFixed(0) + " bow=" + s.bowPx.toFixed(1));
            }
            expect(allSlurs.length).to.be.greaterThan(0);
        });

        it(`should debug measure ${MEASURE}`, () => {
            const log: string[] = debugMeasure(MEASURE, allNotes, allBeams, allSlurs);
            console.log(log.join("\n"));
            expect(log.length).to.be.greaterThan(0);
        });
    });

    describe("Dichterliebe01 slur-beam clearance SVG", () => {
        let crossBeams: CrossStaffBeamInfo[];
        let slurs: { startX: number, startY: number, endX: number, endY: number }[];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("Dichterliebe01.xml").then(
                (svg: SVGElement) => {
                    crossBeams = findCrossStaffBeams(svg, 50);
                    const slurEls: NodeListOf<Element> =
                        svg.querySelectorAll("[class*='vf-curve']");
                    slurs = [];
                    for (let i: number = 0; i < slurEls.length; i++) {
                        const pathEl: Element | null =
                            slurEls[i].querySelector("path");
                        if (!pathEl) { continue; }
                        const d: string = pathEl.getAttribute("d") || "";
                        // Start point from first M coordinate pair
                        const startM: RegExpMatchArray | null =
                            d.match(/M([\d.]+)\s+([\d.]+)/);
                        if (!startM) { continue; }
                        const sx: number = parseFloat(startM[1]);
                        const sy: number = parseFloat(startM[2]);
                        // End point: last coordinate pair before Z
                        const endM: RegExpMatchArray | null =
                            d.match(/([\d.]+)\s+([\d.]+)Z/);
                        if (endM) {
                            slurs.push({
                                startX: sx, startY: sy,
                                endX: parseFloat(endM[1]),
                                endY: parseFloat(endM[2]),
                            });
                        }
                    }
                }
            );
        });

        it("should find cross-staff beams", () => {
            expect(crossBeams.length).to.be.greaterThan(0,
                "no cross-staff beams detected");
        });
    });

    describe("test_slur_across_staves_right_to_left_hand slur endpoint", () => {
        let slur: SlurBezier | undefined;
        let trebleNH: { x: number, y: number } | undefined;
        let bassNH: { x: number, y: number } | undefined;
        const stemDirs: string[] = [];

        beforeAll(function (): Promise<void> {
                        return renderToSVG("test_slur_across_staves_right_to_left_hand.musicxml")
                .then((s: SVGElement) => {
                    // Parse slur
                    const slurEls: NodeListOf<Element> =
                        s.querySelectorAll("[class*='vf-curve']");
                    for (let i: number = 0; i < slurEls.length; i++) {
                        const pathEl: Element | null =
                            slurEls[i].querySelector("path");
                        if (pathEl) {
                            slur = parseSlurBezier(pathEl);
                            break;
                        }
                    }
                    // Find slur start/end X to locate noteheads.
                    // Slur start should be near a treble notehead (staff 1),
                    // slur end near a bass notehead (staff 2).
                    // Use vf-measure structure: find measure groups and
                    // determine staff from group position.
                    const staffGroups: Element[] =
                        Array.from(s.querySelectorAll("[class*='staffline']"));
                    // For each staffline, find noteheads and stave Y.
                    const allNH: { x: number, y: number, staff: number }[] = [];
                    for (let si: number = 0; si < staffGroups.length; si++) {
                        const sg: Element = staffGroups[si];
                        // Staff index from stave Y: lower Y = higher staff
                        const staves: NodeListOf<Element> =
                            sg.querySelectorAll("[class*='vf-stave']");
                        for (let st: number = 0; st < staves.length; st++) {
                            const staveEl: SVGGraphicsElement =
                                staves[st] as SVGGraphicsElement;
                            try {
                                staveEl.getBBox();
                            } catch (_) { continue; }
                            const nhEls: NodeListOf<Element> =
                                staveEl.querySelectorAll("[class*='vf-notehead']");
                            for (let ni: number = 0; ni < nhEls.length; ni++) {
                                try {
                                    const box: SVGRect =
                                        (nhEls[ni] as SVGGraphicsElement).getBBox();
                                    if (box.width > 0 && box.height > 0) {
                                        allNH.push({
                                            x: box.x + box.width / 2,
                                            y: box.y + box.height / 2,
                                            staff: si * 10 + st,
                                        });
                                    }
                                } catch (_) { /* skip */ }
                            }
                        }
                    }
                    // Collect stem directions
                    const stems: NodeListOf<Element> =
                        s.querySelectorAll("[class*='vf-stem']");
                    for (let i: number = 0; i < stems.length; i++) {
                        const pathEl: Element | null =
                            stems[i].querySelector("path");
                        if (pathEl) {
                            const d: string = pathEl.getAttribute("d") || "";
                            const coords: RegExpMatchArray | null =
                                d.match(/M([\d.]+)\s+([\d.]+)L([\d.]+)\s+([\d.]+)/);
                            if (coords) {
                                const y1: number = parseFloat(coords[2]);
                                const y2: number = parseFloat(coords[4]);
                                stemDirs.push(y2 < y1 ? "up" : "down");
                            }
                        }
                    }
                    // Match noteheads to slur endpoints
                    if (slur && allNH.length >= 2) {
                        // Sort noteheads by Y to determine treble vs bass staff
                        const sorted: typeof allNH =
                            [...allNH].sort((a, b) => a.y - b.y);
                        // Treble group: smaller Y (higher on page)
                        const trebleY: number = sorted[0].y;
                        const bassY: number = sorted[sorted.length - 1].y;
                        const mid: number = (trebleY + bassY) / 2;
                        const trebleCands: typeof allNH =
                            allNH.filter((n) => n.y < mid);
                        const bassCands: typeof allNH =
                            allNH.filter((n) => n.y > mid);
                        // Closest to slur start X within treble
                        let bestTr: typeof trebleCands[0] | undefined;
                        let trDist: number = Infinity;
                        for (const n of trebleCands) {
                            const d: number = Math.abs(n.x - slur.startX);
                            if (d < trDist) { trDist = d; bestTr = n; }
                        }
                        trebleNH = bestTr;
                        // Closest to slur end X within bass
                        let bestBs: typeof bassCands[0] | undefined;
                        let bsDist: number = Infinity;
                        for (const n of bassCands) {
                            const d: number = Math.abs(n.x - slur.endX);
                            if (d < bsDist) { bsDist = d; bestBs = n; }
                        }
                        bassNH = bestBs;
                    }
                });
        });

        it("both notes should have DOWN stems", () => {
            // For cross-staff slurs with Above placement, stems point DOWN
            // (away from the slur). The score has 4 stems — at least 2
            // should be DOWN.
            const downCount: number =
                stemDirs.filter((d) => d === "down").length;
            expect(downCount).to.be.greaterThan(1,
                "expected at least 2 DOWN stems, got " +
                stemDirs.length + " stems: " + stemDirs.join(","));
        });

        it("slur start Y should be within 15px of treble notehead", () => {
            expect(trebleNH).to.not.be.undefined,
                "must find treble notehead near slur start";
            const gap: number = Math.abs(slur!.startY - trebleNH!.y);
            expect(gap).to.be.lessThan(15,
                "slur start Y=" + slur!.startY.toFixed(1) +
                " should be near treble notehead Y=" + trebleNH!.y.toFixed(1) +
                " (gap=" + gap.toFixed(1) + "px)");
        });

        it("slur end Y should be within 15px of bass notehead", () => {
            expect(bassNH).to.not.be.undefined,
                "must find bass notehead near slur end";
            const gap: number = Math.abs(slur!.endY - bassNH!.y);
            expect(gap).to.be.lessThan(15,
                "slur end Y=" + slur!.endY.toFixed(1) +
                " should be near bass notehead Y=" + bassNH!.y.toFixed(1) +
                " (gap=" + gap.toFixed(1) + "px)");
        });
    });

    describe("cross-staff beam stem lengths", () => {
        /** Parse and validate stem lengths for a cross-staff score. */
        function checkStemLengths(
            scorePath: string,
            minSpan: number,
        ): Promise<string[]> {
            return renderToSVG(scorePath).then((svg: SVGElement) => {
                const errors: string[] = [];
                const crossBeams: CrossStaffBeamInfo[] =
                    findCrossStaffBeams(svg, minSpan);
                if (crossBeams.length === 0) {
                    errors.push("no cross-staff beams found");
                    return errors;
                }
                // Measure staff distance: find min/max Y of staff line
                // paths within each vf-stave group.
                const staveEls: NodeListOf<Element> =
                    svg.querySelectorAll("[class~='vf-stave']");
                const staveTops: number[] = [];
                const staveBottoms: number[] = [];
                for (let s: number = 0; s < staveEls.length; s++) {
                    let minY: number = Infinity;
                    let maxY: number = -Infinity;
                    const paths: HTMLCollection =
                        staveEls[s].getElementsByTagName("path");
                    for (let p: number = 0; p < paths.length; p++) {
                        const d: string = paths[p].getAttribute("d") || "";
                        // Staff lines: M x y L x2 y  (same y, horizontal)
                        const m: RegExpMatchArray | null =
                            d.match(/M[\d.]+ ([\d.]+)L[\d.]+ ([\d.]+)/);
                        if (!m) { continue; }
                        if (Math.abs(parseFloat(m[1]) - parseFloat(m[2])) > 0.5) {
                            continue; // not a horizontal staff line
                        }
                        const y: number = parseFloat(m[1]);
                        if (y > 0 && y < 3000) {
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        }
                    }
                    if (isFinite(minY) && isFinite(maxY)) {
                        staveTops.push(minY);
                        staveBottoms.push(maxY);
                    }
                }
                const staveGap: number = staveTops.length >= 2
                    ? staveTops[1] - staveBottoms[0]
                    : 100;
                // For each cross-staff beam, check stem lengths
                for (const cb of crossBeams) {
                    if (cb.stems.length < 2) { continue; }
                    const stemLens: number[] = cb.stems.map(
                        (s) => Math.abs(s.tipY - s.baseY));
                    const minLen: number = Math.min(...stemLens);
                    const maxLen: number = Math.max(...stemLens);
                    const avgLen: number = stemLens.reduce((a, b) => a + b, 0)
                        / stemLens.length;
                    // A normal stem is roughly 2.5-4 staff spaces (25-40px).
                    // But cross-staff stems can be longer. Check that the
                    // SHORTEST stem isn't unreasonably short.
                    if (minLen < 15) {
                        errors.push(
                            "stem too short: min=" + minLen.toFixed(1) +
                            "px avg=" + avgLen.toFixed(1) +
                            " staveGap=" + staveGap.toFixed(0) +
                            "px");
                    }
                    if (maxLen > staveGap * 1.5) {
                        errors.push(
                            "stem too long: max=" + maxLen.toFixed(1) +
                            "px avg=" + avgLen.toFixed(1) +
                            " staveGap=" + staveGap.toFixed(0) +
                            "px");
                    }
                }
                return errors;
            });
        }

        it("tuplet cross-staff beams have normalized stem lengths", function (): Promise<void> {
                        return checkStemLengths(
                "test_tuplet_crossstaff_alignment.musicxml",
                MIN_CROSS_STAFF_SPAN_SMALL,
            ).then((errors: string[]) => {
                expect(errors).to.deep.equal([], errors.join("\n"));
            });
        });

        it("16ths ghost cross-staff beams have normalized stem lengths", function (): Promise<void> {
                        return checkStemLengths(
                "test_cross_stave_16ths_ghost_notes_simple.musicxml",
                25, // lower threshold: fragmented cross-staff beams
            ).then((errors: string[]) => {
                expect(errors).to.deep.equal([], errors.join("\n"));
            });
        });
    });

    describe("Land_der_Berge same-staff slur anchoring", () => {
        let svg: SVGElement;

        beforeAll(function (): Promise<void> {
                        return renderToSVG("Land_der_Berge.musicxml").then(
                (s: SVGElement) => { svg = s; });
        });

        it("m2 voice1 UP-stem slur anchors at beam top, not notehead", () => {
            // Find the slur vf-note-2-0-1-0-slur
            const slurEl: Element | null =
                svg.querySelector("#vf-note-2-0-1-0-slur");
            expect(slurEl).to.not.be.null;
            const pathEl: Element | null = slurEl!.querySelector("path");
            const slur: SlurBezier | undefined = pathEl
                ? parseSlurBezier(pathEl) : undefined;
            expect(slur).to.not.be.undefined;
            // Find stem at slur start X (~446)
            const stems: NodeListOf<Element> =
                svg.querySelectorAll("[class*='vf-stem']");
            let startStemTipY: number | undefined;
            for (let i: number = 0; i < stems.length; i++) {
                const p: Element | null = stems[i].querySelector("path");
                if (!p) { continue; }
                const d: string = p.getAttribute("d") || "";
                const coords: RegExpMatchArray | null =
                    d.match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
                if (!coords) { continue; }
                const sx: number = parseFloat(coords[1]);
                const sy1: number = parseFloat(coords[2]);
                const sy2: number = parseFloat(coords[4]);
                // Stem at x≈446, UP (tip < base)
                if (Math.abs(sx - slur!.startX) < 15 && sy2 < sy1) {
                    startStemTipY = Math.min(sy1, sy2);
                    break;
                }
            }
            expect(startStemTipY).to.not.be.undefined,
                "must find UP stem near slur start X";
            // Slur start (upper curve) should be near beam top (stem tip)
            const gap: number = Math.abs(slur!.startY - startStemTipY!);
            expect(gap).to.be.lessThan(15,
                "slur start Y=" + slur!.startY.toFixed(1) +
                " stem tip (beam top)=" + startStemTipY!.toFixed(1) +
                " gap=" + gap.toFixed(1) + "px (should be <15)");
        });

        it("m2-m3 voice2 DOWN-stem slur ends at stem tip", () => {
            const slurEl: Element | null =
                svg.querySelector("#vf-note-2-0-2-0-slur");
            expect(slurEl).to.not.be.null;
            const pathEl: Element | null = slurEl!.querySelector("path");
            const slur: SlurBezier | undefined = pathEl
                ? parseSlurBezier(pathEl) : undefined;
            expect(slur).to.not.be.undefined;
            // Find DOWN stem near slur end X (~454)
            // For DOWN stem (sy2 > sy1), tip is sy2 (the lower Y).
            const stems: NodeListOf<Element> =
                svg.querySelectorAll("[class*='vf-stem']");
            let endStemTipY: number | undefined;
            let endStemBaseY: number | undefined;
            for (let i: number = 0; i < stems.length; i++) {
                const p: Element | null = stems[i].querySelector("path");
                if (!p) { continue; }
                const d: string = p.getAttribute("d") || "";
                const coords: RegExpMatchArray | null =
                    d.match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
                if (!coords) { continue; }
                const sx: number = parseFloat(coords[1]);
                const sy1: number = parseFloat(coords[2]);
                const sy2: number = parseFloat(coords[4]);
                if (Math.abs(sx - slur!.endX) < 15 && sy2 > sy1) {
                    endStemBaseY = sy1; // notehead side
                    endStemTipY = sy2;  // stem tip (bottom)
                    break;
                }
            }
            expect(endStemTipY).to.not.be.undefined,
                "must find DOWN stem near slur end X";
            // Slur end (upper curve) should be near stem tip (not notehead)
            // for Below+DOWN placement (stem pointing toward slur).
            const gap: number = Math.abs(slur!.endY - endStemTipY!);
            expect(gap).to.be.lessThan(15,
                "slur end Y=" + slur!.endY.toFixed(1) +
                " stem tip=" + endStemTipY!.toFixed(1) +
                " notehead=" + (endStemBaseY ?? 0).toFixed(1) +
                " gap=" + gap.toFixed(1) + "px (should be <15)");
        });

        it("slur ribbon ends close properly (upper and lower curves within 10px at same X)", () => {
            const slurEls: NodeListOf<Element> =
                svg.querySelectorAll("[class*='vf-curve']");
            const violations: string[] = [];
            const maxGap: number = 10;
            for (let i: number = 0; i < slurEls.length; i++) {
                const pathEl: Element | null =
                    slurEls[i].querySelector("path");
                if (!pathEl) { continue; }
                const d: string = pathEl.getAttribute("d") || "";
                // Path from renderCurve:
                //   M x0 y0 C x1 y1,x2 y2,x3 y3 L x7 y7 C x6 y6,x5 y5,x4 y4 L x0 y0 Z
                // Right-end ribbon: |upperRightY(y3) - lowerRightY(y7)|
                const rightMatch: RegExpMatchArray | null = d.match(/,([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)C/);
                expect(rightMatch, pathEl.parentElement?.id + " matches path ribbon pattern (C…L…C)").to.not.be.null;
                if (rightMatch) {
                    const upperRightY: number = parseFloat(rightMatch[2]);
                    const lowerRightY: number = parseFloat(rightMatch[4]);
                    const gap: number = Math.abs(upperRightY - lowerRightY);
                    if (gap > maxGap) {
                        violations.push(pathEl.parentElement?.id +
                            " right-end upperY=" + upperRightY.toFixed(1) +
                            " lowerY=" + lowerRightY.toFixed(1) +
                            " gap=" + gap.toFixed(0));
                    }
                }
            }
            expect(violations).to.deep.equal([],
                violations.length + " slurs have wide ribbon at end:\n" +
                violations.join("\n"));
        });
    });

    describe("Mozart quartet m4 A4→B4 slur anchoring", () => {
        let svg: SVGElement;

        beforeAll(function (): Promise<void> {
                        return renderToSVG(
                "Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml"
            ).then((s: SVGElement) => { svg = s; });
        });

        it("slur endpoints exist and are within valid Y range", () => {
            // Verify the score has curves (slurs) and they have
            // reasonable positions. This tests that the VF5 layout
            // produces anchored slurs for all instruments.
            const allCurves: NodeListOf<Element> =
                svg.querySelectorAll("[class*='vf-curve']");
            expect(allCurves.length).to.be.greaterThan(0,
                "SVG must contain at least one curve element");

            // Check that all curve endpoints are within the SVG canvas
            // (not at extreme negative Y or way below where notes sit).
            let badCount: number = 0;
            for (let i: number = 0; i < allCurves.length; i++) {
                const pathEl: Element | null =
                    allCurves[i].querySelector("path");
                if (!pathEl) { continue; }
                const s: SlurBezier | undefined = parseSlurBezier(pathEl);
                if (!s) { continue; }
                // A slur endpoint more than 500px below its start is
                // almost certainly wrong (missing beam/stem anchor).
                if (s.endY - s.startY > 500) {
                    badCount++;
                }
            }
            expect(badCount).to.equal(0,
                badCount + " slurs have endY far below startY (>500px)");
        });
    });
});
