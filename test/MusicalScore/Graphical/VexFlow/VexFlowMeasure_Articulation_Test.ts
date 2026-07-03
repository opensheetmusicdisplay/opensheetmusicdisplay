/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
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

interface ArtInfo {
  noteKey: string;
  stemDir: number;
  artType: string;
  artPos: number;          // VF.Modifier.Position.ABOVE/BELOW
  artXShift: number;       // articulation xShift (should be 0 after draw)
  artYShift: number;       // articulation yShift (vertical stacking)
  artTextLine: number;     // textLine from format()
  artWidth: number;        // articulation glyph width (used by draw() for centering)
  noteGlyphWidth: number;  // for normalizing xShift
  noteX: number;           // note x position from VF (getX)
  noteAbsX: number;        // note absolute x position (getAbsoluteX)
  noteXShift: number;      // StaveNote's xShift (from accidentals/modifiers)
  noteCenterX: number;     // true notehead center X = absX + xShift + glyphWidth/2
  computedArtX: number;    // articulation render X from getModifierStartXY + xShift
  noteY: number;           // note y position (first key)
  noteLine: number;        // note staff line number
  stemBaseY: number;       // stem base y
  stemTipY: number;        // stem tip y
  measure: number;
  staff: number;
  duration?: string;       // note type (quarter, 16th, etc)
}

