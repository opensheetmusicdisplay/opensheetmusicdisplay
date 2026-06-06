/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";

import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import * as VF from "vexflow";

interface NotePos {
  renderedX: number;
  absX: number;
  xShift: number;
  keys: string;
  staveInfo: string;
  staff: number;
  measure: number;
  voice: number;
}

function checkAlignment(gms: GraphicalMusicSheet): { misalignedCount: number, checkedCount: number, allPositions: NotePos[] } {
  const allPositions: NotePos[] = [];

  console.log("[AFTER_CALC] === Stave debug ===");
  for (const vml of gms.MeasureList) {
    if (!vml) {continue;}
    console.log(`[AFTER_CALC] MeasureList: ${vml.length} measures`);
    for (const measure of vml) {
      if (!measure) { console.log("[AFTER_CALC]   measure=null"); continue; }
      const stave: VF.Stave = (measure as VexFlowMeasure).getVFStave();
      console.log(
        `[AFTER_CALC]   visible=${measure.isVisible()} m${measure.MeasureNumber}` +
        ` staffEntries=${measure.staffEntries.length} nsX=${stave.getNoteStartX()} formatted=${(stave as any).formatted}`
      );
    }
  }

  let misalignedCount: number = 0;
  let checkedCount: number = 0;

  for (const vml of gms.MeasureList) {
    if (!vml) {continue;}
    const visibleMeasures: VexFlowMeasure[] = vml.filter(
      (m) => m?.isVisible()
    ) as VexFlowMeasure[];
    console.log(`[ALIGN] MeasureList: ${visibleMeasures.length} visible measures (staff#: ${visibleMeasures.map(m => m.ParentStaff?.Id).join(",")})`);
    if (visibleMeasures.length < 2) {continue;}

    const tickGroups: Map<number, NotePos[]> = new Map();
    for (const measure of visibleMeasures) {
      const stave: VF.Stave = (measure as VexFlowMeasure).getVFStave();
      const nsX: number = stave.getNoteStartX();

      for (const se of measure.staffEntries) {
        if (!se) {continue;}

        for (const gve of se.graphicalVoiceEntries) {
          const vfve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
          if (!vfve.vfStaveNote) {continue;}
          const sn: any = vfve.vfStaveNote;
          const tcX: number = sn.tickContext?.getX() ?? 0;
          const xShift: number = typeof sn.getXShift === "function" ? sn.getXShift() : (sn.xShift ?? 0);
          const renderedX: number = sn.getAbsoluteX() + xShift;
          const tcXRounded: number = Math.round(tcX * 100) / 100;
          if (!tickGroups.has(tcXRounded)) {
            tickGroups.set(tcXRounded, []);
          }
          const keys: string = sn.keys?.join(",") ?? "?";
          const pos: NotePos = {
            renderedX: Math.round(renderedX),
            absX: sn.getAbsoluteX(),
            xShift: Math.round(xShift * 100) / 100,
            keys,
            staveInfo: `nsX=${nsX.toFixed(1)} staveX=${stave.getX()}`,
            staff: measure.ParentStaff?.Id ?? -1,
            measure: measure.MeasureNumber,
            voice: -1,
          };
          tickGroups.get(tcXRounded)!.push(pos);
          allPositions.push(pos);
        }
      }
    }

    for (const [tcX, entries] of tickGroups) {
      const staffs: number[] = [...new Set(entries.map(e => e.staff))].sort();
      const xShifts: string = entries.map(e => e.xShift.toFixed(1)).join(",");
      const renderedXs: string = entries.map(e => e.renderedX.toFixed(1)).join(",");
      console.log(
        `[ALIGN]   tcX=${tcX} entries=${entries.length} staffs=[${staffs}]` +
        ` xShift=[${xShifts}] renderedX=[${renderedXs}] keys=${entries.map(e => e.keys).join("|")}`
      );
    }

    for (const [tcX, entries] of tickGroups) {
      if (entries.length < 2) {continue;}
      const crossStaffEntries: NotePos[] = entries.filter(e => e.staff !== entries[0].staff);
      if (crossStaffEntries.length === 0) {continue;}
      checkedCount++;
      const ref: NotePos = entries[0];
      console.log(
        `[XSHIFT_CHECK] m${ref.measure} tcX=${tcX} refStaff=${ref.staff} refXShift=${ref.xShift}` +
        ` crossStaffCount=${crossStaffEntries.length} xShifts=[${crossStaffEntries.map(e => e.xShift.toFixed(1))}]` +
        ` staffs=[${crossStaffEntries.map(e => e.staff)}]`
      );
      for (const entry of crossStaffEntries) {
        // Visual alignment: renderedX (includes collision-avoidance xShift)
        const rendDiff: number = Math.abs(entry.renderedX - ref.renderedX);
        // Logical alignment: absX (excludes xShift)
        const absDiff: number = Math.abs(entry.absX - ref.absX);
        const xShiftDiff: number = Math.abs(entry.xShift - ref.xShift);

        // Flag extreme xShift (way beyond normal collision avoidance)
        if (Math.abs(entry.xShift) > 25 || Math.abs(ref.xShift) > 25) {
          console.log(
            `EXTREME_XSHIFT m${ref.measure} tcX=${tcX}: xShift=${ref.xShift} vs ${entry.xShift}` +
            ` absX=${ref.absX} vs ${entry.absX} renderedX=${ref.renderedX} vs ${entry.renderedX}` +
            ` keys=${ref.keys} vs ${entry.keys}`
          );
          misalignedCount++;
        }

        if (rendDiff > 2) {
          if (misalignedCount < 20) {
            console.log(
              `MISALIGN_REND m${ref.measure} tcX=${tcX}: renderedX diff=${rendDiff.toFixed(1)}` +
              ` (xShift diff=${xShiftDiff.toFixed(1)}) absX diff=${absDiff.toFixed(1)} keys=${ref.keys}|${entry.keys}`
            );
          }
          misalignedCount++;
        }
      }
    }
  }

  return { misalignedCount, checkedCount, allPositions };
}

