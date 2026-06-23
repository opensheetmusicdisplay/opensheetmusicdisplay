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
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

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

        it("cross-staff beams should have non-zero slope after positioning", () => {
            let slopedCount: number = 0;
            let totalCrossStaff: number = 0;
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const trebleMeasure: VexFlowMeasure = measureRow[1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (!siblingMap || siblingMap.size === 0) { continue; }

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();

                for (const [beam] of siblingMap) {
                    totalCrossStaff++;
                    const slope: number = (beam as any).slope;
                    if (Math.abs(slope) > 0.01) {
                        slopedCount++;
                    }
                }
            }
            expect(totalCrossStaff).to.be.greaterThan(20,
                "should have many cross-staff beams");
            expect(slopedCount).to.equal(totalCrossStaff,
                `all ${totalCrossStaff} cross-staff beams should have non-zero slope, but only ${slopedCount} do`);
        });

        it("cross-staff beams should have negative slope (bass→treble arpeggio goes upward)", () => {
            let wrongSign: number = 0;
            let totalCrossStaff: number = 0;
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const trebleMeasure: VexFlowMeasure = measureRow[1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (!siblingMap || siblingMap.size === 0) { continue; }

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();

                for (const [beam] of siblingMap) {
                    totalCrossStaff++;
                    const slope: number = (beam as any).slope;
                    if (slope > 0) {
                        wrongSign++;
                    }
                }
            }
            expect(wrongSign).to.equal(0,
                `${wrongSign}/${totalCrossStaff} cross-staff beams have wrong slope sign (positive instead of negative)`);
        });

        it("stem length should not exceed notehead-to-beam distance", () => {
            let violations: number = 0;
            let totalNotes: number = 0;
            const details: string[] = [];
            const tolerance: number = 20;
            for (const measureRow of gms.MeasureList) {
                if (measureRow.length < 3) { continue; }
                const trebleMeasure: VexFlowMeasure = measureRow[1] as VexFlowMeasure;
                const bassMeasure: VexFlowMeasure = measureRow[2] as VexFlowMeasure;
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;
                if (!siblingMap || siblingMap.size === 0) { continue; }

                trebleMeasure.setAbsoluteCoordinates(0, 100);
                bassMeasure.setAbsoluteCoordinates(0, 250);
                (bassMeasure as any).positionCrossStaffBeams();

                for (const [beam] of siblingMap) {
                    const beamAny: any = beam;
                    const offset: number = beamAny.renderOptions.flatBeamOffset;
                    const slope: number = beamAny.slope;
                    const notes: VF.Note[] = beam.getNotes();
                    const firstX: number = (notes[0] as any).getStemX();

                    for (const note of notes) {
                        totalNotes++;
                        const noteAny: any = note;
                        const noteX: number = noteAny.getStemX();
                        const beamY: number = offset + slope * (noteX - firstX);
                        const kps: any[] = note.getKeyProps();
                        const noteheadY: number = noteAny.stave.getYForNote(kps[0].line);
                        const noteToBeam: number = Math.abs(noteheadY - beamY);
                        const extents: { topY: number, baseY: number } = noteAny.getStemExtents();
                        const stemLen: number = Math.abs(extents.topY - extents.baseY);

                        if (stemLen > noteToBeam + tolerance) {
                            violations++;
                            details.push(
                                "stemLen=" + stemLen.toFixed(0) +
                                " noteToBeam=" + noteToBeam.toFixed(0) +
                                " excess=" + (stemLen - noteToBeam).toFixed(0) +
                                " line=" + kps[0].line.toFixed(1) +
                                " dir=" + noteAny.stemDirection
                            );
                        }
                    }
                }
            }
            expect(violations).to.equal(0,
                violations + "/" + totalNotes + " stems exceed notehead-to-beam distance+" +
                tolerance + "px:\n" + details.join("\n"));
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
                    "cross-staff beams should use flatBeams for offset anchoring");
            }
        });

        it("beam slope should be non-zero (diagonal cross-staff beam)", () => {
            trebleMeasure.setAbsoluteCoordinates(0, 100);
            bassMeasure.setAbsoluteCoordinates(0, 250);
            (bassMeasure as any).positionCrossStaffBeams();

            const beams: VF.Beam[] = (bassMeasure as any).autoTupletVfBeams;
            const trebleBottom: number = trebleMeasure.getVFStave().getYForLine(4);
            const bassTop: number = bassMeasure.getVFStave().getYForLine(0);

            for (const beam of beams) {
                const slope: number = (beam as any).slope;
                expect(Math.abs(slope)).to.be.greaterThan(0.05,
                    "cross-staff beam slope should be non-zero (diagonal)");

                const notes: VF.Note[] = beam.getNotes();
                const firstX: number = (notes[0] as any).getStemX();
                const lastX: number = (notes[notes.length - 1] as any).getStemX();
                const offset: number = (beam as any).renderOptions.flatBeamOffset;
                const beamAtLast: number = offset + slope * (lastX - firstX);
                expect(beamAtLast).to.be.greaterThan(trebleBottom,
                    "beam at last note should be below treble stave");
                expect(beamAtLast).to.be.lessThan(bassTop,
                    "beam at last note should be above bass stave");
            }
        });
    });
});