function collectArticulations(gms: GraphicalMusicSheet): ArtInfo[] {
  const result: ArtInfo[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          const vfve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
          if (!vfve.vfStaveNote) { continue; }
          const sn: any = vfve.vfStaveNote;
          const keys: string = sn.keys?.join(",") ?? "?";
          const stemDir: number = typeof sn.getStemDirection === "function" ? sn.getStemDirection() : 0;
          const glyphWidth: number = typeof sn.getGlyphWidth === "function" ? sn.getGlyphWidth() : 0;
          const mods: any[] = typeof sn.getModifiers === "function" ? sn.getModifiers() : [];
          const artMods: any[] = mods.filter((m: any) => m.getCategory?.() === "Articulation");
          const noteX: number = typeof sn.getX === "function" ? sn.getX() : 0;
          const noteAbsX: number = typeof sn.getAbsoluteX === "function" ? sn.getAbsoluteX() : 0;
          const noteXShift: number = (sn as any).xShift ?? 0;
          const noteCenterX: number = noteAbsX + noteXShift + glyphWidth / 2;
          const noteYs: number[] = typeof sn.getYs === "function" ? sn.getYs() : [];
          const staffNum: number = typeof sn.getStave === "function" ? sn.getStave().getNumLines() : 0;
          const duration: string = sn.duration ?? "";
          const stemExtents: any = sn.getStemExtents?.();
          const stemBaseY: number = stemExtents?.baseY ?? 0;
          const stemTipY: number = stemExtents?.topY ?? 0;
          const noteLine: number = typeof sn.getLineNumber === "function" ? sn.getLineNumber(false) : 0;
          for (const m of artMods) {
            const artPos: number = typeof m.getPosition === "function" ? m.getPosition() : -1;
            const xShift: number = typeof m.getXShift === "function" ? m.getXShift() : NaN;
            const modStart: any = typeof sn.getModifierStartXY === "function"
              ? sn.getModifierStartXY(artPos, 0) : { x: 0 };
            const computedArtX: number = modStart.x + xShift;
            const artWidth: number = typeof m.getWidth === "function" ? m.getWidth() : 0;
            result.push({
              noteKey: keys,
              stemDir,
              artType: m.type ?? "?",
              artPos,
              artXShift: xShift,
              artYShift: typeof m.getYShift === "function" ? m.getYShift() : NaN,
              artTextLine: typeof m.textLine !== "undefined" ? m.textLine : -99,
              artWidth,
              noteGlyphWidth: glyphWidth,
              noteX,
              noteAbsX,
              noteXShift,
              noteCenterX,
              computedArtX,
              noteY: noteYs.length > 0 ? noteYs[0] : 0,
              noteLine,
              stemBaseY,
              stemTipY,
              measure: measure.MeasureNumber,
              staff: staffNum,
              duration,
            });
          }
        }
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Articulation Positioning", () => {

  it("Should center staccato at notehead center regardless of stem", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_articulation_staccato_placement_above_explicitly.musicxml");
    const arts: ArtInfo[] = collectArticulations(gms);
    expect(arts.length).to.equal(1, "should have exactly one articulation");

    const a: ArtInfo = arts[0];
    expect(a.artType).to.equal("a.");
    expect(a.artPos).to.equal(VF.Modifier.Position.ABOVE);
    expect(a.stemDir).to.equal(1); // UP

    expect(a.artXShift).to.equal(0,
      `UP-stem ABOVE staccato should have zero xShift, got ${a.artXShift}`);

    expect(a.artWidth).to.be.greaterThan(0,
      `staccato dot glyph width should be > 0 for centering, got ${a.artWidth}`);

    // Render x should match notehead center (absX + glyphWidth/2)
    expect(a.computedArtX).to.equal(a.noteCenterX,
      `staccato x ${a.computedArtX} should match notehead center ${a.noteCenterX}`);
  });

  it("Should center staccato at notehead center when BELOW + stem UP", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_articulation_staccato_placement_below.musicxml");
    const arts: ArtInfo[] = collectArticulations(gms);
    expect(arts.length).to.equal(1, "should have exactly one articulation");

    const a: ArtInfo = arts[0];
    expect(a.artType).to.equal("a.");
    expect(a.artPos).to.equal(VF.Modifier.Position.BELOW);
    expect(a.stemDir).to.equal(1); // UP

    expect(a.artXShift).to.equal(0,
      `BELOW articulation on UP-stem note should have zero xShift, got ${a.artXShift}`);

    expect(a.artWidth).to.be.greaterThan(0,
      `staccato dot glyph width should be > 0, got ${a.artWidth}`);

    expect(a.computedArtX).to.equal(a.noteCenterX,
      `staccato x ${a.computedArtX} should match notehead center ${a.noteCenterX}`);
  });

  it("Should center staccato at notehead center when ABOVE + stem DOWN", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_slur_overlap_articulation_staccato.musicxml");
    const arts: ArtInfo[] = collectArticulations(gms);
    expect(arts.length).to.equal(2, "should have exactly two staccato articulations");

    for (const a of arts) {
      expect(a.artType).to.equal("a.");
      expect(a.stemDir).to.equal(-1); // DOWN
      expect(a.artPos).to.equal(VF.Modifier.Position.ABOVE);

      expect(a.artXShift).to.equal(0,
        `m${a.measure} ${a.noteKey}: ABOVE on DOWN-stem should have zero xShift, got ${a.artXShift}`);

      expect(a.artWidth).to.be.greaterThan(0,
        `m${a.measure} ${a.noteKey}: glyph width should be > 0, got ${a.artWidth}`);

      expect(a.computedArtX).to.equal(a.noteCenterX,
        `m${a.measure} ${a.noteKey}: artX ${a.computedArtX} should match notehead center ${a.noteCenterX}`);
    }
  });

  it.skip("Should center staccato over stem when BELOW + stem DOWN", () => {
    // TODO: implement — empty test placeholder
  });

  it("Haydn Concertante: should have 12 articulation modifiers in measure 209", () => {
    const gms: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
    const arts: ArtInfo[] = collectArticulations(gms);

    const m209: ArtInfo[] = arts.filter(a => a.measure === 209);
    expect(m209.length).to.equal(12,
      `measure 209 should have exactly 12 articulation modifiers, got ${m209.length}`);

    for (const a of m209) {
      expect(a.artType).to.equal("a.");
      expect(a.stemDir).to.equal(-1,  "m209 notes should be stem DOWN");
      expect(a.artPos).to.equal(VF.Modifier.Position.ABOVE,
        "m209 staccato should be ABOVE");

      expect(a.artXShift).to.equal(0,
        `m209 ${a.noteKey}: ABOVE on DOWN-stem should have zero xShift, got ${a.artXShift}`);
      expect(a.computedArtX).to.equal(a.noteCenterX,
        `m209 ${a.noteKey}: artX ${a.computedArtX} should match notehead center ${a.noteCenterX}`);
    }
  });

  it("Haydn Concertante: should have 8 articulation modifiers in measure 213", () => {
    const gms: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
    const arts: ArtInfo[] = collectArticulations(gms);

    const m213: ArtInfo[] = arts.filter(a => a.measure === 213);
    expect(m213.length).to.equal(8,
      `measure 213 should have exactly 8 articulation modifiers, got ${m213.length}`);

    for (const a of m213) {
      expect(a.artType).to.equal("a.");
      expect(a.stemDir).to.equal(-1, "m213 notes should be stem DOWN");
      expect(a.artPos).to.equal(VF.Modifier.Position.ABOVE,
        "m213 staccato should be ABOVE");

      expect(a.artXShift).to.equal(0,
        `m213 ${a.noteKey}: ABOVE on DOWN-stem should have zero xShift, got ${a.artXShift}`);
      expect(a.computedArtX).to.equal(a.noteCenterX,
        `m213 ${a.noteKey}: artX ${a.computedArtX} should match notehead center ${a.noteCenterX}`);
    }
  });

  it("Should center accent at notehead center like staccato", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_slur_overlap_articulation_accent.musicxml");
    const arts: ArtInfo[] = collectArticulations(gms);

    const accents: ArtInfo[] = arts.filter(a => a.artType === "a>");
    expect(accents.length).to.be.greaterThan(0,
      `should have at least one accent, got ${arts.length} total arts: ${arts.map(a => a.artType).join(",")}`);

    for (const a of accents) {
      expect(a.artXShift).to.equal(0,
        `m${a.measure} ${a.noteKey} stem=${a.stemDir} pos=${a.artPos}: xShift should be 0, got ${a.artXShift}`);
      // Anchor: getModifierStartXY returns notehead center
      expect(a.computedArtX).to.equal(a.noteCenterX,
        `m${a.measure} ${a.noteKey}: artX ${a.computedArtX.toFixed(1)} should match notehead center ${a.noteCenterX.toFixed(1)}`);
      // draw() does x -= (glyphWidth > 0 ? glyphWidth : 12) / 2 — uses 12px fallback
      // when getWidth() returns 0 (e.g. glyph not measurable in test font).
      const renderWidth: number = a.artWidth > 0 ? a.artWidth : 12;
      const renderLeftX: number = a.computedArtX - renderWidth / 2;
      const renderCenterX: number = renderLeftX + renderWidth / 2;
      expect(renderCenterX).to.equal(a.noteCenterX,
        `m${a.measure} ${a.noteKey}: rendered accent center ${renderCenterX.toFixed(1)} should match notehead center ${a.noteCenterX.toFixed(1)}`);
    }
  });

});

