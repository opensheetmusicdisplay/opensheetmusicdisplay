/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowPedal } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import * as VF from "vexflow";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";

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

describe("VexFlow Measure - Pedal, Segno, Skyline", () => {
  it("pedal marking has non-empty glyph text after creation", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_pedal_signs.musicxml");

    // Find pedal objects
    const pedals: VexFlowPedal[] = [];
    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const sl: StaffLine = measure.ParentStaffLine;
        if (sl?.Pedals) {
          for (const p of sl.Pedals) {
            if (p) { pedals.push(p as VexFlowPedal); }
          }
        }
      }
    }

    expect(pedals.length, "should have at least one pedal").to.be.greaterThan(0);
    console.log(`Found ${pedals.length} pedal(s)`);

    for (const pedal of pedals) {
      console.log(`Pedal: startNote=${!!pedal.startNote} endNote=${!!pedal.endNote} ` +
        `startVfVoiceEntry=${!!pedal.startVfVoiceEntry} endVfVoiceEntry=${!!pedal.endVfVoiceEntry}`);

      // Verify notes are set
      expect(pedal.startNote, "pedal should have startNote").to.not.be.undefined;
      expect(pedal.endNote, "pedal should have endNote").to.not.be.undefined;

      // Create PedalMarking and check its properties
      const marking: VF.PedalMarking = pedal.getPedalMarking();
      expect(marking, "PedalMarking should be created").to.not.be.undefined;

      // Check the glyph text values
      const notes: VF.StaveNote[] = (marking as any).notes;
      console.log(`  PedalMarking notes: ${notes?.length ?? 0}`);
      const depressText: string = (marking as any).depressText;
      const releaseText: string = (marking as any).releaseText;
      console.log(`  depressText charCode: ${depressText?.charCodeAt?.(0)?.toString(16)}`);
      console.log(`  releaseText charCode: ${releaseText?.charCodeAt?.(0)?.toString(16)}`);

      // The default glyphs should be Ped () and * ()
      expect(depressText, "depressText should not be empty").to.not.be.empty;
      expect(releaseText, "releaseText should not be empty").to.not.be.empty;
      expect(depressText, "depressText should be the Ped glyph").to.equal("");
      expect(releaseText, "releaseText should be the release glyph").to.equal("");

      // Check type
      const type: number = (marking as any).type;
      console.log(`  type: ${type} (TEXT=1, BRACKET=2, MIXED=3)`);
    }
  });

  it("pedal bbox is tracked after calculation", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_pedal_signs.musicxml");

    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const sl: StaffLine = measure.ParentStaffLine;
        if (sl?.Pedals) {
          for (const p of sl.Pedals) {
            if (!p) { continue; }
            const bbox: BoundingBox = p.PositionAndShape;
            console.log(`Pedal bbox: relX=${bbox.RelativePosition.x.toFixed(3)} ` +
              `relY=${bbox.RelativePosition.y.toFixed(3)} ` +
              `w=${bbox.Size.width.toFixed(3)} h=${bbox.Size.height.toFixed(3)}`);
          }
        }
      }
    }
  });
});
