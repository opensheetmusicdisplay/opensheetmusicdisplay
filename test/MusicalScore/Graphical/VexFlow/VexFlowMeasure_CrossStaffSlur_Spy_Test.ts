import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import * as VF from "vexflow";

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

describe("Cross-Staff Slur Spy Tests", () => {
    describe("Dichterliebe m12-13 voice 3 cross-staff slur data", () => {
        it("dump noteheads and bezier for the m12-13 slur", () => {
            const result: { gms: GraphicalMusicSheet } = loadScore("Dichterliebe01.xml");
            const gms: GraphicalMusicSheet = result.gms;

            const m12Bass: VexFlowMeasure = gms.MeasureList[11][2] as VexFlowMeasure;
            const m12Treble: VexFlowMeasure = gms.MeasureList[11][1] as VexFlowMeasure;
            const m13Bass: VexFlowMeasure = gms.MeasureList[12][2] as VexFlowMeasure;
            const m13Treble: VexFlowMeasure = gms.MeasureList[12][1] as VexFlowMeasure;

            m12Treble.setAbsoluteCoordinates(0, 100);
            m12Bass.setAbsoluteCoordinates(0, 250);
            m13Treble.setAbsoluteCoordinates(0, 100);
            m13Bass.setAbsoluteCoordinates(0, 250);

            (m12Bass as any).positionCrossStaffBeams();
            (m12Treble as any).positionCrossStaffBeams();
            (m13Bass as any).positionCrossStaffBeams();
            (m13Treble as any).positionCrossStaffBeams();

            // Get voice 3 noteheads from the BEAMs (deduplicated by X)
            const seen: Set<string> = new Set();
            const noteheads: { x: number, y: number, stY0: number, line: number }[] = [];
            const addNoteheads: (beam: any) => void = (beam: any): void => {
                for (const note of (beam as any).getNotes()) {
                    const ns: any = note.checkStave?.() || note.stave;
                    if (!ns) { continue; }
                    const stY0: number = ns.getYForLine(0);
                    const sx: number = note.getStemX?.() ?? 0;
                    for (const kp of note.getKeyProps?.() || []) {
                        const yPx: number = ns.getYForNote(kp.line);
                        const key: string = sx.toFixed(0) + "," + yPx.toFixed(1);
                        if (!seen.has(key)) {
                            seen.add(key);
                            noteheads.push({ x: sx, y: yPx, stY0, line: kp.line });
                        }
                    }
                }
            };

            // Beams from crossStaffBeamSiblings on m12 and m13 bass
            const m12Sib: Map<VF.Beam, VexFlowMeasure> = (m12Bass as any).crossStaffBeamSiblings;
            const m13Sib: Map<VF.Beam, VexFlowMeasure> = (m13Bass as any).crossStaffBeamSiblings;
            if (m12Sib) { for (const [b] of m12Sib) { addNoteheads(b); } }
            if (m13Sib) { for (const [b] of m13Sib) { addNoteheads(b); } }
            expect(noteheads.length).to.be.greaterThan(0);

            // Get staff-absolute X offset so notehead X aligns with SVG slur X
            const pages: any[] = gms.MusicPages;
            let staffAbsX: number = 0;
            for (const page of pages) {
                for (const sys of page.MusicSystems) {
                    for (const col of sys.GraphicalMeasures) {
                        if (col.indexOf(m12Bass) >= 0) {
                            staffAbsX = sys.StaffLines[2]
                                .PositionAndShape.AbsolutePosition.x * 10;
                        }
                    }
                }
            }

            noteheads.sort((a, b) => a.x - b.x);
            const bass: typeof noteheads = noteheads.filter((n) => n.stY0 > 200);
            const treble: typeof noteheads = noteheads.filter((n) => n.stY0 < 200);
            const minY: number = Math.min(...noteheads.map((n) => n.y));
            const maxY: number = Math.max(...noteheads.map((n) => n.y));

            console.log("=== m12-13 voice3 cross-staff beam noteheads ===");
            console.log("count=" + noteheads.length +
                " bass=" + bass.length + " treble=" + treble.length +
                " yRange=[" + minY.toFixed(1) + "," + maxY.toFixed(1) + "]");
            for (const n of noteheads) {
                const absX: number = n.x + staffAbsX;
                console.log("  (x=" + n.x.toFixed(0).padStart(4) +
                    " absX=" + absX.toFixed(0).padStart(4) +
                    ", y=" + n.y.toFixed(1).padStart(7) +
                    ", stY0=" + n.stY0 +
                    ", line=" + n.line.toFixed(1).padStart(5) + ")");
            }

            // Slur bezier from SVG (known reference)
            console.log("=== m12 voice3 slur bezier (from SVG) ===");
            console.log("  M(480.3, 1231.4)");
            console.log("  C1(539.0, 1174.0)");
            console.log("  C2(656.6, 1136.5)");
            console.log("  E(715.3, 1156.5)");
            console.log("  top notehead: (x=632, y=1151.5)");
        });
    });
});