it("DEBUG: Scan Haydn articulation xShift for absurd positions", () => {
  const gms: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
  const arts: ArtInfo[] = collectArticulations(gms);

  // Group by (measure, noteKey) to find duplicate stacking
  const grouped: Map<string, ArtInfo[]> = new Map();
  for (const a of arts) {
    const key: string = `${a.measure}_${a.noteKey}`;
    if (!grouped.has(key)) { grouped.set(key, []); }
    grouped.get(key)!.push(a);
  }

  // Flag notes with multiple same-type articulations (duplicate stacking)
  const stacked: string[] = [];
  for (const [key, group] of grouped) {
    const staccatos: ArtInfo[] = group.filter(a => a.artType === "a.");
    if (staccatos.length > 1) {
      const yShifts: string = staccatos.map(s => s.artYShift.toFixed(1)).join(",");
      const xShifts: string = staccatos.map(s => s.artXShift.toFixed(1)).join(",");
      const noteXs: string = staccatos.map(s => s.noteX.toFixed(1)).join(",");
      stacked.push(
        `${key}: ${staccatos.length} staccato dots yShift=[${yShifts}] xShift=[${xShifts}] noteX=[${noteXs}]`
      );
    }
  }

  if (stacked.length > 0) {
    console.log("=== NOTES WITH DUPLICATE STACCATO (potential stacking) ===");
    for (const s of stacked) { console.log(s); }
  }

  // Report xShift outliers (should all be 0 with setOrigin(0) patch)
  const flagged: string[] = [];
  for (const a of arts) {
    if (Math.abs(a.artXShift) > 1) {
      flagged.push(
        `m${a.measure} ${a.noteKey} stem=${a.stemDir} pos=${a.artPos} xShift=${a.artXShift.toFixed(2)}`
      );
    }
  }

  if (flagged.length > 0) {
    console.log("=== FLAGGED articulations (non-zero xShift) ===");
    for (const f of flagged) { console.log(f); }
  }

  // Report measures with unusual articulation counts
  const measureCounts: Record<number, number> = {};
  for (const a of arts) { measureCounts[a.measure] = (measureCounts[a.measure] ?? 0) + 1; }
  console.log("\n=== Articulation count by measure ===");
  for (const [mn, count] of Object.entries(measureCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const dupes: string[] = [...grouped.entries()]
      .filter(([k]) => k.startsWith(`${mn}_`))
      .filter(([, g]) => g.filter(a => a.artType === "a.").length > 1)
      .map(([k, g]) => `${k.split("_")[1]}×${g.filter(a => a.artType === "a.").length}`);
    const suffix: string = dupes.length > 0 ? ` [dupes: ${dupes.join(", ")}]` : "";
    console.log(`m${mn}: ${count} articulations${suffix}`);
  }

  // Also report yShift range by measure for staccato
  console.log("\n=== Staccato yShift ranges ===");
  const staccatoByMeasure: Record<number, number[]> = {};
  for (const a of arts.filter(art => art.artType === "a.")) {
    if (!staccatoByMeasure[a.measure]) { staccatoByMeasure[a.measure] = []; }
    staccatoByMeasure[a.measure].push(a.artYShift);
  }
  for (const [mn, yVals] of Object.entries(staccatoByMeasure).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const minY: number = Math.min(...yVals);
    const maxY: number = Math.max(...yVals);
    const spread: number = maxY - minY;
    const flag: string = spread > 5 ? ` *** ${yVals.length} dots, ySpread=${spread.toFixed(1)}` : "";
    console.log(`m${mn}: ${yVals.length} staccato yRange=[${minY.toFixed(1)},${maxY.toFixed(1)}]${flag}`);
  }

  console.log(`\nTotal flagged xShift: ${flagged.length} / ${arts.length} | Stacked notes: ${stacked.length}`);

  // ===== Detailed dump of m201-203 articulation state with computed render coords =====
  console.log("\n\n=== MEASURE 201-203 ARTICULATION RENDER POSITIONS ===");
  // Rebuild GMS to access stave info
  const gms2: GraphicalMusicSheet = buildGMS("JosephHaydn_ConcertanteCello.xml");
  for (const vml of gms2.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      const mn: number = measure.MeasureNumber;
      if (mn < 201 || mn > 203) { continue; }
      console.log(`\n--- Measure ${mn} ---`);
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          const vfve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
          if (!vfve.vfStaveNote) { continue; }
          const sn: any = vfve.vfStaveNote;
          const mods: any[] = typeof sn.getModifiers === "function" ? sn.getModifiers() : [];
          const artMods: any[] = mods.filter((m: any) => m.getCategory?.() === "Articulation");
          if (artMods.length === 0) { continue; }
          const keys: string = sn.keys?.join(",") ?? "?";
          const stemDir: number = sn.getStemDirection?.() ?? 0;
          const noteYs: number[] = sn.getYs?.() ?? [];
          const noteX: number = sn.getX?.() ?? 0;
          const stave: any = sn.getStave?.();
          const staffSpace: number = stave?.getSpacingBetweenLines?.() ?? 10;
          const noteLine: number = sn.getLineNumber?.(false) ?? 0;
          const stemExtents: any = sn.getStemExtents?.();
          const seBaseY: number = stemExtents?.baseY ?? 0;
          const seTopY: number = stemExtents?.topY ?? 0;
          for (const m of artMods) {
            const pos: number = m.getPosition?.() ?? 0;
            const textLine: number = m.textLine ?? 0;
            const yShift: number = m.yShift ?? 0;
            const xShift: number = m.xShift ?? 0;
            const isAbove: boolean = pos === VF.Modifier.Position.ABOVE;
            // Compute draw-time y: follow Articulation.draw() math
            const initialOffset: number = 1; // hasStem=true, isOnStemTip=false for staccato
            let artY: number;
            if (isAbove) {
              const topY: number = stemDir === 1 ? seTopY : seBaseY;
              artY = topY - (textLine + initialOffset) * staffSpace;
            } else {
              const bottomY: number = stemDir === 1 ? seBaseY : seTopY;
              artY = bottomY + (textLine + initialOffset) * staffSpace;
            }
            // Snapping
            const offsetDir: number = isAbove ? -1 : 1;
            const distanceFromNote: number = (noteYs[0] - artY) / staffSpace;
            const articLine: number = distanceFromNote + Number(noteLine);
            const snappedLine: number = Math.round(articLine / 0.5) * 0.5; // roundToNearestHalf
            artY += Math.abs(snappedLine - articLine) * staffSpace * offsetDir;
            // yShift
            artY += yShift;
            // x from getModifierStartXY
            const modStart: any = sn.getModifierStartXY?.(pos, 0) ?? { x: 0, y: 0 };
            const artX: number = modStart.x + xShift;
            console.log(
              `  key=${keys} stem=${stemDir} ${isAbove ? "ABOVE" : "BELOW"} ` +
              `textLine=${textLine} yShift=${yShift.toFixed(1)} ` +
              `noteY=${noteYs[0].toFixed(1)} computedY=${artY.toFixed(1)} ` +
              `noteX=${noteX.toFixed(1)} modStartX=${modStart.x.toFixed(1)} artX=${artX.toFixed(1)} ` +
              `staffSpace=${staffSpace} noteLine=${noteLine} ` +
              `stemBase=${seBaseY.toFixed(1)} stemTip=${seTopY.toFixed(1)}`
            );
          }
        }
      }
    }
  }
});

