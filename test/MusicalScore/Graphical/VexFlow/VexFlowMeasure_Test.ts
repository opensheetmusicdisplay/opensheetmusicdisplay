/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {SourceMeasure} from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import {MusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {EngravingRules} from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

describe("VexFlow Measure", () => {

   it("Can create GraphicalMusicSheet", (done: Mocha.Done) => {
      const path: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
      const score: Document = TestUtils.getScore(path);
      chai.expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      chai.expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      // console.log(gms);
      chai.expect(gms).to.not.be.undefined; // at least necessary for linter so that variable is not unused
      done();
   });

   it("Can have a single empty Measure", (done: Mocha.Done) => {
      const sheet: MusicSheet = new MusicSheet();
      sheet.Rules = new EngravingRules();
      const measure: SourceMeasure = new SourceMeasure(1, sheet.Rules);
      measure.FirstInstructionsStaffEntries[0] = new SourceStaffEntry(undefined, undefined);
      sheet.addMeasure(measure);
      const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator(sheet.Rules);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      chai.expect(gms.MeasureList.length).to.equal(1);
      chai.expect(gms.MeasureList[0].length).to.equal(1);
      chai.expect(gms.MeasureList[0][0].staffEntries.length).to.equal(0);
      done();
   });

   it("Can get note, stem and beam SVG elements by id", (done: Mocha.Done) => {
      //const url: string = "base/test/data/test_rest_positioning_8th_quarter.musicxml"; // doesn't work, works for Mozart Clarinet Quintet
      const score: Document = TestUtils.getScore("test_rest_positioning_8th_quarter.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
      // we need this way of creating the score to get the SVG elements, doesn't work with creating MusicSheet by hand
      osmd.load(score).then(
          (_: {}) => {
               osmd.render();
               const gse: GraphicalStaffEntry = osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries[0];
               const firstNote: VexFlowGraphicalNote = (gse.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
               const noteSVGId: string = "vf-" + firstNote.getSVGId();
               const noteSVG: HTMLElement = document.getElementById(noteSVGId);
               const stemSVGId: string = noteSVGId + "-stem";
               const stemSVG: HTMLElement = document.getElementById(stemSVGId);
               const beamSVGId: string = noteSVGId + "-beam";
               const beamSVG: HTMLElement = document.getElementById(beamSVGId);
               const nonexistingSVG: HTMLElement = document.getElementById(stemSVGId + "s");
               chai.expect(noteSVG?.id).to.equal(noteSVGId);
               chai.expect(stemSVG).to.not.be.null;
               chai.expect(stemSVG).to.not.be.undefined;
               chai.expect(beamSVG).to.not.be.null;
               chai.expect(beamSVG).to.not.be.undefined;
               chai.expect(nonexistingSVG).to.be.null;
               done();
          },
          done
      );
   });

});
