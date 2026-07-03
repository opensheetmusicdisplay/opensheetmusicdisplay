/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { SkyBottomLineCalculator } from "../../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowOctaveShift } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
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

describe("VexFlow Measure - Octave Shift Skyline Collision", () => {
  it("octave shift bbox has non-zero vertical extent (reproducer for missing skyline contribution)", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_octaveshift_notes_shifted_octave_shift_end.musicxml");

    const allOctaveShifts: VexFlowOctaveShift[] = [];
    for (const page of gms.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const o of staffLine.OctaveShifts) {
            if (o) { allOctaveShifts.push(o as VexFlowOctaveShift); }
          }
        }
      }
    }

    expect(allOctaveShifts.length, "should have octave shifts").to.be.greaterThan(0);

    // VF.TextBracket draws text + line ~2-4 units above/below the staff.
    // Zero height/zero borders means the skyline/bottomline can't see these
    // elements, causing undetected inter-staff collisions (e.g. bass stave
    // 8va text colliding with upper stave beams).
    for (const os of allOctaveShifts) {
      const bbox: BoundingBox = os.PositionAndShape;
      console.log(`OctaveShift type=${os.getOctaveShift.Type} ` +
        `size=${bbox.Size.width.toFixed(2)}×${bbox.Size.height.toFixed(2)} ` +
        `bt=${bbox.BorderTop?.toFixed(3)} bb=${bbox.BorderBottom?.toFixed(3)} ` +
        `bmt=${bbox.BorderMarginTop?.toFixed(3)} bmb=${bbox.BorderMarginBottom?.toFixed(3)}`);

      const hasVerticalExtent: boolean =
        bbox.Size.height > 0 ||
        bbox.BorderTop < 0 ||
        bbox.BorderBottom > 0 ||
        bbox.BorderMarginTop < 0 ||
        bbox.BorderMarginBottom > 0;
      expect(hasVerticalExtent,
        `octave shift type ${os.getOctaveShift.Type} should have non-zero vertical bbox extent`).to.be.true;
    }
  });

  it("lower staff skyline includes octave shift text height", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_octaveshift_notes_shifted_octave_shift_end.musicxml");

    for (const page of gms.MusicPages) {
      for (const system of page.MusicSystems) {
        const staffLines: StaffLine[] = system.StaffLines;
        for (let i: number = 0; i < staffLines.length; i++) {
          const staffLine: StaffLine = staffLines[i];
          if (staffLine.OctaveShifts.length === 0) { continue; }

          const calc: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
          const skyLine: number[] = calc.SkyLine;
          const skyMin: number = Math.min(...skyLine.filter(v => !isNaN(v)));

          // Compute how far the octave shift should extend above the staff:
          // VF.TextBracket for 8va draws at ~3 units above the staff top line.
          // The skyline for a staff with 8va should extend at least 2 units above
          // (0 = top of staff, negative = above).
          console.log(`StaffLine[${i}] OctaveShifts=${staffLine.OctaveShifts.length} ` +
            `skyLineMin=${skyMin.toFixed(3)} (negative = above staff top)`);

          // A skyline that doesn't account for octave shift text height means
          // inter-staff collision prevention can't work.
          // When fixed, skyMin should be < -2.0 for a staff with 8va text brackets.
          expect(skyMin, "skyline should extend above staff top to cover octave shift text")
            .to.be.lessThan(-2.0);
        }
      }
    }
  });
});
