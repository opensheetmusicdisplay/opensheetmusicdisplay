/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlow GraphicalNote", () => {
    it("Can get SVG elements for note, stem and beam", (done: Mocha.Done) => {
        //const url: string = "base/test/data/test_rest_positioning_8th_quarter.musicxml"; // doesn't work, works for Mozart Clarinet Quintet
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        // sample should start with a beamed 8th note, and be simple.
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        // we need this way of creating the score to get the SVG elements, doesn't work with creating MusicSheet by hand
        osmd.load(score).then(
            (_: {}) => {
                 osmd.render();
                 const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
                 const note1: VexFlowGraphicalNote = (gm.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 const noteSVG: SVGGElement = note1.getSVGGElement();
                 chai.expect(noteSVG).to.not.be.null;
                 chai.expect(noteSVG).to.not.be.undefined;
                 // const noteSVGId: string = "vf-" + firstNote.getSVGId();
                 // const noteSVG: HTMLElement = document.getElementById(noteSVGId);
                 //const stemSVGId: string = noteSVGId + "-stem";
                 //const stemSVG: HTMLElement = document.getElementById(stemSVGId);
                 const stemSVG: HTMLElement = note1.getStemSVG();
                 chai.expect(stemSVG).to.not.be.null;
                 chai.expect(stemSVG).to.not.be.undefined;
                 // const beamSVGId: string = noteSVGId + "-beam";
                 // const beamSVG: HTMLElement = document.getElementById(beamSVGId);
                 const beamSVGs: HTMLElement[] = note1.getBeamSVGs();
                 chai.expect(beamSVGs.length).to.equal(1); // 8th beam start. (16th beam starts on note2)
                 chai.expect(beamSVGs[0]).to.not.be.null;
                 chai.expect(beamSVGs[0]).to.not.be.undefined;
                 const note2: VexFlowGraphicalNote = (gm.staffEntries[1].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 chai.expect(note2.getBeamSVGs().length).to.equal(1); // start of 16th beam
                 const note3: VexFlowGraphicalNote = (gm.staffEntries[2].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 chai.expect(note3.getBeamSVGs().length).to.equal(0); // end of 16th beam
                 const note4: VexFlowGraphicalNote = (gm.staffEntries[3].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 chai.expect(note4.getBeamSVGs().length).to.equal(2); // 16th beams start
                 done();
            },
            done
        );
     });
});
