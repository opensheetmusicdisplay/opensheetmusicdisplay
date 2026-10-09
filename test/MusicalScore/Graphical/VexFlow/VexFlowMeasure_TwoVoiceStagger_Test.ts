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

describe("VexFlow Measure - Two-Voice Stagger", () => {

   const path: string = "test_two_voice_stagger_dotted_upper_second.musicxml";

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

   function voiceEntriesAt(measure: VexFlowMeasure, timestampRealValue: number): VexFlowVoiceEntry[] {
      const staffEntry: GraphicalStaffEntry = measure.staffEntries.find(
         (se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestampRealValue) < 1e-6);
      expect(staffEntry, `expected a staff entry at timestamp ${timestampRealValue}`).to.not.be.undefined;
      return staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[];
   }

   // x of the centre of the voice's note head, where it is drawn (a staggered note is drawn about a note head further right)
   function noteX(gves: VexFlowVoiceEntry[], voiceId: number): number {
      const gve: VexFlowVoiceEntry = gves.find((g) => g.parentVoiceEntry.ParentVoice.VoiceId === voiceId);
      expect(gve, `voice ${voiceId} should be present`).to.not.be.undefined;
      return gve.notes[0].PositionAndShape.AbsolutePosition.x;
   }

   it("Should stagger a dotted upper note rather than the lower note a second below, which would cover its dot", (done: Mocha.Done) => {
      // Measure 1: a dotted A4 over a G4, then a dotted G4 over an F4.
      const measure: VexFlowMeasure = renderMeasures()[0];
      for (const timestamp of [0, 0.5]) {
         const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, timestamp);
         expect(gves.length).to.equal(2, `the beat at ${timestamp} should have two voices`);
         expect(noteX(gves, 1) - noteX(gves, 2)).to.be.greaterThan(1,
            `at ${timestamp}, the dotted upper note must be staggered, its dot next to its head`);
      }
      done();
   });

   it("Should stagger a dotted upper note in a space over a dotted lower note, whose dot then goes below", (done: Mocha.Done) => {
      // Measure 2, beat 1: a dotted A4 over a dotted G4.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(renderMeasures()[1], 0);
      expect(gves.length).to.equal(2, "the first beat should have two voices");
      expect(noteX(gves, 1) - noteX(gves, 2)).to.be.greaterThan(1,
         "the dotted upper note in a space must be staggered, the lower dot going to the space below");
      done();
   });

   it("Should still stagger the lower note when it is the only one dotted, or the dotted upper note is on a line", (done: Mocha.Done) => {
      // Measure 2, beat 3: an A4 over a dotted G4. Measure 3, beat 1: a dotted G4 over a dotted F4.
      const measures: VexFlowMeasure[] = renderMeasures();
      for (const [measureIndex, timestamp] of [[1, 0.5], [2, 0]]) {
         const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measures[measureIndex], timestamp);
         expect(gves.length).to.equal(2, `measure ${measureIndex + 1} at ${timestamp} should have two voices`);
         expect(noteX(gves, 2) - noteX(gves, 1)).to.be.greaterThan(1,
            `in measure ${measureIndex + 1} at ${timestamp}, the dotted lower note must be staggered, as before`);
      }
      done();
   });

});
