import { expect } from "vitest";
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
import * as VF from "vexflow";

const RESOLUTION: number = 16384;

describe("VexFlow Measure - Tuplet Voice Alignment", () => {

   it("Should normalize tick denominators for tuplet notes", () => {
      const path: string = "test_tuplet_multivoice_alignment.musicxml";
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();

      // Get the first measure
      expect(gms.MeasureList.length).to.be.greaterThan(0);
      expect(gms.MeasureList[0].length).to.be.greaterThan(0);
      const measure: VexFlowMeasure = gms.MeasureList[0][0] as VexFlowMeasure;

      // Verify that all notes have their tick denominators normalized to 1
      for (const staffEntry of measure.staffEntries) {
         for (const gve of staffEntry.graphicalVoiceEntries) {
            const vfVoiceEntry: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
            if (vfVoiceEntry.vfStaveNote) {
               const ticks: VF.Fraction = vfVoiceEntry.vfStaveNote.getTicks();
               expect(ticks.denominator).to.equal(1,
                  "All tick denominators should be normalized to 1");
            }
         }
      }
   });

   it("Should calculate correct tick values for tuplet notes based on graphical length", () => {
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

      expect(voiceIds.length).to.be.greaterThan(1, "Should have multiple voices");

      // Voice 1 should have 6 tuplet eighth notes, each with the same tick value
      const voice1: VF.Voice = vfVoices[voiceIds[0]];
      const voice1Tickables: VF.Tickable[] = voice1.getTickables();

      // All voice 1 notes should have identical tick values (tuplet eighths)
      const firstNoteTicks: number = voice1Tickables[0].getTicks().value();
      for (let i: number = 1; i < voice1Tickables.length; i++) {
         const tickValue: number = voice1Tickables[i].getTicks().value();
         expect(tickValue).to.equal(firstNoteTicks,
            "All tuplet eighths in voice 1 should have the same tick value");
      }
   });

   it("Should align notes at same timestamp in different voices", () => {
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

      expect(voice2QuarterNotePos).to.equal(voice1SecondNotePos,
         "Notes at the same timestamp in different voices should have the same cumulative tick position");
   });

   it("Should handle tuplets with different normal-type values correctly", () => {
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
                  const expectedTicks: number = Math.round(graphicalLength.RealValue * RESOLUTION);

                  expect(ticks.numerator).to.equal(expectedTicks,
                     "Tuplet note tick value should match its graphical length");
                  expect(ticks.denominator).to.equal(1,
                     "Tuplet note tick denominator should be 1");
               }
            }
         }
      }
   });

});

describe("VexFlow Measure - Cross-Staff Tuplet Alignment", () => {

   const path: string = "test_tuplet_crossstaff_alignment.musicxml";

   function calculateCrossStaffSheet(): GraphicalMusicSheet {
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

   it("Should fill a cross-staff tuplet gap with a ghost note of the exact tuplet length", () => {
      const gms: GraphicalMusicSheet = calculateCrossStaffSheet();
      // The lower staff is the second graphical measure of the first vertical measure.
      const bassMeasure: VexFlowMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
      const tupletVoice: VF.Voice = bassMeasure.vfVoices[2];
      expect(tupletVoice, "tuplet voice (id 2) should exist on the lower staff").to.not.be.undefined;

      // The third note of each triplet (G4) is notated on the upper staff, so the lower
      // staff fills that slot with a ghost note. A triplet eighth lasts RESOLUTION / 12 ticks.
      const tripletEighthTicks: number = VF.VexFlow.RESOLUTION / 12;
      const tickables: VF.Note[] = tupletVoice.getTickables() as VF.Note[];
      const ghostTickables: VF.Note[] = tickables.filter((t: VF.Note) => t.isRest());
      expect(ghostTickables.length).to.equal(2, "each of the two triplets should leave exactly one ghost-filled slot");
      for (const ghost of ghostTickables) {
         expect(ghost.getTicks().value()).to.be.closeTo(tripletEighthTicks, 0.001,
            "the cross-staff ghost note should be exactly one triplet eighth, not an overshooting dyadic decomposition");
      }

      // The whole voice should still add up to the measure length (2/4 = RESOLUTION / 2).
      const totalTicks: number = tickables.reduce((sum: number, t: VF.Note) => sum + t.getTicks().value(), 0);
      expect(totalTicks).to.be.closeTo(VF.VexFlow.RESOLUTION / 2, 0.001,
         "tuplet voice ticks should sum to the measure duration");
   });

   it("Should align the beat-2 tuplet note with the simultaneous note in the other voice", () => {
      const gms: GraphicalMusicSheet = calculateCrossStaffSheet();
      const bassMeasure: VexFlowMeasure = gms.MeasureList[0][1] as VexFlowMeasure;
      const tupletVoice: VF.Voice = bassMeasure.vfVoices[2];
      const eighthVoice: VF.Voice = bassMeasure.vfVoices[5];
      expect(eighthVoice, "eighth-note voice (id 5) should exist on the lower staff").to.not.be.undefined;

      // Cumulative tick position where each voice reaches beat 2 (a quarter into a 2/4 measure).
      const beat2Ticks: number = VF.VexFlow.RESOLUTION / 4;

      function cumulativePositions(voice: VF.Voice): number[] {
         const positions: number[] = [];
         let pos: number = 0;
         for (const tickable of voice.getTickables()) {
            positions.push(pos);
            pos += tickable.getTicks().value();
         }
         return positions;
      }
      const tupletPositions: number[] = cumulativePositions(tupletVoice);
      const eighthPositions: number[] = cumulativePositions(eighthVoice);

      // Both voices must have a note that starts exactly at beat 2; those starts must match.
      const tupletBeat2: number = tupletPositions.find((p: number) => Math.abs(p - beat2Ticks) < 0.001);
      const eighthBeat2: number = eighthPositions.find((p: number) => Math.abs(p - beat2Ticks) < 0.001);
      expect(eighthBeat2, "the eighth-note voice should have a note starting on beat 2").to.not.be.undefined;
      expect(tupletBeat2,
         "the tuplet voice's beat-2 note should start at the same tick position as the simultaneous eighth note")
         .to.not.be.undefined;
      expect(tupletBeat2).to.be.closeTo(eighthBeat2, 0.001,
         "notes at the same timestamp in different voices should share the same cumulative tick position");
   });

});
