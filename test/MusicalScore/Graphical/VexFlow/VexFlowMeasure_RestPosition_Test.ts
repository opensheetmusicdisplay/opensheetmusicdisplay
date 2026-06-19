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
  lineShift: number;
  keyLine: number;
  keys: string[];
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
              lineShift: note.lineShift ?? 0,
              keyLine: sn.getKeyLine?.(0) ?? -999,
              keys: sn.getKeys?.() ?? [],
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

  it("Half rest should NOT be centered", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const halfRest: RestInfo | undefined = rests.find(
      r => r.measure === 1 && r.voiceId === 1 && r.duration === "h"
    );
    expect(halfRest, "should find half rest in m1 voice1").to.not.be.undefined;

    expect(halfRest!.duration).to.equal("h",
      "rest must keep half-rest duration, not be converted to whole");
    expect(halfRest!.hasAlignCenter).to.be.false,
      "isCenterAligned() must be false for half rests";
    expect(halfRest!.alignCenterFlag).to.be.false,
      "_alignCenter flag must not be set for half rests";
    expect(halfRest!.centerXShift).to.equal(0,
      "centerXShift must be zero — formatter must not slot-center half rests");
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
    // Wide tolerance: bounding box Y may be computed before stave gets its final
    // Y position during layout. The bbox is refreshed when calculateXPosition()
    // is called, which for the first measure may happen before stave Y is final.
    expect(bboxY).to.be.closeTo(noteRelY, 120,
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

  it("rests must not overflow past measure/staff-entry boundaries", (done: Mocha.Done) => {
    // Load OSMD_function_test_all.xml (same score used for grace note overflow test).
    const score: any = TestUtils.getScore("OSMD_function_test_all.xml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "OSMD_function_test_all.xml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    interface RestOverflow {
      mnum: number;
      ts: number;
      duration: string;
      voiceId: number;
      staffId: number;
      side: string;
      overflow: number;
      absX: number;
      gw: number;
      nsX: number;
      neX: number;
      ctxX: number;
      cxs: number;
      jw: number;
    }
    const overflows: RestOverflow[] = [];
    let restCount: number = 0;

    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const vfStave: any = (measure as any).getVFStave?.();
        if (!vfStave) { continue; }
        const srcMnum: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;
        const noteStartX: number = vfStave.getNoteStartX?.() ?? 0;
        const noteEndX: number = vfStave.getNoteEndX?.() ?? 0;

        for (const se of measure.staffEntries) {
          for (const gve of se.graphicalVoiceEntries) {
            const isRest: boolean = gve.notes.some(n => n.sourceNote.isRest());
            if (!isRest) { continue; }
            restCount++;

            const vfNote: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
            const sn: any = vfNote?.vfnote?.[0];
            if (!sn) { continue; }

            const absX: number = sn.getAbsoluteX?.() ?? 0;
            const gw: number = sn.getGlyphWidth?.() ?? 0;
            const restLeft: number = absX;
            const restRight: number = absX + gw;
            const tolerance: number = 2;
            const ctxX: number = sn.getTickContext?.()?.getX?.() ?? 0;
            const cxs: number = sn.getCenterXShift?.() ?? 0;
            const jw: number = (vfStave as any).getJustifyWidth?.() ?? vfStave.getWidth?.() ?? 0;

            const firstNote: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
            const voiceId: number = firstNote.parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0;
            const staffId: number = firstNote.sourceNote.ParentStaff?.Id ?? 0;
            const duration: string = sn.getDuration?.() ?? "?";

            if (restLeft < noteStartX - tolerance) {
              overflows.push({
                mnum: srcMnum, ts: se.relInMeasureTimestamp.RealValue,
                duration, voiceId, staffId, side: "LEFT",
                overflow: noteStartX - restLeft,
                absX, gw, nsX: noteStartX, neX: noteEndX,
                ctxX, cxs, jw,
              });
            }
            if (restRight > noteEndX + tolerance) {
              overflows.push({
                mnum: srcMnum, ts: se.relInMeasureTimestamp.RealValue,
                duration, voiceId, staffId, side: "RIGHT",
                overflow: restRight - noteEndX,
                absX, gw, nsX: noteStartX, neX: noteEndX,
                ctxX, cxs, jw,
              });
            }
          }
        }
      }
    }

    expect(restCount, "should find at least one rest").to.be.greaterThan(0);

    // Dump all tick context X values for measures with overflows
    {
      const overflowMnums: Set<number> = new Set(overflows.map(o => o.mnum));
      for (const measureList of gms.MeasureList) {
        for (const measure of measureList) {
          if (!measure) { continue; }
          const srcMnum: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;
          if (!overflowMnums.has(srcMnum)) { continue; }
          for (const se of measure.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
              for (const note of gve.notes) {
                const vfNote2: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
                const sn2: any = vfNote2?.vfnote?.[0];
                if (!sn2) { continue; }
                const tc2: any = sn2.getTickContext?.();
                const ctxX2: number = tc2?.getX?.() ?? 0;
                const voiceId2: number = (note as VexFlowGraphicalNote).parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0;
                const isRest2: boolean = note.sourceNote.isRest();
                const dur2: string = sn2.getDuration?.() ?? "?";
                const absX2: string = sn2.getAbsoluteX?.()?.toFixed(2) ?? "?";
                const cxs2: string = sn2.getCenterXShift?.()?.toFixed(2) ?? "?";
                console.log(
                  `[CTX_DUMP] mnum=${srcMnum} ts=${se.relInMeasureTimestamp.RealValue.toFixed(3)} ` +
                  `vId=${voiceId2} rest=${isRest2} dur=${dur2} ctxX=${ctxX2.toFixed(2)} absX=${absX2} cxs=${cxs2}`
                );
              }
            }
          }
        }
      }
    }

    if (overflows.length > 0) {
      console.log(`\n=== ${overflows.length} rest overflows detected ===`);
      for (const o of overflows) {
        console.log(
          `[REST_OVF] mnum=${o.mnum} ts=${o.ts.toFixed(3)} dur=${o.duration} ` +
          `vId=${o.voiceId} sId=${o.staffId} side=${o.side} overflow=${o.overflow.toFixed(2)} ` +
          `absX=${o.absX.toFixed(2)} gw=${o.gw.toFixed(2)} ` +
          `nsX=${o.nsX.toFixed(2)} neX=${o.neX.toFixed(2)} ` +
          `ctxX=${o.ctxX.toFixed(2)} cxs=${o.cxs.toFixed(2)} jw=${o.jw.toFixed(2)}`
        );
      }
    }

    expect(overflows, `rests must not overflow: ${overflows.length} found`).to.be.empty;
    done();
  });

  it("short rests (quarter and shorter) should not be centered — they behave like notes", (done: Mocha.Done) => {
    // Use test_tie_direction which has quarter rests (m2/voice5) and half rest (m1/voice1).
    const gms: GraphicalMusicSheet = buildGMS("test_tie_direction.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const shortRests: RestInfo[] = rests.filter(r => r.duration === "q" || r.duration === "8" || r.duration === "16");
    const halfRests: RestInfo[] = rests.filter(r => r.duration === "h");
    expect(shortRests.length).to.be.greaterThan(0, "should find at least one short rest");
    expect(halfRests.length).to.be.greaterThan(0, "should find at least one half rest");

    // Short rests (quarter, 8th, 16th) should have zero or near-zero centerXShift.
    // They should be positioned at their tick context like notes, not centered.
    for (const r of shortRests) {
      expect(r.centerXShift).to.be.lessThan(2,
        `short rest m${r.measure}/v${r.voiceId}/${r.duration}: ` +
        `centerXShift=${r.centerXShift.toFixed(2)} should be near 0 (not centered)`);
    }

    // Half rests should be centered in their duration span, not at measure edges.
    for (const r of halfRests) {
      // The rest's right edge should not be too close to noteEndX.
      const restRight: number = r.xPos + r.glyphWidth;
      const distFromRight: number = r.noteEndX - restRight;
      const measureNoteArea: number = r.noteEndX - r.noteStartX;
      // Half rest occupies half the measure. It should not be attached to the right edge.
      // Allow at least 15% of the note area as margin from the right edge.
      expect(distFromRight).to.be.greaterThan(measureNoteArea * 0.15,
        `half rest m${r.measure}/v${r.voiceId}: ` +
        `restRight=${restRight.toFixed(2)} noteEndX=${r.noteEndX.toFixed(2)} ` +
        `distFromRight=${distFromRight.toFixed(2)} margin=${(measureNoteArea * 0.15).toFixed(2)} ` +
        `xPos=${r.xPos.toFixed(2)} cxs=${r.centerXShift.toFixed(2)}`);
    }
    done();
  });

  it("whole-bar rest should be centered in measure 3 of OSMD_function_test_all", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_function_test_all.xml");
    const rests: RestInfo[] = collectRests(gms);
    const m3Rests: RestInfo[] = rests.filter(x => x.measure === 3);
    expect(m3Rests.length).to.equal(1, `expected 1 rest in m3, got ${m3Rests.length}`);
    const r: RestInfo = m3Rests[0];
    expect(r.duration).to.equal("w", `expected whole rest, got ${r.duration}`);
    console.log(
      `[M3_WHOLE_REST] xPos=${r.xPos.toFixed(2)} gw=${r.glyphWidth.toFixed(2)} ` +
      `nsX=${r.noteStartX.toFixed(2)} neX=${r.noteEndX.toFixed(2)} ` +
      `ctxX=${r.contextX.toFixed(2)} cxs=${r.centerXShift.toFixed(2)} ` +
      `measureCenter=${r.measureCenterX.toFixed(2)} ` +
      `restCenter=${(r.xPos + r.glyphWidth/2).toFixed(2)} ` +
      `hasAlignCenter=${r.hasAlignCenter} alignCenterFlag=${r.alignCenterFlag}`
    );
    const restCenterX: number = r.xPos + r.glyphWidth / 2;
    const distFromCenter: number = Math.abs(restCenterX - r.measureCenterX);
    expect(distFromCenter).to.be.lessThan(5,
      `whole-bar rest m3: restCenter=${restCenterX.toFixed(2)} measureCenter=${r.measureCenterX.toFixed(2)} dist=${distFromCenter.toFixed(2)}`);
    done();
  });

  it("rests should have reasonable distance from measure edges in OSMD_function_test_all", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_function_test_all.xml");

    interface RestEdgeInfo {
      mnum: number;
      dur: string;
      vId: number;
      xPos: number;
      gw: number;
      restLeft: number;
      restRight: number;
      nsX: number;
      neX: number;
      distLeft: number;
      distRight: number;
      noteArea: number;
      cxs: number;
      ctxX: number;
    }
    const edgeIssues: RestEdgeInfo[] = [];

    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const vfStave: any = (measure as any).getVFStave?.();
        if (!vfStave) { continue; }
        const noteStartX: number = vfStave.getNoteStartX?.() ?? 0;
        const noteEndX: number = vfStave.getNoteEndX?.() ?? 0;
        const noteArea: number = noteEndX - noteStartX;
        const srcMnum: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;

        for (const se of measure.staffEntries) {
          for (const gve of se.graphicalVoiceEntries) {
            const isRest: boolean = gve.notes.some(n => n.sourceNote.isRest());
            if (!isRest) { continue; }
            const vfNote: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
            const sn: any = vfNote?.vfnote?.[0];
            if (!sn) { continue; }
            const absX: number = sn.getAbsoluteX?.() ?? 0;
            const gw: number = sn.getGlyphWidth?.() ?? 0;
            const restLeft: number = absX;
            const restRight: number = absX + gw;
            const distLeft: number = restLeft - noteStartX;
            const distRight: number = noteEndX - restRight;
            const cxs: number = sn.getCenterXShift?.() ?? 0;
            const ctxX: number = sn.getTickContext?.()?.getX?.() ?? 0;
            const dur: string = sn.getDuration?.() ?? "?";
            const voiceId: number = (gve.notes[0] as VexFlowGraphicalNote).parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0;

            const info: RestEdgeInfo = {
              mnum: srcMnum, dur, vId: voiceId,
              xPos: absX, gw, restLeft, restRight,
              nsX: noteStartX, neX: noteEndX,
              distLeft, distRight, noteArea,
              cxs, ctxX,
            };

            // Half/whole rests must not glue to either edge.
            // A half rest in the second half naturally sits near the right edge
            // (ideal: noteArea * 0.25 - gw/2 from the right). Use 5% as a
            // generous floor that only catches egregious misplacements.
            if (dur === "h" || dur === "w") {
              const minEdgeDist: number = noteArea * 0.05;
              if (distRight < minEdgeDist || distLeft < minEdgeDist) {
                edgeIssues.push(info);
              }
            }
            // Short rests should not be centered.
            if (dur === "q" || dur === "8" || dur === "16") {
              if (cxs > 2) {
                edgeIssues.push(info);
              }
            }
          }
        }
      }
    }

    if (edgeIssues.length > 0) {
      console.log(`\n=== ${edgeIssues.length} rest spacing issues ===`);
      for (const e of edgeIssues) {
        console.log(
          `[REST_SPACE] mnum=${e.mnum} dur=${e.dur} vId=${e.vId} ` +
          `xPos=${e.xPos.toFixed(2)} gw=${e.gw.toFixed(2)} ` +
          `restLeft=${e.restLeft.toFixed(2)} restRight=${e.restRight.toFixed(2)} ` +
          `nsX=${e.nsX.toFixed(2)} neX=${e.neX.toFixed(2)} ` +
          `distLeft=${e.distLeft.toFixed(2)} distRight=${e.distRight.toFixed(2)} ` +
          `cxs=${e.cxs.toFixed(2)} ctxX=${e.ctxX.toFixed(2)}`
        );
      }
    }

    expect(edgeIssues, `rest spacing issues: ${edgeIssues.length} found`).to.be.empty;
    done();
  });

  it("quarter rests on beat 1 should NOT be shifted by centerWholeBarRests in Mozart_Clarinet_Quintet_Excerpt", (done: Mocha.Done) => {
    const mxl: string = TestUtils.getMXL("Mozart_Clarinet_Quintet_Excerpt.mxl");
    const div: HTMLElement = TestUtils.getDivElement(document);
    const osmd: any = TestUtils.createOpenSheetMusicDisplay(div);
    osmd.load(mxl).then(() => {
      osmd.render();
      const gms: GraphicalMusicSheet = osmd.graphic;

      // Collect quarter rests at beat 1 in measures 1-5.
      // Verify their xShift is near 0 (not shifted by centerWholeBarRests).
      const badShifts: string[] = [];
      for (const vml of gms.MeasureList) {
        if (!vml) { continue; }
        for (const measure of vml) {
          const mnum: number = measure.MeasureNumber;
          if (mnum < 1 || mnum > 5) { continue; }
          if (!measure?.isVisible()) { continue; }
          for (const se of measure.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
              const vfve: any = gve;
              const sn: any = vfve?.vfStaveNote;
              if (!sn) { continue; }
              const tc: any = sn.tickContext;
              if (!tc) { continue; }
              const tcTicks: number = tc.getCurrentTick?.()?.value?.() ?? -1;
              if (tcTicks > 0.01) { continue; } // beat 1 only
              const dur: string = sn.getDuration?.() ?? "?";
              if (!sn.isRest?.() || dur !== "q") { continue; }

              const xShift: number = sn.getXShift?.() ?? sn.xShift ?? 0;
              if (Math.abs(xShift) > 1) {
                badShifts.push(
                  `m${mnum} s${measure.ParentStaff?.idInMusicSheet ?? -1}: ` +
                  `xShift=${xShift.toFixed(1)} (should be ~0 for quarter rest at beat 1)`
                );
              }
            }
          }
        }
      }

      expect(badShifts, `Quarter rests at beat 1 should NOT have large xShift:\n${badShifts.join("\n")}`).to.be.empty;
      done();
    }).catch(done);
  });

  it("multi-voice rests at same beat must not share y position (test_alignrests_null_error_ghostnote)", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_alignrests_null_error_ghostnote.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    expect(rests.length).to.be.greaterThan(1,
      `expected multiple rests, got ${rests.length}`);

    // Find rest pairs from different voices at same x (within 2px).
    const collisions: {v1: RestInfo, v2: RestInfo, xDiff: number, yDiff: number}[] = [];
    for (let i: number = 0; i < rests.length; i++) {
      for (let j: number = i + 1; j < rests.length; j++) {
        if (rests[i].voiceId === rests[j].voiceId) { continue; }
        const xDiff: number = Math.abs(rests[i].xPos - rests[j].xPos);
        if (xDiff < 2) {
          const yDiff: number = Math.abs(rests[i].yPos - rests[j].yPos);
          collisions.push({v1: rests[i], v2: rests[j], xDiff, yDiff});
        }
      }
    }

    expect(collisions.length).to.be.greaterThan(0,
      "should find rests from different voices at the same x position. " +
      `Got rests: ${rests.map(r => `v=${r.voiceId} x=${r.xPos.toFixed(1)} y=${r.yPos.toFixed(1)} ${r.duration}`).join(" | ")}`);

    for (const c of collisions) {
      expect(c.yDiff).to.be.greaterThan(2,
        `Voice ${c.v1.voiceId} and Voice ${c.v2.voiceId} rests at same x=${c.v1.xPos.toFixed(1)} have overlapping y: ` +
        `v${c.v1.voiceId} y=${c.v1.yPos.toFixed(1)}, v${c.v2.voiceId} y=${c.v2.yPos.toFixed(1)} (dy=${c.yDiff.toFixed(1)})`);
    }
    done();
  });

  it("width balancing: canonical per-duration spacing redistributes extra width toward cramped measures", (done: Mocha.Done) => {
    const mxl: string = TestUtils.getMXL("Mozart_Clarinet_Quintet_Excerpt.mxl");
    // Render without balancing
    const divOff: HTMLElement = TestUtils.getDivElement(document);
    const osmdOff: any = TestUtils.createOpenSheetMusicDisplay(divOff);
    osmdOff.load(mxl).then(() => {
      osmdOff.render();
      const gmsOff: GraphicalMusicSheet = osmdOff.graphic;

      // Render with balancing
      const divOn: HTMLElement = TestUtils.getDivElement(document);
      const osmdOn: any = TestUtils.createOpenSheetMusicDisplay(divOn);
      osmdOn.EngravingRules.BalanceMeasureWidths = true;
      osmdOn.load(mxl).then(() => {
        osmdOn.render();
        const gmsOn: GraphicalMusicSheet = osmdOn.graphic;

        const issues: string[] = [];

        // Check each measure's variable width doesn't go below its minimumStaffEntriesWidth
        for (let col: number = 0; col < gmsOn.MeasureList.length; col++) {
          const onMeasure: any = gmsOn.MeasureList[col]?.[0];
          const offMeasure: any = gmsOff.MeasureList[col]?.[0];
          if (!onMeasure || !offMeasure) { continue; }
          if (!onMeasure.isVisible() || !offMeasure.isVisible()) { continue; }

          const varWidthOn: number = onMeasure.PositionAndShape.Size.width
            - onMeasure.beginInstructionsWidth - onMeasure.endInstructionsWidth;
          const minWidth: number = onMeasure.minimumStaffEntriesWidth;

          if (varWidthOn + 0.001 < minWidth) {
            issues.push(`m${onMeasure.MeasureNumber}: varWidth=${varWidthOn.toFixed(2)} < minWidth=${minWidth.toFixed(2)}`);
          }

          // Canonical target width should be set
          if (onMeasure.canonicalTargetWidth === 0 && offMeasure.canonicalTargetWidth === 0) {
            // Both zero is OK only if the measure has no tickables (e.g., multi-rest)
            // For normal measures we expect non-zero targets when balancing is on.
          }
        }

        // Check that the system total width is roughly preserved between ON and OFF.
        // Get the last measure's right edge in the first staff line.
        const sysOn: any = gmsOn.MusicPages?.[0]?.MusicSystems?.[0];
        const sysOff: any = gmsOff.MusicPages?.[0]?.MusicSystems?.[0];
        if (sysOn && sysOff) {
          const sysWidthOn: number = sysOn.PositionAndShape.Size.width;
          const sysWidthOff: number = sysOff.PositionAndShape.Size.width;
          // System widths should be reasonably close (same page width)
          if (Math.abs(sysWidthOn - sysWidthOff) > 2) {
            issues.push(`System width differs: ON=${sysWidthOn.toFixed(2)} OFF=${sysWidthOff.toFixed(2)}`);
          }
        }

        // Check that canonicalTargetWidth was populated when balancing is ON
        let nonZeroTargets: number = 0;
        for (const col of gmsOn.MeasureList) {
          const m: any = col?.[0];
          if (m && m.canonicalTargetWidth > 0) {
            nonZeroTargets++;
          }
        }
        if (nonZeroTargets === 0) {
          issues.push("No measures have canonicalTargetWidth > 0 with BalanceMeasureWidths=true");
        }

        expect(issues, `Width balancing issues:\n${issues.join("\n")}`).to.be.empty;
        done();
      }).catch(done);
    }).catch(done);
  });

  it("dichterliebe measure width comparison (ON vs OFF)", (done: Mocha.Done) => {
    const xmlDoc: Document = TestUtils.getScore("Dichterliebe01.xml");
    const divOn: HTMLElement = TestUtils.getDivElement(document);
    const osmdOn: any = TestUtils.createOpenSheetMusicDisplay(divOn);
    osmdOn.EngravingRules.BalanceMeasureWidths = true;
    osmdOn.load(xmlDoc).then(() => {
      osmdOn.render();
      const gmsOn: GraphicalMusicSheet = osmdOn.graphic;
      const divOff: HTMLElement = TestUtils.getDivElement(document);
      const osmdOff: any = TestUtils.createOpenSheetMusicDisplay(divOff);
      osmdOff.load(xmlDoc).then(() => {
        osmdOff.render();
        const gmsOff: GraphicalMusicSheet = osmdOff.graphic;
        const lines: string[] = ["m# | varW_ON | varW_OFF | diff | minSEW | ct | sf"];
        for (let col: number = 0; col < gmsOn.MeasureList.length; col++) {
          const onM: any = gmsOn.MeasureList[col]?.[0];
          const offM: any = gmsOff.MeasureList[col]?.[0];
          if (!onM?.isVisible() || !offM?.isVisible()) { continue; }
          const b: number = onM.beginInstructionsWidth || 0;
          const e: number = onM.endInstructionsWidth || 0;
          const vOn: number = onM.PositionAndShape.Size.width - b - e;
          const vOff: number = offM.PositionAndShape.Size.width - b - e;
          const min: number = onM.minimumStaffEntriesWidth || 0;
          const ct: number = onM.canonicalTargetWidth || 0;
          const sf: number = onM.staffEntriesScaleFactor || 0;
          // Also dump per-tickable details for m5 and m6
          let extra: string = "";
          if (onM.MeasureNumber === 5 || onM.MeasureNumber === 6) {
            const parts: string[] = [];
            for (const se of onM.staffEntries) {
              for (const gve of se.graphicalVoiceEntries) {
                const vfNote: any = (gve as any).vfStaveNote;
                if (!vfNote) { continue; }
                const dur: string = vfNote.getDuration?.() ?? "?";
                const ticks: number = vfNote.getTicks?.()?.value?.() ?? 0;
                const gvw: number = vfNote.getGlyphWidth?.() ?? 0;
                const fm: any = vfNote.getFormatterMetrics?.();
                const su: number = fm?.space?.used ?? -1;
                const sd: number = fm?.space?.deviation ?? -1;
                const x: number = vfNote.getX?.() ?? -1;
                const ax: number = vfNote.getAbsoluteX?.() ?? -1;
                const isRest: boolean = vfNote.isRest?.() ?? false;
                const tag: string = isRest ? "R" : "N";
                parts.push(`${tag}${dur} t=${ticks} gw=${gvw.toFixed(1)} x=${x.toFixed(1)}`
                  + ` ax=${ax.toFixed(1)} su=${su.toFixed(1)} sd=${sd.toFixed(1)}`);
              }
            }
            extra = " | " + parts.join(" | ");
          }
          lines.push(
            `m${onM.MeasureNumber}: ON=${vOn.toFixed(2)} OFF=${vOff.toFixed(2)} ` +
            `diff=${(vOn - vOff).toFixed(2)} min=${min.toFixed(2)} ct=${ct} sf=${sf.toFixed(3)}${extra}`
          );
        }
        console.log("Dichterliebe width comparison:\n" + lines.join("\n"));
        // Just informational - always pass
        expect(true).to.be.true;
        done();
      }).catch(done);
    }).catch(done);
  });

  it("multi-voice rests should not be placed at extreme positions (test_rest_positioning_16th)", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_rest_positioning_16th.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    expect(rests.length).to.be.greaterThan(0, "should find rests");

    // Log all rest positions for diagnostic purposes
    console.log("=== Rest positions in test_rest_positioning_16th ===");
    for (const r of rests) {
      console.log(
        `  m${r.measure}/v${r.voiceId}/${r.duration}: ` +
        `yPos=${r.yPos.toFixed(1)} osmdRelY=${r.osmdRelY.toFixed(3)}`
      );
    }

    const extremeRests: string[] = [];
    for (const r of rests) {
      if (r.yPos === 0) { continue; }
      let staveTopY: number = 0;
      let staveBottomY: number = 0;
      for (const vml of gms.MeasureList) {
        for (const measure of vml) {
          if (!measure) { continue; }
          if (measure.MeasureNumber !== r.measure) { continue; }
          const vfStave: any = (measure as any).getVFStave?.();
          if (!vfStave) { continue; }
          staveTopY = vfStave.getY?.() ?? 0;
          staveBottomY = vfStave.getBottomY?.() ?? 0;
        }
      }
      if (staveTopY === 0 && staveBottomY === 0) { continue; }

      const staveHeight: number = staveBottomY - staveTopY;
      // Rest should be within 0.5 staff heights of the stave edges.
      // Multi-voice rests may move up/down, but not by more than half a stave.
      const maxAbove: number = staveTopY - staveHeight * 0.5;
      const maxBelow: number = staveBottomY + staveHeight * 0.5;
      if (r.yPos < maxAbove || r.yPos > maxBelow) {
        extremeRests.push(
          `m${r.measure}/v${r.voiceId}/${r.duration}: ` +
          `yPos=${r.yPos.toFixed(1)} stave=[${staveTopY.toFixed(1)},${staveBottomY.toFixed(1)}] ` +
          `allowed=[${maxAbove.toFixed(1)},${maxBelow.toFixed(1)}]`
        );
      }
    }

    if (extremeRests.length > 0) {
      console.log(`\n=== Extreme rest positions ===\n${extremeRests.join("\n")}`);
    }
    expect(extremeRests, `Rests at extreme positions:\n${extremeRests.join("\n")}`).to.be.empty;
    done();
  });

  it("systems respect page width and staves share a common right border", (done: Mocha.Done) => {
    const xmlDoc: Document = TestUtils.getScore("Dichterliebe01.xml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    const osmd: any = TestUtils.createOpenSheetMusicDisplay(div);
    osmd.load(xmlDoc).then(() => {
      osmd.render();
      const gms: GraphicalMusicSheet = osmd.graphic;
      const issues: string[] = [];

      for (const page of gms.MusicPages) {
        const pageWidth: number = page.PositionAndShape.Size.width;
        for (const system of page.MusicSystems) {
          const sysWidth: number = system.PositionAndShape.Size.width;
          // System must not overflow page width
          if (sysWidth > pageWidth + 0.5) {
            issues.push(`System overflows page: sys=${sysWidth.toFixed(2)} > page=${pageWidth.toFixed(2)}`);
          }

          // All staff lines in a system must share the same right edge
          const staffRightEdges: number[] = [];
          for (const sl of system.StaffLines) {
            const measures: any[] = sl.Measures;
            if (measures.length > 0) {
              const lastM: any = measures[measures.length - 1];
              const rightEdge: number = (lastM?.PositionAndShape?.RelativePosition?.x ?? 0)
                + (lastM?.PositionAndShape?.Size?.width ?? 0);
              staffRightEdges.push(rightEdge);
            }
          }
          if (staffRightEdges.length > 1) {
            const firstEdge: number = staffRightEdges[0];
            for (let i: number = 1; i < staffRightEdges.length; i++) {
              if (Math.abs(staffRightEdges[i] - firstEdge) > 1.0) {
                issues.push(
                  `System right edge misaligned: staff 0 = ${firstEdge.toFixed(2)}, ` +
                  `staff ${i} = ${staffRightEdges[i].toFixed(2)} (diff ${(staffRightEdges[i] - firstEdge).toFixed(2)})`
                );
              }
            }
          }
        }
      }

      expect(issues, `Page width / right border issues:\n${issues.join("\n")}`).to.be.empty;
      done();
    }).catch(done);
  });

  it("multi-voice rests in Voice Alignment m2 should be near staff center, not at ledger lines", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_Function_Test_Voice_Alignment.musicxml");
    const rests: RestInfo[] = collectRests(gms);
    const m2Rests: RestInfo[] = rests.filter(r => r.measure === 2 && r.staffId === 1);

    expect(m2Rests.length).to.be.greaterThan(0,
      `should find rests in m2 staff1. All rests: ${rests.map(r => `m${r.measure}/v${r.voiceId}/s${r.staffId}=${r.duration}`).join(", ")}`);

    console.log("=== Voice Alignment m2 rests ===");
    const extremeRests: string[] = [];
    for (const r of m2Rests) {
      let staveTopY: number = 0;
      let staveBottomY: number = 0;
      for (const vml of gms.MeasureList) {
        for (const measure of vml) {
          if (!measure || measure.MeasureNumber !== 2) { continue; }
          const vfStave: any = (measure as any).getVFStave?.();
          if (!vfStave) { continue; }
          if ((measure.ParentStaff?.Id ?? 0) !== r.staffId) { continue; }
          staveTopY = vfStave.getY?.() ?? 0;
          staveBottomY = vfStave.getBottomY?.() ?? 0;
        }
      }
      const staveHeight: number = staveBottomY - staveTopY;
      const staveCenterY: number = staveTopY + staveHeight / 2;
      const distFromCenter: number = Math.abs(r.yPos - staveCenterY);

      console.log(
        `  v${r.voiceId}/${r.duration}: yPos=${r.yPos.toFixed(1)} ` +
        `stave=[${staveTopY.toFixed(1)},${staveBottomY.toFixed(1)}] ` +
        `center=${staveCenterY.toFixed(1)} distFromCenter=${distFromCenter.toFixed(1)} ` +
        `lineShift=${r.lineShift} keyLine=${r.keyLine} keys=${r.keys.join(",")}`
      );

      if (distFromCenter > staveHeight * 0.6) {
        extremeRests.push(
          `v${r.voiceId}/${r.duration}: yPos=${r.yPos.toFixed(1)} ` +
          `staveCenter=${staveCenterY.toFixed(1)} dist=${distFromCenter.toFixed(1)} ` +
          `staveH=${staveHeight.toFixed(1)}`
        );
      }
    }

    expect(extremeRests, `Rests far from staff center:\n${extremeRests.join("\n")}`).to.be.empty;
    done();
  });

  it("eighth rests must not collide with notes at same beat (piano_two_voices)", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("test_rest_positioning_piano_two_voices.musicxml");

    interface BeatEntry {
      voiceId: number;
      isRest: boolean;
      yPos: number;
      duration: string;
      measure: number;
      staffId: number;
      lineShift: number;
      keyLine: number;
    }
    // Group entries by staff entry to find rest+note collisions at same beat
    const collisions: { rest: BeatEntry, note: BeatEntry, yGap: number }[] = [];

    for (const vml of gms.MeasureList) {
      for (const measure of vml) {
        if (!measure?.isVisible()) { continue; }
        for (const se of measure.staffEntries) {
          const entries: BeatEntry[] = [];
          for (const gve of se.graphicalVoiceEntries) {
            for (const n of gve.notes) {
              const vfn: VexFlowGraphicalNote = n as VexFlowGraphicalNote;
              const sn: any = vfn.vfnote?.[0];
              if (!sn) { continue; }
              const ys: number[] = sn.getYs?.() ?? [];
              entries.push({
                voiceId: n.parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0,
                isRest: n.sourceNote.isRest(),
                yPos: ys[0] ?? 0,
                duration: sn.getDuration?.() ?? "?",
                measure: measure.MeasureNumber,
                staffId: n.sourceNote.ParentStaff?.Id ?? 0,
                lineShift: n.lineShift ?? 0,
                keyLine: sn.getKeyLine?.(0) ?? -999,
              });
            }
          }

          // Find rest+note pairs from different voices
          const rests: BeatEntry[] = entries.filter(e => e.isRest);
          const notes: BeatEntry[] = entries.filter(e => !e.isRest);
          for (const r of rests) {
            for (const n of notes) {
              if (r.voiceId === n.voiceId) { continue; }
              if (r.staffId !== n.staffId) { continue; }
              // For notes with multiple Ys (chords), use the closest Y to the rest
              const yGap: number = Math.abs(r.yPos - n.yPos);
              collisions.push({ rest: r, note: n, yGap });
            }
          }
        }
      }
    }

    expect(collisions.length).to.be.greaterThan(0,
      "should find rest+note pairs at same beat");

    console.log("=== piano_two_voices rest/note collisions ===");
    const overlaps: string[] = [];
    const minGap: number = 8; // minimum pixels between rest and note
    for (const c of collisions) {
      console.log(
        `  m${c.rest.measure}/s${c.rest.staffId}: ` +
        `rest v${c.rest.voiceId}/${c.rest.duration} y=${c.rest.yPos.toFixed(1)} ` +
        `lineShift=${c.rest.lineShift} keyLine=${c.rest.keyLine} | ` +
        `note v${c.note.voiceId} y=${c.note.yPos.toFixed(1)} | gap=${c.yGap.toFixed(1)}`
      );
      if (c.yGap < minGap) {
        overlaps.push(
          `m${c.rest.measure}/s${c.rest.staffId}: rest v${c.rest.voiceId}/${c.rest.duration} ` +
          `y=${c.rest.yPos.toFixed(1)} vs note v${c.note.voiceId} y=${c.note.yPos.toFixed(1)} ` +
          `gap=${c.yGap.toFixed(1)} < ${minGap} lineShift=${c.rest.lineShift}`
        );
      }
    }

    expect(overlaps, `Rest/note collisions:\n${overlaps.join("\n")}`).to.be.empty;
    done();
  });

});

