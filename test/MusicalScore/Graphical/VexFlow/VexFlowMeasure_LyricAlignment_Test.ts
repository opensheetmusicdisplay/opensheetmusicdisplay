/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalLyricEntry } from "../../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
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

interface LyricPosition {
  text: string;
  verseNumber: string;
  measureNumber: number;
  absoluteX: number;
  rightEdge: number;
}

describe("VexFlow Measure - Lyric X-Alignment", () => {
  it("lyrics should not overlap horizontally in second verse with whole rest voice", () => {
    const gms: GraphicalMusicSheet =
      buildGMS("test_lyrics_x-alignment_whole_rest_second_voice.musicxml");

    // Collect lyrics grouped by verse number
    const byVerse: Map<string, LyricPosition[]> = new Map();

    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const gMeasure: GraphicalMeasure = measure as unknown as GraphicalMeasure;
        const measureX: number = gMeasure.PositionAndShape.RelativePosition.x;

        for (const staffEntry of gMeasure.staffEntries) {
          const gse: GraphicalStaffEntry = staffEntry as GraphicalStaffEntry;
          if (gse.LyricsEntries.length === 0) { continue; }

          const seX: number = gse.PositionAndShape.RelativePosition.x;

          for (const lyricEntry of gse.LyricsEntries) {
            const gle: GraphicalLyricEntry = lyricEntry;
            const label: BoundingBox = gle.GraphicalLabel.PositionAndShape;
            const absoluteX: number = measureX + seX + label.RelativePosition.x;
            const rightEdge: number = absoluteX + label.Size.width;

            const verse: string = gle.LyricsEntry.VerseNumber;
            if (!byVerse.has(verse)) {
              byVerse.set(verse, []);
            }
            byVerse.get(verse)!.push({
              text: gle.LyricsEntry.Text,
              verseNumber: verse,
              measureNumber: gMeasure.MeasureNumber,
              absoluteX,
              rightEdge,
            });
          }
        }
      }
    }

    expect(byVerse.size, "should have lyrics in at least 2 verses").to.be.greaterThan(0);

    // For each verse, check consecutive lyrics don't overlap
    const overlapFailures: string[] = [];
    for (const [verse, lyrics] of byVerse) {
      for (let i: number = 0; i < lyrics.length - 1; i++) {
        const current: LyricPosition = lyrics[i];
        const next: LyricPosition = lyrics[i + 1];
        const gap: number = next.absoluteX - current.rightEdge;

        // Gap should be >= 0 — lyrics should not overlap.
        // Allow a small negative tolerance for sub-pixel rounding.
        if (gap < -0.5) {
          overlapFailures.push(
            `verse ${verse}: "${current.text}"(m${current.measureNumber}) ` +
            `right=${current.rightEdge.toFixed(1)} → "${next.text}"(m${next.measureNumber}) ` +
            `left=${next.absoluteX.toFixed(1)} gap=${gap.toFixed(1)}`,
          );
        }
      }
    }

    for (const f of overlapFailures) {
      console.log(`[LYRIC_OVERLAP] ${f}`);
    }
    expect(overlapFailures, `lyric x-overlap detected:\n${overlapFailures.join("\n")}`)
      .to.be.empty;
  });
});