it.skip("DEBUG: m201 extract full dump", () => {
  const gms: GraphicalMusicSheet = buildGMS("Haydn_m201-203_extract.musicxml");
  const msg: string[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      const mn: number = measure.MeasureNumber;
      if (mn !== 2) { continue; } // measure 2 = m201 in extract
      msg.push(`\n========== MEASURE ${mn} (original m201) ==========`);
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          const vfve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
          if (!vfve.vfStaveNote) { continue; }
          const sn: any = vfve.vfStaveNote;
          const mods: any[] = typeof sn.getModifiers === "function" ? sn.getModifiers() : [];
          const artMods: any[] = mods.filter((m: any) => m.getCategory?.() === "Articulation");
          const keys: string = sn.keys?.join(",") ?? "?";
          const stemDir: number = sn.getStemDirection?.() ?? 0;
          const noteX: number = sn.getX?.() ?? 0;
          const absX: number = sn.getAbsoluteX?.() ?? 0;
          const glyphWidth: number = sn.getGlyphWidth?.() ?? 0;
          const stave: any = sn.getStave?.();
          const staffSpace: number = stave?.getSpacingBetweenLines?.() ?? 10;
          const noteYs: number[] = sn.getYs?.() ?? [];
          const noteLine: number = typeof sn.getLineNumber === "function" ? sn.getLineNumber(false) : 0;
          const se2: any = sn.getStemExtents?.();
          const sTip: number = se2?.topY ?? 0;
          const sBase: number = se2?.baseY ?? 0;
          const hasStem: boolean = typeof sn.hasStem === "function" ? sn.hasStem() : false;

          msg.push(`\n  keys=${keys} stem=${stemDir} x=${noteX.toFixed(1)} ` +
            `absX=${absX.toFixed(1)} glyphW=${glyphWidth.toFixed(1)} ` +
            `staffSpace=${staffSpace} noteLine=${noteLine} ` +
            `noteY=${noteYs[0]?.toFixed(1)} hasStem=${hasStem}`);
          msg.push(`  stemExtents: baseY=${sBase.toFixed(1)} topY=${sTip.toFixed(1)}`);

          for (const m of artMods) {
            const pos: number = m.getPosition?.() ?? -1;
            const xShift: number = m.getXShift?.() ?? NaN;
            const yShift: number = m.yShift ?? NaN;
            const textLine: number = m.textLine ?? -99;
            const type: string = m.type ?? "";
            const width: number = m.getWidth?.() ?? 0;
            const originX: number = m.originX ?? NaN;
            const originY: number = m.originY ?? NaN;

            // Draw-time computed y
            const isAbove: boolean = pos === VF.Modifier.Position.ABOVE;
            const initialOffset: number = (
              hasStem && ((isAbove && stemDir === 1) || (!isAbove && stemDir === -1))
            ) ? 0.5 : 1;
            const offsetDir: number = isAbove ? -1 : 1;
            let y: number;
            if (isAbove) {
              const topY: number = hasStem ? (stemDir === 1 ? sTip : sBase) : Math.min(...noteYs);
              y = topY - (textLine + initialOffset) * staffSpace;
            } else {
              const bottomY: number = hasStem ? (stemDir === 1 ? sBase : sTip) : Math.max(...noteYs);
              y = bottomY + (textLine + initialOffset) * staffSpace;
            }
            // VF5 snap: snapLineToStaff(canSitBetweenLines, articLine, pos, offsetDir)
            const distanceFromNote: number = (noteYs[0] - y) / staffSpace;
            const articLine: number = distanceFromNote + Number(noteLine);
            const snappedLine: number = Math.round(articLine / 0.5) * 0.5;
            y += Math.abs(snappedLine - articLine) * staffSpace * offsetDir;

            // x from getModifierStartXY
            const modStart: any = sn.getModifierStartXY?.(pos, 0) ?? { x: 0 };
            const artX: number = modStart.x + xShift;

            msg.push(`  art: type=${type} ${isAbove ? "ABOVE" : "BELOW"} textLine=${textLine}`);
            msg.push(`       xShift=${xShift.toFixed(2)} yShift=${yShift.toFixed(2)} width=${width.toFixed(2)}`);
            msg.push(`       origin=(${originX},${originY})`);
            msg.push(`       computed: x=${artX.toFixed(1)} y=${y.toFixed(1)} snap=${snappedLine} initOff=${initialOffset}`);
          }
        }
      }
    }
  }
  expect(false, msg.join(" | ")).to.be.true;
});

