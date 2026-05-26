/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
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

interface RestInfo {
  voiceId: number;
  staffId: number;
  measure: number;
  duration: string;
  xPos: number;
  centerXShift: number;
  glyphWidth: number;
  isWholeBar: boolean;
  hasAlignCenter: boolean;
  measureCenterX: number;
  contextX: number;
}

function collectRests(gms: GraphicalMusicSheet): RestInfo[] {
  const result: RestInfo[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      const vfStave: VF.Stave = (measure as any).getVFStave?.();
      const noteStartX: number = vfStave?.getNoteStartX?.() ?? 0;
      const noteEndX: number = vfStave?.getNoteEndX?.() ?? 0;
      const measureCenterX: number = noteStartX + (noteEndX - noteStartX) / 2;
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          for (const note of gve.notes) {
            if (!note.sourceNote.isRest()) { continue; }
            const vfNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
            const sn: any = vfNote.vfnote?.[0];
            if (!sn) { continue; }
            const tc: any = sn.getTickContext?.();
            result.push({
              voiceId: note.parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0,
              staffId: note.sourceNote.ParentStaff?.Id ?? 0,
              measure: measure.MeasureNumber,
              duration: sn.getDuration?.() ?? "?",
              xPos: sn.getAbsoluteX?.() ?? 0,
              centerXShift: sn.getCenterXShift?.() ?? 0,
              glyphWidth: sn.getGlyphWidth?.() ?? 0,
              isWholeBar: note.sourceNote.IsWholeMeasureRest ?? false,
              hasAlignCenter: (sn as any)._alignCenter ?? false,
              measureCenterX,
              contextX: tc?.getX?.() ?? 0,
            });
          }
        }
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Rest Positioning", () => {

  it("Should parse test_tie_direction with correct rest count", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    // 1 half rest (m1/staff1/voice1) + 1 whole rest (m1/staff2/voice5) +
    // 1 whole rest (m2/staff1/voice1) + 2 quarter rests (m2/staff2/voice5) = 5
    chai.expect(rests.length).to.equal(5,
      `expected 5 rests, got ${rests.length}`);
    done();
  });

  it("Should flag whole-measure rests with _alignCenter", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const alignCenterRests: RestInfo[] = rests.filter(r => r.hasAlignCenter);
    chai.expect(alignCenterRests.length).to.equal(2,
      `expected 2 rests with _alignCenter, got ${alignCenterRests.length}. ` +
      `Durations: ${rests.map(r => `m${r.measure}/v${r.voiceId}/s${r.staffId}=${r.duration} align=${r.hasAlignCenter}`).join(", ")}`);
    for (const r of alignCenterRests) {
      chai.expect(r.duration).to.equal("w",
        `alignCenter rest m${r.measure}/staff${r.staffId}/voice${r.voiceId}: expected "w" got "${r.duration}"`);
    }
    done();
  });

  it("Should center whole-bar rests within measure", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const wholeBarRests: RestInfo[] = rests.filter(r => r.hasAlignCenter);
    chai.expect(wholeBarRests.length).to.be.greaterThan(0,
      "need at least one alignCenter rest to test centering");
    for (const r of wholeBarRests) {
      const restGlyphCenter: number = r.xPos + r.glyphWidth / 2;
      const distFromCenter: number = Math.abs(restGlyphCenter - r.measureCenterX);
      chai.expect(distFromCenter).to.be.lessThan(5,
        `whole-bar rest m${r.measure}/staff${r.staffId}/voice${r.voiceId}: ` +
        `restGlyphCenter=${restGlyphCenter.toFixed(1)} measureCenter=${r.measureCenterX.toFixed(1)} ` +
        `dist=${distFromCenter.toFixed(1)} xPos=${r.xPos.toFixed(1)} cxs=${r.centerXShift.toFixed(1)}`);
    }
    done();
  });

  it("Half rest should be positioned after quarter notes in measure 1 voice 1", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const halfRest: RestInfo | undefined = rests.find(
      r => r.measure === 1 && r.voiceId === 1
    );
    chai.expect(halfRest).to.not.be.undefined,
      "should find rest in m1 voice1. " +
      `Got: ${rests.map(r => `m${r.measure}/v${r.voiceId}/${r.duration}`).join(", ")}`;
    if (halfRest) {
      chai.expect(halfRest.duration).to.equal("h",
        `m1/voice1 rest duration expected "h" got "${halfRest.duration}"`);
      chai.expect(halfRest.contextX).to.be.greaterThan(50,
        `half rest contextX=${halfRest.contextX.toFixed(1)} should be past measure start`);
      chai.expect(halfRest.glyphWidth).to.be.greaterThan(0,
        `half rest glyphWidth=${halfRest.glyphWidth} should be > 0`);
    }
    done();
  });

  it("Quarter rests should have valid positions in measure 2 voice 5", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const quarterRests: RestInfo[] = rests.filter(
      r => r.measure === 2 && r.voiceId === 5
    );
    chai.expect(quarterRests.length).to.equal(2,
      `expected 2 quarter rests in m2 voice5, got ${quarterRests.length}. ` +
      `Got: ${rests.filter(r => r.measure === 2).map(r => `v${r.voiceId}/${r.duration}`).join(", ")}`);
    for (const r of quarterRests) {
      chai.expect(r.duration).to.equal("q",
        `quarter rest duration expected "q" got "${r.duration}"`);
      chai.expect(r.glyphWidth).to.be.greaterThan(0,
        `quarter rest glyphWidth=${r.glyphWidth} should be > 0`);
    }
    done();
  });

});
