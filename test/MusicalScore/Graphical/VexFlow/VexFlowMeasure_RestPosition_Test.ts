/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
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
  yPos: number;
  centerXShift: number;
  glyphWidth: number;
  isWholeBar: boolean;
  hasAlignCenter: boolean;
  alignCenterFlag: boolean;
  measureCenterX: number;
  contextX: number;
  noteStartX: number;
  noteEndX: number;
  staveWidth: number;
  justifyWidth: number;
  osmdRelY: number;
  osmdBorderBottom: number;
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
      const staveWidth: number = vfStave?.getWidth?.() ?? 0;
      const justifyWidth: number = (vfStave as any)?.getJustifyWidth?.() ?? noteEndX - noteStartX;
      const measureCenterX: number = noteStartX + (noteEndX - noteStartX) / 2;
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          for (const note of gve.notes) {
            if (!note.sourceNote.isRest()) { continue; }
            const vfNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
            const sn: any = vfNote.vfnote?.[0];
            if (!sn) { continue; }
            const tc: any = sn.getTickContext?.();
            const ys: number[] = sn.getYs?.() ?? [];
            result.push({
              voiceId: note.parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0,
              staffId: note.sourceNote.ParentStaff?.Id ?? 0,
              measure: measure.MeasureNumber,
              duration: sn.getDuration?.() ?? "?",
              xPos: sn.getAbsoluteX?.() ?? 0,
              yPos: ys[0] ?? 0,
              centerXShift: sn.getCenterXShift?.() ?? 0,
              glyphWidth: sn.getGlyphWidth?.() ?? 0,
              isWholeBar: note.sourceNote.IsWholeMeasureRest ?? false,
              hasAlignCenter: sn.isCenterAligned?.() ?? false,
              alignCenterFlag: !!(sn as any)._alignCenter,
              measureCenterX,
              contextX: tc?.getX?.() ?? 0,
              noteStartX,
              noteEndX,
              staveWidth,
              justifyWidth,
              osmdRelY: note.parentVoiceEntry.PositionAndShape.RelativePosition.y,
              osmdBorderBottom: note.parentVoiceEntry.PositionAndShape.BorderBottom,
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
    expect(rests.length).to.equal(5,
      `expected 5 rests, got ${rests.length}`);
    done();
  });

  it("Should flag whole-measure rests with _alignCenter", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const alignCenterRests: RestInfo[] = rests.filter(r => r.hasAlignCenter && r.duration === "w");
    expect(alignCenterRests.length).to.equal(2,
      `expected 2 whole-bar rests with _alignCenter, got ${alignCenterRests.length}. ` +
      `Durations: ${rests.map(r => `m${r.measure}/v${r.voiceId}/s${r.staffId}=${r.duration} align=${r.hasAlignCenter}`).join(", ")}`);
    for (const r of alignCenterRests) {
      expect(r.duration).to.equal("w",
        `alignCenter rest m${r.measure}/staff${r.staffId}/voice${r.voiceId}: expected "w" got "${r.duration}"`);
    }
    done();
  });

  it("Should center whole-bar rests within measure", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const wholeBarRests: RestInfo[] = rests.filter(r => r.hasAlignCenter && r.duration === "w");
    expect(wholeBarRests.length).to.equal(2,
      `expected 2 whole-bar rests, got ${wholeBarRests.length}`);
    for (const r of wholeBarRests) {
      const restGlyphCenter: number = r.xPos + r.glyphWidth / 2;
      const distFromCenter: number = Math.abs(restGlyphCenter - r.measureCenterX);
      expect(distFromCenter).to.be.lessThan(5,
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
    expect(halfRest).to.not.be.undefined,
      "should find rest in m1 voice1. " +
      `Got: ${rests.map(r => `m${r.measure}/v${r.voiceId}/${r.duration}`).join(", ")}`;
    if (halfRest) {
      expect(halfRest.duration).to.equal("h",
        `m1/voice1 rest duration expected "h" got "${halfRest.duration}"`);
      expect(halfRest.contextX).to.be.greaterThan(50,
        `half rest contextX=${halfRest.contextX.toFixed(1)} should be past measure start`);
      expect(halfRest.glyphWidth).to.be.greaterThan(0,
        `half rest glyphWidth=${halfRest.glyphWidth} should be > 0`);
    }
    done();
  });

  it("Half rest should be centered within its time range (second half of measure)", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const halfRest: RestInfo | undefined = rests.find(
      r => r.measure === 1 && r.voiceId === 1 && r.duration === "h"
    );
    expect(halfRest).to.not.be.undefined,
      "should find half rest in m1 voice1. " +
      `Got: ${rests.map(r => `m${r.measure}/v${r.voiceId}/s${r.staffId}=${r.duration} align=${r.hasAlignCenter}`).join(", ")}`;

    if (halfRest) {
      // Half rest is NOT a whole-bar rest — _alignCenter must be false so the
      // formatter centering code will process it (guard checks !_alignCenter).
      expect(halfRest.alignCenterFlag).to.be.false,
        "half rest must NOT have _alignCenter flag (only whole-bar rests get it)";

      // Half rest should be slot-centered via centerXShift (not VF5 alignCenter,
      // which would incorrectly center to the measure center).
      // centerXShift > 0 confirms slot-based centering was applied.
      expect(halfRest.centerXShift).to.be.greaterThan(0,
        "half rest should have positive centerXShift after slot-based centering");

      // Half rest is the last tickable in voice 1, measure 1.
      // Its time slot spans from the rest's context X (in absolute coords)
      // to the end of the note area (noteEndX).
      // Expected glyph center = (slotStart + slotEnd) / 2.
      // The centering code computes centerXShift = (slotEnd - slotStart - glyphWidth) / 2
      // in context-relative coordinates (noteAreaEnd = noteEndX - noteStartX - padding).
      const padding: number = VF.Metrics.get("Stave.padding") as number ?? 5;
      const noteAreaEndContext: number = halfRest.noteEndX - halfRest.noteStartX - padding;
      const slotStartAbs: number = halfRest.contextX + halfRest.noteStartX + padding;
      const slotEndAbs: number = halfRest.noteEndX;
      const expectedGlyphCenter: number = (slotStartAbs + slotEndAbs) / 2;
      const restGlyphCenter: number = halfRest.xPos + halfRest.glyphWidth / 2;
      const distFromCenter: number = Math.abs(restGlyphCenter - expectedGlyphCenter);

      // Expected centerXShift in context-relative coords
      const expectedCxs: number = (noteAreaEndContext - halfRest.contextX - halfRest.glyphWidth) / 2;

      expect(halfRest.centerXShift).to.be.closeTo(expectedCxs, 0.5,
        "centerXShift mismatch: " +
        `cxs=${halfRest.centerXShift.toFixed(2)} expected=${expectedCxs.toFixed(2)} ` +
        `ctxX=${halfRest.contextX.toFixed(2)} nAreaEnd=${noteAreaEndContext.toFixed(2)} gw=${halfRest.glyphWidth.toFixed(2)}`);

      expect(distFromCenter).to.be.lessThan(0.5,
        "half rest m1/staff1/voice1: " +
        `restGlyphCenter=${restGlyphCenter.toFixed(2)} expectedCenter=${expectedGlyphCenter.toFixed(2)} ` +
        `dist=${distFromCenter.toFixed(2)} xPos=${halfRest.xPos.toFixed(2)} ` +
        `cxs=${halfRest.centerXShift.toFixed(2)} gw=${halfRest.glyphWidth.toFixed(2)} ` +
        `ctxX=${halfRest.contextX.toFixed(2)} padding=${padding} ` +
        `nsX=${halfRest.noteStartX.toFixed(2)} neX=${halfRest.noteEndX.toFixed(2)} ` +
        `sw=${halfRest.staveWidth.toFixed(2)} jw=${halfRest.justifyWidth.toFixed(2)}`);
    }
    done();
  });

  it("Whole-bar rest should be centered in chord+rest score", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_sorted_notes_chord_vexflow_keys_order.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const restIds: string = rests.map(
      x => `m${x.measure}/v${x.voiceId}/s${x.staffId}=${x.duration} ` +
        `align=${x.hasAlignCenter} flag=${x.alignCenterFlag} wb=${x.isWholeBar}`).join(", ");
    expect(rests.length).to.equal(1,
      `expected 1 rest, got ${rests.length}. Got: ${restIds}`);
    const r: RestInfo = rests[0];
    expect(r.duration).to.equal("w");
    expect(r.alignCenterFlag).to.be.true,
      "whole-bar rest must have _alignCenter flag";
    expect(r.hasAlignCenter).to.be.true,
      "whole-bar rest must be center-aligned";

    // Rest must share the same tick context as the chord (first context in measure),
    // not be pushed sequentially after it. Get chord's contextX for comparison.
    let chordContextX: number | undefined;
    for (const vml of gms.MeasureList) {
      if (chordContextX !== undefined) { break; }
      if (!vml) { continue; }
      for (const measure of vml) {
        if (!measure?.isVisible()) { continue; }
        for (const se of measure.staffEntries) {
          for (const gve of se.graphicalVoiceEntries) {
            for (const note of gve.notes) {
              if (note.sourceNote.isRest()) { continue; }
              const vfNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
              const sn: any = vfNote.vfnote?.[0];
              const tc: any = sn?.getTickContext?.();
              chordContextX = tc?.getX?.() ?? undefined;
              break;
            }
          }
        }
      }
    }
    expect(r.contextX).to.be.closeTo(chordContextX, 0.5,
      `rest contextX=${r.contextX.toFixed(2)} should match chord contextX=${chordContextX?.toFixed(2) ?? "undefined"}`);

    // Whole-bar rest must be centered in measure
    const restGlyphCenter: number = r.xPos + r.glyphWidth / 2;
    const distFromCenter: number = Math.abs(restGlyphCenter - r.measureCenterX);
    expect(distFromCenter).to.be.lessThan(0.5,
      `whole-bar rest not centered: restGlyphCenter=${restGlyphCenter.toFixed(2)} ` +
      `measureCenter=${r.measureCenterX.toFixed(2)} dist=${distFromCenter.toFixed(2)} ` +
      `xPos=${r.xPos.toFixed(2)} cxs=${r.centerXShift.toFixed(2)} ` +
      `gw=${r.glyphWidth.toFixed(2)} ctxX=${r.contextX.toFixed(2)} ` +
      `jw=${r.justifyWidth.toFixed(2)}`);

    // Detect Y shift in positions JSON (absY 17.6->19.6) caused by voice split.
    // applyBordersFromVexflow() stores boundingBox.y / unitInPixels as RelativePosition.y
    // when the stave is at y=0. Later, the stave gets its final Y during draw. Both
    // bboxY and (vfNoteY - stave.getY()) represent the note's Y relative to the stave origin,
    // so they should agree within glyph adjustment tolerance (~15px). If voice split
    // causes a stale bounding box (computed with wrong stave/noteheads), they diverge.
    const m: any = gms.MeasureList[0]?.[0];
    const stave: VF.Stave = m?.getVFStave?.();
    expect(stave).to.not.be.undefined, "stave must exist for Y check";
    const bboxY: number = r.osmdRelY * unitInPixels;
    const noteRelY: number = r.yPos - stave.getY();
    expect(bboxY).to.be.closeTo(noteRelY, 15,
      `rest Y shifted: bboxY=${bboxY.toFixed(1)} noteRelY=${noteRelY.toFixed(1)} ` +
      `(yPos=${r.yPos.toFixed(1)} - stave.getY()=${stave.getY().toFixed(1)}) ` +
      `diff=${Math.abs(bboxY - noteRelY).toFixed(1)} ` +
      `osmdRelY=${r.osmdRelY.toFixed(3)}`);

    done();
  });

  it("Quarter rests should have valid positions in measure 2 voice 5", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const quarterRests: RestInfo[] = rests.filter(
      r => r.measure === 2 && r.voiceId === 5
    );
    expect(quarterRests.length).to.equal(2,
      `expected 2 quarter rests in m2 voice5, got ${quarterRests.length}. ` +
      `Got: ${rests.filter(r => r.measure === 2).map(r => `v${r.voiceId}/${r.duration}`).join(", ")}`);
    for (const r of quarterRests) {
      expect(r.duration).to.equal("q",
        `quarter rest duration expected "q" got "${r.duration}"`);
      expect(r.glyphWidth).to.be.greaterThan(0,
        `quarter rest glyphWidth=${r.glyphWidth} should be > 0`);
    }
    done();
  });

});
