import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlow GraphicalNote", () => {
    it("Can get SVG elements for note, stem and beam", (done: Mocha.Done) => {
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.load(score).then(
            (_: {}) => {
                osmd.render();
                const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);

                // Note 1: G#4 8th, start of beam group A (notes 1-3)
                const note1: VexFlowGraphicalNote = (gm.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                const noteSVG: SVGGElement = note1.getSVGGElement();
                expect(noteSVG).to.not.be.null;
                expect(noteSVG).to.not.be.undefined;

                const stemSVG: HTMLElement = note1.getStemSVG();
                expect(stemSVG).to.not.be.null;
                expect(stemSVG).to.not.be.undefined;

                // VF5: all notes in a beam group share one Beam object
                const beamSVGs1: HTMLElement[] = note1.getBeamSVGs();
                expect(beamSVGs1.length).to.equal(1);
                expect(beamSVGs1[0]).to.not.be.null;
                expect(beamSVGs1[0]).to.not.be.undefined;

                // Note 2: A4 16th, in same beam group A
                const note2: VexFlowGraphicalNote = (gm.staffEntries[1].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                const beamSVGs2: HTMLElement[] = note2.getBeamSVGs();
                expect(beamSVGs2.length).to.equal(1);
                // Same beam group as note1
                expect(beamSVGs2[0]).to.equal(beamSVGs1[0]);

                // Note 3: B4 16th, end of beam group A
                const note3: VexFlowGraphicalNote = (gm.staffEntries[2].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                const beamSVGs3: HTMLElement[] = note3.getBeamSVGs();
                expect(beamSVGs3.length).to.equal(1);
                expect(beamSVGs3[0]).to.equal(beamSVGs1[0]);

                // Note 4: C5 16th, start of beam group B (notes 4-5)
                const note4: VexFlowGraphicalNote = (gm.staffEntries[3].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                const beamSVGs4: HTMLElement[] = note4.getBeamSVGs();
                expect(beamSVGs4.length).to.equal(1);
                // Different beam group from note1
                expect(beamSVGs4[0]).to.not.equal(beamSVGs1[0]);

                // Note 6: rest, no beam
                const note6: VexFlowGraphicalNote = (gm.staffEntries[5].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                expect(note6.getBeamSVGs().length).to.equal(0);
                expect(note6.getStemSVG()).to.be.undefined;

                done();
            },
            done
        );
    });
});
