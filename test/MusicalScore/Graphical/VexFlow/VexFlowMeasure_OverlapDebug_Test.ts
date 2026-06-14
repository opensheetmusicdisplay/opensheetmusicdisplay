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

describe("VexFlowMeasure - note overlap staggering", () => {
  it("whole and half note at same pitch get xShift to avoid overlap", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_note_overlap_staggering_whole_half.musicxml");
    for (const measureList of gms.MeasureList) {
      const vfMeasure: VexFlowMeasure = measureList[0] as VexFlowMeasure;
      if (!vfMeasure || !vfMeasure.getVFStave) { continue; }

      let wholeX: number = -1;
      let halfX: number = -1;
      for (const voiceId of Object.keys(vfMeasure.vfVoices)) {
        const voice: VF.Voice = vfMeasure.vfVoices[Number(voiceId)];
        for (const t of voice.getTickables()) {
          const note: any = t;
          if (note.isRest?.()) { continue; }
          const nhBeginX: number = note.getNoteHeadBeginX?.() ?? -1;
          if (note.duration === "w") {
            wholeX = nhBeginX;
          } else if (note.duration === "h") {
            halfX = nhBeginX;
          }
        }
      }
      expect(wholeX, "whole note noteHeadBeginX").to.be.greaterThan(0);
      expect(halfX, "half note noteHeadBeginX").to.be.greaterThan(0);
      // Half note should be shifted right of whole note to avoid overlap
      expect(halfX, "half note xShift applied: half note should be right of whole note")
        .to.be.greaterThan(wholeX);
    }
  });
});
