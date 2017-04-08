import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {SourceMeasure} from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import {StaffMeasure} from "../../../../src/MusicalScore/Graphical/StaffMeasure";
import {MusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";

/* tslint:disable:no-unused-expression */
describe("VexFlow Measure", () => {

   it.skip("GraphicalMusicSheet", (done: MochaDone) => {
      let path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
      let score: Document = TestUtils.getScore(path);
      chai.expect(score).to.not.be.undefined;
      let partwise: Element = TestUtils.getPartWiseElement(score);
      chai.expect(partwise).to.not.be.undefined;
      let calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
      let reader: MusicSheetReader = new MusicSheetReader();
      let sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      console.log(gms);
      done();
   });

   it.skip("Simple Measure", (done: MochaDone) => {
      let sheet: MusicSheet = new MusicSheet();
      let measure: SourceMeasure = new SourceMeasure(1);
      sheet.addMeasure(measure);
      let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
      let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      chai.expect(gms.MeasureList.length).to.equal(1);
      chai.expect(gms.MeasureList[0].length).to.equal(1);
      let gm: StaffMeasure = gms.MeasureList[0][0];
      console.log(gm);
      done();
   });

   it.skip("Empty Measure", (done: MochaDone) => {
      let sheet: MusicSheet = new MusicSheet();
      let measure: SourceMeasure = new SourceMeasure(1);
      measure.FirstInstructionsStaffEntries[0] = new SourceStaffEntry(undefined, undefined);
      sheet.addMeasure(measure);
      let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
      let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      chai.expect(gms.MeasureList.length).to.equal(1);
      chai.expect(gms.MeasureList[0].length).to.equal(0);
      done();
   });

});
