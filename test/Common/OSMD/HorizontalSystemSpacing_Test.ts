import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {
  VexFlowHorizontalSpacingCandidateDiagnostics,
  VexFlowHorizontalSpacingColumnDiagnostics,
  VexFlowHorizontalSpacingDiagnostics,
  VexFlowHorizontalSpacingSystemDiagnostics,
} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowHorizontalSpacing";
import { LyricFootprint } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { ResolvedHorizontalSpacingConstraint } from
  "../../../src/MusicalScore/Graphical/VexFlow/HorizontalSpacingConstraintSolver";
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

  it("keeps selected system targets idempotent without converting them to padding", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(denseLyricScore());
    osmd.render();

    const firstPaddings: { leftPx: number, rightPx: number }[] = notePaddings(osmd);
    const firstAddedWidth: number = getDiagnostics(osmd).addedWidthPx;
    expect(firstAddedWidth).to.be.greaterThan(0);
    expect(
      firstPaddings.every(
        (padding: { leftPx: number, rightPx: number }): boolean =>
          padding.leftPx === 0 && padding.rightPx === 0,
      ),
    ).to.equal(true);

    osmd.render();

    expect(notePaddings(osmd)).to.deep.equal(firstPaddings);
    expect(getDiagnostics(osmd).addedWidthPx).to.be.closeTo(firstAddedWidth, 0.001);
  });

  it("keeps cross-measure lyric clearance before a tick-zero accidental", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(crossMeasureLyricScore());
    osmd.render();

    const previousPadding: { leftPx: number, rightPx: number } =
      notePaddingsForMeasure(osmd, 0)[0];
    const currentPadding: { leftPx: number, rightPx: number } =
      notePaddingsForMeasure(osmd, 1)[0];
    expect(previousPadding.rightPx).to.be.closeTo(0, 0.001);
    expect(currentPadding.leftPx).to.be.closeTo(0, 0.001);
    const lyricConstraint: ResolvedHorizontalSpacingConstraint =
      getDiagnostics(osmd).resolvedConstraints.find(
        (constraint): boolean => constraint.reason === "lyric",
      );
    expect(lyricConstraint).to.not.equal(undefined);
    expect(lyricConstraint.finalDistance).to.be.at.least(
      lyricConstraint.minimumDistance - 0.001,
    );
    expect(
      getDiagnostics(osmd).selectedSystems[0].columns.some(
        (column): boolean => column.kind === "measure-boundary",
      ),
    ).to.equal(true);
    assertSelectedTargetsMatchRenderedContexts(osmd);
    osmd.render();
    assertSelectedTargetsMatchRenderedContexts(osmd);
  });

  it("allocates system residual by pickup duration rather than per-measure softmax", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(pickupAndFullMeasureScore());
    osmd.render();

    const columns: VexFlowHorizontalSpacingColumnDiagnostics[] =
      getDiagnostics(osmd).selectedSystems[0].columns;
    const systemStart: VexFlowHorizontalSpacingColumnDiagnostics =
      columns.find((column): boolean => column.kind === "system-start");
    const boundary: VexFlowHorizontalSpacingColumnDiagnostics =
      columns.find((column): boolean => column.kind === "measure-boundary");
    const systemEnd: VexFlowHorizontalSpacingColumnDiagnostics =
      columns.find((column): boolean => column.kind === "system-end");
    expect(systemStart).to.not.equal(undefined);
    expect(boundary).to.not.equal(undefined);
    expect(systemEnd).to.not.equal(undefined);

    const pickupAddition: number =
      (boundary.finalX - systemStart.finalX) -
      (boundary.baseX - systemStart.baseX);
    const fullMeasureAddition: number =
      (systemEnd.finalX - boundary.finalX) -
      (systemEnd.baseX - boundary.baseX);
    expect(pickupAddition).to.be.greaterThan(0);
    expect(fullMeasureAddition).to.be.greaterThan(0);
    expect(pickupAddition / fullMeasureAddition).to.be.closeTo(0.125, 0.001);
  });

  it("uses elapsed onset intervals for melisma spacing across staves", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(melismaWithSustainedPianoScore());
    osmd.Sheet.MeasureWidthFactor = 0.2;
    osmd.render();

    const system: VexFlowHorizontalSpacingSystemDiagnostics =
      getDiagnostics(osmd).selectedSystems[0];
    expect(system.addedWidthPx, "fixture must create a lyric deficit").to.be.greaterThan(0);
    const rhythmicColumns: VexFlowHorizontalSpacingColumnDiagnostics[] =
      system.columns.filter(
        (column): boolean => column.kind === "rhythmic",
      );
    expect(rhythmicColumns.length).to.be.at.least(3);
    const firstAddition: number =
      rhythmicColumns[1].finalX - rhythmicColumns[0].finalX -
      (rhythmicColumns[1].baseX - rhythmicColumns[0].baseX);
    const secondAddition: number =
      rhythmicColumns[2].finalX - rhythmicColumns[1].finalX -
      (rhythmicColumns[2].baseX - rhythmicColumns[1].baseX);
    expect(firstAddition, "first equal-duration interval must receive added space").to.be.greaterThan(0);
    expect(firstAddition).to.be.closeTo(secondAddition, 0.001);
    assertSelectedTargetsMatchRenderedContexts(osmd);
  });

  it("restores selected system tick positions after final VexFlow formatting", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(denseLyricScore());
    osmd.render();

    assertSelectedTargetsMatchRenderedContexts(osmd);
    osmd.render();
    assertSelectedTargetsMatchRenderedContexts(osmd);
  });

  it("uses the first visible staff profile when an earlier instrument is hidden", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(melismaWithSustainedPianoScore());
    osmd.Sheet.Instruments[0].Visible = false;
    osmd.render();

    expect(getDiagnostics(osmd).selectedSystems).to.have.length(1);
    expect(
      getDiagnostics(osmd).selectedSystems[0].columns.some(
        (column): boolean => column.kind === "rhythmic",
      ),
    ).to.equal(true);
    assertSelectedTargetsMatchRenderedContexts(osmd);
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

  it("anchors lyrics to notehead geometry without including a flag", async (): Promise<void> => {
    const osmd: OpenSheetMusicDisplay = createOsmd();
    await osmd.load(flaggedLyricScore());
    osmd.render();

    const staffEntries: any[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries;
    const melismaStaffEntry: any = staffEntries.find(
      (staffEntry: any): boolean =>
        staffEntry.LyricsEntries.some(
          (entry: any): boolean => entry.LyricsEntry.Text === "wide",
        ),
    );
    const ordinaryStaffEntry: any = staffEntries.find(
      (staffEntry: any): boolean =>
        staffEntry.LyricsEntries.some(
          (entry: any): boolean => entry.LyricsEntry.Text === "last",
        ),
    );
    const assertAnchor: (
      staffEntry: any,
      text: string,
      expectedAnchor: (note: any) => number,
    ) => void = (
      staffEntry: any,
      text: string,
      expectedAnchor: (note: any) => number,
    ): void => {
      const lyricEntry: any = staffEntry.LyricsEntries.find(
        (entry: any): boolean => entry.LyricsEntry.Text === text,
      );
      const voiceEntry: VexFlowVoiceEntry = staffEntry.graphicalVoiceEntries.find(
        (entry: VexFlowVoiceEntry): boolean =>
          entry.parentVoiceEntry === lyricEntry.LyricsEntry.Parent,
      ) as VexFlowVoiceEntry;
      const staveNote: any = voiceEntry.vfStaveNote;
      const stave: VF.Stave = staffEntry.parentMeasure.getVFStave();
      const actualAnchor: number =
        stave.getX() +
        (
          staffEntry.PositionAndShape.RelativePosition.x +
          lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.x
        ) * 10;
      expect(actualAnchor).to.be.closeTo(expectedAnchor(staveNote), 0.001);
    };

    assertAnchor(
      melismaStaffEntry,
      "wide",
      (note: any): number => note.getNoteHeadBeginX(),
    );
    assertAnchor(
      ordinaryStaffEntry,
      "last",
      (note: any): number =>
        (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2,
    );

    const ordinaryLyric: any = ordinaryStaffEntry.LyricsEntries[0];
    const ordinaryVoice: VexFlowVoiceEntry = ordinaryStaffEntry.graphicalVoiceEntries.find(
      (entry: VexFlowVoiceEntry): boolean =>
        entry.parentVoiceEntry === ordinaryLyric.LyricsEntry.Parent,
    ) as VexFlowVoiceEntry;
    expect(ordinaryVoice.vfStaveNote.hasFlag()).to.equal(true);
    expect(
      Math.abs(ordinaryLyric.GraphicalLabel.PositionAndShape.RelativePosition.x),
    ).to.be.greaterThan(0.1);
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

function notePaddingsForMeasure(
  osmd: OpenSheetMusicDisplay,
  measureIndex: number,
): { leftPx: number, rightPx: number }[] {
  return (osmd.GraphicSheet.MeasureList[measureIndex] ?? [])
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

function assertSelectedTargetsMatchRenderedContexts(osmd: OpenSheetMusicDisplay): void {
  const system: VexFlowHorizontalSpacingSystemDiagnostics =
    getDiagnostics(osmd).selectedSystems[0];
  for (const column of system.columns.filter(
    (candidate): boolean => candidate.kind === "rhythmic",
  )) {
    const measureNumber: number = system.measureNumbers[column.measureIndex];
    const verticalMeasureList: any[] = osmd.GraphicSheet.MeasureList.find(
      (candidates: any[]): boolean =>
        candidates.some(
          (candidate: any): boolean => candidate?.MeasureNumber === measureNumber,
        ),
    );
    const measure: any = verticalMeasureList?.find(
      (candidate: any): boolean => candidate?.isVisible?.() !== false,
    );
    expect(measure).to.not.equal(undefined);
    const contexts: Map<number, VF.TickContext> = new Map<number, VF.TickContext>();
    for (const verticalMeasure of verticalMeasureList) {
      if (verticalMeasure?.isVisible?.() === false) {
        continue;
      }
      for (const staffEntry of verticalMeasure.staffEntries) {
        for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
          const voiceContext: VF.TickContext =
            (voiceEntry as VexFlowVoiceEntry).vfStaveNote?.getTickContext?.();
          if (voiceContext) {
            contexts.set(voiceContext.getTickID(), voiceContext);
          }
        }
      }
    }
    const context: VF.TickContext = contexts.get(column.tickIds[0]);
    expect(context).to.not.equal(undefined);
    const renderedSystemX: number =
      measure.PositionAndShape.RelativePosition.x * 10 +
      measure.beginInstructionsWidth * 10 +
      context.getX();
    expect(renderedSystemX).to.be.closeTo(column.finalX, 0.001);
  }
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
        <pitch><step>D</step><alter>1</alter><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <accidental>sharp</accidental>
        <lyric number="1"><syllabic>single</syllabic><text>uncompromisingly</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function crossMeasureLyricScore(): string {
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
        <lyric number="1"><syllabic>single</syllabic><text>extraordinarily</text></lyric>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>uncompromisingly</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function pickupAndFullMeasureScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="0" implicit="yes">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type>
      </note>
    </measure>
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
}

function melismaWithSustainedPianoScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Voice</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type>
        <lyric number="1"><syllabic>begin</syllabic><text>extraordinarily</text></lyric>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>2</duration><type>quarter</type>
        <lyric number="1"><syllabic>end</syllabic><text>uncompromisingly</text></lyric>
      </note>
      <note><rest/><duration>2</duration><type>quarter</type></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>3</octave></pitch>
        <duration>4</duration><type>half</type>
      </note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>1</duration><type>eighth</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><type>eighth</type></note>
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

function flaggedLyricScore(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><type>16th</type>
        <lyric number="1"><syllabic>single</syllabic><text>wide</text><extend type="start"/></lyric>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration><type>16th</type>
        <lyric number="1"><syllabic>single</syllabic><text>next</text></lyric>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>1</duration><type>16th</type>
        <lyric number="1"><syllabic>single</syllabic><text>then</text></lyric>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>1</duration><type>16th</type>
        <lyric number="1"><syllabic>single</syllabic><text>last</text></lyric>
      </note>
      <note><rest/><duration>12</duration><type>half</type><dot/></note>
    </measure>
  </part>
</score-partwise>`;
}
