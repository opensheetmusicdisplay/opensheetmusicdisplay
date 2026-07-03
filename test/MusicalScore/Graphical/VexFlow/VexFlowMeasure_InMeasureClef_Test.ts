/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { ClefInstruction, ClefEnum } from "../../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import * as VF from "vexflow";

describe("VexFlow Measure - In-Measure Clef Changes", () => {
  function findMeasure(gms: GraphicalMusicSheet, measureNumber: number, staffId: number): VexFlowMeasure {
    for (const vml of gms.MeasureList) {
      if (!vml) { continue; }
      for (const m of vml) {
        if (!m || !m.isVisible()) { continue; }
        if (m.MeasureNumber === measureNumber && (m as any).ParentStaff?.Id === staffId) {
          return m as VexFlowMeasure;
        }
      }
    }
    return undefined;
  }

  function getBeginClefs(m: VexFlowMeasure): VF.StaveModifier[] {
    return m.getVFStave().getModifiers(VF.StaveModifier.Position.BEGIN, "Clef");
  }

  function buildGMS(path: string): GraphicalMusicSheet {
    const score: any = TestUtils.getScore(path);
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    // Enable XML system breaks so bar 2 starts a new system (test data has new-system="yes")
    reader.rules.NewSystemAtXMLNewSystemAttribute = true;
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();
    return gms;
  }

  it("Should NOT repeat in-measure clef as system-start clef on next line", () => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_function_test_in-measure-clefs.xml");
    expect(gms.MeasureList.length).to.be.greaterThan(1, "should have at least 2 measures");

    // Bar 1 staff 2: verify in-measure treble clef change exists
    const bar1Staff2: VexFlowMeasure = findMeasure(gms, 1, 2);
    expect(bar1Staff2, "bar 1 staff 2 should exist").to.not.be.undefined;
    const srcMeasure: any = bar1Staff2.parentSourceMeasure;
    const entries: any[] = srcMeasure.getEntriesPerStaff(1);
    let foundTreble: boolean = false;
    for (const entry of entries) {
      if (!entry?.Instructions) { continue; }
      for (const instr of entry.Instructions) {
        if (instr instanceof ClefInstruction && instr.ClefType === ClefEnum.G) {
          foundTreble = true;
        }
      }
    }
    expect(foundTreble).to.be.true,
      "bar 1 staff 2 should have an in-measure treble clef change";

    // Bar 2 staff 2: should NOT have a redundant system-start clef
    const bar2Staff2: VexFlowMeasure = findMeasure(gms, 2, 2);
    expect(bar2Staff2, "bar 2 staff 2 should exist").to.not.be.undefined;

    const beginClefs2: VF.StaveModifier[] = getBeginClefs(bar2Staff2);
    expect(beginClefs2.length).to.equal(0,
      "bar 2 staff 2 should NOT have a system-start clef — " +
      "the in-measure treble on bar 1 beat 4 already shows the clef");

    // Internal tracking still knows active clef (treble) for accidentals etc.
    expect(bar2Staff2.InitiallyActiveClef).to.not.be.undefined;
    expect(bar2Staff2.InitiallyActiveClef.ClefType).to.equal(ClefEnum.G,
      "internal clef tracking should still be treble");
  });

  it("Should show system-start clef on stave whose clef changed from previous system", () => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_function_test_in-measure-clefs.xml");
    expect(gms.MeasureList.length).to.be.greaterThan(1, "should have at least 2 measures");

    // Bar 2 staff 1: should have a system-start clef because it changed from bass (bar 1 beat 2)
    // to treble (explicit in bar 2 attributes).
    const bar2Staff1: VexFlowMeasure = findMeasure(gms, 2, 1);
    expect(bar2Staff1, "bar 2 staff 1 should exist").to.not.be.undefined;

    const beginClefs1: VF.StaveModifier[] = getBeginClefs(bar2Staff1);
    expect(beginClefs1.length).to.equal(1,
      "bar 2 staff 1 should have a system-start clef (treble, from bar 2 attributes)");
    expect(bar2Staff1.InitiallyActiveClef).to.not.be.undefined;
    expect(bar2Staff1.InitiallyActiveClef.ClefType).to.equal(ClefEnum.G,
      "bar 2 staff 1 clef should be treble");
  });

  it.skip("in-measure clef should have adequate spacing from following note", () => {
    const gms: GraphicalMusicSheet = buildGMS("OSMD_function_test_in-measure-clefs.xml");
    const minGapPx: number = 12;
    let clefCount: number = 0;

    for (const vml of gms.MeasureList) {
      if (!vml) { continue; }
      for (const m of vml) {
        if (!m?.isVisible()) { continue; }
        for (const se of m.staffEntries) {
          const vfse: VexFlowStaffEntry = se as VexFlowStaffEntry;
          if (!vfse.vfClefBefore) { continue; }
          clefCount++;
          const clefNote: any = vfse.vfClefBefore;
          const clefWidth: number = clefNote.getWidth?.() ?? 0;
          for (const gve of vfse.graphicalVoiceEntries) {
            const sn: any = (gve as any).vfStaveNote;
            if (!sn) { continue; }
            const mods: any[] = sn.getModifiers?.() ?? [];
            for (const mod of mods) {
              if (mod.getWidth && mod.subNotes) {
                const subGroupWidth: number = mod.getWidth();
                expect(subGroupWidth).to.be.at.least(clefWidth + minGapPx,
                  `m${m.MeasureNumber}: NoteSubGroup width ${subGroupWidth.toFixed(1)} ` +
                  `should exceed clefWidth(${clefWidth.toFixed(1)}) + ${minGapPx}px gap`);
              }
            }
          }
        }
      }
    }
    expect(clefCount).to.be.greaterThan(0, "should find at least one in-measure clef");
  });
});
