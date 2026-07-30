import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {
    VexFlowHorizontalSpacingCandidateDiagnostics,
    VexFlowHorizontalSpacingDiagnostics,
} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowHorizontalSpacing";
import { LyricFootprint } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";
import * as VF from "vexflow/core";

describe("Horizontal system spacing", (): void => {
  it("does not publish constraints across a selected XML system break", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(twoMeasureSystemBreakScore());
    osmd.Sheet.Rules.NewSystemAtXMLNewSystemAttribute = true;
    osmd.render();

    const diagnostics: VexFlowHorizontalSpacingDiagnostics = getDiagnostics(osmd);
    expect(diagnostics.selectedSystems).to.have.length(2);
    expect(
      diagnostics.selectedSystems.every((system): boolean => system.measureNumbers.length === 1),
    ).to.equal(true);
    expect(
      diagnostics.resolvedConstraints.some(
        (constraint): boolean =>
          constraint.reason === "lyric" ||
          constraint.reason === "hyphen" ||
          constraint.reason === "extender",
      ),
    ).to.equal(false);
    expect(
      diagnostics.resolvedConstraints.some(
        (constraint): boolean => constraint.reason === "system-edge",
      ),
    ).to.equal(true);

    const rejectedPairCandidate: VexFlowHorizontalSpacingCandidateDiagnostics =
      diagnostics.candidateEvaluations.find(
        (candidate): boolean =>
          candidate.measureNumbers.length === 2 && candidate.accepted === false,
      );
    expect(rejectedPairCandidate).to.not.equal(undefined);
    expect(diagnostics.selectedSystems.map((system): number => system.systemIndex)).to.deep.equal([
      0, 1,
    ]);
    for (const system of diagnostics.selectedSystems) {
      expect(system.columns.length).to.be.greaterThan(2);
      expect(
        system.resolvedConstraints.every(
          (constraint): boolean =>
            constraint.fromColumn >= 0 &&
            constraint.toColumn < system.columns.length &&
            system.columns[constraint.fromColumn].columnIndex === constraint.fromColumn &&
            system.columns[constraint.toColumn].columnIndex === constraint.toColumn,
        ),
      ).to.equal(true);
    }
    expect(() => JSON.stringify(diagnostics)).to.not.throw();
  });

  it("replaces named system padding idempotently on rerender", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(denseLyricScore());
    osmd.render();

    const firstPaddings: { leftPx: number, rightPx: number }[] = notePaddings(osmd);
    const firstAddedWidth: number = getDiagnostics(osmd).addedWidthPx;
    expect(firstAddedWidth).to.be.greaterThan(0);

    osmd.render();

    expect(notePaddings(osmd)).to.deep.equal(firstPaddings);
    expect(getDiagnostics(osmd).addedWidthPx).to.be.closeTo(firstAddedWidth, 0.001);
  });

  it("does not let a width factor reduce intrinsic quarter-rest clearance", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(quarterRestScore());
    osmd.Sheet.MeasureWidthFactor = 0.01;
    osmd.render();

    const diagnostics: VexFlowHorizontalSpacingDiagnostics = getDiagnostics(osmd);
    expect(diagnostics.selectedSystems).to.have.length(1);
    expect(diagnostics.selectedSystems[0].intrinsicHardWidthPx).to.be.at.least(4.5);
    expect(diagnostics.selectedSystems[0].selectedHardWidthPx).to.be.at.least(4.5);
    expect(
      Math.max(...notePaddings(osmd).map((padding): number => padding.rightPx)),
    ).to.be.at.least(4.5);
  });

  it("keeps polyphonic lyrics on one rendered row clear without joining their words", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(polyphonicLyricScore());
    osmd.render();

    const diagnostics: VexFlowHorizontalSpacingDiagnostics = getDiagnostics(osmd);
    expect(diagnostics.selectedSystems).to.have.length(1);
    expect(
      diagnostics.resolvedConstraints.filter(
        (constraint): boolean => constraint.reason === "lyric",
      ),
    ).to.have.length(1);
    expect(
      diagnostics.resolvedConstraints.some(
        (constraint): boolean => constraint.reason === "hyphen" || constraint.reason === "extender",
      ),
    ).to.equal(false);
  });

  it("preserves hard clearance when a centred chorus takes over a verse row", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(chorusHandoffScore());
    osmd.render();

    const lyricEntries: any[] = osmd.GraphicSheet.MeasureList.flatMap(
      (verticalMeasures): unknown[] => verticalMeasures,
    )
      .flatMap((measure: any): unknown[] => measure?.staffEntries ?? [])
      .flatMap((staffEntry: any): unknown[] => staffEntry.LyricsEntries ?? []);
    const verse: any = lyricEntries.find(
      (entry: any): boolean => entry.LyricsEntry.Text === "walk,",
    );
    const chorus: any = lyricEntries.find(
      (entry: any): boolean => entry.LyricsEntry.Text === "Mark",
    );
    expect(verse).to.not.equal(undefined);
    expect(chorus).to.not.equal(undefined);
    expect(chorus.GraphicalLabel.PositionAndShape.RelativePosition.y).to.be.closeTo(
      verse.GraphicalLabel.PositionAndShape.RelativePosition.y,
      0.001,
    );

        const verseFootprint: LyricFootprint = verse.getFootprint(
            verse.StaffEntryParent.PositionAndShape.RelativePosition.x,
        );
        const chorusFootprint: LyricFootprint = chorus.getFootprint(
            chorus.StaffEntryParent.PositionAndShape.RelativePosition.x,
        );
    expect(chorusFootprint.leftEdgeX - verseFootprint.rightEdgeX).to.be.at.least(
      osmd.Sheet.Rules.HorizontalBetweenLyricsDistance - 0.001,
    );
  });

  it("preserves internal notation bounds under every width-reduction path", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(denseNotationPickupScore());
    osmd.Sheet.MeasureWidthFactor = 0.01;
    osmd.Sheet.Rules.VoiceSpacingMultiplierVexflow = 0.01;
    osmd.Sheet.Rules.PickupMeasureWidthMultiplier = 0.01;
    osmd.Sheet.Rules.FixedMeasureWidth = true;
    osmd.Sheet.Rules.FixedMeasureWidthFixedValue = 0.01;
    osmd.Sheet.Rules.FixedMeasureWidthUseForPickupMeasures = true;
    osmd.render();

    const contexts: VF.TickContext[] = notationContexts(osmd);
    expect(contexts.length).to.be.greaterThan(2);
    for (let index: number = 1; index < contexts.length; index++) {
      const previous: VF.TickContext = contexts[index - 1];
      const current: VF.TickContext = contexts[index];
      const previousMetrics: ReturnType<VF.TickContext["getMetrics"]> = previous.getMetrics();
      const currentMetrics: ReturnType<VF.TickContext["getMetrics"]> = current.getMetrics();
      const gap: number =
        current.getX() -
        currentMetrics.totalLeftPx -
        (previous.getX() + previousMetrics.notePx + previousMetrics.totalRightPx);
      expect(gap).to.be.at.least(-0.001);
    }

    const exactHardWidthPx: number = contexts.reduce(
      (width: number, context: VF.TickContext): number => width + context.getWidth(),
      0,
    );
    expect(getDiagnostics(osmd).selectedSystems[0].intrinsicHardWidthPx).to.be.closeTo(
      exactHardWidthPx,
      0.001,
    );
  });
});

