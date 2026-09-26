import { expect } from "chai";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {TestUtils} from "../../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

// In 3/2, the alto (voice 2) leaves out a whole note or more with <forward>: before its note in measure 1,
//   after its note in measure 2, and between its notes in measure 3. Each gap is filled with a ghost note.
//   In measure 4, an invisible rest of five quarters is written as a dotted whole, so its ticks are corrected from its duration.
describe("VexFlow Measure - Voice gaps of a whole note or more", () => {

   const path: string = "test_voice_gaps_of_a_whole_note_or_more.musicxml";

   function calculateSheet(score: Document = TestUtils.getScore(path)): GraphicalMusicSheet {
      const partwise: Element = TestUtils.getPartWiseElement(score);
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      return gms;
   }

   /** The tick positions of the notes and rests (not the ghost notes) of a voice in a measure. */
   function notePositions(gms: GraphicalMusicSheet, measureIndex: number, staffIndex: number, voiceId: number): number[] {
      const positions: number[] = [];
      let position: number = 0;
      for (const tickable of (gms.MeasureList[measureIndex][staffIndex] as VexFlowMeasure).vfVoices[voiceId].getTickables()) {
         if (!(tickable instanceof VF.GhostNote)) {
            positions.push(position);
         }
         position += tickable.getTicks().value();
      }
      return positions;
   }

   it("Starts a note after a gap of a whole note or more at its time", (done: Mocha.Done) => {
      const gms: GraphicalMusicSheet = calculateSheet();
      expect(notePositions(gms, 0, 0, 2), "measure 1: the half note after a whole note's gap")
         .to.deep.equal([VF.RESOLUTION]);
      expect(notePositions(gms, 2, 0, 2), "measure 3: the second quarter note, after a quarter note and a whole note's gap")
         .to.deep.equal([0, VF.RESOLUTION * 5 / 4]);
      expect(notePositions(gms, 3, 0, 2), "measure 4: the quarter note after the invisible rest of five quarters")
         .to.deep.equal([0, VF.RESOLUTION * 5 / 4]);
      done();
   });

   it("Fills a voice up to the end of the measure after a gap of a whole note or more", (done: Mocha.Done) => {
      const gms: GraphicalMusicSheet = calculateSheet();
      const altoTicks: number = (gms.MeasureList[1][0] as VexFlowMeasure).vfVoices[2].getTickables().reduce(
         (sum: number, tickable: VF.Tickable) => sum + tickable.getTicks().value(), 0);
      expect(altoTicks, "measure 2: the half note and a whole note's gap fill the 3/2 measure").to.equal(VF.RESOLUTION * 3 / 2);
      done();
   });

   // A guitar part in 5/4 with a standard and a tablature staff, each with a whole rest and a quarter note.
   //   In a tablature staff, rests are ghost notes too.
   it("Starts a tablature note after a whole rest at its time", (done: Mocha.Done) => {
      const staff: (number: number, fret: string) => string = (number: number, fret: string): string =>
         `<note><rest/><duration>4</duration><voice>${number}</voice><type>whole</type><staff>${number}</staff></note>
         <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>${number}</voice>
            <type>quarter</type><staff>${number}</staff>${fret}</note>`;
      const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
         <part id="P1">
            <measure number="1">
               <attributes><divisions>1</divisions><time><beats>5</beats><beat-type>4</beat-type></time><staves>2</staves>
                  <clef number="1"><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>
                  <clef number="2"><sign>TAB</sign><line>5</line></clef>
                  <staff-details number="2"><staff-lines>6</staff-lines></staff-details></attributes>
               ${staff(1, "")}
               <backup><duration>5</duration></backup>
               ${staff(2, "<notations><technical><string>1</string><fret>0</fret></technical></notations>")}
            </measure>
         </part>
      </score-partwise>`;
      const gms: GraphicalMusicSheet = calculateSheet(new DOMParser().parseFromString(xml, "text/xml"));
      expect(notePositions(gms, 0, 0, 1), "the standard staff: the rest, then the note").to.deep.equal([0, VF.RESOLUTION]);
      expect(notePositions(gms, 0, 1, 2), "the tablature staff: the note after the rest").to.deep.equal([VF.RESOLUTION]);
      done();
   });
});
