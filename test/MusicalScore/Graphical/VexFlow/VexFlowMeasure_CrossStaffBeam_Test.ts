import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
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

describe("VexFlow Measure - Cross-Staff Beams", () => {

    describe("Tuplet cross-staff beams (test_tuplet_crossstaff_alignment)", () => {
        let bassMeasure: VexFlowMeasure;
        let trebleMeasure: VexFlowMeasure;
        let beams: VF.Beam[];
        let siblingMap: Map<VF.Beam, VexFlowMeasure>;

        before(() => {
            const { gms } = loadScore("test_tuplet_crossstaff_alignment.musicxml");
            expect(gms.MeasureList.length).to.be.greaterThan(0);
            expect(gms.MeasureList[0].length).to.equal(2, "should have 2 staves");
            trebleMeasure = gms.MeasureList[0][0] as VexFlowMeasure;
            bassMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
            beams = (bassMeasure as any).autoTupletVfBeams;
            siblingMap = (bassMeasure as any).crossStaffBeamSiblings;
        });

        it("bass measure should have cross-staff tuplet beams", () => {
            expect(beams).to.not.be.undefined;
            expect(beams.length).to.equal(2, "2 triplets = 2 beams");
        });

        it("each beam should have 3 notes (2 local + 1 cross-staff)", () => {
            for (let i: number = 0; i < beams.length; i++) {
                const notes: VF.Note[] = beams[i].getNotes();
                expect(notes.length).to.equal(3, `beam[${i}] should have 3 notes`);
            }
        });

        it("crossStaffBeamSiblings should map each beam to treble measure", () => {
            expect(siblingMap).to.not.be.undefined;
            expect(siblingMap.size).to.equal(2, "2 cross-staff beams");
            for (const [beam, sibling] of siblingMap) {
                expect(beams).to.include(beam);
                expect(sibling).to.equal(trebleMeasure);
            }
        });

        it("local bass notes should have consistent stem direction", () => {
            for (const beam of beams) {
                const notes: VF.Note[] = beam.getNotes();
                const firstDir: number = (notes[0] as any).stemDirection;
                for (let i: number = 1; i < 2; i++) {
                    const dir: number = (notes[i] as any).stemDirection;
                    expect(dir).to.equal(firstDir,
                        `beam note[${i}] should match note[0] stem direction`);
                }
            }
        });

        it("cross-staff treble note should have stem direction set", () => {
            for (const beam of beams) {
                const notes: VF.Note[] = beam.getNotes();
                const dir: number = (notes[2] as any).stemDirection;
                expect(dir).to.be.oneOf([VF.Stem.UP, VF.Stem.DOWN],
                    "cross-staff note must have explicit stem direction");
            }
        });

        it("beam note references should point to real StaveNote objects (not ghost notes)", () => {
            for (const beam of beams) {
                for (const note of beam.getNotes()) {
                    expect(note.getCategory()).to.not.equal("ghostnotes",
                        "beam should not contain ghost notes");
                }
            }
        });

        it("all beamed notes should have beam reference set", () => {
            for (const beam of beams) {
                for (const note of beam.getNotes()) {
                    expect((note as any).beam).to.equal(beam,
                        "note.beam should reference its containing beam");
                }
            }
        });

        it("tuplet bracket should be suppressed for cross-staff tuplets", () => {
            const vftuplets: { [voiceID: number]: VF.Tuplet[] } = (bassMeasure as any).vftuplets;
            for (const voiceID in vftuplets) {
                if (!vftuplets.hasOwnProperty(voiceID)) { continue; }
                for (const tuplet of vftuplets[voiceID]) {
                    expect((tuplet as any).options.bracketed).to.equal(false,
                        "cross-staff tuplet bracket should be hidden");
                }
            }
        });

        it("treble measure should NOT have cross-staff beams (minority staff)", () => {
            const trebleSiblings: Map<VF.Beam, VexFlowMeasure> = (trebleMeasure as any).crossStaffBeamSiblings;
            expect(trebleSiblings.size).to.equal(0,
                "minority staff should not create cross-staff beams");
        });
    });

    describe("Dichterliebe01 cross-staff beams", () => {
        let gms: GraphicalMusicSheet;

        before(() => {
            const result: { gms: GraphicalMusicSheet } = loadScore("Dichterliebe01.xml");
            gms = result.gms;
        });

        it("bass measures with voice 3 should have cross-staff beam entries", () => {
            let crossStaffCount: number = 0;
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (siblingMap && siblingMap.size > 0) {
                    crossStaffCount += siblingMap.size;
                }
            }
            expect(crossStaffCount).to.be.greaterThan(20,
                "Dichterliebe should have many cross-staff beam groups");
        });

        it("cross-staff beam notes should have correct stem directions", () => {
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (!siblingMap || siblingMap.size === 0) { continue; }
                for (const [beam] of siblingMap) {
                    for (const note of beam.getNotes()) {
                        const dir: number = (note as any).stemDirection;
                        expect(dir).to.be.oneOf([VF.Stem.UP, VF.Stem.DOWN],
                            "stem direction must be explicitly set");
                    }
                }
            }
        });

        it("cross-staff beams should have 4 notes (typical Dichterliebe arpeggio pattern)", () => {
            let found4NoteBeam: boolean = false;
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (!siblingMap) { continue; }
                for (const [beam] of siblingMap) {
                    if (beam.getNotes().length === 4) {
                        found4NoteBeam = true;
                        break;
                    }
                }
                if (found4NoteBeam) { break; }
            }
            expect(found4NoteBeam).to.be.true;
        });
    });

    describe("positionCrossStaffBeams draw-time positioning", () => {
        let bassMeasure: VexFlowMeasure;
        let trebleMeasure: VexFlowMeasure;

        before(() => {
            const { gms } = loadScore("test_tuplet_crossstaff_alignment.musicxml");
            trebleMeasure = gms.MeasureList[0][0] as VexFlowMeasure;
            bassMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
        });

        it("after setAbsoluteCoordinates, beam flatBeamOffset should be between staves", () => {
            // Simulate draw-time positioning
            trebleMeasure.setAbsoluteCoordinates(0, 100);
            bassMeasure.setAbsoluteCoordinates(0, 250);
            (bassMeasure as any).positionCrossStaffBeams();

            const trebleBottom: number = trebleMeasure.getVFStave().getYForLine(4);
            const bassTop: number = bassMeasure.getVFStave().getYForLine(0);
            const beams: VF.Beam[] = (bassMeasure as any).autoTupletVfBeams;

            for (const beam of beams) {
                const offset: number = (beam as any).renderOptions.flatBeamOffset;
                expect(offset).to.be.greaterThan(trebleBottom,
                    "beam Y should be below treble stave bottom");
                expect(offset).to.be.lessThan(bassTop,
                    "beam Y should be above bass stave top");
            }
        });

        it("after positioning, cross-staff note staves should be updated", () => {
            trebleMeasure.setAbsoluteCoordinates(0, 100);
            bassMeasure.setAbsoluteCoordinates(0, 250);
            (bassMeasure as any).positionCrossStaffBeams();

            const beams: VF.Beam[] = (bassMeasure as any).autoTupletVfBeams;
            const bassStave: VF.Stave = bassMeasure.getVFStave();
            const trebleStave: VF.Stave = trebleMeasure.getVFStave();

            for (const beam of beams) {
                for (const note of beam.getNotes()) {
                    const noteStave: VF.Stave = (note as any).stave;
                    expect(noteStave).to.be.oneOf([bassStave, trebleStave],
                        "note stave should reference a current stave");
                    const staveY: number = noteStave.getYForLine(0);
                    expect(staveY).to.be.greaterThan(0,
                        "note stave Y should not be 0 (stale reference)");
                }
            }
        });

        it("beam flatBeams flag should be true for cross-staff beams", () => {
            trebleMeasure.setAbsoluteCoordinates(0, 100);
            bassMeasure.setAbsoluteCoordinates(0, 250);
            (bassMeasure as any).positionCrossStaffBeams();

            const beams: VF.Beam[] = (bassMeasure as any).autoTupletVfBeams;
            for (const beam of beams) {
                expect((beam as any).renderOptions.flatBeams).to.equal(true,
                    "cross-staff beams should be flat");
            }
        });
    });
});