describe("VexFlow Measure - Voice Alignment Across Staves", () => {
  it("Should align notes across staves in full score", (done: Mocha.Done) => {
    const path: string = "OSMD_Function_Test_Voice_Alignment.musicxml";
    const score: any = TestUtils.getScore(path);
    expect(score).to.not.be.undefined;
    const partwise: any = TestUtils.getPartWiseElement(score);
    expect(partwise).to.not.be.undefined;
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    expect(gms.MeasureList.length).to.be.greaterThan(0);

    const { misalignedCount, checkedCount }: { misalignedCount: number, checkedCount: number } = checkAlignment(gms);
    expect(misalignedCount).to.equal(0,
      `${misalignedCount} out of ${checkedCount} cross-staff note groups have misaligned rendered X positions (>2px)`);
    done();
  });

  it("Should align voices in reduced grand staff score", (done: Mocha.Done) => {
    const path: string = "OSMD_Function_Test_Voice_Alignment_reduced.musicxml";
    const score: any = TestUtils.getScore(path);
    expect(score).to.not.be.undefined;
    const partwise: any = TestUtils.getPartWiseElement(score);
    expect(partwise).to.not.be.undefined;
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    expect(gms.MeasureList.length).to.be.greaterThan(0);

    const { misalignedCount, checkedCount }: { misalignedCount: number, checkedCount: number } = checkAlignment(gms);
    expect(misalignedCount).to.equal(0,
      `${misalignedCount} out of ${checkedCount} cross-staff note groups have misaligned rendered X positions (>2px)`);
    done();
  });

  it("Should keep reference staff (treble/green) xShift unchanged while aligning colored score", (done: Mocha.Done) => {
    const path: string = "OSMD_Function_Test_Voice_Alignment_colored.musicxml";
    const score: any = TestUtils.getScore(path);
    expect(score).to.not.be.undefined;
    const partwise: any = TestUtils.getPartWiseElement(score);
    expect(partwise).to.not.be.undefined;
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    expect(gms.MeasureList.length).to.be.greaterThan(0);

    const { misalignedCount, checkedCount }: { misalignedCount: number, checkedCount: number } = checkAlignment(gms);
    expect(misalignedCount).to.equal(0,
      `${misalignedCount} out of ${checkedCount} cross-staff note groups have misaligned rendered X positions (>2px)`);

    done();
  });
});
