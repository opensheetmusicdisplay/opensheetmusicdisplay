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

describe("VexFlow Measure - Three-Voice Unison Alignment", () => {

   const path: string = "test_three_voice_unison_alignment.musicxml";

   function firstMeasure(): VexFlowMeasure {
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      return gms.MeasureList[0][0] as VexFlowMeasure;
   }

   // x-shift applied to a note's notehead within its ModifierContext.
   function xShift(gve: VexFlowVoiceEntry): number {
      return (gve.vfStaveNote as unknown as { xShift: number }).xShift;
   }

   function voiceEntriesAt(measure: VexFlowMeasure, timestampRealValue: number): VexFlowVoiceEntry[] {
      const staffEntry: GraphicalStaffEntry = measure.staffEntries.find(
         (se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestampRealValue) < 1e-6);
      expect(staffEntry, `expected a staff entry at timestamp ${timestampRealValue}`).to.not.be.undefined;
      return staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[];
   }

   it("Should not stagger a unison between two voices in a three-voice stave", (done: Mocha.Done) => {
      const measure: VexFlowMeasure = firstMeasure();
      // Beat 1: voices 1 and 2 both play G4 (unison); voice 3 is a G3 far below.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, 0);
      expect(gves.length).to.equal(3, "beat 1 should have three voices");
      for (const gve of gves) {
         expect(xShift(gve)).to.equal(0,
            "unison/non-colliding notes should share their horizontal position (no stagger x-shift)");
      }
      done();
   });

   it("Should still stagger a genuine second-interval collision in a three-voice stave", (done: Mocha.Done) => {
      const measure: VexFlowMeasure = firstMeasure();
      // Beat 2: voice 1 = A4, voice 2 = G4 (a second below) -> genuine collision.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, 0.25);
      const middle: VexFlowVoiceEntry = gves.find(
         (g) => g.parentVoiceEntry.ParentVoice.VoiceId === 2);
      expect(middle, "voice 2 should be present on beat 2").to.not.be.undefined;
      expect(xShift(middle)).to.be.greaterThan(0,
         "a second-interval collision must still be staggered (noteheads cannot overlap)");
      done();
   });

});
