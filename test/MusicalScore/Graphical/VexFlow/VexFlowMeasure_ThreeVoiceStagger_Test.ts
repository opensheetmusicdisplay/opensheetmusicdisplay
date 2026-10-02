/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {VexFlowVoiceEntry} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import {expect} from "chai";

describe("VexFlow Measure - Three-Voice Stagger", () => {

   const path: string = "test_three_voice_stagger_middle_by_pitch_traumerei_measure23.musicxml";

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
      return (gve.vfStaveNote as unknown as { x_shift: number }).x_shift;
   }

   it("Should stagger the middle note by pitch, not by voice number", (done: Mocha.Done) => {
      const measure: VexFlowMeasure = firstMeasure();
      // Beat 1: voice 1 = C4 (upper), voice 2 = C3 (lower), voice 3 = Bb3 (middle, a second below C4).
      const gves: VexFlowVoiceEntry[] = measure.staffEntries[0].graphicalVoiceEntries as VexFlowVoiceEntry[];
      expect(gves.length).to.equal(3, "beat 1 should have three voices");
      const byVoice: (id: number) => VexFlowVoiceEntry =
         (id: number) => gves.find((g) => g.parentVoiceEntry.ParentVoice.VoiceId === id);
      expect(xShift(byVoice(3))).to.be.greaterThan(0,
         "the Bb3 of voice 3 collides with the C4 of voice 1 a second above, so it must be staggered");
      expect(xShift(byVoice(1))).to.equal(0, "the upper voice stays in place");
      expect(xShift(byVoice(2))).to.equal(0, "the lower voice stays in place");
      done();
   });

});
