import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffLine } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffLine";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";

function loadScore(path: string): { gms: GraphicalMusicSheet, calc: VexFlowMusicSheetCalculator } {
    const score: Document = TestUtils.getScore(path);
    const partwise: Element = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();
    return { gms, calc };
}

/** Set abs coordinates and position cross-staff beams for all measures. */
function prepareMeasures(gms: GraphicalMusicSheet): void {
    const pages: any[] = gms.MusicPages;
    for (const page of pages) {
        for (const sys of page.MusicSystems) {
            for (const col of sys.GraphicalMeasures) {
                for (const m of col) {
                    if ((m as VexFlowMeasure).setAbsoluteCoordinates) {
                        (m as VexFlowMeasure).setAbsoluteCoordinates(
                            m.PositionAndShape.AbsolutePosition.x * 10,
                            m.PositionAndShape.AbsolutePosition.y * 10,
                        );
                    }
                }
            }
            // Position beams per staff line
            for (const sl of sys.StaffLines) {
                for (const m of sl.Measures) {
                    try { (m as any).positionCrossStaffBeams?.(); } catch (_) { /* skip */ }
                }
            }
        }
    }
}

/** Run draw-time adjustments on a graphical slur to get final CPs. */
function applyDrawTimeAdjustments(slur: GraphicalSlur, rules: any): void {
    if (slur.slur.isCrossed()) {
        slur.calculateCurveCrossStaff(rules);
    } else {
        slur.clampToVoiceSkyline(rules);
        slur.adjustForVisualCrossStaff(rules);
    }
}

interface SlurCpInfo {
    slur: GraphicalSlur;
    measure: number;
    stave: number;
    isCrossed: boolean;
    startPt: { x: number, y: number };
    cp1: { x: number, y: number };
    cp2: { x: number, y: number };
    endPt: { x: number, y: number };
    bow: number;
    obstacleCount: number;
}

function collectCrossStaffSlurs(gms: GraphicalMusicSheet, calc: VexFlowMusicSheetCalculator): SlurCpInfo[] {
    const result: SlurCpInfo[] = [];
    const pages: any[] = gms.MusicPages;
    for (const page of pages) {
        for (const sys of page.MusicSystems) {
            for (const sl of sys.StaffLines) {
                const vfSl: VexFlowStaffLine = sl as VexFlowStaffLine;
                for (const slur of vfSl.GraphicalSlurs) {
                    if (!slur.bezierStartPt) { continue; }
                    // Determine if visually cross-staff (different VF5 staves)
                    const startNote: any = calc.rules.GNote(slur.slur.StartNote);
                    const endNote: any = calc.rules.GNote(slur.slur.EndNote);
                    const sv: any = (startNote as any)?.vfnote?.[0];
                    const ev: any = (endNote as any)?.vfnote?.[0];
                    const sStave: any = sv?.checkStave?.() || sv?.stave;
                    const eStave: any = ev?.checkStave?.() || ev?.stave;
                    const visCross: boolean = !!(sStave && eStave && sStave !== eStave);
                    // Skip slurs that are neither source-crossed nor visual-cross-staff
                    if (!slur.slur.isCrossed() && !visCross) { continue; }

                    applyDrawTimeAdjustments(slur, calc.rules);

                    const sy: number = slur.bezierStartPt.y;
                    const ey: number = slur.bezierEndPt.y;
                    const chordTop: number = Math.min(sy, ey);
                    const bow: number = chordTop - slur.bezierStartControlPt.y;

                    const firstSE: any = slur.staffEntries?.[0];
                    const meas: any = firstSE?.parentMeasure;
                    const mn: number = meas?.MeasureNumber ?? meas?.ImplicitMeasureNumber ?? -1;
                    const parSl2: any = meas?.ParentStaffLine;
                    const si: number = parSl2?.ParentMusicSystem?.StaffLines?.indexOf(parSl2) ?? -1;

                    result.push({
                        slur,
                        measure: mn,
                        stave: si,
                        isCrossed: slur.slur.isCrossed(),
                        startPt: { x: slur.bezierStartPt.x, y: sy },
                        cp1: { x: slur.bezierStartControlPt.x, y: slur.bezierStartControlPt.y },
                        cp2: { x: slur.bezierEndControlPt.x, y: slur.bezierEndControlPt.y },
                        endPt: { x: slur.bezierEndPt.x, y: ey },
                        bow,
                        obstacleCount: slur.debugSkyPoints?.length ?? 0,
                    });
                }
            }
        }
    }
    return result;
}

