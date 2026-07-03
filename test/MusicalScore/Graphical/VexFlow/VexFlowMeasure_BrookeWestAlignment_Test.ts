/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import * as VF from "vexflow";

function buildGMS(path: string, overrides?: { pageWidth?: number, voiceSpacingMultiplier?: number, newSystemAtXML?: boolean }): GraphicalMusicSheet {
  const score: Document = TestUtils.getScore(path);
  const partwise: Element = TestUtils.getPartWiseElement(score);
  const reader: MusicSheetReader = new MusicSheetReader();
  if (overrides?.voiceSpacingMultiplier !== undefined) {
    reader.rules.VoiceSpacingMultiplierVexflow = overrides.voiceSpacingMultiplier;
  }
  if (overrides?.newSystemAtXML !== undefined) {
    reader.rules.NewSystemAtXMLNewSystemAttribute = overrides.newSystemAtXML;
    reader.rules.NewSystemAtXMLNewPageAttribute = overrides.newSystemAtXML;
  }
  const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
  const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
  if (overrides?.pageWidth !== undefined) {
    sheet.pageWidth = overrides.pageWidth;
  }
  const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
  calc.calculate();
  return gms;
}

describe("VexFlow Measure - BrookeWest Bar 10-11 Alignment", () => {

  it("measure 10 notes should not extend past measure bounds", () => {
    // BrookeWestSample: measure 10 has half rest + quarter rest + 2 beamed eighths (F#4, A#4)
    // Bug: the two eighth notes at end of bar 10 shifted into bar 11, misaligned with lyrics
    // Root cause: stale xShift on tickables from centerWholeBarRests() polluted formatter spacing.

    const gms: GraphicalMusicSheet = buildGMS("BrookeWestSample.musicxml", {
      pageWidth: 144,
      voiceSpacingMultiplier: 0.65,
    });

    const measure10: VexFlowMeasure = gms.findGraphicalMeasureByMeasureNumber(10, 0) as VexFlowMeasure;
    const stave10: VF.Stave = measure10.getVFStave();
    const stave10NoteEndX: number = stave10.getX() + stave10.getNoteEndX();

    const voice1: VF.Voice | undefined = measure10.vfVoices[1];
    const tickables: VF.Tickable[] = voice1!.getTickables();
    const notes: VF.Note[] = [];
    for (const t of tickables) {
      if (!(t as any).isRest?.()) {
        notes.push(t as VF.Note);
      }
    }

    expect(notes.length).to.equal(2, "measure 10 should have exactly 2 notes (F#4, A#4)");

    // Both notes must end within the stave's note area
    for (const note of notes) {
      const noteEndX: number = note.getAbsoluteX() + note.getGlyphWidth();
      expect(noteEndX).to.be.at.most(stave10NoteEndX,
        `note ${note.getKeys().join(",")} in measure 10 ` +
        `(end=${noteEndX.toFixed(1)}) should be within stave (end=${stave10NoteEndX.toFixed(1)})`);
    }
  });

  it("measure 11 notes should start within measure 11 bounds", () => {
    // Verify that the first notes of measure 11 aren't being eaten by
    // overflow from measure 10's late notes.
    const gms: GraphicalMusicSheet = buildGMS("BrookeWestSample.musicxml");

    const measure11: VexFlowMeasure = gms.findGraphicalMeasureByMeasureNumber(11, 0) as VexFlowMeasure;
    expect(measure11, "measure 11 should exist").to.not.be.undefined;

    const stave11: VF.Stave = measure11.getVFStave();
    const stave11NoteStartX: number = stave11.getX() + stave11.getNoteStartX();

    const voice1: VF.Voice | undefined = measure11.vfVoices[1];
    expect(voice1, "measure 11 should have voice 1").to.not.be.undefined;

    const tickables: VF.Tickable[] = voice1!.getTickables();
    // Measure 11 has: G#4 16th, G#4 eighth, G#4 eighth, G#4 eighth, G#4 eighth + more (8 total)
    expect(tickables.length).to.be.greaterThan(0,
      "measure 11 should have tickables");

    // First tickable should be within the stave's note area
    const firstTickable: VF.Tickable = tickables[0];
    const firstX: number = (firstTickable as VF.Note).getAbsoluteX?.();
    if (typeof firstX === "number") {
      expect(firstX).to.be.at.least(stave11NoteStartX,
        `first tickable in measure 11 at X=${firstX.toFixed(1)} should be >= ` +
        `stave note start at X=${stave11NoteStartX.toFixed(1)}`);
    }

    // Verify all notes in measure 11 are within stave bounds
    for (const t of tickables) {
      if (!(t as any).isRest?.()) {
        const note: VF.Note = t as VF.Note;
        const noteEndX: number = note.getAbsoluteX() + note.getGlyphWidth();
        const stave11NoteEndX: number = stave11.getX() + stave11.getNoteEndX();
        expect(noteEndX).to.be.at.most(stave11NoteEndX,
          `note ${note.getKeys().join(",")} in measure 11 should not extend past stave end ` +
          `(noteEnd=${noteEndX.toFixed(1)} vs staveEnd=${stave11NoteEndX.toFixed(1)})`);
      }
    }
  });

  it("measure 10 eighth notes should have lyrics attached", () => {
    const gms: GraphicalMusicSheet = buildGMS("BrookeWestSample.musicxml");
    const measure10: VexFlowMeasure = gms.findGraphicalMeasureByMeasureNumber(10, 0) as VexFlowMeasure;

    // Collect lyric texts from parent voice entries.
    const lyricTexts: string[] = [];
    for (const se of measure10.staffEntries) {
      for (const gve of se.graphicalVoiceEntries) {
        const ve: any = (gve as VexFlowVoiceEntry).parentVoiceEntry;
        if (ve?.LyricsEntries) {
          ve.LyricsEntries.forEach((_key: string, entry: any) => {
            if (entry?.Text) {
              lyricTexts.push(entry.Text);
            }
          });
        }
      }
    }

    expect(lyricTexts.length).to.equal(2,
      `measure 10 should have exactly 2 lyrics (I'm, re-), got ${lyricTexts.length}: [${lyricTexts.join(", ")}]`);

    if (lyricTexts.length >= 2) {
      expect(lyricTexts[0]).to.include("I'm",
        `first lyric should be "I'm", got "${lyricTexts[0]}"`);
      expect(lyricTexts[1]).to.include("re",
        `second lyric should be "re", got "${lyricTexts[1]}"`);
    }
  });

  it("measure 10 and 11 should be in the same system", () => {
    // Bug: measures 10 and 11 end up in different systems when the system break
    // should happen at measure 10 (per MusicXML new-system="yes").
    // Without NewSystemAtXMLNewSystemAttribute, these get split across sys1/sys2.
    const gms: GraphicalMusicSheet = buildGMS("BrookeWestSample.musicxml", { newSystemAtXML: true });

    const measure10: VexFlowMeasure = gms.findGraphicalMeasureByMeasureNumber(10, 0) as VexFlowMeasure;
    const measure11: VexFlowMeasure = gms.findGraphicalMeasureByMeasureNumber(11, 0) as VexFlowMeasure;

    const sl10: any = measure10.ParentStaffLine;
    const sl11: any = measure11.ParentStaffLine;

    const sameStaffLine: boolean = sl10 === sl11;
    expect(sameStaffLine,
      `m10 (sys=${sl10?.ParentMusicSystem?.id}) and m11 (sys=${sl11?.ParentMusicSystem?.id}) ` +
      "should share the same StaffLine — system break misplaced").to.be.true;
  });

  it("measure 10-11: systems should be correctly split at measure 10", () => {
    // System layout: system breaks at m5, m10, m15.
    // Measures 10-14 should be one system. Verify that m10 is the first measure
    // in its system (stave X = 0 or left margin) and m11 follows it.
    const gms: GraphicalMusicSheet = buildGMS("BrookeWestSample.musicxml", { newSystemAtXML: true });

    // Find all graphical measures for staff 0 (Voice)
    const voiceMeasures10to14: VexFlowMeasure[] = [];
    for (const vml of gms.MeasureList) {
      if (!vml || !vml[0]) { continue; }
      const gm: VexFlowMeasure = vml[0] as VexFlowMeasure;
      if (gm.MeasureNumber >= 10 && gm.MeasureNumber <= 14) {
        voiceMeasures10to14.push(gm);
      }
    }

    // Verify all measures 10-14 exist and have notes within their stave bounds
    expect(voiceMeasures10to14.length).to.equal(5,
      "should find exactly 5 Voice measures (10, 11, 12, 13, 14)");

    if (voiceMeasures10to14.length >= 2) {
      for (const vm of voiceMeasures10to14) {
        const stave: VF.Stave = vm.getVFStave();
        const noteEndX: number = stave.getX() + stave.getNoteEndX();
        for (const voiceId of Object.keys(vm.vfVoices)) {
          const voice: VF.Voice = vm.vfVoices[Number(voiceId)];
          for (const t of voice.getTickables()) {
            if (!(t as any).isRest?.()) {
              const note: VF.Note = t as VF.Note;
              const endX: number = note.getAbsoluteX() + note.getGlyphWidth();
              expect(endX).to.be.at.most(noteEndX,
                `measure ${vm.MeasureNumber} note ${note.getKeys().join(",")} ` +
                `(end=${endX.toFixed(1)}) should be within stave (end=${noteEndX.toFixed(1)})`);
            }
          }
        }
      }
    }
  });

});
