import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/** The middle line of the staff, where a rest of the only voice is: the bottom line is line 1, the top line 5. */
const middleLine: number = 3;

/**
 * The rests of a voice in a measure.
 * @param measures the first staff's measures of the score
 * @param measureNumber the measure's number
 * @param voiceId the voice's number in the MusicXML
 * @returns the graphical notes of the rests, in order
 */
function restsOf(measures: GraphicalMeasure[], measureNumber: number, voiceId: number): GraphicalNote[] {
   const rests: GraphicalNote[] = [];
   for (const staffEntry of measures[measureNumber - 1].staffEntries) {
      for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
         if (voiceEntry.parentVoiceEntry.ParentVoice.VoiceId === voiceId && voiceEntry.notes[0].sourceNote.isRest()) {
            rests.push(voiceEntry.notes[0]);
         }
      }
   }
   return rests;
}

/**
 * Checks the lines of a voice's rests in a measure: where OSMD places them, and that they are drawn there.
 * @param measures the first staff's measures of the score
 * @param measureNumber the measure's number
 * @param voiceId the voice's number in the MusicXML
 * @param lines the expected line of each rest (where VexFlow places the rest: a half rest sits on it, a whole rest hangs from it,
 *   a quarter rest is centered on it): 1 is the bottom line, 5 the top line, 0 and 6 the first ledger lines
 */
function expectRestLines(measures: GraphicalMeasure[], measureNumber: number, voiceId: number, lines: number[]): void {
   const rests: GraphicalNote[] = restsOf(measures, measureNumber, voiceId);
   expect(rests.length, `rests of voice ${voiceId} in measure ${measureNumber}`).to.equal(lines.length);
   const measure: VexFlowMeasure = measures[measureNumber - 1] as VexFlowMeasure;
   for (let i: number = 0; i < lines.length; i++) {
      const description: string = `rest ${i + 1} of voice ${voiceId} in measure ${measureNumber}`;
      expect(middleLine + rests[i].lineShift, `line of ${description}`).to.equal(lines[i]);
      // the drawn position: nothing moved the rest off the line afterwards. The top line is the stave's line 0.
      const drawnY: number = (rests[i].parentVoiceEntry as VexFlowVoiceEntry).vfStaveNote.getYs()[0];
      expect(drawnY, `drawn y of ${description}`).to.be.closeTo(measure.getVFStave().getYForLine(5 - lines[i]), 0.01);
   }
}

/**
 * Loads and renders a sample.
 * @param sample the file name in test/data
 * @returns the OSMD instance
 */
async function render(sample: string): Promise<OpenSheetMusicDisplay> {
   const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
   await osmd.load(TestUtils.getScore(sample));
   osmd.render();
   return osmd;
}

/**
 * The first staff's measures of a rendered score.
 * @param osmd the OSMD instance
 * @returns one measure per measure number
 */
function firstStaffMeasures(osmd: OpenSheetMusicDisplay): GraphicalMeasure[] {
   return osmd.GraphicSheet.MeasureList.map((staffMeasures: GraphicalMeasure[]) => staffMeasures[0]);
}

