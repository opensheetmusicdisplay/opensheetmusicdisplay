import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

// VexFlowConverter.StaveNote() moves the rest of an upper voice (1 or 5) above the notes of the other voices in its staff entry,
//   and the rest of another voice below them. A note of the other staff's voice crossing into the rest's staff moved the rest
//   towards that staff, out of its own: e.g. voice 5's rest on the lower staff above voice 1's notes, between the staves.
describe("VexFlow Converter - Rests next to cross-staff notes", () => {

   /**
    * Loads and renders a sample.
    * @param sample the file name of the sample in test/data
    * @returns the OSMD instance
    */
   async function render(sample: string): Promise<OpenSheetMusicDisplay> {
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore(sample));
      osmd.render();
      return osmd;
   }

   /**
    * The voice entry of a voice on the first beat of a measure.
    * @param measure the measure of one staff
    * @param voiceId the voice's number in the MusicXML
    * @returns the voice entry in the measure's first staff entry
    */
   function voiceEntryOnBeat1(measure: GraphicalMeasure, voiceId: number): VexFlowVoiceEntry {
      const voiceEntry: GraphicalVoiceEntry = measure.staffEntries[0].graphicalVoiceEntries.find(
         (gve: GraphicalVoiceEntry) => gve.parentVoiceEntry.ParentVoice.VoiceId === voiceId);
      expect(voiceEntry, `voice ${voiceId} on beat 1 of measure ${measure.MeasureNumber}`).to.not.be.undefined;
      return voiceEntry as VexFlowVoiceEntry;
   }

   /**
    * The y where VexFlow draws a note or rest (its first key).
    * @param voiceEntry the voice entry of the note or rest
    * @returns the y in VexFlow's (pixel) coordinates, growing downwards
    */
   function drawnY(voiceEntry: VexFlowVoiceEntry): number {
      return voiceEntry.vfStaveNote.getYs()[0];
   }

   /**
    * Checks that the rest of a voice on the first beat of a measure is drawn within the measure's staff lines,
    *   next to a visible note of the other staff's voice on the same beat.
    * @param measure the measure of the rest's staff
    * @param restVoiceId the rest's voice
    * @param crossStaffVoiceId the voice of the cross-staff note
    */
   function expectRestInStaff(measure: GraphicalMeasure, restVoiceId: number, crossStaffVoiceId: number): void {
      const rest: VexFlowVoiceEntry = voiceEntryOnBeat1(measure, restVoiceId);
      expect(rest.notes[0].sourceNote.isRest(), `voice ${restVoiceId} has a rest`).to.be.true;
      const crossStaffNote: VexFlowVoiceEntry = voiceEntryOnBeat1(measure, crossStaffVoiceId);
      expect(crossStaffNote.notes[0].sourceNote.isRest(), `voice ${crossStaffVoiceId} has a note`).to.be.false;
      const stave: VF.Stave = (measure as VexFlowMeasure).getVFStave();
      expect(drawnY(rest), `voice ${restVoiceId}'s rest in measure ${measure.MeasureNumber} between the top and bottom line`)
         .to.be.within(stave.getYForLine(0), stave.getYForLine(4));
   }

   it("Keeps voice 5's whole rest in the lower staff next to voice 1's notes crossing down into it", async () => {
      // voice 1's first triplet starts with two notes on the lower staff, voice 5 has a whole-measure rest there
      const osmd: OpenSheetMusicDisplay = await render("test_tuplet_crossstaff_first_triplet_number.musicxml");
      expectRestInStaff(osmd.GraphicSheet.MeasureList[0][1], 5, 1);
   });

   it("Keeps a rest in its staff next to a note of the other staff's voice crossing into it", async () => {
      const osmd: OpenSheetMusicDisplay = await render("test_rest_positioning_crossstaff_notes.musicxml");
      const measures: GraphicalMeasure[][] = osmd.GraphicSheet.MeasureList;
      // measure 1: voice 5's rest on the lower staff, voice 1's G3 crossing down. As an upper voice's rest, it went above G3.
      expectRestInStaff(measures[0][1], 5, 1);
      // measure 2: voice 2's rest on the upper staff, voice 5's A3 crossing up. As a lower voice's rest, it went below A3.
      expectRestInStaff(measures[1][0], 2, 5);
   });

   it("Still moves a rest past a note of the other staff's voice crossing into its staff, away from the other staff", async () => {
      const osmd: OpenSheetMusicDisplay = await render("test_rest_positioning_crossstaff_notes.musicxml");
      const measures: GraphicalMeasure[][] = osmd.GraphicSheet.MeasureList;
      // measure 3: voice 1's rest on the upper staff, above voice 5's B4 crossing up
      expect(drawnY(voiceEntryOnBeat1(measures[2][0], 1)), "voice 1's rest above voice 5's B4")
         .to.be.below(drawnY(voiceEntryOnBeat1(measures[2][0], 5)));
      // measure 4: voice 6's rest on the lower staff, below voice 1's G3 crossing down
      expect(drawnY(voiceEntryOnBeat1(measures[3][1], 6)), "voice 6's rest below voice 1's G3")
         .to.be.above(drawnY(voiceEntryOnBeat1(measures[3][1], 1)));
   });
});
