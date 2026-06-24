import { expect } from "chai";
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

        before(function (): Promise<void> {
            this.timeout(20000);
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

        before(function (): Promise<void> {
            this.timeout(20000);
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

        before(function (): Promise<void> {
            this.timeout(20000);
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

    /** Evaluate cubic bezier Y at parameter t (0..1). */
    function evalBezierY(t: number, startY: number, cp1Y: number, cp2Y: number, endY: number): number {
        const mt: number = 1 - t;
        return mt * mt * mt * startY + 3 * mt * mt * t * cp1Y +
               3 * mt * t * t * cp2Y + t * t * t * endY;
    }

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

    describe("Dichterliebe01 voice-skyline slur clearance", () => {
        let svg: SVGElement;
        let slurs: SlurBezier[];
        let crossBeams: CrossStaffBeamInfo[];

        before(function (): Promise<void> {
            this.timeout(20000);
            return renderToSVG("Dichterliebe01.xml").then((s: SVGElement) => {
                svg = s;
                crossBeams = findCrossStaffBeams(svg, 50);
                // Parse all slurs from the SVG
                const slurEls: NodeListOf<Element> =
                    svg.querySelectorAll("[class*='vf-curve']");
                slurs = [];
                for (let i: number = 0; i < slurEls.length; i++) {
                    const pathEl: Element | null =
                        slurEls[i].querySelector("path");
                    if (pathEl) {
                        const sb: SlurBezier | undefined =
                            parseSlurBezier(pathEl);
                        if (sb) { slurs.push(sb); }
                    }
                }
            });
        });

        it("cross-staff beam noteheads must be cleared by any overlapping slur", () => {
            const margin: number = 3;
            const violations: string[] = [];
            // Collect all cross-staff-beam noteheads with their X,Y
            const beamNoteheads: { x: number, y: number, beamX: number }[] = [];
            for (const cb of crossBeams) {
                if (!isCrossStaffBeam(cb, 80)) { continue; }
                const bx: number = cb.stems[0]?.x ?? 0;
                for (const nh of cb.noteheads) {
                    beamNoteheads.push({ x: nh.x, y: nh.centerY, beamX: bx });
                }
            }
            if (beamNoteheads.length === 0) { return; }

            for (const nh of beamNoteheads) {
                // Find any slur whose X range covers this notehead
                let covered: boolean = false;
                for (const slur of slurs) {
                    if (nh.x < slur.startX - 10 || nh.x > slur.endX + 10) {
                        continue;
                    }
                    // Also check: slur and notehead must be on similar Y scale
                    // (same staff area) — skip vocal staff slurs for bass notes
                    const slurMidY: number = (Math.min(slur.startY, slur.cp1Y,
                        slur.cp2Y, slur.endY) + Math.max(slur.startY, slur.cp1Y,
                        slur.cp2Y, slur.endY)) / 2;
                    if (Math.abs(slurMidY - nh.y) > 200) { continue; }

                    covered = true;
                    const t: number = Math.max(0, Math.min(1,
                        (nh.x - slur.startX) / (slur.endX - slur.startX || 1)));
                    const curveY: number = evalBezierY(
                        t, slur.startY, slur.cp1Y, slur.cp2Y, slur.endY);
                    if (curveY > nh.y - margin) {
                        violations.push(
                            "beam@" + nh.beamX.toFixed(0) +
                            " nh@(x=" + nh.x.toFixed(0) + ",y=" + nh.y.toFixed(0) + ")" +
                            " slur=\"" + slur.id + "\"" +
                            " curveY=" + curveY.toFixed(1) +
                            " vs target=" + (nh.y - margin).toFixed(1) +
                            " (off by " + (curveY - nh.y + margin).toFixed(1) + ")");
                    }
                    break; // first matching slur is the closest one
                }
                if (!covered) {
                    violations.push("beam@" + nh.beamX.toFixed(0) +
                        " nh@(x=" + nh.x.toFixed(0) + ",y=" + nh.y.toFixed(0) + ")" +
                        " has no overlapping slur");
                }
            }

            expect(violations).to.deep.equal([],
                violations.length + " noteheads not cleared:\n" +
                violations.join("\n"));
        });
    });

    /**
     * Returns true if the beam appears to span two distinct staves (cross-staff),
     * rather than just having a wide melodic range on a single staff.
     * Cross-staff beams have notehead Ys in two clusters with a gap between them.
     */
    function isCrossStaffBeam(cb: CrossStaffBeamInfo, staveGapThreshold: number): boolean {
        if (cb.noteheads.length < 2) { return false; }
        const ys: number[] = cb.noteheads.map((nh) => nh.centerY).sort((a, b) => a - b);
        // Find the largest gap between consecutive sorted Y values
        let maxGap: number = 0;
        for (let i: number = 1; i < ys.length; i++) {
            const g: number = ys[i] - ys[i - 1];
            if (g > maxGap) { maxGap = g; }
        }
        // True cross-staff: gap between staves is larger than within-stave spread
        return maxGap >= staveGapThreshold;
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

        before(function (): Promise<void> {
            this.timeout(20000);
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

        before(function (): Promise<void> {
            this.timeout(20000);
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

        it("slurs above UP-stem cross-staff beams must clear beam top", () => {
            let violations: number = 0;
            const details: string[] = [];
            for (const cb of crossBeams) {
                // Only check actual cross-staff beams (notes on two different staves)
                if (!isCrossStaffBeam(cb, 80)) { continue; }
                const upCount: number =
                    cb.stems.filter((s) => s.direction === "up").length;
                if (upCount <= cb.stems.length / 2) { continue; }

                // Beam top Y from beam polygon edges
                let beamTopY: number = Infinity;
                for (const bl of cb.beamLines) {
                    beamTopY = Math.min(beamTopY, bl.startY, bl.endY);
                }
                if (!isFinite(beamTopY)) {
                    for (const s of cb.stems) {
                        beamTopY = Math.min(beamTopY, s.tipY);
                    }
                }

                // Match slurs to notes in the beam by X position.
                // A slur linked to a beamed note will start at that note's X (± small offset).
                for (let ni: number = 0; ni < cb.stems.length; ni++) {
                    const noteX: number = cb.stems[ni].x;
                    // Find the nearest slur start within 25px of this note's X
                    for (const slur of slurs) {
                        if (Math.abs(slur.startX - noteX) > 25) { continue; }
                        // Slur must be on the correct staff — its Y should be within
                        // reasonable range of the beam (not on an unrelated staff).
                        if (Math.abs(slur.startY - beamTopY) > 300) { continue; }
                        const gap: number = slur.startY - beamTopY;
                        if (gap > -2) {
                            violations++;
                            details.push(
                                "stem[" + ni + "] x=" + noteX.toFixed(0) +
                                " slur=(" + slur.startX.toFixed(0) + "," +
                                slur.startY.toFixed(0) + ") beam_top=" +
                                beamTopY.toFixed(0) + " gap=" + gap.toFixed(1)
                            );
                        }
                        break; // one slur per note
                    }
                }
            }
            expect(violations).to.equal(0,
                violations + " slurs not above UP-stem beam top:\n" +
                details.join("\n"));
        });
    });
});
