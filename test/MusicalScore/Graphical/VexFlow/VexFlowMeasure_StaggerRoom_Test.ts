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
import {unitInPixels} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
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

   // the space between the right edge of the first note head and the left edge of the second, where they are drawn
   //   (a staggered note is drawn about a note head right of its beat), in units
   function gapBetween(first: VexFlowVoiceEntry, second: VexFlowVoiceEntry): number {
      const firstNote: any = first.vfStaveNote;
      const secondNote: any = second.vfStaveNote;
      return (secondNote.getNoteHeadBeginX() - firstNote.getNoteHeadEndX()) / unitInPixels;
   }

   // how far the voice entry's note head is drawn right of the other one's
   function shiftFrom(gve: VexFlowVoiceEntry, other: VexFlowVoiceEntry): number {
      return ((gve.vfStaveNote as any).getNoteHeadBeginX() - (other.vfStaveNote as any).getNoteHeadBeginX()) / unitInPixels;
   }

   it("Should give a staggered note as much room before the next note as a sixteenth that isn't moved", (done: Mocha.Done) => {
      // Measure 2: on each beat, voice 2's quarter is moved right, beside the sixteenth a second above it.
      const measure: VexFlowMeasure = renderMeasures()[1];
      for (const beat of [0, 0.25, 0.5, 0.75]) {
         const moved: VexFlowVoiceEntry = voiceEntry(measure, beat, 2);
         expect(shiftFrom(moved, voiceEntry(measure, beat, 1))).to.be.greaterThan(1, `at ${beat}, the quarter must be staggered`);
         const next: VexFlowVoiceEntry = voiceEntry(measure, beat + 1 / 16, 1);
         const afterNext: VexFlowVoiceEntry = voiceEntry(measure, beat + 2 / 16, 1);
         expect(gapBetween(moved, next)).to.be.at.least(gapBetween(next, afterNext) - 0.01,
            `at ${beat}, the moved quarter must get as much room before the next sixteenth as a sixteenth that isn't moved`);
      }
      done();
   });

   it("Should give a staggered middle voice note of three as much room before the next note as a sixteenth", (done: Mocha.Done) => {
      // Measure 3: on beats 1 and 3, voice 2's G4 eighth is moved right, beside voice 1's A4, and its F4 sixteenth follows.
      const measure: VexFlowMeasure = renderMeasures()[2];
      for (const beat of [0, 0.5]) {
         const moved: VexFlowVoiceEntry = voiceEntry(measure, beat, 2);
         expect(shiftFrom(moved, voiceEntry(measure, beat, 1))).to.be.greaterThan(1, `at ${beat}, the eighth must be staggered`);
         const next: VexFlowVoiceEntry = voiceEntry(measure, beat + 1 / 8, 2);
         const afterNext: VexFlowVoiceEntry = voiceEntry(measure, beat + 3 / 16, 2);
         expect(gapBetween(moved, next)).to.be.at.least(gapBetween(next, afterNext) - 0.01,
            `at ${beat}, the moved eighth must get at least as much room before the next note as a sixteenth`);
      }
      done();
   });

   it("Should give a tie from a staggered note as much room as one from a note that isn't moved", (done: Mocha.Done) => {
      // Measure 1: the G4 of beat 1 is moved right, beside the A4, and tied to the G4 of beat 2, which isn't moved.
      const measure: VexFlowMeasure = renderMeasures()[0];
      const moved: VexFlowVoiceEntry = voiceEntry(measure, 0, 2);
      const tiedTo: VexFlowVoiceEntry = voiceEntry(measure, 0.25, 2);
      expect(shiftFrom(moved, voiceEntry(measure, 0, 1))).to.be.greaterThan(1, "the G4 of beat 1 must be staggered");
      // the tie starts at the moved note head, not where the note would be without the move
      const movedNote: any = moved.vfStaveNote;
      expect(movedNote.getTieRightX()).to.be.closeTo(movedNote.getNoteHeadEndX(), 0.01);
      // the G4 of beat 2 is a quarter too, and isn't moved
      expect(gapBetween(moved, tiedTo)).to.be.at.least(gapBetween(tiedTo, voiceEntry(measure, 0.5, 2)) - 0.01,
         "the moved G4 must get as much room before the G4 it is tied to as the G4 of beat 2 before the next note");
      done();
   });

});
