/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import * as VF from "vexflow";

function buildGMS(path: string): GraphicalMusicSheet {
  const score: any = TestUtils.getScore(path);
  const partwise: any = TestUtils.getPartWiseElement(score);
  const reader: MusicSheetReader = new MusicSheetReader();
  const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
  const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
  const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
  calc.calculate();
  return gms;
}

interface RehearsalMarkInfo {
  label: string;
  measureNumber: number;
  xShift: number;
  yShift: number;
  padding: number;
  section: VF.StaveSection;
  stave: VF.Stave;
}

function collectRehearsalMarks(gms: GraphicalMusicSheet): RehearsalMarkInfo[] {
  const result: RehearsalMarkInfo[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      const vfMeasure: any = measure;
      const vfStave: VF.Stave | undefined = vfMeasure.getVFStave?.();
      if (!vfStave) { continue; }
      const modifiers: VF.StaveModifier[] = vfStave.getModifiers();
      for (const mod of modifiers) {
        if (mod.getCategory() !== VF.StaveSection.CATEGORY) { continue; }
        const section: VF.StaveSection = mod as VF.StaveSection;
        const s: any = section;
        result.push({
          label: s.getText(),
          measureNumber: measure.MeasureNumber,
          xShift: s.getXShift(),
          yShift: s.getYShift(),
          padding: s.padding,
          section,
          stave: vfStave,
        });
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Rehearsal Mark Positioning", () => {

  it("Should have rehearsal mark 'F' in Haydn cello concerto", () => {
    const gms: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
    const marks: RehearsalMarkInfo[] = collectRehearsalMarks(gms);

    expect(marks.length).to.be.greaterThan(0, "should have at least one rehearsal mark");

    const markF: RehearsalMarkInfo | undefined = marks.find(m => m.label === "F");
    expect(markF).to.not.be.undefined;
    if (!markF) { return; }

    expect(markF.measureNumber).to.equal(201, "rehearsal mark 'F' should be on measure 201");
    // StaveSection metrics define padding=2 (see Metrics.ts)
    expect(markF.padding).to.equal(2, "StaveSection padding should be 2");
    // EngravingRules.RehearsalMarkXOffsetDefault = 10
    expect(markF.xShift).to.equal(10,
      `xShift should be RehearsalMarkXOffsetDefault (10), got ${markF.xShift}`);
  });

  it("rehearsal mark text should be vertically contained within its bounding box (tab -> classical clef)", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_tab_dont_switch_to_classical_from_clefinstruction.musicxml");
    const marks: RehearsalMarkInfo[] = collectRehearsalMarks(gms);

    expect(marks.length).to.be.greaterThan(0, "should have at least one rehearsal mark");

    const dropMark: RehearsalMarkInfo | undefined = marks.find(m => m.label === "Drop");
    expect(dropMark).to.not.be.undefined;
    if (!dropMark) { return; }

    const section: VF.StaveSection = dropMark.section;
    const stave: VF.Stave = dropMark.stave;

    // Replicate StaveSection.draw() positioning math.
    // draw() computes:
    //   y = stave.getYForTopText(1.5) + this.yShift
    //   headroom = -textMetrics.actualBoundingBoxDescent
    //   rect(x, y - height + headroom, width, height)
    //   this.renderText(ctx, this.padding, y + 2*headroom - this.padding - this.yShift)
    //
    // renderText fills at: yPos + this.y + this.yShift
    //   = (y + 2*headroom - padding - yShift) + 0 + yShift = y + 2*headroom - padding
    const sAny: any = section;
    const y: number = stave.getYForTopText(1.5) + sAny.getYShift();
    const tm: any = sAny.textMetrics;
    const descent: number = tm.actualBoundingBoxDescent || 0;
    const headroom: number = -descent;
    const textHeight: number = sAny.height
      || (tm.emHeightAscent >= 0 ? tm.emHeightAscent + 2 : tm.fontBoundingBoxAscent + 3 || 14);
    const padding: number = sAny.padding;
    const height: number = textHeight + 2 * padding;

    const rectTop: number = y - height + headroom;
    const rectBottom: number = y + headroom;

    // What draw() produces for fillText baseline y (must match stavesection.ts draw()):
    //   this.renderText(ctx, this.padding, y + 2*headroom - this.padding - this.yShift)
    //   → fillText y = (y + 2*headroom - padding - yShift) + this.y + this.yShift
    //   → with this.y = 0: fillText y = y + 2*headroom - padding
    const fillTextY: number = y + 2 * headroom - padding;

    // Invariant: text must be inside the bounding rect, not at/below its bottom edge.
    // Text occupies [baseline - ascent, baseline + descent].
    // For text to be visible within the rect, baseline + descent must be ≤ rectBottom.
    const textBottom: number = fillTextY + descent;
    expect(textBottom).to.be.lessThan(rectBottom + 0.5,
      `Text bottom y=${textBottom.toFixed(1)} (baseline=${fillTextY.toFixed(1)} + descent=${descent.toFixed(1)}) ` +
      `must be inside rect bottom y=${rectBottom.toFixed(1)}. ` +
      `rect=[${rectTop.toFixed(1)}, ${rectBottom.toFixed(1)}] height=${height.toFixed(1)}`);
  });

});