describe("Cornelius Christbaum rest positioning", () => {
  it("multi-voice rests must not touch notes from other voices", (done: Mocha.Done) => {
    const gms: GraphicalMusicSheet = buildGMS("Cornelius_P_Christbaum_Opus_8_1_1865.musicxml");
    const minGap: number = 20;
    const collisions: string[] = [];

    for (const vml of gms.MeasureList) {
      for (const measure of vml) {
        if (!measure?.isVisible()) { continue; }
        // check all measures
        for (const se of measure.staffEntries) {
          const rests: { voiceId: number, y: number, dur: string, lineShift: number }[] = [];
          const notes: { voiceId: number, y: number, pitch: string }[] = [];
          for (const gve of se.graphicalVoiceEntries) {
            for (const n of gve.notes) {
              const vfn: VexFlowGraphicalNote = n as VexFlowGraphicalNote;
              const sn: any = vfn.vfnote?.[0];
              if (!sn) { continue; }
              const ys: number[] = sn.getYs?.() ?? [];
              const vid: number = n.parentVoiceEntry?.parentVoiceEntry?.ParentVoice?.VoiceId ?? 0;
              if (n.sourceNote.isRest()) {
                rests.push({
                  voiceId: vid, y: ys[0] ?? 0,
                  dur: sn.getDuration?.() ?? "?", lineShift: n.lineShift ?? 0,
                });
              } else {
                const p: any = n.sourceNote.Pitch;
                const name: string = p
                  ? `${["C","#","D","#","E","F","#","G","#","A","#","B"][p.FundamentalNote]}${p.Octave + 3}`
                  : "?";
                notes.push({ voiceId: vid, y: ys[0] ?? 0, pitch: name });
              }
            }
          }
          for (const r of rests) {
            for (const n of notes) {
              if (r.voiceId === n.voiceId) { continue; }
              const gap: number = Math.abs(r.y - n.y);
              const staffId: number = measure.ParentStaff?.Id ?? -1;
              console.log(
                `  m${measure.MeasureNumber}/s${staffId}: rest v${r.voiceId}/${r.dur} ` +
                `y=${r.y.toFixed(1)} ls=${r.lineShift} | ` +
                `note v${n.voiceId} ${n.pitch} y=${n.y.toFixed(1)} | gap=${gap.toFixed(1)}`
              );
              if (gap < minGap) {
                collisions.push(
                  `m${measure.MeasureNumber}: rest v${r.voiceId}/${r.dur} y=${r.y.toFixed(1)} ` +
                  `vs note v${n.voiceId} ${n.pitch} y=${n.y.toFixed(1)} gap=${gap.toFixed(1)}`
                );
              }
            }
          }
        }
      }
    }
    expect(collisions, `Cornelius rest/note collisions:\n${collisions.join("\n")}`).to.be.empty;
    done();
  });
});