// A half rest sits on a line and a whole rest hangs from one. Next to the notes of another voice in the staff,
//   VexFlowConverter.StaveNote() moved them by the distances made for the shorter rests, into a space or out of the staff
//   without a ledger line, where the two can't be told apart (#893).
describe("VexFlow Converter - Half and whole rests of one of several voices", () => {
   let measures: GraphicalMeasure[];

   beforeAll(async () => {
      measures = firstStaffMeasures(await render("test_rests_second_voice_half_whole.musicxml"));
   });

   it("Puts a lower voice's half rest on a line below the notes, in the staff where there is room", () => {
      expectRestLines(measures, 1, 2, [1]); // under B4 on the middle line: on the bottom line
      expectRestLines(measures, 10, 2, [2]); // bass clef, under F3 on the fourth line: on the second line
      expectRestLines(measures, 3, 2, [-1, -1]); // under E4 on the bottom line and D4 below it: on the second ledger line
   });

   it("Puts an upper voice's half rest on a line above the notes, in the staff where there is room", () => {
      expectRestLines(measures, 2, 1, [4]); // over A4 in the second space: on the fourth line
      expectRestLines(measures, 4, 1, [6, 5]); // over E5 in the top space: on the first ledger line. Over D5: on the top line
   });

   it("Hangs a whole rest from a line next to the other voice's notes", () => {
      expectRestLines(measures, 5, 2, [1]); // measure rest under G4 to B4: from the bottom line
      expectRestLines(measures, 6, 1, [5]); // measure rest over A4 to C5: from the top line
      expectRestLines(measures, 9, 2, [0]); // whole rest in 4/2 under E4 on the bottom line: from the first ledger line
      expectRestLines(measures, 9, 1, [5]); // whole rest in 4/2 over B4: from the top line
   });

   it("Moves a centered measure rest away from the notes in the middle of the measure, not those at its start or end", () => {
      expectRestLines(measures, 12, 1, [4]); // over G4 A4 G4, an F5 at the end of the measure: from the fourth line
      expectRestLines(measures, 13, 1, [6]); // over C5 E5 D5 after a quarter rest: from the first ledger line above
   });

   it("Leaves the half rest of the only voice on the middle line", () => {
      expect(restsOf(measures, 8, 1)[0].lineShift).to.equal(0);
   });
});

// Behind Bars pp. 35-37: in double-stemmed writing, an upper voice's rests go above the middle of the staff and a lower voice's
//   below it, moving by whole line distances. OSMD moved the shorter rests only for notes starting at the same time, by half lines.
describe("VexFlow Converter - Rests of two voices", () => {
   let osmd: OpenSheetMusicDisplay;
   let measures: GraphicalMeasure[];

   beforeAll(async () => {
      osmd = await render("test_rests_two_voices_sides.musicxml");
      measures = firstStaffMeasures(osmd);
   });

   it("Moves an upper voice's rests a line distance up and a lower voice's down while the other voice sounds", () => {
      expectRestLines(measures, 1, 1, [4, 4]); // quarter rests over low notes of voice 2
      expectRestLines(measures, 2, 2, [2, 2]); // quarter rests under high notes of voice 1
      expectRestLines(measures, 7, 1, [4, 4, 4, 4]); // eighth and quarter rests while voice 2's half notes are held
      expectRestLines(measures, 11, 2, [2, 2, 2, 2]); // the same in voice 2, under voice 1's half notes
   });

   it("Moves a rest further out by whole line distances only to clear the other voice's notes", () => {
      expectRestLines(measures, 4, 1, [4, 4, 5, 5]); // eighth rests over F4, G4, A4, B4
      expectRestLines(measures, 5, 2, [1, 1, 2, 2]); // quarter rests under C5, D5, E5, F5 with up stems
   });

   it("Leaves rests of both voices at the same time and of the same duration in the middle, as one shared rest", () => {
      expect(restsOf(measures, 3, 1)[0].lineShift).to.equal(0);
      expect(restsOf(measures, 3, 2)[0].lineShift).to.equal(0);
      expect(restsOf(measures, 6, 1)[0].lineShift).to.equal(0); // measure rests
      expect(restsOf(measures, 6, 2)[0].lineShift).to.equal(0);
   });

   it("Keeps the rests in the middle with MultiVoiceRestOffset 0, unless notes are in the way", () => {
      osmd.EngravingRules.MultiVoiceRestOffset = 0;
      try {
         osmd.updateGraphic();
         osmd.render();
         const measuresWithoutOffset: GraphicalMeasure[] = firstStaffMeasures(osmd);
         expectRestLines(measuresWithoutOffset, 1, 1, [3, 3]);
         expectRestLines(measuresWithoutOffset, 5, 2, [1, 1, 2, 2]);
      } finally {
         osmd.EngravingRules.MultiVoiceRestOffset = 1;
         osmd.updateGraphic();
         osmd.render();
         measures = firstStaffMeasures(osmd);
      }
   });
});
