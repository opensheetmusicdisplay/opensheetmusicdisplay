import {expect} from "chai";
import {GraphicalChordSymbolContainer} from
  "../../../src/MusicalScore/Graphical/GraphicalChordSymbolContainer";
import {GraphicalLabel} from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import {
  ChordSymbolContainer,
  HarmonyArrangement,
  HarmonyBassArrangement,
} from "../../../src/MusicalScore/VoiceData/ChordSymbolContainer";
import {
  SMUFL_CHORD_ACCIDENTAL_SHARP_GLYPH,
  SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
  SMUFL_CHORD_AUGMENTED_GLYPH,
  SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
  SMUFL_CHORD_DIMINISHED_GLYPH,
  SMUFL_CHORD_HALF_DIMINISHED_GLYPH,
  SMUFL_CHORD_MAJOR_SEVENTH_GLYPH,
  SMUFL_CHORD_MINOR_GLYPH,
} from "../../../src/Common/DataObjects/ChordSymbolGlyphs";
import {KeyInstruction} from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {TransposeCalculator} from "../../../src/Plugins/Transpose/TransposeCalculator";
import {TestUtils} from "../../Util/TestUtils";

describe("Dorico-style MusicXML harmony arrangements", (): void => {
  it("preserves ordered components, degree ownership, arrangements, and separators", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = await loadHarmonyScore();
    const sourceChords: ChordSymbolContainer[] = osmd.Sheet.SourceMeasures.flatMap((measure) =>
      measure.VerticalSourceStaffEntryContainers.flatMap((vertical) =>
        vertical.StaffEntries.filter(Boolean).flatMap((entry) => entry.ChordContainers),
      ),
    );
    expect(sourceChords[0].Arrangement).to.equal(HarmonyArrangement.Vertical);
    expect(sourceChords[0].Components).to.have.length(2);
    expect(sourceChords[0].Components[0].ChordDegrees.map((degree) => degree.value)).to.deep.equal([9]);
    expect(sourceChords[0].Components[1].ChordDegrees.map((degree) => degree.value)).to.deep.equal([13]);
    expect(sourceChords[1].Arrangement).to.equal(HarmonyArrangement.Horizontal);
    expect(sourceChords[2].Arrangement).to.equal(HarmonyArrangement.Diagonal);
    expect(sourceChords[5].BassSeparator).to.deep.equal({text: "over", explicit: true});
    expect(sourceChords[5].Components[0].BassArrangement).to.equal(HarmonyBassArrangement.Diagonal);
    expect(sourceChords[13].Components[0].BassArrangement).to.equal(HarmonyBassArrangement.Horizontal);
    expect(sourceChords[14].Components[0].BassArrangement).to.equal(HarmonyBassArrangement.Vertical);

    const key: KeyInstruction = osmd.Sheet.SourceMeasures[0].getKeyInstruction(0);
    expect(sourceChords[0].calculateUpperHarmonyText(sourceChords[0].Components[0], 2, key))
      .to.match(/^D/);
    expect(sourceChords[0].calculateUpperHarmonyText(sourceChords[0].Components[1], 2, key))
      .to.match(/^A/);
    expect(sourceChords[3].calculateUpperHarmonyText(sourceChords[3].Components[0], 2, key))
      .to.match(/^D/);
    expect(sourceChords[3].calculateBassText(sourceChords[3].Components[0], 2, key))
      .to.match(/^F[#♯]/);

    const qualityTexts: string[] = sourceChords.slice(6, 11).map((chord) =>
      chord.calculateUpperHarmonyText(chord.Components[0], 0, key),
    );
    expect(qualityTexts[0]).to.equal("Cm");
    expect(qualityTexts[0]).to.not.include(SMUFL_CHORD_MINOR_GLYPH);
    expect(qualityTexts[1]).to.include(SMUFL_CHORD_AUGMENTED_GLYPH);
    expect(qualityTexts[2]).to.include(SMUFL_CHORD_DIMINISHED_GLYPH);
    expect(qualityTexts[3]).to.include(SMUFL_CHORD_HALF_DIMINISHED_GLYPH);
    expect(qualityTexts[4]).to.include(SMUFL_CHORD_MAJOR_SEVENTH_GLYPH);
    expect(sourceChords[15].calculateUpperHarmonyText(sourceChords[15].Components[0], 0, key))
      .to.equal("C#6/9");
    expect(sourceChords[16].calculateUpperHarmonyText(sourceChords[16].Components[0], 0, key))
      .to.equal("Em6/9");
  });

  it("lays out fraction, diagonal, custom, and abbreviated chord geometry inside aggregate bounds", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = await loadHarmonyScore();
    const systems: GraphicalChordSymbolContainer[][] = osmd.GraphicSheet.MusicPages
      .flatMap((page) => page.MusicSystems)
      .map((system) => system.StaffLines[0].Measures
        .flatMap((measure) => measure.staffEntries)
        .flatMap((entry) => entry.graphicalChordContainers),
      );
    const firstSystem: GraphicalChordSymbolContainer[] = systems[0];
    const vertical: GraphicalChordSymbolContainer = firstSystem[0];
    expect(vertical.GraphicalLabels).to.have.length(2);
    expect(vertical.GraphicalSeparators).to.have.length(1);
    expect(vertical.GraphicalSeparators[0].Line.Start.y)
      .to.be.closeTo(vertical.GraphicalSeparators[0].Line.End.y, 0.0001);

    const diagonal: GraphicalChordSymbolContainer = firstSystem[2];
    expect(diagonal.GraphicalSeparators).to.have.length(0);
    expect(diagonal.GraphicalLabels.some((label) =>
      label.Label.text === SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
    )).to.equal(true);

    const firstSlash: GraphicalChordSymbolContainer = firstSystem[3];
    const abbreviatedSlash: GraphicalChordSymbolContainer = firstSystem[4];
    expect(firstSlash.IsUpperChordAbbreviated).to.equal(false);
    expect(abbreviatedSlash.IsUpperChordAbbreviated).to.equal(true);
    expect(abbreviatedSlash.GraphicalLabels[0].Label.print).to.equal(false);
    expect(firstSlash.GraphicalSeparators).to.have.length(0);
    expect(abbreviatedSlash.GraphicalSeparators).to.have.length(0);
    const firstSlashGlyph: GraphicalLabel = firstSlash.GraphicalLabels.find((label) =>
      label.Label.text === SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
    );
    const abbreviatedSlashGlyph: GraphicalLabel = abbreviatedSlash.GraphicalLabels.find((label) =>
      label.Label.text === SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
    );
    expect(firstSlashGlyph).to.not.equal(undefined);
    expect(abbreviatedSlashGlyph).to.not.equal(undefined);
    expect(abbreviatedSlashGlyph.PositionAndShape.RelativePosition.x)
      .to.be.closeTo(firstSlashGlyph.PositionAndShape.RelativePosition.x, 0.001);

    const customSeparator: GraphicalChordSymbolContainer = firstSystem[5];
    expect(customSeparator.GraphicalSeparators).to.have.length(0);
    expect(customSeparator.GraphicalLabels.some((label) => label.Label.text === "over")).to.equal(true);

    for (const chord of firstSystem) {
      for (const separator of chord.GraphicalSeparators) {
        expect(separator.Line.Start.x).to.be.at.least(chord.PositionAndShape.BorderLeft - 0.001);
        expect(separator.Line.End.x).to.be.at.most(chord.PositionAndShape.BorderRight + 0.001);
        expect(separator.Line.Start.y).to.be.at.least(chord.PositionAndShape.BorderTop - 0.001);
        expect(separator.Line.End.y).to.be.at.most(chord.PositionAndShape.BorderBottom + 0.001);
      }
    }

    expect(systems[2][0].IsUpperChordAbbreviated).to.equal(false);
    expect(systems[2][1].IsUpperChordAbbreviated).to.equal(true);
    expect(systems[2][2].GraphicalLabels).to.have.length(1);
    expect(systems[2][2].GraphicalSeparators).to.have.length(0);
    expect(systems[2][3].GraphicalLabels).to.have.length(2);
    expect(systems[2][3].GraphicalSeparators).to.have.length(1);
    expect(systems[2][3].GraphicalSeparators[0].Line.Start.y)
      .to.be.closeTo(systems[2][3].GraphicalSeparators[0].Line.End.y, 0.0001);
  });

  it("routes chord-quality symbols through explicit Bravura Text glyphs and remains rebuild-stable", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = await loadHarmonyScore();
    const qualityGlyphs: string[] = [
      SMUFL_CHORD_DIMINISHED_GLYPH,
      SMUFL_CHORD_HALF_DIMINISHED_GLYPH,
      SMUFL_CHORD_AUGMENTED_GLYPH,
      SMUFL_CHORD_MAJOR_SEVENTH_GLYPH,
      SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
      SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
      SMUFL_CHORD_ACCIDENTAL_SHARP_GLYPH,
    ];
    const renderedText: SVGTextElement[] = Array.from(document.querySelectorAll("text"));
    for (const glyph of qualityGlyphs) {
      const node: SVGTextElement = renderedText.find((candidate) => candidate.textContent?.includes(glyph));
      expect(node, `missing chord glyph U+${glyph.charCodeAt(0).toString(16)}`).to.not.equal(undefined);
      expect(node.getAttribute("font-family")).to.equal("Bravura Text");
    }
    const minorNode: SVGTextElement = renderedText.find((candidate) =>
      candidate.textContent === "Cm",
    );
    expect(minorNode).to.not.equal(undefined);
    expect(minorNode.getAttribute("font-family")).to.equal("Academico");

    const firstGeometry: string[] = harmonyGeometry(osmd);
    osmd.updateGraphic();
    osmd.render();
    expect(harmonyGeometry(osmd)).to.deep.equal(firstGeometry);
  });
});

async function loadHarmonyScore(): Promise<OpenSheetMusicDisplay> {
  const container: HTMLElement = TestUtils.getDivElement(document);
  const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
  osmd.TransposeCalculator = new TransposeCalculator();
  await osmd.load(TestUtils.getScore("test_harmony_dorico_arrangements.musicxml"));
  osmd.setOptions({newSystemFromXML: true});
  osmd.render();
  return osmd;
}

function harmonyGeometry(osmd: OpenSheetMusicDisplay): string[] {
  return osmd.GraphicSheet.MusicPages.flatMap((page) => page.MusicSystems)
    .flatMap((system) => system.StaffLines)
    .flatMap((staffLine) => staffLine.Measures)
    .flatMap((measure) => measure.staffEntries)
    .flatMap((entry) => entry.graphicalChordContainers)
    .map((chord) => [
      chord.UpperHarmonySignature,
      chord.BassSignature,
      chord.IsUpperChordAbbreviated ? "abbreviated" : "full",
      chord.PositionAndShape.BorderLeft.toFixed(4),
      chord.PositionAndShape.BorderRight.toFixed(4),
      chord.PositionAndShape.BorderTop.toFixed(4),
      chord.PositionAndShape.BorderBottom.toFixed(4),
    ].join("|"));
}
