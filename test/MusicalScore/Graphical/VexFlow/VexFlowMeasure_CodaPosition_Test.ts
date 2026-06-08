/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
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

describe("VexFlow Measure - Coda Position", () => {
  it("repetition instructions assigned to correct measures in test_staverepetitions_coda_etc", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_staverepetitions_coda_etc.musicxml");

    // Collect all VF.Repetition objects with their measure info
    interface RepInfo {
      measureIndex: number;
      measureNumber: string;
      vfType: number;
      position: number;
      xShift: number;
      x: number;
    }
    const repInfos: RepInfo[] = [];

    for (let mi: number = 0; mi < gms.MeasureList.length; mi++) {
      const measureList: VexFlowMeasure[] = gms.MeasureList[mi] as VexFlowMeasure[];
      for (const measure of measureList) {
        if (!measure) { continue; }
        const vfMeasure: VexFlowMeasure = measure as VexFlowMeasure;
        const stave: VF.Stave = (vfMeasure as any).stave as VF.Stave;
        if (!stave) { continue; }

        const modifiers: VF.StaveModifier[] = (stave as any).modifiers as VF.StaveModifier[];
        for (const mod of modifiers) {
          if ((mod as any).getCategory?.() === "Repetition") {
            repInfos.push({
              measureIndex: mi,
              measureNumber: (stave as any).MeasureNumber,
              vfType: (mod as any).symbolType,
              position: mod.getPosition(),
              xShift: (mod as any).xShift,
              x: (mod as any).x,
            });
          }
        }
      }
    }

    console.log("VF.Repetition objects found:");
    const vfTypeNames: Record<number, string> = {
      1: "NONE", 2: "CODA_LEFT", 3: "CODA_RIGHT", 4: "SEGNO_LEFT", 5: "SEGNO_RIGHT",
      6: "DC", 7: "DC_AL_CODA", 8: "DC_AL_FINE", 9: "DS", 10: "DS_AL_CODA",
      11: "DS_AL_FINE", 12: "FINE", 13: "TO_CODA",
    };
    const posNames: Record<number, string> = { 1: "LEFT", 2: "RIGHT", 5: "BEGIN", 6: "END" };
    for (const info of repInfos) {
      console.log(`  measure ${info.measureNumber} (idx ${info.measureIndex}): ` +
        `type=${vfTypeNames[info.vfType] ?? info.vfType} ` +
        `position=${posNames[info.position] ?? info.position} ` +
        `xShift=${info.xShift} x=${info.x}`);
    }

    // Dump stave geometry for measures with repetitions
    console.log("Stave geometry for measures with repetitions:");
    for (const info of repInfos) {
      const measureList: VexFlowMeasure[] = gms.MeasureList[info.measureIndex] as VexFlowMeasure[];
      const vfMeasure: VexFlowMeasure | undefined = measureList.find((m: VexFlowMeasure) => m !== undefined);
      if (!vfMeasure) { continue; }
      const stave: VF.Stave = (vfMeasure as any).stave as VF.Stave;
      const noteStartX: number = stave.getNoteStartX();
      const staveX: number = stave.getX();
      const staveWidth: number = stave.getWidth();
      const begModifiers: VF.StaveModifier[] = stave.getModifiers(VF.StaveModifier.Position.BEGIN);
      const endModifiers: VF.StaveModifier[] = stave.getModifiers(VF.StaveModifier.Position.END);
      console.log(`  measure ${info.measureNumber}: staveX=${staveX.toFixed(2)} ` +
        `noteStartX=${noteStartX.toFixed(2)} staveWidth=${staveWidth.toFixed(2)} ` +
        `numBegModifiers=${begModifiers.length} numEndModifiers=${endModifiers.length} ` +
        `endModifierXShift=${stave.getModifierXShift(VF.StaveModifier.Position.END).toFixed(2)}`);
    }

    // Expected from MusicXML:
    // Measure 0 (number=1): Segno at LEFT
    // Measure 1 (number=2): ToCoda - should be at measure 2
    // Measure 2 (number=3): DS_AL_CODA
    // Measure 3 (number=4): Coda at LEFT

    expect(repInfos.length, "should have 4 repetition instructions").to.equal(4);

    // Measure 1: Segno (should be SEGNO_LEFT at LEFT)
    const segno: RepInfo | undefined = repInfos.find((r: RepInfo) => r.vfType === VF.Repetition.type.SEGNO_LEFT);
    expect(segno, "should have SEGNO_LEFT").to.not.be.undefined;
    expect(segno!.measureNumber, "segno should be in measure 1").to.equal(1);
    expect(segno!.position, "segno should be at LEFT position").to.equal(VF.StaveModifier.Position.LEFT);

    // Measure 2: ToCoda
    const toCoda: RepInfo | undefined = repInfos.find((r: RepInfo) => r.vfType === (VF.Repetition as any).type.TO_CODA);
    expect(toCoda, "should have TO_CODA").to.not.be.undefined;
    expect(toCoda!.measureNumber, "to coda should be in measure 2").to.equal(2);

    // Measure 3: DS_AL_CODA
    const dsAlCoda: RepInfo | undefined = repInfos.find((r: RepInfo) => r.vfType === VF.Repetition.type.DS_AL_CODA);
    expect(dsAlCoda, "should have DS_AL_CODA").to.not.be.undefined;
    expect(dsAlCoda!.measureNumber, "D.S. al Coda should be in measure 3").to.equal(3);

    // Measure 4: Coda (should be CODA_LEFT at LEFT)
    const coda: RepInfo | undefined = repInfos.find((r: RepInfo) => r.vfType === VF.Repetition.type.CODA_LEFT);
    expect(coda, "should have CODA_LEFT").to.not.be.undefined;
    expect(coda!.measureNumber, "coda should be in measure 4").to.equal(4);
    expect(coda!.position, "coda should be at LEFT position").to.equal(VF.StaveModifier.Position.LEFT);
  });

  it("end-position repetition symbols are rendered within stave bounds", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_staverepetitions_coda_etc.musicxml");
    const offsetX: number = 12; // Repetition.text.offsetX

    for (let mi: number = 0; mi < gms.MeasureList.length; mi++) {
      const measureList: VexFlowMeasure[] = gms.MeasureList[mi] as VexFlowMeasure[];
      for (const measure of measureList) {
        if (!measure) { continue; }
        const vfMeasure: VexFlowMeasure = measure as VexFlowMeasure;
        const stave: VF.Stave = (vfMeasure as any).stave as VF.Stave;
        if (!stave) { continue; }

        const modifiers: VF.StaveModifier[] = (stave as any).modifiers as VF.StaveModifier[];
        for (const mod of modifiers) {
          if ((mod as any).getCategory?.() !== "Repetition") { continue; }

          const pos: number = mod.getPosition();
          const modX: number = (mod as any).x;
          const modWidth: number = (mod as any).width || 0;
          const modXShift: number = (mod as any).xShift || 0;
          const staveWidth: number = stave.getWidth();
          const measureNum: string = (stave as any).MeasureNumber;

          if (pos === VF.StaveModifier.Position.END) {
            // renderText computes: textX + this.x + this.xShift
            // drawSymbolText sets textX = -(this.width) - offsetX
            // So render left edge = -(width) - offsetX + modX + modXShift
            // render right edge = modX + modXShift - offsetX
            const renderLeft: number = -(modWidth) - offsetX + modX + modXShift;
            const renderRight: number = modX + modXShift - offsetX;
            console.log(`  END mod measure ${measureNum}: modX=${modX.toFixed(2)} ` +
              `modWidth=${modWidth.toFixed(2)} ` +
              `renderLeft=${renderLeft.toFixed(2)} renderRight=${renderRight.toFixed(2)} ` +
              `staveWidth=${staveWidth.toFixed(2)}`);

            // Rendered text should be within stave bounds
            expect(renderRight, `END repetition in measure ${measureNum} right edge past stave`)
              .to.be.at.most(staveWidth + 5);
            expect(renderLeft, `END repetition in measure ${measureNum} left edge before stave start`)
              .to.be.at.least(-5);
          }
        }
      }
    }
  });
});
