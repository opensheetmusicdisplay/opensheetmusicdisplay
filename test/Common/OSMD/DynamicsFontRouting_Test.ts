import { expect } from "chai";
import { TextDynamics } from "vexflow/core";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import {
  DORICO_DEFAULT_TEXT_FONT_FAMILY,
  DORICO_NOTATION_FONT_FAMILY,
} from "../../../src/MusicalScore/Graphical/DoricoTextFontRouting";
import { VexFlowInstantaneousDynamicExpression } from
  "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstantaneousDynamicExpression";
import {
  InstantaneousDynamicExpression,
  InstantaneousDynamicComponentType,
} from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

describe("MusicXML dynamics font routing", (): void => {
  it("preserves ordered components and renders standard marks as explicit Bravura glyphs", async (): Promise<void> => {
    const container: HTMLElement = TestUtils.getDivElement(document);
    const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
    await osmd.load(TestUtils.getScore("test_dynamics_bravura_combined.musicxml"));
    osmd.render();

    const sourceExpressions: InstantaneousDynamicExpression[] =
      osmd.Sheet.SourceMeasures[0].StaffLinkedExpressions[0]
      .map((multiExpression) => multiExpression.InstantaneousDynamic);
    expect(sourceExpressions.map((expression) => expression.DisplayText))
      .to.deep.equal(["pp", "mf", "sfz", "sfmp", "subito dolce"]);
    expect(sourceExpressions[3].Components).to.deep.equal([
      { type: InstantaneousDynamicComponentType.Standard, text: "sf" },
      { type: InstantaneousDynamicComponentType.Standard, text: "mp" },
    ]);
    expect(sourceExpressions[4].Components).to.deep.equal([
      { type: InstantaneousDynamicComponentType.Literal, text: "subito dolce" },
    ]);

    const graphicalExpressions: VexFlowInstantaneousDynamicExpression[] =
      osmd.GraphicSheet.MusicPages.flatMap((page) => page.MusicSystems)
        .flatMap((system) => system.StaffLines)
        .flatMap((staffLine) => staffLine.AbstractExpressions)
        .filter((expression): expression is VexFlowInstantaneousDynamicExpression =>
          expression instanceof VexFlowInstantaneousDynamicExpression,
        );
    expect(graphicalExpressions).to.have.length(5);
    expect(graphicalExpressions.every((expression) =>
      expression.Label.Label.fontStyle === FontStyles.Regular,
    )).to.equal(true);
    expect(graphicalExpressions.every((expression) =>
      expression.Label.Label.fontHeight === osmd.Sheet.Rules.InstantaneousDynamicTextHeight,
    )).to.equal(true);
    expect(osmd.Sheet.Rules.InstantaneousDynamicTextHeight)
      .to.equal(osmd.Sheet.Rules.ContinuousDynamicTextHeight * 2);

    const glyphs: (text: string) => string = (text: string): string => text.split("")
      .map((letter: string): string => TextDynamics.GLYPHS[letter])
      .join("");
    expect(graphicalExpressions[0].Label.Label.textLines[0].runs).to.deep.equal([
      { text: glyphs("pp"), fontFamily: DORICO_NOTATION_FONT_FAMILY },
    ]);
    expect(graphicalExpressions[3].Label.Label.textLines[0].runs).to.deep.equal([
      { text: glyphs("sf"), fontFamily: DORICO_NOTATION_FONT_FAMILY },
      { text: glyphs("mp"), fontFamily: DORICO_NOTATION_FONT_FAMILY },
    ]);
    expect(graphicalExpressions[4].Label.Label.textLines[0].runs).to.deep.equal([
      { text: "subito dolce", fontFamily: DORICO_DEFAULT_TEXT_FONT_FAMILY },
    ]);

    const textNodes: SVGTextElement[] = Array.from(container.querySelectorAll("text"));
    for (const expected of ["pp", "mf", "sfz", "sf", "mp"].map(glyphs)) {
      const node: SVGTextElement = textNodes.find((candidate) => candidate.textContent === expected);
      expect(node, `missing rendered glyph run ${expected}`).to.not.equal(undefined);
      expect(node.getAttribute("font-family")).to.equal(DORICO_NOTATION_FONT_FAMILY);
    }
    const literal: SVGTextElement = textNodes.find((candidate) => candidate.textContent === "subito dolce");
    expect(literal).to.not.equal(undefined);
    expect(literal.getAttribute("font-family")).to.equal(DORICO_DEFAULT_TEXT_FONT_FAMILY);
  });
});
