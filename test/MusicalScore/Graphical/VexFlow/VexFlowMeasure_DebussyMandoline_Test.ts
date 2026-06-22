import { expect } from "chai";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {unitInPixels} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
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

describe("VexFlow Measure - Debussy Mandoline Cross-Staff Beams", () => {
    let gms: GraphicalMusicSheet;

    before(() => {
        const result: { gms: GraphicalMusicSheet } = loadScore("Debussy_Mandoline.xml");
        gms = result.gms;
    });

    // Debussy Mandoline: 3 staves (vocal=0, piano treble=1, piano bass=2)
    // m2-m5 voice 2: alternating arpeggio pattern across piano staves
    // Group 1 (eighths 1-3): bass→treble→bass  → majority=bass  → crossStaffBeamSiblings on stave 2
    // Group 2 (eighths 4-6): treble→bass→treble → majority=treble → crossStaffBeamSiblings on stave 1

    describe("cross-staff beam detection for m2-m5", () => {
        it("bass measures (stave 2) should have cross-staff beam entries", () => {
            for (let m: number = 1; m <= 4; m++) {
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                expect(siblingMap.size).to.be.greaterThan(0,
                    `m${m + 1} bass should have cross-staff beam entries`);
            }
        });

        it("treble measures (stave 1) should have cross-staff beam entries", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (trebleMeasure as any).crossStaffBeamSiblings;
                expect(siblingMap.size).to.be.greaterThan(0,
                    `m${m + 1} treble should have cross-staff beam entries (group 2: treble→bass→treble)`);
            }
        });

        it("each cross-staff beam should have 3 notes", () => {
            for (let m: number = 1; m <= 4; m++) {
                for (const staveIdx of [1, 2]) {
                    const measure: VexFlowMeasure = gms.MeasureList[m][staveIdx] as VexFlowMeasure;
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        expect(beam.getNotes().length).to.equal(3,
                            `m${m + 1} stave ${staveIdx} beam should have 3 notes`);
                    }
                }
            }
        });
    });

    describe("beam positioning after setAbsoluteCoordinates", () => {
        it("beam Y should be between staves for all cross-staff beam groups", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();
                (trebleMeasure as any).positionCrossStaffBeams();

                const trebleBottom: number = trebleMeasure.getVFStave().getYForLine(4);
                const bassTop: number = bassMeasure.getVFStave().getYForLine(0);

                for (const [staveIdx, measure] of [[1, trebleMeasure], [2, bassMeasure]] as [number, VexFlowMeasure][]) {
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        const offset: number = (beam as any).renderOptions.flatBeamOffset;
                        expect(offset).to.be.greaterThan(trebleBottom,
                            `m${m + 1} stave ${staveIdx} beam Y should be below treble bottom`);
                        expect(offset).to.be.lessThan(bassTop,
                            `m${m + 1} stave ${staveIdx} beam Y should be above bass top`);
                    }
                }
            }
        });

        it("beam Y should be consistent between group 1 and group 2 within same measure", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();
                (trebleMeasure as any).positionCrossStaffBeams();

                const bassBeamYs: number[] = [];
                const trebleBeamYs: number[] = [];
                const bassSiblings: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                const trebleSiblings: Map<VF.Beam, VexFlowMeasure> = (trebleMeasure as any).crossStaffBeamSiblings;

                for (const [beam] of bassSiblings) {
                    bassBeamYs.push((beam as any).renderOptions.flatBeamOffset);
                }
                for (const [beam] of trebleSiblings) {
                    trebleBeamYs.push((beam as any).renderOptions.flatBeamOffset);
                }

                if (bassBeamYs.length > 0 && trebleBeamYs.length > 0) {
                    const diff: number = Math.abs(bassBeamYs[0] - trebleBeamYs[0]);
                    expect(diff).to.be.lessThan(30,
                        `m${m + 1} group1 vs group2 beam Y should be similar (diff=${diff.toFixed(1)})`);
                }
            }
        });

        it("no stem X should be displaced to extreme left of score", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();
                (trebleMeasure as any).positionCrossStaffBeams();

                for (const [staveIdx, measure] of [[1, trebleMeasure], [2, bassMeasure]] as [number, VexFlowMeasure][]) {
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        const notes: VF.Note[] = beam.getNotes();
                        const staveX: number = measure.getVFStave().getX();
                        for (let i: number = 0; i < notes.length; i++) {
                            const stemX: number = (notes[i] as any).getStemX();
                            expect(stemX).to.be.greaterThan(staveX - 10,
                                `m${m + 1} stave ${staveIdx} note[${i}] stemX=${stemX.toFixed(0)} displaced left of stave (staveX=${staveX.toFixed(0)})`);
                        }
                    }
                }
            }
        });

        it("after positioning, upper-stave notes should stem DOWN and lower-stave notes should stem UP", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();
                (trebleMeasure as any).positionCrossStaffBeams();

                const trebleStave: VF.Stave = trebleMeasure.getVFStave();
                const bassStave: VF.Stave = bassMeasure.getVFStave();

                for (const [staveIdx, measure] of [[1, trebleMeasure], [2, bassMeasure]] as [number, VexFlowMeasure][]) {
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        for (const note of beam.getNotes()) {
                            const noteStave: VF.Stave = (note as any).stave;
                            const dir: number = (note as any).stemDirection;
                            if (noteStave === trebleStave) {
                                expect(dir).to.equal(VF.Stem.DOWN,
                                    `m${m + 1} stave ${staveIdx} treble note stem should be DOWN`);
                            } else if (noteStave === bassStave) {
                                expect(dir).to.equal(VF.Stem.UP,
                                    `m${m + 1} stave ${staveIdx} bass note stem should be UP`);
                            }
                        }
                    }
                }
            }
        });
    });

    describe("draw-order stem displacement", () => {
        it("treble-majority beams: no displaced stems when bass stave not yet positioned", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                const tPos: { x: number, y: number } = trebleMeasure.PositionAndShape.AbsolutePosition;
                trebleMeasure.setAbsoluteCoordinates(tPos.x * unitInPixels, tPos.y * unitInPixels);
                bassMeasure.getVFStave().setX(0).setY(0);
                (trebleMeasure as any).positionCrossStaffBeams();

                const staveX: number = trebleMeasure.getVFStave().getX();
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (trebleMeasure as any).crossStaffBeamSiblings;
                for (const [beam] of siblingMap) {
                    const notes: VF.Note[] = beam.getNotes();
                    for (let i: number = 0; i < notes.length; i++) {
                        const stemX: number = (notes[i] as any).getStemX();
                        expect(stemX).to.be.greaterThan(staveX - 10,
                            `m${m + 1} note[${i}] stemX=${stemX.toFixed(0)} displaced left of stave (staveX=${staveX.toFixed(0)})`);
                    }
                }
            }
        });

        it("bass-majority beams: no displaced stems when treble stave not yet positioned", () => {
            for (let m: number = 1; m <= 4; m++) {
                const trebleMeasure: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;

                const bPos: { x: number, y: number } = bassMeasure.PositionAndShape.AbsolutePosition;
                bassMeasure.setAbsoluteCoordinates(bPos.x * unitInPixels, bPos.y * unitInPixels);
                trebleMeasure.getVFStave().setX(0).setY(0);
                (bassMeasure as any).positionCrossStaffBeams();

                const staveX: number = bassMeasure.getVFStave().getX();
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                for (const [beam] of siblingMap) {
                    const notes: VF.Note[] = beam.getNotes();
                    for (let i: number = 0; i < notes.length; i++) {
                        const stemX: number = (notes[i] as any).getStemX();
                        expect(stemX).to.be.greaterThan(staveX - 10,
                            `m${m + 1} note[${i}] stemX=${stemX.toFixed(0)} displaced left of stave (staveX=${staveX.toFixed(0)})`);
                    }
                }
            }
        });
    });

    describe("beam note references integrity", () => {
        it("all beamed notes should be real StaveNotes, not ghost notes", () => {
            for (let m: number = 1; m <= 4; m++) {
                for (const staveIdx of [1, 2]) {
                    const measure: VexFlowMeasure = gms.MeasureList[m][staveIdx] as VexFlowMeasure;
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        for (const note of beam.getNotes()) {
                            expect(note.getCategory()).to.not.equal("ghostnotes",
                                `m${m + 1} stave ${staveIdx} beam should not contain ghost notes`);
                        }
                    }
                }
            }
        });

        it("all beamed notes should have beam reference set", () => {
            for (let m: number = 1; m <= 4; m++) {
                for (const staveIdx of [1, 2]) {
                    const measure: VexFlowMeasure = gms.MeasureList[m][staveIdx] as VexFlowMeasure;
                    const siblingMap: Map<VF.Beam, VexFlowMeasure> = (measure as any).crossStaffBeamSiblings;
                    for (const [beam] of siblingMap) {
                        for (const note of beam.getNotes()) {
                            expect((note as any).beam).to.equal(beam,
                                `m${m + 1} stave ${staveIdx} note.beam should reference its beam`);
                        }
                    }
                }
            }
        });
    });
});
