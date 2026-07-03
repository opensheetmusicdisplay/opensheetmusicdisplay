/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

describe("Grace Note X Spacing", () => {
  let osmd: OpenSheetMusicDisplay;

  beforeAll(async function (): Promise<void> {
        const score: Document = TestUtils.getScore("Beethoven_AnDieFerneGeliebte.xml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  it("grace note in measure 9 has enough x-space from preceding note", () => {
    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const measure of staffLine.Measures) {
            if (measure.MeasureNumber !== 9) {
              continue;
            }

            let prevNoteRightEdge: number | undefined;
            let hasGrace: boolean = false;

            for (const se of measure.staffEntries) {
              for (const gve of se.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                const vfNote: any = gve.vfStaveNote;
                if (!vfNote) {
                  continue;
                }
                const bbox: any = vfNote.getBoundingBox();
                const rightEdge: number = bbox.x + (bbox.w ?? 0);

                if (gve.parentVoiceEntry.IsGrace) {
                  hasGrace = true;
                  const graceLeft: number = bbox.x;
                  const gapPx: number = prevNoteRightEdge !== undefined
                    ? graceLeft - prevNoteRightEdge
                    : 999;
                  const gapUnits: number = gapPx / unitInPixels;

                  // Gap should be at least 0.8 OSMD units (8px) to prevent
                  // stem-notehead collision.
                  expect(
                    gapUnits,
                    `grace x=${bbox.x.toFixed(1)} gap=${gapPx.toFixed(1)}px = ${gapUnits.toFixed(2)}u (prevRightEdge=${prevNoteRightEdge?.toFixed(1)})`,
                  ).to.be.at.least(0.4);
                } else {
                  if (prevNoteRightEdge === undefined || rightEdge > prevNoteRightEdge) {
                    prevNoteRightEdge = rightEdge;
                  }
                }
              }
            }

            if (hasGrace) {
              expect(prevNoteRightEdge).to.not.be.undefined;
            }
          }
        }
      }
    }
  });
});
