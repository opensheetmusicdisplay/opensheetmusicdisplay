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
