import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import * as VF from "vexflow";

describe("VexFlow Measure - Metronome Mark Collision", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const mxl: string = TestUtils.getMXL("OSMD_function_test_metronome_marks.mxl");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(mxl);
    osmd.render();
  });

  it("consecutive metronome marks should not overlap", () => {
    const tempoPositions: Array<{ measure: number, x: number, width: number, endX: number }> = [];
    const beginWidths: Array<{ measure: number, beginInstructionsWidth: number }> = [];
    const measureAreas: Array<{
      measure: number;
      noteStartX: number;
      noteEndX: number;
      staveRightX: number;
    }> = [];

    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const measure of staffLine.Measures) {
            if (!measure?.isVisible?.()) { continue; }
            const vfMeasure: any = measure;
            const vfStave: VF.Stave | undefined = vfMeasure.getVFStave?.();
            if (!vfStave) { continue; }

            // Record beginInstructionsWidth for each measure
            const biw: number = vfMeasure.beginInstructionsWidth ?? 0;
            beginWidths.push({
              measure: measure.MeasureNumber,
              beginInstructionsWidth: biw,
            });

            const noteStartX: number = vfStave.getNoteStartX();
            const noteEndX: number = vfStave.getNoteEndX();
            const staveRightX: number = vfStave.getX() + vfStave.getWidth();

            // Record StaveTempo positions
            const modifiers: VF.StaveModifier[] = vfStave.getModifiers();
            for (const mod of modifiers) {
              if (mod.getCategory() !== "StaveTempo") { continue; }
              const st: any = mod;
              const x: number = st.getX?.() ?? st.x ?? 0;
              const width: number = st.getWidth?.() ?? st.width ?? 0;
              tempoPositions.push({
                measure: measure.MeasureNumber,
                x,
                width,
                endX: x + width,
              });
            }

            measureAreas.push({
              measure: measure.MeasureNumber,
              noteStartX,
              noteEndX,
              staveRightX,
            });
          }
        }
      }
    }

    expect(tempoPositions.length, "should find 6 metronome marks").to.equal(6);

    // Each metronome mark's endX should not overlap the NEXT mark's startX
    for (let i: number = 1; i < tempoPositions.length; i++) {
      const prev: { measure: number, x: number, width: number, endX: number } = tempoPositions[i - 1];
      const curr: { measure: number, x: number, width: number, endX: number } = tempoPositions[i];
      expect(
        curr.x,
        `metronome mark m${curr.measure} (x=${curr.x.toFixed(2)}) ` +
        `should be after m${prev.measure} endX (${prev.endX.toFixed(2)})`,
      ).to.be.at.least(prev.endX - 1);
    }

    // Each measure's beginInstructionsWidth must include the StaveTempo width.
    // Without the fix, measures 2-6 had beginInstructionsWidth ~0.7 (only barline).
    // With the fix, all measures should have beginInstructionsWidth > 1.
    for (const bw of beginWidths) {
      expect(
        bw.beginInstructionsWidth,
        `measure ${bw.measure} beginInstructionsWidth (${bw.beginInstructionsWidth.toFixed(2)}) ` +
        "too small — StaveTempo width not counted in layout",
      ).to.be.greaterThan(1);
    }

    // Rest centering: each measure's note area must be within the stave bounds.
    // (Metronome marks fly ABOVE the stave — they may horizontally overlap
    // the note area without issue. Only rests must not overflow right barline.)
    for (const area of measureAreas) {
      expect(
        area.noteStartX,
        `measure ${area.measure} noteStartX must be < noteEndX ` +
        `(${area.noteStartX.toFixed(2)} >= ${area.noteEndX.toFixed(2)}) — no room for rest`,
      ).to.be.lessThan(area.noteEndX);

      expect(
        area.noteEndX,
        `measure ${area.measure} noteEndX (${area.noteEndX.toFixed(2)}) ` +
        `must be <= stave right edge (${area.staveRightX.toFixed(2)}) — rest overflows right barline`,
      ).to.be.at.most(area.staveRightX + 1);
    }
  });
});
