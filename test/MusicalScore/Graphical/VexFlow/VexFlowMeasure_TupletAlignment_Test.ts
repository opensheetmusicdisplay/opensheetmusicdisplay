/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {VexFlowVoiceEntry} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import {Note} from "../../../../src/MusicalScore/VoiceData/Note";
import {Fraction} from "../../../../src/Common/DataObjects/Fraction";
import Vex from "vexflow";
import VF = Vex.Flow;

describe("VexFlow Measure - Tuplet Voice Alignment", () => {

   it("Should normalize tick denominators for tuplet notes", (done: Mocha.Done) => {
      const path: string = "test_tuplet_multivoice_alignment.musicxml";
      const score: Document = TestUtils.getScore(path);
      chai.expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      chai.expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();

      // Get the first measure
      chai.expect(gms.MeasureList.length).to.be.greaterThan(0);
      chai.expect(gms.MeasureList[0].length).to.be.greaterThan(0);
      const measure: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;

      // Verify that all notes have their tick denominators normalized to 1
      for (const staffEntry of measure.staffEntries) {
         for (const gve of staffEntry.graphicalVoiceEntries) {
            const vfVoiceEntry: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
            if (vfVoiceEntry.vfStaveNote) {
               const ticks: VF.Fraction = vfVoiceEntry.vfStaveNote.getTicks();
               chai.expect(ticks.denominator).to.equal(1,
                  "All tick denominators should be normalized to 1");
            }
         }
      }

      done();
   });

   it("Should calculate correct tick values for tuplet notes based on graphical length", (done: Mocha.Done) => {
      const path: string = "test_tuplet_multivoice_alignment.musicxml";
      const score: Document = TestUtils.getScore(path);
      const partwise: Element = TestUtils.getPartWiseElement(score);
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();

      const measure: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;

      // Get voices from the VexFlow measure
      const vfVoices: { [voiceID: number]: VF.Voice } = measure.vfVoices;
      const voiceIds: string[] = Object.keys(vfVoices);

      chai.expect(voiceIds.length).to.be.greaterThan(1, "Should have multiple voices");

      // Voice 1 should have 6 tuplet eighth notes, each with the same tick value
      const voice1: VF.Voice = vfVoices[voiceIds[0]];
      const voice1Tickables: VF.Tickable[] = voice1.getTickables();

      // All voice 1 notes should have identical tick values (tuplet eighths)
      const firstNoteTicks: number = voice1Tickables[0].getTicks().value();
      for (let i: number = 1; i < voice1Tickables.length; i++) {
         const tickValue: number = voice1Tickables[i].getTicks().value();
         chai.expect(tickValue).to.equal(firstNoteTicks,
            "All tuplet eighths in voice 1 should have the same tick value");
      }

      done();
   });

   it("Should align notes at same timestamp in different voices", (done: Mocha.Done) => {
      const path: string = "test_tuplet_multivoice_alignment.musicxml";
      const score: Document = TestUtils.getScore(path);
      const partwise: Element = TestUtils.getPartWiseElement(score);
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();

      const measure: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;
      const vfVoices: { [voiceID: number]: VF.Voice } = measure.vfVoices;
      const voiceIds: string[] = Object.keys(vfVoices);

      // Get tickables from both voices
      const voice1Tickables: VF.Note[] = vfVoices[voiceIds[0]].getTickables();
      const voice2Tickables: VF.Note[] = vfVoices[voiceIds[1]].getTickables();

      // Calculate cumulative positions
      let voice1Pos: number = 0;
      const voice1Positions: number[] = [];
      for (const tickable of voice1Tickables) {
         voice1Positions.push(voice1Pos);
         voice1Pos += tickable.getTicks().value();
      }

      let voice2Pos: number = 0;
      const voice2Positions: number[] = [];
      for (const tickable of voice2Tickables) {
         voice2Positions.push(voice2Pos);
         voice2Pos += tickable.getTicks().value();
      }

      // Voice 2's first quarter note (at position voice2Positions[1])
      // should align with Voice 1's second eighth note (at position voice1Positions[1])
      // Both should be at the same cumulative tick position
      const voice1SecondNotePos: number = voice1Positions[1];
      const voice2QuarterNotePos: number = voice2Positions[1];

      chai.expect(voice2QuarterNotePos).to.equal(voice1SecondNotePos,
         "Notes at the same timestamp in different voices should have the same cumulative tick position");

      done();
   });

   it("Should handle tuplets with different normal-type values correctly", (done: Mocha.Done) => {
      const path: string = "test_tuplet_multivoice_alignment.musicxml";
      const score: Document = TestUtils.getScore(path);
      const partwise: Element = TestUtils.getPartWiseElement(score);
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();

      const measure: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;

      // Verify that tuplet notes with different normal-type (16th, 32nd)
      // are still calculated correctly based on their graphical length
      for (const staffEntry of measure.staffEntries) {
         for (const gve of staffEntry.graphicalVoiceEntries) {
            const vfVoiceEntry: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
            if (vfVoiceEntry.notes.length > 0 && vfVoiceEntry.notes[0].sourceNote) {
               const sourceNote: Note = vfVoiceEntry.notes[0].sourceNote;
               if (sourceNote.NoteTuplet && vfVoiceEntry.vfStaveNote) {
                  const ticks: VF.Fraction = vfVoiceEntry.vfStaveNote.getTicks();
                  const graphicalLength: Fraction = vfVoiceEntry.notes[0].graphicalNoteLength;
                  const expectedTicks: number = Math.round(graphicalLength.RealValue * VF.RESOLUTION);

                  chai.expect(ticks.numerator).to.equal(expectedTicks,
                     "Tuplet note tick value should match its graphical length");
                  chai.expect(ticks.denominator).to.equal(1,
                     "Tuplet note tick denominator should be 1");
               }
            }
         }
      }

      done();
   });

});