describe("Cross-Staff Slur Spy Tests", () => {
    describe("Dichterliebe01 cross-staff slurs — jsdom draw-time CPs", () => {
        let slurs: SlurCpInfo[];

        beforeAll(() => {
            const { gms, calc } = loadScore("Dichterliebe01.xml");
            prepareMeasures(gms);
            slurs = collectCrossStaffSlurs(gms, calc);
        });

        it("finds cross-staff slurs", () => {
            expect(slurs.length).to.be.greaterThan(0,
                `expected ≥1 cross-staff slur, got ${slurs.length}`);
        });

        it("all cross-staff slurs have positive upward bow (CP above chord)", () => {
            const failures: string[] = [];
            for (const s of slurs) {
                if (s.bow < -2) {
                    failures.push(
                        `M${s.measure}.S${s.stave} bow=${s.bow.toFixed(1)}`);
                }
            }
            expect(failures).to.deep.equal([],
                `${failures.length} slurs with negative bow:\n` + failures.join("\n"));
        });

        it("cross-staff slurs collect obstacles", () => {
            const noObs: SlurCpInfo[] = slurs.filter(s => s.obstacleCount === 0);
            // Most cross-staff slurs should have obstacles from both staves.
            // Allow some to have 0 (e.g. short slurs with few noteheads).
            expect(noObs.length).to.be.lessThan(slurs.length,
                `${noObs.length}/${slurs.length} slurs have zero obstacles`);
        });

        it("CP height does not exceed highest obstacle Y in debug points", () => {
            const failures: string[] = [];
            for (const s of slurs) {
                const obs: any[] = s.slur.debugSkyPoints ?? [];
                if (obs.length === 0) { continue; }
                const minObsY: number = Math.min(...obs.map((p: any) => p.y));
                if (s.cp1.y < minObsY - 20) {
                    failures.push(
                        `M${s.measure}.S${s.stave} cp1.y=${s.cp1.y.toFixed(1)} ` +
                        `minObsY=${minObsY.toFixed(1)}`);
                }
            }
            expect(failures).to.deep.equal([],
                `${failures.length} slurs with CP above max obstacle:\n` +
                failures.join("\n"));
        });

        it("reports CP summary", () => {
            console.warn("\n=== Cross-staff slur CP summary ===");
            for (const s of slurs) {
                const tag: string = s.isCrossed ? "isCrossed" : "visCross";
                console.warn(
                    `  M${s.measure}.S${s.stave} ${tag}` +
                    ` startY=${s.startPt.y.toFixed(1)}` +
                    ` cp1y=${s.cp1.y.toFixed(1)}` +
                    ` cp2y=${s.cp2.y.toFixed(1)}` +
                    ` endY=${s.endPt.y.toFixed(1)}` +
                    ` bow=${s.bow.toFixed(1)}` +
                    ` obs=${s.obstacleCount}`);
            }
        });

        it("M12 and M21 cross-staff slurs have bow > 0", () => {
            const m12: SlurCpInfo[] = slurs.filter(s => s.measure === 12);
            const m21: SlurCpInfo[] = slurs.filter(s => s.measure === 21);
            for (const s of [...m12, ...m21]) {
                expect(s.bow).to.be.greaterThan(0,
                    `M${s.measure}.S${s.stave} bow=${s.bow.toFixed(1)}`);
            }
        });

        it("M4 and M5 cross-staff slurs have CP not too high", () => {
            const m4: SlurCpInfo[] = slurs.filter(s => s.measure === 4);
            const m5: SlurCpInfo[] = slurs.filter(s => s.measure === 5);
            const ref: SlurCpInfo[] = slurs.filter(s => s.measure === 14);
            if (ref.length === 0) { return; }
            const maxRefBow: number = Math.max(...ref.map(s => s.bow));
            for (const s of [...m4, ...m5]) {
                if (s.bow > maxRefBow * 3) {
                    expect(s.bow).to.be.lessThanOrEqual(maxRefBow * 3,
                        `M${s.measure}.S${s.stave} bow=${s.bow.toFixed(1)} ` +
                        `> 3× ref(${maxRefBow.toFixed(1)})`);
                }
            }
        });
    });
});
