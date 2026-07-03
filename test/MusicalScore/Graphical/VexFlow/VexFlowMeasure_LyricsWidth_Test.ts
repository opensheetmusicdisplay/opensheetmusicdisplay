
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";

function buildGMS(path: string, renderLyrics: boolean = true): GraphicalMusicSheet {
  const score: any = TestUtils.getScore(path);
  const partwise: any = TestUtils.getPartWiseElement(score);
  const reader: MusicSheetReader = new MusicSheetReader();
  reader.rules.RenderLyrics = renderLyrics;
  const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
  const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
  const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
  calc.calculate();
  return gms;
}

function getMeasureWidths(gms: GraphicalMusicSheet): number[] {
  const widths: number[] = [];
  for (const vml of gms.MeasureList) {
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      widths.push(measure.PositionAndShape.Size.width);
      break; // one per column
    }
  }
  return widths;
}

describe("VexFlow Measure - Lyrics Width Inflation", () => {
  it("lyrics should not inflate measure widths beyond 2x (short notes four characters)", () => {
    const gmsWithLyrics: GraphicalMusicSheet =
      buildGMS("test_lyrics_spacing_short_notes_four_characters.musicxml", true);
    const gmsWithout: GraphicalMusicSheet =
      buildGMS("test_lyrics_spacing_short_notes_four_characters.musicxml", false);

    const withWidths: number[] = getMeasureWidths(gmsWithLyrics);
    const withoutWidths: number[] = getMeasureWidths(gmsWithout);

    expect(withWidths.length).to.equal(withoutWidths.length);

    let maxRatio: number = 0;
    let maxRatioMeasure: number = 0;
    for (let i: number = 0; i < withWidths.length; i++) {
      const ratio: number = withWidths[i] / withoutWidths[i];
      console.log(`  M${i + 1}: with=${withWidths[i].toFixed(1)} without=${withoutWidths[i].toFixed(1)} ratio=${ratio.toFixed(2)}`);
      if (ratio > maxRatio) {
        maxRatio = ratio;
        maxRatioMeasure = i + 1;
      }
    }
    console.log(`Max inflation ratio: ${maxRatio.toFixed(2)} at M${maxRatioMeasure}`);
    expect(maxRatio, `M${maxRatioMeasure}: ratio ${maxRatio.toFixed(2)} should be < 2.0`).to.be.lessThan(2.0);
  });

  it("lyrics should not inflate measure widths beyond 2x (Dichterliebe)", () => {
    const gmsWithLyrics: GraphicalMusicSheet =
      buildGMS("Dichterliebe01.xml", true);
    const gmsWithout: GraphicalMusicSheet =
      buildGMS("Dichterliebe01.xml", false);

    const withWidths: number[] = getMeasureWidths(gmsWithLyrics);
    const withoutWidths: number[] = getMeasureWidths(gmsWithout);

    expect(withWidths.length).to.equal(withoutWidths.length);

    let maxRatio: number = 0;
    let maxRatioMeasure: number = 0;
    for (let i: number = 0; i < withWidths.length; i++) {
      const ratio: number = withWidths[i] / withoutWidths[i];
      if (ratio > 1.3) {
        console.log(`  M${i + 1}: with=${withWidths[i].toFixed(1)} without=${withoutWidths[i].toFixed(1)} ratio=${ratio.toFixed(2)}`);
      }
      if (ratio > maxRatio) {
        maxRatio = ratio;
        maxRatioMeasure = i + 1;
      }
    }
    console.log(`Max inflation ratio: ${maxRatio.toFixed(2)} at M${maxRatioMeasure}`);
    expect(maxRatio, `M${maxRatioMeasure}: ratio ${maxRatio.toFixed(2)} should be < 2.0`).to.be.lessThan(2.0);
  });
});
