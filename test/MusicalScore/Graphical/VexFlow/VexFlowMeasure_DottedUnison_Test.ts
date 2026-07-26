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

describe("VexFlow Measure - Dotted Unison Alignment", () => {

   const path: string = "test_dotted_unison_alignment.musicxml";

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
      return (gve.vfStaveNote as { getXShift?: () => number }).getXShift?.() ?? 0;
   }

   function voiceEntriesAt(measure: VexFlowMeasure, timestampRealValue: number): VexFlowVoiceEntry[] {
      const staffEntry: GraphicalStaffEntry = measure.staffEntries.find(
         (se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestampRealValue) < 1e-6);
      expect(staffEntry, `expected a staff entry at timestamp ${timestampRealValue}`).to.not.be.undefined;
      return staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[];
   }

   it("Allows modern VexFlow to stagger a unison whose two voices differ only in dot count", (done: Mocha.Done) => {
      const measure: VexFlowMeasure = firstMeasure();
      // Beat 1: voice 1 (dotted quarter G4) and voice 2 (quarter G4) form a unison.
      // Legacy downstream VexFlow patches forced these noteheads to overlap. Modern
      // VexFlow keeps them staggered, which is now the accepted/default behavior.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, 0);
      expect(gves.length).to.equal(2, "beat 1 should have two voices");
      expect(gves.some((gve) => xShift(gve) > 0)).to.equal(true,
         "modern VexFlow should be free to stagger dotted/plain unisons instead of forcing a shared column");
      done();
   });

});
