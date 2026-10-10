/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {VexFlowVoiceEntry} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import {GraphicalStaffEntry} from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import {expect} from "chai";

describe("VexFlow Measure - Room for Staggered Notes", () => {

   const path: string = "test_stagger_room_in_spacing.musicxml";

   function renderMeasures(): VexFlowMeasure[] {
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      return gms.MeasureList.map((staves) => staves[0] as VexFlowMeasure);
   }

   function voiceEntry(measure: VexFlowMeasure, timestampRealValue: number, voiceId: number): VexFlowVoiceEntry {
      const staffEntry: GraphicalStaffEntry = measure.staffEntries.find(
         (se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestampRealValue) < 1e-6);
      expect(staffEntry, `expected a staff entry at timestamp ${timestampRealValue}`).to.not.be.undefined;
      const gve: VexFlowVoiceEntry = (staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]).find(
         (g) => g.parentVoiceEntry.ParentVoice.VoiceId === voiceId);
      expect(gve, `voice ${voiceId} should be present at timestamp ${timestampRealValue}`).to.not.be.undefined;
      return gve;
   }

   // how far right of the first note head the second one is drawn, centre to centre (a staggered note is drawn about a note
   //   head right of its beat). The heads compared here are all black, so this is the space between them plus a head.
   function distance(first: VexFlowVoiceEntry, second: VexFlowVoiceEntry): number {
      return second.notes[0].PositionAndShape.AbsolutePosition.x - first.notes[0].PositionAndShape.AbsolutePosition.x;
   }

   it("Should give a staggered note as much room before the next note as a sixteenth that isn't moved", (done: Mocha.Done) => {
      // Measure 2: on each beat, voice 2's quarter is moved right, beside the sixteenth a second above it.
      const measure: VexFlowMeasure = renderMeasures()[1];
      for (const beat of [0, 0.25, 0.5, 0.75]) {
         const moved: VexFlowVoiceEntry = voiceEntry(measure, beat, 2);
         expect(distance(voiceEntry(measure, beat, 1), moved)).to.be.greaterThan(1, `at ${beat}, the quarter must be staggered`);
         const next: VexFlowVoiceEntry = voiceEntry(measure, beat + 1 / 16, 1);
         const afterNext: VexFlowVoiceEntry = voiceEntry(measure, beat + 2 / 16, 1);
         expect(distance(moved, next)).to.be.at.least(distance(next, afterNext) - 0.01,
            `at ${beat}, the moved quarter must get as much room before the next sixteenth as a sixteenth that isn't moved`);
      }
      done();
   });

   it("Should give a staggered middle voice note of three as much room before the next note as a sixteenth", (done: Mocha.Done) => {
      // Measure 3: on beats 1 and 3, voice 2's G4 eighth is moved right, beside voice 1's A4, and its F4 sixteenth follows.
      const measure: VexFlowMeasure = renderMeasures()[2];
      for (const beat of [0, 0.5]) {
         const moved: VexFlowVoiceEntry = voiceEntry(measure, beat, 2);
         expect(distance(voiceEntry(measure, beat, 1), moved)).to.be.greaterThan(1, `at ${beat}, the eighth must be staggered`);
         const next: VexFlowVoiceEntry = voiceEntry(measure, beat + 1 / 8, 2);
         const afterNext: VexFlowVoiceEntry = voiceEntry(measure, beat + 3 / 16, 2);
         expect(distance(moved, next)).to.be.at.least(distance(next, afterNext) - 0.01,
            `at ${beat}, the moved eighth must get at least as much room before the next note as a sixteenth`);
      }
      done();
   });

});
