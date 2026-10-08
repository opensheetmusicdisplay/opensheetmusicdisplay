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

describe("VexFlow Measure - Three-Voice Stagger", () => {

   function renderMeasure(path: string, index: number = 0): VexFlowMeasure {
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      return gms.MeasureList[index][0] as VexFlowMeasure;
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

   it("Should not stagger a unison between two voices in a three-voice stave", (done: Mocha.Done) => {
      // Beat 1: voices 1 and 2 both play G4 (unison); voice 3 is a B3, a sixth below.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(renderMeasure("test_three_voice_unison_alignment.musicxml"), 0);
      expect(gves.length).to.equal(3, "beat 1 should have three voices");
      for (const voiceId of [2, 3]) {
         expect(noteX(gves, voiceId)).to.be.closeTo(noteX(gves, 1), 0.01,
            "unison/non-colliding notes should share their horizontal position (no stagger)");
      }
      done();
   });

   it("Should still stagger a genuine second-interval collision in a three-voice stave", (done: Mocha.Done) => {
      // Beat 2: voice 1 = A4, voice 2 = G4 (a second below) -> genuine collision.
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(renderMeasure("test_three_voice_unison_alignment.musicxml"), 0.25);
      expect(noteX(gves, 2) - noteX(gves, 1)).to.be.greaterThan(1,
         "a second-interval collision must still be staggered (noteheads cannot overlap)");
      done();
   });

   it("Should stagger the middle note by pitch, not by voice number", (done: Mocha.Done) => {
      // Beat 1: voice 1 = C4 (upper), voice 2 = C3 (lower), voice 3 = Bb3 (middle, a second below C4).
      const gves: VexFlowVoiceEntry[] = voiceEntriesAt(
         renderMeasure("test_three_voice_stagger_middle_by_pitch_traumerei_measure23.musicxml"), 0);
      expect(gves.length).to.equal(3, "beat 1 should have three voices");
      expect(noteX(gves, 3) - noteX(gves, 1)).to.be.greaterThan(1,
         "the Bb3 of voice 3 collides with the C4 of voice 1 a second above, so it must be staggered");
      expect(noteX(gves, 2)).to.be.closeTo(noteX(gves, 1), 0.01, "the upper and the lower voice stay in place");
      done();
   });

   it("Should stagger the lower note when only the middle and the lower note collide, whatever the voice numbers", (done: Mocha.Done) => {
      // Voice 1 = C5 (stem up). Below it, A4 and G4 (both stems down) a second apart:
      // beat 1 has the A4 in voice 2 and the G4 in voice 3, beat 3 the other way round.
      const measure: VexFlowMeasure = renderMeasure("test_three_voice_stagger_lower_second.musicxml");
      for (const [timestamp, middle, lower] of [[0, 2, 3], [0.5, 3, 2]]) {
         const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, timestamp);
         expect(gves.length).to.equal(3, `the beat at ${timestamp} should have three voices`);
         expect(noteX(gves, lower) - noteX(gves, 1)).to.be.greaterThan(1,
            `the G4 of voice ${lower} collides with the A4 a second above, so it must be staggered`);
         expect(noteX(gves, middle)).to.be.closeTo(noteX(gves, 1), 0.01,
            `the A4 of voice ${middle} stays on the beat under the C5`);
      }
      done();
   });

   it("Should stagger a dotted middle note rather than the lower note, which would cover its dot", (done: Mocha.Done) => {
      // Measure 2 is measure 1 with a dotted A4: voice 1 = C5 (stem up), A4 dotted and G4 (both stems down) a second apart.
      const measure: VexFlowMeasure = renderMeasure("test_three_voice_stagger_lower_second.musicxml", 1);
      for (const [timestamp, middle, lower] of [[0, 2, 3], [0.5, 3, 2]]) {
         const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measure, timestamp);
         expect(gves.length).to.equal(3, `the beat at ${timestamp} should have three voices`);
         expect(noteX(gves, middle) - noteX(gves, 1)).to.be.greaterThan(1,
            `the dotted A4 of voice ${middle} must be staggered, its dot next to its head`);
         expect(noteX(gves, lower)).to.be.closeTo(noteX(gves, 1), 0.01,
            `the G4 of voice ${lower} stays on the beat, clear of the A4's dot`);
      }
      done();
   });

});