function createOsmd(): OpenSheetMusicDisplay {
  return TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
}

function getDiagnostics(osmd: OpenSheetMusicDisplay): VexFlowHorizontalSpacingDiagnostics {
  return (
    osmd.GraphicSheet as typeof osmd.GraphicSheet & {
      HorizontalSpacingDiagnostics: VexFlowHorizontalSpacingDiagnostics;
    }
  ).HorizontalSpacingDiagnostics;
}

function notePaddings(osmd: OpenSheetMusicDisplay): { leftPx: number, rightPx: number }[] {
  return osmd.GraphicSheet.MeasureList.flatMap((verticalMeasures): unknown[] => verticalMeasures)
    .flatMap((measure: any): unknown[] => measure?.staffEntries ?? [])
    .flatMap((staffEntry: any): unknown[] => staffEntry.graphicalVoiceEntries ?? [])
    .map((voiceEntry: any): { leftPx: number, rightPx: number } =>
      voiceEntry.vfStaveNote.getLayoutPadding(),
    );
}

function notationContexts(osmd: OpenSheetMusicDisplay): VF.TickContext[] {
  const contextsByTick: Map<number, VF.TickContext> = new Map<number, VF.TickContext>();
  for (const verticalMeasures of osmd.GraphicSheet.MeasureList) {
    for (const measure of verticalMeasures) {
      for (const staffEntry of measure?.staffEntries ?? []) {
        for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
          const context: VF.TickContext = (
            voiceEntry as VexFlowVoiceEntry
          ).vfStaveNote?.getTickContext?.();
          if (context) {
            contextsByTick.set(context.getTickID(), context);
          }
        }
      }
    }
  }
  return Array.from(contextsByTick.values()).sort(
    (left: VF.TickContext, right: VF.TickContext): number => left.getX() - right.getX(),
  );
}

function twoMeasureSystemBreakScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>1</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>previous</text></lyric>
      </note>
    </measure>
    <measure number="2">
      <print new-system="yes"/>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>current</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function denseLyricScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>extraordinarily</text></lyric>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>uncompromisingly</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function quarterRestScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><rest/><duration>1</duration><type>quarter</type></note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function polyphonicLyricScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><voice>1</voice><type>quarter</type>
        <lyric number="1"><syllabic>begin</syllabic><text>extraordinarily</text></lyric>
      </note>
      <note>
        <rest/><duration>1</duration><voice>1</voice><type>quarter</type>
      </note>
      <backup><duration>2</duration></backup>
      <note>
        <rest/><duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>uncompromisingly</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function chorusHandoffScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
        <lyric number="1" name="verse"><text>maid,</text></lyric>
        <lyric number="2" name="verse"><text>walk,</text></lyric>
        <lyric number="3" name="verse"><text>kiss,</text></lyric>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
        <lyric number="chorus" name="chorus"><text>Mark</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function denseNotationPickupScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0" osmdMeasureWidthFactor="0.01">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1" implicit="yes" osmdWidthFactor="0.01">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><alter>1</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>sharp</accidental>
      </note>
      <note>
        <pitch><step>D</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>flat</accidental>
      </note>
      <note>
        <pitch><step>E</step><alter>2</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>double-sharp</accidental>
      </note>
      <note>
        <pitch><step>F</step><alter>-2</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>flat-flat</accidental>
      </note>
      <note>
        <pitch><step>G</step><alter>1</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>sharp</accidental>
      </note>
      <note>
        <pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type><accidental>flat</accidental>
      </note>
    </measure>
  </part>
</score-partwise>`;
}
