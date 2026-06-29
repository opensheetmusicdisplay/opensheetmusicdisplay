
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

interface NoteEntry {
  x: number;
  width: number;
  ticks: number; // VF5 tick count (eighth=2048, quarter=4096 at resolution 4096)
}

describe("Mozart Anacrusis Note Distance", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("Mozart_AnChloe.xml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  /** Collect rendered note positions and VF5 tick durations. */
  function collectNotes(measure: any): NoteEntry[] {
    const result: NoteEntry[] = [];
    for (const se of measure.staffEntries as GraphicalStaffEntry[]) {
      for (const gve of se.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
        const vfNote: any = (gve as any).vfStaveNote;
        if (!vfNote) {
          continue;
        }
        const fm: any = vfNote.getFormatterMetrics?.();
        if (!fm?.duration) {
          continue;
        }
        const durStr: string = fm.duration as string;
        const parts: string[] = durStr.split("/");
        let ticks: number = 0;
        if (parts.length === 2) {
          ticks = parseInt(parts[0], 10) / parseInt(parts[1], 10);
        }
        const bbox: any = vfNote.getBoundingBox();
        result.push({
          x: bbox.x as number,
          width: (bbox.w ?? 0) as number,
          ticks,
        });
      }
    }
    return result;
  }

  it("anacrusis bar note gaps per tick match adjacent bar", () => {
    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          const meas0: any = staffLine.Measures.find(
            (m: any): boolean => m.MeasureNumber === 0,
          );
          const meas1: any = staffLine.Measures.find(
            (m: any): boolean => m.MeasureNumber === 1,
          );
          if (!meas0 || !meas1) {
            continue;
          }

          const notes0: NoteEntry[] = collectNotes(meas0);
          const notes1: NoteEntry[] = collectNotes(meas1);

          if (notes0.length < 2 || notes1.length < 2) {
            continue;
          }

          // Compute average gap per VF5 tick for consecutive notes in OSMD units.
          const avgGapPerTick: (notes: NoteEntry[]) => number = (notes: NoteEntry[]): number => {
            let total: number = 0;
            let count: number = 0;
            for (let i: number = 1; i < notes.length; i++) {
              const gapPx: number = notes[i].x - (notes[i - 1].x + notes[i - 1].width);
              const gapU: number = gapPx / unitInPixels;
              const ticks: number = notes[i].ticks;
              if (ticks > 0 && gapPx > 0) {
                total += gapU / ticks;
                count++;
              }
            }
            return count > 0 ? total / count : 0;
          };

          const gpt0: number = avgGapPerTick(notes0);
          const gpt1: number = avgGapPerTick(notes1);

          console.log(
            `M0: ${notes0.length} notes, gapPerTick=${gpt0.toFixed(6)} ` +
              `durations=[${notes0.map((n) => n.ticks).join(",")}] ` +
              `gaps=[${notes0.slice(1).map((n, i) =>
                ((n.x - (notes0[i].x + notes0[i].width)) / unitInPixels).toFixed(2),
              ).join(",")}]u`,
          );
          console.log(
            `M1: ${notes1.length} notes, gapPerTick=${gpt1.toFixed(6)} ` +
              `durations=[${notes1.map((n) => n.ticks).join(",")}] ` +
              `gaps=[${notes1.slice(1).map((n, i) =>
                ((n.x - (notes1[i].x + notes1[i].width)) / unitInPixels).toFixed(2),
              ).join(",")}]u`,
          );

          if (gpt1 > 0) {
            const ratio: number = gpt0 / gpt1;
            console.log(`  gapPerTick ratio M0/M1 = ${ratio.toFixed(3)}`);

            // Note gaps per tick should be similar between anacrusis and adjacent bar.
            // Currently M0 gets tighter spacing because VF5 formats sparse measures
            // more compactly. The anacrusis notes should have comparable breathing room.
            expect(
              ratio,
              `M0 gapPerTick=${gpt0.toFixed(6)} vs M1=${gpt1.toFixed(6)}, ratio=${ratio.toFixed(3)}`,
            ).to.be.at.least(0.7);

            return;
          }
        }
      }
    }

    expect.fail("no staff line with notes in both M0 and M1");
  });
});
