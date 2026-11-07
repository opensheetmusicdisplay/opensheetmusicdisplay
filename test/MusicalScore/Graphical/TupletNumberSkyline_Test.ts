import { expect } from "vitest";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { Tuplet } from "../../../src/MusicalScore/VoiceData/Tuplet";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The sky and bottom lines have the tuplet numbers that are drawn, not the ones left out (MusicSheetCalculator
 * .calculateTupletNumbers(), EngravingRules.TupletNumberLimitConsecutiveRepetitions). The geometric calculation measures the
 * lines from a draw of each measure, which drew every number: the numbers were left out only after it, so the lines had them.
 */
describe("Sky and bottom lines of tuplet numbers left out", () => {
   /** bass clef, m.1: G4 half in the top voice; four triplets of eighths (C3 B2 C3, stems up, then stems down) in the bottom voice */
   const sampleFilename: string = "test_tuplet_consecutive_simple.musicxml";
   let container: HTMLElement;

   beforeEach(() => {
      container = TestUtils.getDivElement(document);
   });
   afterEach(() => {
      container.remove();
   });

   /** a staff line's sky and bottom lines, and how many of their samples there are per unit (SkyBottomLineCalculator.SamplingUnit) */
   interface ILines { sky: number[], bottom: number[], samplingUnit: number }

   /** Renders the sample, with the repeated tuplet numbers left out or not, and returns its staff lines' sky and bottom lines,
    *  and for each tuplet whose number is left out, the staff line and the x range of its notes (relative to the staff line). */
   async function render(limitRepetitions: boolean): Promise<{lines: ILines[], hidden: {line: number, left: number, right: number}[]}> {
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
      osmd.EngravingRules.TupletNumberLimitConsecutiveRepetitions = limitRepetitions;
      await osmd.load(TestUtils.getScore(sampleFilename));
      osmd.render();
      const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).flatMap(system => system.StaffLines);
      const hiddenTuplets: Map<Tuplet, {line: number, left: number, right: number}> = new Map();
      staffLines.forEach((staffLine: StaffLine, line: number) => {
         for (const measure of staffLine.Measures as GraphicalMeasure[]) {
            for (const staffEntry of measure.staffEntries as GraphicalStaffEntry[]) {
               for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                  const tuplet: Tuplet = voiceEntry.notes[0]?.sourceNote.NoteTuplet;
                  if (!tuplet || tuplet.RenderTupletNumber) {
                     continue;
                  }
                  const x: number = measure.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x;
                  const range: {line: number, left: number, right: number} =
                     hiddenTuplets.get(tuplet) ?? { line, left: Infinity, right: -Infinity };
                  range.left = Math.min(range.left, x + staffEntry.PositionAndShape.BorderLeft);
                  range.right = Math.max(range.right, x + staffEntry.PositionAndShape.BorderRight);
                  hiddenTuplets.set(tuplet, range);
               }
            }
         }
      });
      return {
         lines: staffLines.map(staffLine => ({ sky: [...staffLine.SkyLine], bottom: [...staffLine.BottomLine],
            samplingUnit: staffLine.SkyBottomLineCalculator.SamplingUnit })),
         hidden: [...hiddenTuplets.values()],
      };
   }

   it("don't have the numbers of the repeated tuplets, which aren't drawn", async () => {
      const allNumbers: ILines[] = (await render(false)).lines;
      const { lines, hidden } = await render(true);
      expect(hidden.length, "tuplets whose number is left out").to.be.greaterThan(0);
      expect(lines.length, "staff lines").to.equal(allNumbers.length);
      lines.forEach((line: ILines, lineIndex: number) => {
         const samplingUnit: number = line.samplingUnit;
         const rangesOfLine: {left: number, right: number}[] = hidden.filter(range => range.line === lineIndex);
         /** how much closer to the staff the line is than with all numbers, at most, in a range of samples */
         const closer: (from: number, to: number) => number = (from, to) => {
            let most: number = 0;
            for (let i: number = Math.max(0, from); i < Math.min(line.sky.length, to); i++) {
               most = Math.max(most, line.sky[i] - allNumbers[lineIndex].sky[i], allNumbers[lineIndex].bottom[i] - line.bottom[i]);
            }
            return most;
         };
         for (const range of rangesOfLine) {
            // (the number is about 1.2 high: was 0, the same lines as with all numbers)
            expect(closer(Math.floor(range.left * samplingUnit), Math.ceil(range.right * samplingUnit)),
               `lines over the tuplet at ${range.left.toFixed(1)}-${range.right.toFixed(1)} without its number`).to.be.greaterThan(0.5);
         }
         // and the same lines everywhere else
         for (let i: number = 0; i < line.sky.length; i++) {
            const x: number = i / samplingUnit;
            if (rangesOfLine.some(range => x > range.left - 1 && x < range.right + 1)) {
               continue;
            }
            expect(closer(i, i + 1), `lines at ${x.toFixed(1)}, outside the tuplets without number`).to.be.lessThan(0.01);
         }
      });
   });
});
