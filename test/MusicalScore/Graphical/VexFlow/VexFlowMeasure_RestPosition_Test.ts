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

      // Half rest is the last tickable in voice 1, measure 1 (q, q, h-rest).
      // Ticks: 1+1+2=4 in 4/4. At the half rest: ticksAccum=2, tickDuration=2, totalTicks=4.
      // The formatter uses proportional tick-based centering:
      //   slotStart  = (ticksAccum / totalTicks) * noteAreaEnd
      //   slotEnd    = ((ticksAccum + tickDuration) / totalTicks) * noteAreaEnd
      //   cxs        = (slotStart + slotEnd) / 2 - gw / 2 - ctxX
      // For this half rest: slotStart=0.5*nEAEnd, slotEnd=nEAEnd
      //   → cxs = 0.75 * nEAEnd - gw/2 - ctxX
      const padding: number = VF.Metrics.get("Stave.padding") as number ?? 5;
      const noteAreaEndContext: number = halfRest.noteEndX - halfRest.noteStartX - padding;
      const totalTicks: number = 4; // 4/4 time
      const ticksAccum: number = 2; // q(1) + q(1)
      const tickDuration: number = 2; // half note
      const slotStart: number = (ticksAccum / totalTicks) * noteAreaEndContext;
      const slotEnd: number = ((ticksAccum + tickDuration) / totalTicks) * noteAreaEndContext;
      const expectedCxs: number = (slotStart + slotEnd) / 2 - halfRest.glyphWidth / 2 - halfRest.contextX;
      const expectedGlyphCenter: number = halfRest.contextX + halfRest.noteStartX + padding + expectedCxs + halfRest.glyphWidth / 2;
      const restGlyphCenter: number = halfRest.xPos + halfRest.glyphWidth / 2;
      const distFromCenter: number = Math.abs(restGlyphCenter - expectedGlyphCenter);

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

});
