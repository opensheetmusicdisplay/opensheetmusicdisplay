/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";

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

interface BuzzRollInfo {
  pitch: string;
  stemDir: number;
  stemLength: number;
  stemTipX: number;
  stemTipY: number;
  beamCount: number;
  hasStemSVG: boolean;
  measure: number;
}

function collectBuzzRolls(gms: GraphicalMusicSheet): BuzzRollInfo[] {
  const result: BuzzRollInfo[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          for (const note of gve.notes) {
            if (!note.sourceNote.TremoloInfo?.tremoloUnmeasured) { continue; }
            const vfNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
            const sn: any = vfNote.vfnote?.[0];
            const stemDir: number = sn?.getStemDirection?.() ?? 0;
            const stemLength: number = sn?.getStemLength?.() ?? 0;
            const stem: any = sn?.getStem?.();
            const beamCount: number = sn?.getBeamCount?.() ?? 0;
            const hasStemSVG: boolean = vfNote.getStemSVG?.() !== null;
            const pitchStr: string = note.sourceNote.Pitch?.ToStringShort(0) ?? "?";
            result.push({
              pitch: pitchStr,
              stemDir,
              stemLength,
              stemTipX: stem?.x_begin ?? 0,
              stemTipY: stem?.y_top ?? 0,
              beamCount,
              hasStemSVG,
              measure: measure.MeasureNumber,
            });
          }
        }
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Tremolo Buzz Roll", () => {

  it("Should parse 4 unmeasured tremolo (buzz roll) notes", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tremolo_unmeasured_buzz_roll.musicxml");
    const rolls: BuzzRollInfo[] = collectBuzzRolls(gms);
    expect(rolls.length).to.equal(4,
      `expected 4 buzz roll notes, got ${rolls.length}`);
    done();
  });

  it("Should have valid stem data for all buzz roll notes", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tremolo_unmeasured_buzz_roll.musicxml");
    const rolls: BuzzRollInfo[] = collectBuzzRolls(gms);

    for (const r of rolls) {
      expect(r.stemLength).to.be.greaterThan(0,
        `buzz roll note ${r.pitch} should have non-zero stem length, got ${r.stemLength}`);
    }
    done();
  });

  it("Should not lose buzz roll stem extensions when rendering", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tremolo_unmeasured_buzz_roll.musicxml");
    const rolls: BuzzRollInfo[] = collectBuzzRolls(gms);

    const expectedPitches: string[] = ["G1", "C2", "E2", "A1"];
    for (const expected of expectedPitches) {
      const found: BuzzRollInfo | undefined = rolls.find(r => r.pitch === expected);
      expect(found).to.not.be.undefined,
        `missing buzz roll on ${expected}`;
    }

    // Verify stem extents needed for z-drawing:
    // drawBuzzRolls uses stem tip x/y and stem length to position the z.
    for (const r of rolls) {
      expect(r.stemLength).to.be.greaterThan(0,
        `note ${r.pitch}: stem length must be > 0 for buzz roll`);
      expect(r.stemDir).to.not.equal(0,
        `note ${r.pitch}: stem direction must be set`);
    }

    done();
  });

});
