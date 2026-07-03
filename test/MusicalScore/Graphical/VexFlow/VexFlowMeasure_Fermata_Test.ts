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

interface FermataInfo {
  noteKey: string;
  stemDir: number;
  artType: string;
  artPos: number;
  noteGlyphWidth: number;
  artWidth: number;
  noteAbsX: number;
  noteXShift: number;
  noteCenterX: number;
  modStartX: number;         // getModifierStartXY(pos, 0).x = notehead center
  measure: number;
}

function collectFermatas(gms: GraphicalMusicSheet): FermataInfo[] {
  const result: FermataInfo[] = [];
  for (const vml of gms.MeasureList) {
    if (!vml) { continue; }
    for (const measure of vml) {
      if (!measure?.isVisible()) { continue; }
      for (const se of measure.staffEntries) {
        for (const gve of se.graphicalVoiceEntries) {
          const vfve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
          if (!vfve.vfStaveNote) { continue; }
          const sn: any = vfve.vfStaveNote;
          const mods: any[] = typeof sn.getModifiers === "function" ? sn.getModifiers() : [];
          const fermMods: any[] = mods.filter(
            (m: any) => m.getCategory?.() === "Articulation" &&
              (m.type === "a@a" || m.type === "a@u")
          );
          if (fermMods.length === 0) { continue; }
          const keys: string = sn.keys?.join(",") ?? "?";
          const stemDir: number = typeof sn.getStemDirection === "function" ? sn.getStemDirection() : 0;
          const glyphWidth: number = typeof sn.getGlyphWidth === "function" ? sn.getGlyphWidth() : 0;
          const noteAbsX: number = typeof sn.getAbsoluteX === "function" ? sn.getAbsoluteX() : 0;
          const noteXShift: number = (sn as any).xShift ?? 0;
          const noteCenterX: number = noteAbsX + noteXShift + glyphWidth / 2;
          for (const m of fermMods) {
            const artPos: number = typeof m.getPosition === "function" ? m.getPosition() : -1;
            const artWidth: number = typeof m.getWidth === "function" ? m.getWidth() : 0;
            const modStart: any = typeof sn.getModifierStartXY === "function"
              ? sn.getModifierStartXY(artPos, 0) : { x: 0 };
            result.push({
              noteKey: keys,
              stemDir,
              artType: m.type ?? "?",
              artPos,
              noteGlyphWidth: glyphWidth,
              artWidth,
              noteAbsX,
              noteXShift,
              noteCenterX,
              modStartX: modStart.x,
              measure: measure.MeasureNumber,
            });
          }
        }
      }
    }
  }
  return result;
}

describe("VexFlow Measure - Fermata Positioning", () => {

  it.skip("Should have upright fermata centered on notehead (ABOVE, stem UP)", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_fermata_inverted_placement.musicxml");
    const fermatas: FermataInfo[] = collectFermatas(gms);
    expect(fermatas.length).to.equal(2, "should have exactly 2 fermata articulations");

    const upright: FermataInfo | undefined = fermatas.find(f => f.artType === "a@a");
    expect(upright).to.not.be.undefined;
    if (!upright) { return; }

    expect(upright.stemDir).to.equal(1, "upright fermata note should be stem UP");
    expect(upright.artPos).to.equal(VF.Modifier.Position.ABOVE);

    // getModifierStartXY must return the notehead center (used by draw as anchor)
    expect(upright.modStartX).to.equal(upright.noteCenterX,
      `fermata anchor ${upright.modStartX.toFixed(2)} should be notehead center ${upright.noteCenterX.toFixed(2)}`);

    // Fermata glyph must have a measured width > 0 (draw uses getWidth()/2 to center)
    expect(upright.artWidth).to.be.greaterThan(0,
      `fermata glyph width should be > 0, got ${upright.artWidth}`);
    // Fermata glyph should be substantially wider than the staccato dot (~4-5px)
    expect(upright.artWidth).to.be.greaterThan(10,
      `fermata glyph should be wide (got ${upright.artWidth.toFixed(1)}px)`);
  });

  it.skip("Should have inverted fermata centered on notehead (BELOW, stem UP)", () => {
    const gms: GraphicalMusicSheet = buildGMS("test_fermata_inverted_placement.musicxml");
    const fermatas: FermataInfo[] = collectFermatas(gms);

    const inverted: FermataInfo | undefined = fermatas.find(f => f.artType === "a@u");
    expect(inverted).to.not.be.undefined;
    if (!inverted) { return; }

    expect(inverted.artPos).to.equal(VF.Modifier.Position.BELOW);

    expect(inverted.modStartX).to.equal(inverted.noteCenterX,
      `fermata anchor ${inverted.modStartX.toFixed(2)} should be notehead center ${inverted.noteCenterX.toFixed(2)}`);

    expect(inverted.artWidth).to.be.greaterThan(0,
      `fermata glyph width should be > 0, got ${inverted.artWidth}`);
    expect(inverted.artWidth).to.be.greaterThan(10,
      `fermata glyph should be wide (got ${inverted.artWidth.toFixed(1)}px)`);
  });

});
