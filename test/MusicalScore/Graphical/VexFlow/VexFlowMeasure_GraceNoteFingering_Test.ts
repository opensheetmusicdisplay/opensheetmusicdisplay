/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { NoteEnum, Pitch } from "../../../../src/Common/DataObjects/Pitch";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { SkyBottomLineCalculator } from "../../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

describe("Grace Note Fingering - Ysaye Ballade excerpt", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("test_grace_note_fingerings_Ysaye_excerpt.musicxml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  it("grace notes before E6 have enough distance from target note", () => {
    const measure: GraphicalMeasure = osmd.GraphicSheet.MusicPages[0]?.MusicSystems[0]?.StaffLines[0]?.Measures[0];
    expect(measure, "measure 1 should exist").to.not.be.undefined;

    let lastGraceEntry: VexFlowVoiceEntry | undefined;
    let targetEntry: VexFlowVoiceEntry | undefined;

    for (const se of measure.staffEntries) {
      for (const gve of se.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
        if (gve.parentVoiceEntry.IsGrace) {
          lastGraceEntry = gve;
        } else if (!targetEntry && gve.notes.length > 0) {
          const note: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
          const pitch: Pitch = note.sourceNote.Pitch;
          if (pitch && pitch.FundamentalNote === NoteEnum.E && pitch.Octave === 3) {
            targetEntry = gve;
          }
        }
      }
    }

    expect(lastGraceEntry, "should find grace note voice entry").to.not.be.undefined;
    expect(targetEntry, "should find E6 target note").to.not.be.undefined;

    const lastGraceVFNote: any = lastGraceEntry!.vfStaveNote;
    const targetVFNote: any = targetEntry!.vfStaveNote;

    expect(lastGraceVFNote, "grace note should have vfStaveNote").to.not.be.undefined;
    expect(targetVFNote, "target note should have vfStaveNote").to.not.be.undefined;

    const graceRight: number = (lastGraceVFNote.getAbsoluteX?.() ?? 0) + (lastGraceVFNote.getWidth?.() ?? 0);
    const targetLeft: number = targetVFNote.getAbsoluteX?.() ?? 0;
    const gapPx: number = targetLeft - graceRight;
    const gapUnits: number = gapPx / unitInPixels;

    expect(
      gapUnits,
      `grace-to-target gap too small: ${gapUnits.toFixed(2)}u (${gapPx.toFixed(1)}px)`,
    ).to.be.at.least(0.5);
  });

  it("slur from E6 to E5 has curvature peak centered between endpoints", () => {
    const slurs: GraphicalSlur[] = [];
    for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
      for (const staffLine of system.StaffLines) {
        for (const s of staffLine.GraphicalSlurs) {
          slurs.push(s);
        }
      }
    }

    let targetSlur: GraphicalSlur | undefined;
    for (const s of slurs) {
      if (!s.slur.StartNote || !s.slur.EndNote) {
        continue;
      }
      const startPitch: Pitch = s.slur.StartNote.Pitch;
      const endPitch: Pitch = s.slur.EndNote.Pitch;
      if (!startPitch || !endPitch) {
        continue;
      }
      if (startPitch.FundamentalNote === NoteEnum.E && startPitch.Octave === 3 &&
          endPitch.FundamentalNote === NoteEnum.E && endPitch.Octave === 2) {
        targetSlur = s;
        break;
      }
    }

    expect(targetSlur, "should find E6→E5 slur").to.not.be.undefined;

    const slur: GraphicalSlur = targetSlur!;
    expect(slur.placement, "E6→E5 slur should be above").to.equal(PlacementEnum.Above);

    // Sample the Bezier curve and measure perpendicular distance from
    // the slanted start-end line. The peak (maximum distance above the
    // line) should sit near the midpoint t≈0.5, not drift toward one end.
    const p0: { x: number, y: number } = slur.bezierStartPt;
    const p1: { x: number, y: number } = slur.bezierStartControlPt;
    const p2: { x: number, y: number } = slur.bezierEndControlPt;
    const p3: { x: number, y: number } = slur.bezierEndPt;
    const width: number = p3.x - p0.x;

    // Unit vector along the start-end line.
    const dx: number = p3.x - p0.x;
    const dy: number = p3.y - p0.y;
    const len: number = Math.sqrt(dx * dx + dy * dy);
    const ux: number = dx / len;
    const uy: number = dy / len;

    let peakT: number = 0.5;
    let maxDist: number = -Infinity;
    const samples: number = 100;
    for (let i: number = 0; i <= samples; i++) {
      const t: number = i / samples;
      const t1: number = 1 - t;
      const x: number = t1 * t1 * t1 * p0.x + 3 * t1 * t1 * t * p1.x + 3 * t1 * t * t * p2.x + t * t * t * p3.x;
      const y: number = t1 * t1 * t1 * p0.y + 3 * t1 * t1 * t * p1.y + 3 * t1 * t * t * p2.y + t * t * t * p3.y;
      // Perpendicular distance from (x,y) to start-end line:
      // cross product of (point - p0) with unit direction vector.
      const rx: number = x - p0.x;
      const ry: number = y - p0.y;
      const dist: number = Math.abs(rx * uy - ry * ux);
      if (dist > maxDist) {
        maxDist = dist;
        peakT = t;
      }
    }

    // Check that peakT is near 0.5.
    const tOffset: number = Math.abs(peakT - 0.5);

    expect(
      tOffset,
      `slur peak off-center: peakT=${peakT.toFixed(3)} ` +
      `(expected near 0.5, width=${width.toFixed(1)}px)`,
    ).to.be.at.most(0.08);

    // Y height of the slur curve above the start-end line.
    // Asymmetric skyline slopes (grace notes near start) used to balloon
    // the curve. The min-slope equalization keeps peak perpendicular
    // distance at ~2-3px (down from ~15px pre-fix).
    expect(
      maxDist,
      `slur Y height too large: ${maxDist.toFixed(1)}px (expected ≤8px)`,
    ).to.be.at.most(8);
    expect(
      maxDist,
      `slur Y height too small (may clip skyline): ${maxDist.toFixed(1)}px (expected ≥1.5px)`,
    ).to.be.at.least(1.5);

    const heightRatio: number = maxDist / width;
    expect(
      heightRatio,
      `slur too high: maxDist=${maxDist.toFixed(1)}px = ` +
      `${(heightRatio * 100).toFixed(0)}% of width=${width.toFixed(1)}px`,
    ).to.be.at.most(0.25);

    // Verify slur curve clears the skyline — no noteheads or other
    // objects poke through the curve. The skyline stores the highest
    // obstruction at each X (negative = above staff). After the slur
    // updates the skyline via Math.min, the slur should BE the
    // skyline wherever it passes. If skyline[idx] < curveY at any
    // sampled point, something is above the curve (overlap).
    const slStaffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    const calculator: SkyBottomLineCalculator = slStaffLine.SkyBottomLineCalculator;
    const skyline: number[] = slStaffLine.SkyLine;
    let maxOverlap: number = 0;
    let worstX: number = 0;
    let worstCurveY: number = 0;
    let worstSkyY: number = 0;
    for (let i: number = 0; i <= 50; i++) {
      const t: number = i / 50;
      const pt: { x: number, y: number } = slur.calculateCurvePointAtIndex(t);
      const idx: number = calculator.getLeftIndexForPointX(pt.x, skyline.length);
      if (idx >= 0 && idx < skyline.length && skyline[idx] !== 0) {
        if (skyline[idx] < pt.y) {
          const overlap: number = pt.y - skyline[idx];
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            worstX = pt.x;
            worstCurveY = pt.y;
            worstSkyY = skyline[idx];
          }
        }
      }
    }
    expect(
      maxOverlap,
      `slur clips skyline: overlap=${maxOverlap.toFixed(3)}u ` +
      `at x=${worstX.toFixed(1)} (curve Y=${worstCurveY.toFixed(3)}, skyline=${worstSkyY.toFixed(3)})`,
    ).to.be.at.most(1.5);
  });
});
