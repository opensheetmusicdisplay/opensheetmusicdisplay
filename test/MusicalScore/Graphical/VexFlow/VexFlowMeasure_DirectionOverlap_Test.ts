/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { SkyBottomLineCalculator } from "../../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
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
          section,
          stave: vfStave,
        });
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Direction Text vs Rehearsal Mark Overlap", () => {

  it("should place rehearsal mark above direction text (test_words_direction_lost)", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_words_direction_lost_when_first_instrument_invisible_1621.musicxml");
    const marks: RehearsalMarkInfo[] = collectRehearsalMarks(gms);

    expect(marks.length).to.be.greaterThan(0, "should have at least one rehearsal mark");

    const markA: RehearsalMarkInfo | undefined = marks.find(m => m.label === "A");
    expect(markA).to.not.be.undefined;
    if (!markA) { return; }

    expect(markA.measureNumber).to.equal(1, "rehearsal mark 'A' should be on measure 1");

    // Find the graphical measure and its parent StaffLine
    const stave: VF.Stave = markA.stave;
    let staffLine: StaffLine | undefined;
    for (const vml of gms.MeasureList) {
      if (!vml) { continue; }
      for (const measure of vml) {
        const vfMeasure: any = measure;
        if (vfMeasure.getVFStave?.() === stave) {
          staffLine = vfMeasure.ParentStaffLine;
          break;
        }
      }
      if (staffLine) { break; }
    }
    expect(staffLine).to.not.be.undefined;
    if (!staffLine) { return; }

    const sbc: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
    const skyLen: number = sbc.SkyLine.length;
    expect(skyLen).to.be.greaterThan(0, "skyline should be populated");

    // Compute rehearsal mark's box top in OSMD skyline y-units (0 = staff top, negative = above)
    const spacing: number = 10; // unitInPixels
    const staffTopVF: number = stave.getYForLine(0);
    const sectionAny: any = markA.section;
    const textHeight: number = sectionAny.height || 14;
    const descent: number = sectionAny.textMetrics?.actualBoundingBoxDescent || 3;
    const padding: number = sectionAny.padding || 2;
    // StaveSection.draw(): y = stave.getYForTopText(1.5) + yShift
    // box rect: y - height + headroom, where headroom = -descent
    // boxTop = stave.getYForTopText(1.5) + yShift - height - descent
    const boxTopVF: number = stave.getYForTopText(1.5) + markA.yShift - textHeight - 2 * padding - descent;
    const boxTopOsMd: number = (boxTopVF - staffTopVF) / spacing;

    // Rehearsal mark x range in OSMD units
    const labelWidthVF: number = sectionAny.width || (markA.label.length * 10 * 0.75 + 8);
    const xStartOsMd: number = stave.getX() / spacing + markA.xShift / spacing;
    const xEndOsMd: number = xStartOsMd + labelWidthVF / spacing;

    const skylineMin: number = sbc.getSkyLineMinInRange(xStartOsMd, xEndOsMd);

    // If there are above-staff elements (skylineMin < 0), the rehearsal mark
    // must be positioned completely above them.
    // boxTopOsMd must be ≤ skylineMin (more negative = higher above staff).
    if (skylineMin < 0 && skylineMin !== -Infinity) {
      expect(boxTopOsMd).to.be.at.most(skylineMin + 0.5,
        `Rehearsal mark box top y=${boxTopOsMd.toFixed(1)} (VF ${boxTopVF.toFixed(1)}) ` +
        `must be above skyline min y=${skylineMin.toFixed(1)}. ` +
        `staffTopVF=${staffTopVF.toFixed(1)} textHeight=${textHeight} descent=${descent} ` +
        `xShift=${markA.xShift} yShift=${markA.yShift}`);
    }
  });

});