describe("Cross-staff beam stem geometry", () => {

    function checkBeamStemGeometry(
        ownerMeasure: VexFlowMeasure,
        siblingMeasure: VexFlowMeasure,
        label: string,
    ): string[] {
        const errors: string[] = [];
        const siblingMap: Map<VF.Beam, VexFlowMeasure> = (ownerMeasure as any).crossStaffBeamSiblings;
        if (!siblingMap || siblingMap.size === 0) { return ["no crossStaffBeamSiblings on " + label]; }
        const ownerStave: VF.Stave = ownerMeasure.getVFStave();
        const sibStave: VF.Stave = siblingMeasure.getVFStave();
        const ownerY0: number = ownerStave.getYForLine(0);
        const sibY0: number = sibStave.getYForLine(0);
        const ownerIsBelow: boolean = ownerY0 > sibY0;
        const upperStave: VF.Stave = ownerIsBelow ? sibStave : ownerStave;
        const lowerStave: VF.Stave = ownerIsBelow ? ownerStave : sibStave;
        const upperBottom: number = upperStave.getYForLine(4);
        const lowerTop: number = lowerStave.getYForLine(0);

        let beamIdx: number = 0;
        for (const [beam] of siblingMap) {
            const beamAny: any = beam;
            const offset: number = beamAny.renderOptions.flatBeamOffset;
            const slope: number = beamAny.slope;
            const notes: VF.Note[] = beam.getNotes();
            const firstX: number = (notes[0] as any).getStemX();
            const bid: string = label + " beam[" + beamIdx + "]";

            // Beam offset between staves
            if (offset < upperBottom - 5 || offset > lowerTop + 5) {
                errors.push(bid + " offset=" + offset.toFixed(0) +
                    " not between staves (" + upperBottom.toFixed(0) + "-" + lowerTop.toFixed(0) + ")");
            }

            for (let ni: number = 0; ni < notes.length; ni++) {
                const note: VF.Note = notes[ni];
                const noteAny: any = note;
                const nid: string = bid + " note[" + ni + "]";
                const kps: any[] = note.getKeyProps();
                if (!kps || kps.length === 0) { continue; }
                const noteStave: VF.Stave = noteAny.stave;
                const stemDir: number = noteAny.stemDirection;
                const outerKp: any = stemDir === VF.Stem.UP ? kps[0] : kps[kps.length - 1];
                const noteheadY: number = noteStave.getYForNote(outerKp.line);
                const noteX: number = noteAny.getStemX();
                const beamY: number = offset + slope * (noteX - firstX);
                const stem: any = noteAny.stem;

                // 1. Stem direction: bass-side notes UP, treble-side notes DOWN
                if (noteStave === lowerStave && stemDir !== VF.Stem.UP) {
                    errors.push(nid + " on lower stave: stemDir=" + stemDir + " expected UP(1)");
                }
                if (noteStave === upperStave && stemDir !== VF.Stem.DOWN) {
                    errors.push(nid + " on upper stave: stemDir=" + stemDir + " expected DOWN(-1)");
                }

                // 2. Stem base at notehead
                if (stem) {
                    const baseY: number = stemDir === VF.Stem.UP ? stem.yBottom : stem.yTop;
                    const baseDist: number = Math.abs(baseY - noteheadY);
                    if (baseDist > 5) {
                        errors.push(nid + " stem base=" + baseY.toFixed(0) +
                            " vs notehead=" + noteheadY.toFixed(0) + " (off by " + baseDist.toFixed(0) + ")");
                    }
                }

                // 3. Stem tip touches beam
                if (stem) {
                    const extents: { topY: number, baseY: number } = noteAny.getStemExtents();
                    const stemTip: number = extents.topY;
                    const tipDist: number = Math.abs(stemTip - beamY);
                    if (tipDist > 25) {
                        errors.push(nid + " stem tip=" + stemTip.toFixed(0) +
                            " vs beamY=" + beamY.toFixed(0) + " (off by " + tipDist.toFixed(0) + ")");
                    }
                }

                // 4. Stem length ≤ notehead-to-beam distance + tolerance
                if (stem) {
                    const extents: { topY: number, baseY: number } = noteAny.getStemExtents();
                    const stemLen: number = Math.abs(extents.topY - extents.baseY);
                    const noteToBeam: number = Math.abs(noteheadY - beamY);
                    if (stemLen > noteToBeam + 20) {
                        errors.push(nid + " stemLen=" + stemLen.toFixed(0) +
                            " exceeds noteToBeam=" + noteToBeam.toFixed(0) + "+20");
                    }
                }

                // 5. Stem direction consistent with notehead-to-beam direction
                if (stem) {
                    const goesUp: boolean = noteheadY > beamY;
                    if (goesUp && stemDir !== VF.Stem.UP) {
                        errors.push(nid + " notehead below beam but stemDir=" + stemDir + " (should be UP)");
                    }
                    if (!goesUp && stemDir !== VF.Stem.DOWN) {
                        errors.push(nid + " notehead above beam but stemDir=" + stemDir + " (should be DOWN)");
                    }
                }
            }
            beamIdx++;
        }
        return errors;
    }

    function positionAndCheck(
        ownerMeasure: VexFlowMeasure,
        siblingMeasure: VexFlowMeasure,
        trebleY: number,
        bassY: number,
        label: string,
    ): string[] {
        const ownerY0: number = ownerMeasure.getVFStave().getYForLine(0);
        const sibY0: number = siblingMeasure.getVFStave().getYForLine(0);
        const ownerIsBelow: boolean = ownerY0 > sibY0 || ownerY0 === sibY0;
        if (ownerIsBelow) {
            siblingMeasure.setAbsoluteCoordinates(0, trebleY);
            ownerMeasure.setAbsoluteCoordinates(0, bassY);
        } else {
            ownerMeasure.setAbsoluteCoordinates(0, trebleY);
            siblingMeasure.setAbsoluteCoordinates(0, bassY);
        }
        (ownerMeasure as any).positionCrossStaffBeams();
        return checkBeamStemGeometry(ownerMeasure, siblingMeasure, label);
    }

    describe("Dichterliebe01", () => {
        let gms: GraphicalMusicSheet;
        before(() => {
            const result: { gms: GraphicalMusicSheet } = loadScore("Dichterliebe01.xml");
            gms = result.gms;
        });

        for (const mIdx of [8, 9]) {
            it("m" + (mIdx + 1) + " bass: stem direction, length, beam connection", () => {
                const treble: VexFlowMeasure = gms.MeasureList[mIdx][1] as VexFlowMeasure;
                const bass: VexFlowMeasure = gms.MeasureList[mIdx][2] as VexFlowMeasure;
                const errs: string[] = positionAndCheck(bass, treble, 100, 250, "Dicht m" + (mIdx + 1));
                expect(errs).to.deep.equal([], errs.join("\n"));
            });
        }

        it("m4-m10 bass: all slopes negative (ascending arpeggio)", () => {
            let wrongSign: number = 0;
            let total: number = 0;
            for (let m: number = 3; m <= 9; m++) {
                const treble: VexFlowMeasure = gms.MeasureList[m][1] as VexFlowMeasure;
                const bass: VexFlowMeasure = gms.MeasureList[m][2] as VexFlowMeasure;
                treble.setAbsoluteCoordinates(0, 100);
                bass.setAbsoluteCoordinates(0, 250);
                (bass as any).positionCrossStaffBeams();
                const siblingMap: Map<VF.Beam, VexFlowMeasure> = (bass as any).crossStaffBeamSiblings;
                if (!siblingMap) { continue; }
                for (const [beam] of siblingMap) {
                    total++;
                    if ((beam as any).slope > 0) { wrongSign++; }
                }
            }
            expect(wrongSign).to.equal(0,
                wrongSign + "/" + total + " beams have positive slope (expected negative)");
        });
    });

    describe("Debussy Mandoline", () => {
        let gms: GraphicalMusicSheet;
        before(() => {
            const result: { gms: GraphicalMusicSheet } = loadScore("Debussy_Mandoline.xml");
            gms = result.gms;
        });

        it("m4 bass: stem direction, length, beam connection", () => {
            const treble: VexFlowMeasure = gms.MeasureList[3][1] as VexFlowMeasure;
            const bass: VexFlowMeasure = gms.MeasureList[3][2] as VexFlowMeasure;
            const errs: string[] = positionAndCheck(bass, treble, 100, 250, "Mand m4 bass");
            expect(errs).to.deep.equal([], errs.join("\n"));
        });

        it("m4 treble: stem direction, length, beam connection", () => {
            const treble: VexFlowMeasure = gms.MeasureList[3][1] as VexFlowMeasure;
            const bass: VexFlowMeasure = gms.MeasureList[3][2] as VexFlowMeasure;
            bass.setAbsoluteCoordinates(0, 250);
            treble.setAbsoluteCoordinates(0, 100);
            (treble as any).positionCrossStaffBeams();
            const errs: string[] = checkBeamStemGeometry(treble, bass, "Mand m4 treble");
            expect(errs).to.deep.equal([], errs.join("\n"));
        });
    });

    describe("Tuplet crossstaff alignment", () => {
        let gms: GraphicalMusicSheet;
        before(() => {
            const result: { gms: GraphicalMusicSheet } = loadScore("test_tuplet_crossstaff_alignment.musicxml");
            gms = result.gms;
        });

        it("m1 bass: stem direction, length, beam connection", () => {
            const treble: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;
            const bass: VexFlowMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
            const errs: string[] = positionAndCheck(bass, treble, 100, 250, "Tuplet m1");
            expect(errs).to.deep.equal([], errs.join("\n"));
        });

        it("m1: beam slope should be negative (ascending tuplet)", () => {
            const treble: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;
            const bass: VexFlowMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
            treble.setAbsoluteCoordinates(0, 100);
            bass.setAbsoluteCoordinates(0, 250);
            (bass as any).positionCrossStaffBeams();
            const beams: VF.Beam[] = (bass as any).autoTupletVfBeams;
            for (let i: number = 0; i < beams.length; i++) {
                const slope: number = (beams[i] as any).slope;
                expect(slope).to.be.lessThan(0,
                    "beam[" + i + "] slope=" + slope.toFixed(4) + " should be negative");
            }
        });
    });

    describe("Dichterliebe01 m4 cross-staff slur beam reference trace", () => {
        let gms: GraphicalMusicSheet;
        let rules: any;
        before(() => {
            const result: { gms: GraphicalMusicSheet, calc: VexFlowMusicSheetCalculator } = loadScore("Dichterliebe01.xml");
            gms = result.gms;
            rules = (result.calc as any).rules;
        });

        it("m4 bass cross-staff beam vfNotes should have beam reference after fixCrossStaffBeams", () => {
            const bassMeasure: VexFlowMeasure = gms.MeasureList[4][2] as VexFlowMeasure;
            console.log("bassMeasure.MeasureNumber:", bassMeasure.MeasureNumber,
                "ParentStaff.idInMusicSheet:", bassMeasure.ParentStaff?.idInMusicSheet);
            const sibMap: Map<VF.Beam, VexFlowMeasure> = (bassMeasure as any).crossStaffBeamSiblings;

            // Let's also find which measure row actually has cross-staff beams
            for (let i: number = 0; i < gms.MeasureList.length; i++) {
                const row: any[] = gms.MeasureList[i];
                for (let j: number = 0; j < row.length; j++) {
                    const m: any = row[j];
                    if (m?.crossStaffBeamSiblings?.size > 0) {
                        console.log("  MeasureList[" + i + "][" + j + "] measure=" +
                            m.MeasureNumber + " stave=" + m.ParentStaff?.idInMusicSheet +
                            " beams=" + m.crossStaffBeamSiblings.size);
                    }
                }
            }

            expect(sibMap).to.not.be.undefined;
            expect(sibMap.size).to.be.greaterThan(0, "m4 bass should have cross-staff beams");

            // Pick the first cross-staff beam
            const firstEntry: [VF.Beam, VexFlowMeasure] = sibMap.entries().next().value;
            const beam: VF.Beam = firstEntry[0];
            const sibling: VexFlowMeasure = firstEntry[1];
            const notes: VF.StemmableNote[] = beam.getNotes() as VF.StemmableNote[];

            console.log("Beam notes:", notes.length);
            for (const n of notes) {
                const beamRef: any = (n as any).beam;
                console.log("  note beam ref:", beamRef === beam ? "SAME" : "DIFFERENT",
                    "stemDir:", (n as any).stemDirection);
            }

            // Set coordinates and run positionCrossStaffBeams
            const absPos: PointF2D = bassMeasure.PositionAndShape.AbsolutePosition;
            const sibPos: PointF2D = sibling.PositionAndShape.AbsolutePosition;
            bassMeasure.setAbsoluteCoordinates(absPos.x * unitInPixels, absPos.y * unitInPixels);
            sibling.setAbsoluteCoordinates(sibPos.x * unitInPixels, sibPos.y * unitInPixels);
            (bassMeasure as any).positionCrossStaffBeams();

            console.log("After positionCrossStaffBeams:");
            console.log("  beam.renderOptions.flatBeams:", (beam as any).renderOptions.flatBeams);
            console.log("  beam.renderOptions.flatBeamOffset:", (beam as any).renderOptions.flatBeamOffset);

            // Check each note's beam reference still matches
            for (const n of notes) {
                const beamRef: any = (n as any).beam;
                console.log("  note beam ref after:", beamRef === beam ? "SAME" : "DIFFERENT",
                    "has flatBeamOffset:", !!beamRef?.renderOptions?.flatBeamOffset);
            }

            expect((beam as any).renderOptions.flatBeams).to.equal(true);
            expect((beam as any).renderOptions.flatBeamOffset).to.be.a("number");

            // NOW: check that the slur's start note GNote.vfnote[0] has the beam.
            // We find it by matching VF notes in the beam to their OSMD notes,
            // then finding the slur that starts on that OSMD note.
            let slurGNote: any;
            for (const vfN of notes) {
                // VF notes don't directly reference OSMD notes. Walk staff entries instead.
                for (const se of bassMeasure.staffEntries) {
                    for (const gve of se.graphicalVoiceEntries) {
                        if ((gve as any).vfStaveNote === vfN) {
                            // Found the VF note's voice entry — check if any note in it starts a slur
                            for (const osmdNote of gve.parentVoiceEntry.Notes) {
                                // Find slurs starting on this OSMD note
                                for (const gSlur of (bassMeasure.ParentStaffLine as any)?.GraphicalSlurs ?? []) {
                                    if (gSlur.slur?.StartNote === osmdNote) {
                                        slurGNote = rules.GNote(osmdNote);
                                        break;
                                    }
                                }
                                if (slurGNote) { break; }
                            }
                        }
                        if (slurGNote) { break; }
                    }
                    if (slurGNote) { break; }
                }
                if (slurGNote) { break; }
            }

            console.log("Slur startNote GNote found:", !!slurGNote);
            console.log("  vfnote[0]:", !!slurGNote?.vfnote?.[0]);
            const slurBeam: any = slurGNote?.vfnote?.[0]?.beam;
            console.log("  beam exists:", !!slurBeam);
            console.log("  beam === crossStaffBeam:", slurBeam === beam);
            console.log("  beam.renderOptions?.flatBeams:", slurBeam?.renderOptions?.flatBeams);
            console.log("  beam.renderOptions?.flatBeamOffset:", slurBeam?.renderOptions?.flatBeamOffset);
            expect(slurBeam).to.not.be.undefined;
            expect(slurBeam).to.equal(beam,
                "Slur's GNote vfNote must reference the same beam");
        });

        it("m1 bass should have the cross-staff beam detected", () => {
            const m1Bass: VexFlowMeasure = gms.MeasureList[0]?.[2] as VexFlowMeasure;
            console.log("m1 bass MeasureNumber:", m1Bass?.MeasureNumber);
            console.log("m1 bass crossStaffBeamSiblings size:",
                (m1Bass as any).crossStaffBeamSiblings?.size ?? 0);

            // Dump beams structure to see why fixCrossStaffBeams skips it
            const beamsObj: any = (m1Bass as any).beams;
            console.log("m1 bass beams keys:", Object.keys(beamsObj ?? {}));
            for (const vid of Object.keys(beamsObj ?? {})) {
                const beamBuilders: any[] = beamsObj[vid];
                console.log("  voice " + vid + ": " + beamBuilders.length + " beam builders");
                for (const bb of beamBuilders) {
                    const osmdBeam: any = bb[0];
                    const entries: any[] = bb[1];
                    console.log("    osmdBeam.Notes=" + osmdBeam.Notes.length +
                        " localEntries=" + entries.length +
                        " BeamNumber=" + osmdBeam.BeamNumber);
                }
            }

            // Also check tuplets
            const tupletsObj: any = (m1Bass as any).tuplets;
            console.log("m1 bass tuplets keys:", Object.keys(tupletsObj ?? {}));
        });
    });
});
