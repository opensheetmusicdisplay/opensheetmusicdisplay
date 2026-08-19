/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {GraphicalStaffEntry} from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import {GraphicalVoiceEntry} from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import {StemDirectionType} from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import {expect} from "chai";

describe("VexFlow Measure - Secondary Voice Stem Direction (issue #1719)", () => {

   const path: string = "test_secondary_voice_stem_direction.musicxml";

   // Measures 1 and 2 carry the identical F4 half note (no <stem>). Measure 1 uses
   // voice 1 (main voice); measure 2 uses voice 7, which OSMD parses as a LinkedVoice.
   // Each measure has one voice entry per staff entry, so neither note collides with
   // another voice and both should auto-stem (pitch-based), leaving WantedStemDirection
   // Undefined. The bug forced the lone linked voice in measure 2 stem-down.
   function graphicalMusicSheet(): GraphicalMusicSheet {
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      return gms;
   }

   // The single voice entry of measure `measureIndex` (staff 0), which holds the lone note.
   function loneVoiceEntry(gms: GraphicalMusicSheet, measureIndex: number): GraphicalVoiceEntry {
      const staffEntries: GraphicalStaffEntry[] = gms.MeasureList[measureIndex][0].staffEntries;
      expect(staffEntries.length, `measure ${measureIndex + 1} should have one staff entry`).to.equal(1);
      const gves: GraphicalVoiceEntry[] = staffEntries[0].graphicalVoiceEntries;
      expect(gves.length, `measure ${measureIndex + 1} staff entry should have one voice entry`).to.equal(1);
      return gves[0];
   }

   it("Should not force a lone secondary (linked) voice stem-down", (done: Mocha.Done) => {
      const gms: GraphicalMusicSheet = graphicalMusicSheet();
      const secondaryVoiceEntry: GraphicalVoiceEntry = loneVoiceEntry(gms, 1); // measure 2, voice 7
      expect(secondaryVoiceEntry.parentVoiceEntry.WantedStemDirection).to.equal(
         StemDirectionType.Undefined,
         "a linked voice alone at its staff entry must keep an undefined (auto) stem, not forced Down");
      done();
   });

   it("Should stem the lone secondary voice identically to the identical main-voice measure", (done: Mocha.Done) => {
      const gms: GraphicalMusicSheet = graphicalMusicSheet();
      const mainVoiceEntry: GraphicalVoiceEntry = loneVoiceEntry(gms, 0);      // measure 1, voice 1
      const secondaryVoiceEntry: GraphicalVoiceEntry = loneVoiceEntry(gms, 1); // measure 2, voice 7
      expect(secondaryVoiceEntry.parentVoiceEntry.WantedStemDirection).to.equal(
         mainVoiceEntry.parentVoiceEntry.WantedStemDirection,
         "identical notes should get the same stem treatment whether in the main or a secondary voice");
      done();
   });

});
