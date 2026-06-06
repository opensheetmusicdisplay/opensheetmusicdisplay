/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
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
        const section: any = mod;
        result.push({
          label: section.getText(),
          measureNumber: measure.MeasureNumber,
          xShift: section.getXShift(),
          yShift: section.getYShift(),
          padding: section.padding,
        });
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Rehearsal Mark Positioning", () => {

  it("Should have rehearsal mark 'F' in Haydn cello concerto", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
    const marks: RehearsalMarkInfo[] = collectRehearsalMarks(gms);

    expect(marks.length).to.be.greaterThan(0, "should have at least one rehearsal mark");

    const markF: RehearsalMarkInfo | undefined = marks.find(m => m.label === "F");
    expect(markF).to.not.be.undefined;
    if (!markF) { done(); return; }

    expect(markF.measureNumber).to.equal(201, "rehearsal mark 'F' should be on measure 201");
    // StaveSection metrics define padding=2 (see Metrics.ts)
    expect(markF.padding).to.equal(2, "StaveSection padding should be 2");
    // EngravingRules.RehearsalMarkXOffsetDefault = 10
    expect(markF.xShift).to.equal(10,
      `xShift should be RehearsalMarkXOffsetDefault (10), got ${markF.xShift}`);

    done();
  });

});
