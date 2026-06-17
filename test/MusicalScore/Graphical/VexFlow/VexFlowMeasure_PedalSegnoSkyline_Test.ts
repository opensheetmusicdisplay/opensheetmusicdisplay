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

  it("chord symbols on whole-rest measures should be at beat 1, not centered", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_chord_symbol_position_whole_rest.musicxml");

    interface ChordInfo {
      measure: number;
      containerAbsX: number;
      labelAbsX: number;
      measureAbsX: number;
      measureWidth: number;
      beginInstr: number;
      noteAreaStart: number;
      noteAreaMid: number;
      chordText: string;
    }
    const chordInfos: ChordInfo[] = [];
    for (const vml of gms.MeasureList) {
      for (const measure of vml) {
        if (!measure?.isVisible()) { continue; }
        const measureAbsX: number = measure.PositionAndShape.AbsolutePosition.x;
        const measureWidth: number = measure.PositionAndShape.Size.width;
        const beginInstr: number = (measure as any).beginInstructionsWidth ?? 0;

        for (const se of measure.staffEntries) {
          if (!se.graphicalChordContainers || se.graphicalChordContainers.length === 0) { continue; }

          for (const cc of se.graphicalChordContainers) {
            cc.PositionAndShape.calculateAbsolutePosition();
            cc.GraphicalLabel.PositionAndShape.calculateAbsolutePosition();
            const containerAbsX: number = cc.PositionAndShape.AbsolutePosition.x;
            const labelAbsX: number = cc.GraphicalLabel.PositionAndShape.AbsolutePosition.x;
            const noteAreaStart: number = measureAbsX + beginInstr;
            const noteAreaMid: number = noteAreaStart + (measureWidth - beginInstr) / 2;
            chordInfos.push({
              measure: measure.MeasureNumber,
              containerAbsX,
              labelAbsX,
              measureAbsX,
              measureWidth,
              beginInstr,
              noteAreaStart,
              noteAreaMid,
              chordText: cc.GraphicalLabel?.Label?.text ?? "?",
            });
          }
        }
      }
    }

    expect(chordInfos.length, "should find chord symbols").to.be.greaterThan(0);

    for (const ci of chordInfos) {
      const noteAreaFirstThird: number = ci.noteAreaStart + (ci.noteAreaMid - ci.noteAreaStart) * 0.67;
      console.log(
        `  M${ci.measure} "${ci.chordText}": container=${ci.containerAbsX.toFixed(2)} ` +
        `label=${ci.labelAbsX.toFixed(2)} noteAreaStart=${ci.noteAreaStart.toFixed(2)} ` +
        `noteAreaMid=${ci.noteAreaMid.toFixed(2)} firstThird=${noteAreaFirstThird.toFixed(2)}`
      );
      // Both container and label should be in the first third of the note area
      expect(ci.labelAbsX, `M${ci.measure} "${ci.chordText}": labelAbsX=${ci.labelAbsX.toFixed(2)} ` +
        `should be before first third ${noteAreaFirstThird.toFixed(2)}`)
        .to.be.lessThan(noteAreaFirstThird);
    }
  });

  it("pedal start x should not inherit whole-rest centering", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_pedal_systembreak.musicxml");

    const pedals: VexFlowPedal[] = [];
    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const sl: StaffLine = measure.ParentStaffLine;
        if (!sl?.Pedals) { continue; }
        for (const p of sl.Pedals) {
          if (p && !pedals.includes(p as VexFlowPedal)) { pedals.push(p as VexFlowPedal); }
        }
      }
    }

    console.log(`Found ${pedals.length} pedals in test_pedal_systembreak`);
    for (const pedal of pedals) {
      if (!pedal.startNote) { continue; }
      const sn: any = pedal.startNote;
      const isCentered: boolean = sn.isCenterAligned?.() ?? false;
      const absX: number = sn.getAbsoluteX?.() ?? 0;
      const centerXShift: number = sn.getCenterXShift?.() ?? 0;
      console.log(
        `  Pedal start: absX=${absX.toFixed(1)} isCentered=${isCentered} ` +
        `centerXShift=${centerXShift.toFixed(1)}`
      );
      if (isCentered && centerXShift > 5) {
        // If start note is center-aligned, the pedal's effective x should NOT
        // include the centerXShift. The pedal should start at beat 1.
        const pedalBbox: BoundingBox = pedal.PositionAndShape;
        const pedalAbsX: number = pedalBbox.AbsolutePosition.x;
        const uncorrectedX: number = absX; // includes centerXShift
        const correctedX: number = absX - centerXShift; // beat 1 position
        console.log(
          `  Pedal bbox absX=${pedalAbsX.toFixed(1)} ` +
          `uncorrected=${uncorrectedX.toFixed(1)} corrected=${correctedX.toFixed(1)}`
        );
        // Pedal should be closer to corrected (beat 1) than uncorrected (center)
        const distCorrected: number = Math.abs(pedalAbsX - correctedX);
        const distUncorrected: number = Math.abs(pedalAbsX - uncorrectedX);
        expect(distCorrected, `Pedal at ${pedalAbsX.toFixed(1)} should be near beat 1 (${correctedX.toFixed(1)}), ` +
          `not center (${uncorrectedX.toFixed(1)})`)
          .to.be.lessThan(distUncorrected);
      }
    }
  });

  it("volta boxes in same repeat group should have equal heights (Entertainer)", () => {
    const gms: GraphicalMusicSheet = buildGMS("ScottJoplin_The_Entertainer.xml");

    interface VoltaInfo {
      measure: number;
      endingText: string;
      yShift: number;
    }
    const voltas: VoltaInfo[] = [];

    for (const vml of gms.MeasureList) {
      for (const measure of vml) {
        if (!measure?.isVisible()) { continue; }
        const vfStave: any = (measure as any).getVFStave?.();
        if (!vfStave) { continue; }
        const mods: VF.StaveModifier[] = vfStave.getModifiers();
        for (const mod of mods) {
          if (mod instanceof VF.Volta) {
            voltas.push({
              measure: measure.MeasureNumber,
              endingText: (mod as any).text?.toString() ?? "?",
              yShift: mod.getYShift() ?? 0,
            });
          }
        }
      }
    }

    expect(voltas.length, "should find volta modifiers").to.be.greaterThan(0);

    console.log("=== Volta heights ===");
    for (const v of voltas) {
      console.log(`  M${v.measure}: ending="${v.endingText}" yShift=${v.yShift.toFixed(1)}`);
    }

    // Group consecutive voltas by their ending index. Voltas within same repeat section
    // should be at the same height regardless of system breaks.
    // Find volta pairs (measures that are adjacent or near each other with same or related endings)
    // The key assertion: within a repeat section, all volta endings should match height.
    // Simple heuristic: find pairs of consecutive volta measures and check y_shift equality.
    for (let i: number = 0; i < voltas.length - 1; i++) {
      const curr: VoltaInfo = voltas[i];
      const next: VoltaInfo = voltas[i + 1];
      // Only compare if measures are adjacent (same repeat section)
      if (next.measure - curr.measure <= 2) {
        const diff: number = Math.abs(curr.yShift - next.yShift);
        expect(diff,
          `Volta M${curr.measure}(${curr.endingText}) yShift=${curr.yShift.toFixed(1)} vs ` +
          `M${next.measure}(${next.endingText}) yShift=${next.yShift.toFixed(1)} diff=${diff.toFixed(1)} should be < 10px`)
          .to.be.lessThan(10);
      }
    }
  });
});
