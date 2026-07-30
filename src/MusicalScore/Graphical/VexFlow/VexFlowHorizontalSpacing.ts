import * as VF from "vexflow/core";
import { EngravingRules } from "../EngravingRules";
import { GraphicalLyricEntry, LyricFootprint } from "../GraphicalLyricEntry";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import {
  HorizontalSystemSpacingCandidate,
  HorizontalSystemSpacingLayout,
  IHorizontalSystemSpacingPlanner,
  SystemMeasureSpacingInput,
} from "../HorizontalSystemSpacing";
import { Staff } from "../../VoiceData/Staff";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import {
  HorizontalSpacingConstraint,
  HorizontalSpacingConstraintResult,
  solveHorizontalSpacingConstraints,
} from "./HorizontalSpacingConstraintSolver";

const SYSTEM_LYRIC_PADDING_SOURCE: string = "osmd-system-lyrics";
const FIXED_GAP_WEIGHT: number = 0.000001;

interface MeasureProfile {
  columns: ProfileColumn[];
  graphicalMeasures: GraphicalMeasure[];
  intrinsicHardWidthPx: number;
  minimumRequiredWidthPx: number;
  rhythmicWeight: number;
}

interface ProfileColumn {
  basePositionPx: number;
  contexts: VF.TickContext[];
  intrinsicHardWidthPx: number;
  notationLeftExtentPx: number;
  notationRightExtentPx: number;
  rhythmicWeight: number;
}

interface CandidateColumn extends ProfileColumn {
  inputIndex: number;
}

interface CandidateNode {
  basePositionPx: number;
  column?: CandidateColumn;
}

interface CandidateLyric {
  anchorOffsetPx: number;
  columnIndex: number;
  entry: GraphicalLyricEntry;
  renderedRow: number;
  staff: Staff;
  voiceId: number;
}

interface CandidateSolution {
  addedWidthByMeasurePx: number[];
  baseVariableWidthsPx: number[];
  columns: VexFlowHorizontalSpacingColumnDiagnostics[];
  constraintResult: HorizontalSpacingConstraintResult;
  constraints: HorizontalSpacingConstraint[];
  contextPadding: Map<VF.TickContext, { leftPx: number, rightPx: number }>;
  intrinsicHardWidthsPx: number[];
  minimumVariableWidthPx: number;
  rhythmicWeights: number[];
}

export interface VexFlowHorizontalSpacingDiagnostics {
  addedGapCount: number;
  addedWidthPx: number;
  candidateEvaluations: VexFlowHorizontalSpacingCandidateDiagnostics[];
  constraintCount: number;
  resolvedConstraints: HorizontalSpacingConstraintResult["resolvedConstraints"];
  selectedSystems: VexFlowHorizontalSpacingSystemDiagnostics[];
  selectedSystemCount: number;
}

export interface VexFlowHorizontalSpacingCandidateDiagnostics {
  accepted?: boolean;
  addedWidthPx: number;
  candidateId: number;
  constraintCount: number;
  measureNumbers: number[];
  minimumVariableWidth: number;
}

export interface VexFlowHorizontalSpacingSystemDiagnostics {
  addedGapCount: number;
  addedWidthPx: number;
  columns: VexFlowHorizontalSpacingColumnDiagnostics[];
  constraintCount: number;
  intrinsicHardWidthPx: number;
  measureNumbers: number[];
  minimumVariableWidth: number;
  resolvedConstraints: HorizontalSpacingConstraintResult["resolvedConstraints"];
  selectedHardWidthPx: number;
  systemIndex: number;
}

export interface VexFlowHorizontalSpacingColumnDiagnostics {
  baseX: number;
  columnIndex: number;
  finalX: number;
  kind: "system-start" | "rhythmic" | "system-end";
  measureIndex?: number;
  tickIds: number[];
}

/**
 * Evaluate notation and lyric constraints against candidate systems without
 * mutating the score. Only the range selected by MusicSystemBuilder installs
 * padding.
 */
export class VexFlowSystemSpacingPlanner implements IHorizontalSystemSpacingPlanner {
  private readonly profiles: Map<GraphicalMeasure, MeasureProfile>;
  private readonly graphicalMusicSheet: GraphicalMusicSheet;
  private readonly rules: EngravingRules;
  private candidateId: number = 0;
  private diagnostics: VexFlowHorizontalSpacingDiagnostics = emptyDiagnostics();

  constructor(graphicalMusicSheet: GraphicalMusicSheet, rules: EngravingRules) {
    this.graphicalMusicSheet = graphicalMusicSheet;
    this.rules = rules;
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);
    this.profiles = collectMeasureProfiles(graphicalMusicSheet);
  }

  public evaluateCandidate(
    measures: SystemMeasureSpacingInput[],
  ): HorizontalSystemSpacingCandidate {
    const solution: CandidateSolution = this.solveCandidate(measures);
    const candidateId: number = ++this.candidateId;
    const minimumVariableWidth: number = solution.minimumVariableWidthPx / unitInPixels;
    this.diagnostics.candidateEvaluations.push({
      addedWidthPx: sum(solution.constraintResult.addedGaps),
      candidateId,
      constraintCount: solution.constraints.length,
      measureNumbers: measureNumbers(measures),
      minimumVariableWidth,
    });
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);
    return {
      candidateId,
      minimumVariableWidth,
    };
  }

  public recordCandidateDecision(
    candidate: HorizontalSystemSpacingCandidate,
    accepted: boolean,
  ): void {
    const diagnostics: VexFlowHorizontalSpacingCandidateDiagnostics =
      this.diagnostics.candidateEvaluations.find(
        (current: VexFlowHorizontalSpacingCandidateDiagnostics): boolean =>
          current.candidateId === candidate.candidateId,
      );
    if (diagnostics) {
      diagnostics.accepted = accepted;
      setDiagnostics(this.graphicalMusicSheet, this.diagnostics);
    }
  }

  public applySelectedSystem(
    measures: SystemMeasureSpacingInput[],
    availableVariableWidth: number,
    maximumSoftScalingFactor?: number,
  ): HorizontalSystemSpacingLayout {
    const solution: CandidateSolution = this.solveCandidate(measures);
    solution.contextPadding.forEach(
      (padding: { leftPx: number, rightPx: number }, context: VF.TickContext): void => {
        applyContextPadding(context, padding.leftPx, padding.rightPx);
      },
    );

    const intrinsicHardTotalPx: number = sum(solution.intrinsicHardWidthsPx);
    const selectedHardWidthsPx: number[] = solution.intrinsicHardWidthsPx.map(
      (width: number, index: number): number => width + solution.addedWidthByMeasurePx[index],
    );
    const selectedHardTotalPx: number = sum(selectedHardWidthsPx);
    const softWidthsPx: number[] = solution.baseVariableWidthsPx.map(
      (width: number, index: number): number =>
        Math.max(0, width - solution.intrinsicHardWidthsPx[index]),
    );
    const softTotalPx: number = sum(softWidthsPx);
    const availableVariableWidthPx: number = Math.max(0, availableVariableWidth * unitInPixels);
    const availableSoftWidthPx: number = Math.max(
      softTotalPx,
      availableVariableWidthPx - selectedHardTotalPx,
    );
    const targetSoftWidthPx: number =
      maximumSoftScalingFactor === undefined
        ? availableSoftWidthPx
        : Math.min(availableSoftWidthPx, softTotalPx * maximumSoftScalingFactor);
    const residualWidthPx: number = Math.max(0, targetSoftWidthPx - softTotalPx);
    const totalWeight: number = Math.max(FIXED_GAP_WEIGHT, sum(solution.rhythmicWeights));
    const measureVariableWidths: number[] = measures.map(
      (_measure: SystemMeasureSpacingInput, index: number): number =>
        (selectedHardWidthsPx[index] +
          softWidthsPx[index] +
          (residualWidthPx * solution.rhythmicWeights[index]) / totalWeight) /
        unitInPixels,
    );

    const addedGaps: number[] = solution.constraintResult.addedGaps;
    this.diagnostics.addedGapCount += addedGaps.filter(
      (width: number): boolean => width > 0.01,
    ).length;
    this.diagnostics.addedWidthPx += sum(addedGaps);
    this.diagnostics.constraintCount += solution.constraints.length;
    this.diagnostics.resolvedConstraints.push(...solution.constraintResult.resolvedConstraints);
    this.diagnostics.selectedSystems.push({
      addedGapCount: addedGaps.filter((width: number): boolean => width > 0.01).length,
      addedWidthPx: sum(addedGaps),
      columns: solution.columns,
      constraintCount: solution.constraints.length,
      intrinsicHardWidthPx: intrinsicHardTotalPx,
      measureNumbers: measureNumbers(measures),
      minimumVariableWidth: solution.minimumVariableWidthPx / unitInPixels,
      resolvedConstraints: [...solution.constraintResult.resolvedConstraints],
      selectedHardWidthPx: selectedHardTotalPx,
      systemIndex: this.diagnostics.selectedSystems.length,
    });
    this.diagnostics.selectedSystemCount++;
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);

    return {
      measureVariableWidths,
      minimumVariableWidth:
        (intrinsicHardTotalPx + sum(solution.addedWidthByMeasurePx) + softTotalPx) / unitInPixels,
    };
  }

  public clearAppliedPadding(): void {
    const contexts: Set<VF.TickContext> = collectCurrentContexts(this.graphicalMusicSheet);
    contexts.forEach((context: VF.TickContext): void => {
      const namedContext: VF.TickContext & {
        clearLayoutPaddingForSource?: (source: string) => VF.TickContext;
      } = context;
      if (namedContext.clearLayoutPaddingForSource) {
        namedContext.clearLayoutPaddingForSource(SYSTEM_LYRIC_PADDING_SOURCE);
        return;
      }
      for (const tickable of context.getTickables()) {
        const note: VF.Tickable & {
          clearLayoutPaddingForSource?: (source: string) => VF.Tickable;
        } = tickable;
        note.clearLayoutPaddingForSource?.(SYSTEM_LYRIC_PADDING_SOURCE);
      }
    });
    this.diagnostics = emptyDiagnostics();
    this.candidateId = 0;
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);
  }

  private solveCandidate(measures: SystemMeasureSpacingInput[]): CandidateSolution {
    if (measures.length === 0) {
      return emptySolution();
    }

    const baseVariableWidthsPx: number[] = [];
    const intrinsicHardWidthsPx: number[] = [];
    const rhythmicWeights: number[] = [];
    const nodes: CandidateNode[] = [{ basePositionPx: 0 }];
    const contextToColumn: Map<VF.TickContext, number> = new Map<VF.TickContext, number>();
    let systemPositionPx: number = 0;

    for (let inputIndex: number = 0; inputIndex < measures.length; inputIndex++) {
      const input: SystemMeasureSpacingInput = measures[inputIndex];
      const profile: MeasureProfile = this.profiles.get(input.graphicalMeasures[0]);
      const intrinsicHardWidthPx: number = profile?.intrinsicHardWidthPx ?? 0;
      const baseVariableWidthPx: number = Math.max(
        input.baseVariableWidth * unitInPixels,
        profile?.minimumRequiredWidthPx ?? 0,
        intrinsicHardWidthPx,
      );
      baseVariableWidthsPx.push(baseVariableWidthPx);
      intrinsicHardWidthsPx.push(Math.min(baseVariableWidthPx, intrinsicHardWidthPx));
      rhythmicWeights.push(
        Math.max(FIXED_GAP_WEIGHT, profile?.rhythmicWeight ?? baseVariableWidthPx),
      );

      const contentStartPx: number = systemPositionPx + input.beginInstructionsWidth * unitInPixels;
      for (const profileColumn of profile?.columns ?? []) {
        const column: CandidateColumn = {
          ...profileColumn,
          inputIndex,
        };
        const columnIndex: number = nodes.length;
        nodes.push({
          basePositionPx: contentStartPx + profileColumn.basePositionPx,
          column,
        });
        for (const context of profileColumn.contexts) {
          contextToColumn.set(context, columnIndex);
        }
      }
      systemPositionPx +=
        input.beginInstructionsWidth * unitInPixels +
        baseVariableWidthPx +
        input.endInstructionsWidth * unitInPixels;
    }
    nodes.push({ basePositionPx: systemPositionPx });

    const constraints: HorizontalSpacingConstraint[] = [
      ...collectSystemNotationConstraints(nodes),
      ...collectSystemLyricConstraints(measures, contextToColumn, nodes.length - 1, this.rules),
    ];
    const basePositions: number[] = nodes.map((node: CandidateNode): number => node.basePositionPx);
    const gapWeights: number[] = nodes
      .slice(0, -1)
      .map((node: CandidateNode): number => node.column?.rhythmicWeight ?? FIXED_GAP_WEIGHT);
    const constraintResult: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
      basePositions,
      constraints,
      gapWeights,
    );
    // Candidate widths are evaluated against VexFlow's elastic rhythmic
    // positions. Those positions are deliberately discarded when the
    // selected measure is formatted again, so their remaining clearance
    // cannot be encoded as hard TickContext padding. Solve the same
    // constraints against the formatter's true hard column extents to
    // determine the padding that must survive that final justification.
    const hardLayoutBasePositions: number[] = collectHardLayoutBasePositions(nodes, measures);
    const hardLayoutResult: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
      hardLayoutBasePositions,
      constraints,
      gapWeights,
    );
    const columns: VexFlowHorizontalSpacingColumnDiagnostics[] = nodes.map(
      (node: CandidateNode, columnIndex: number): VexFlowHorizontalSpacingColumnDiagnostics => ({
        baseX: basePositions[columnIndex],
        columnIndex,
        finalX: constraintResult.positions[columnIndex],
        kind:
          columnIndex === 0
            ? "system-start"
            : columnIndex === nodes.length - 1
              ? "system-end"
              : "rhythmic",
        measureIndex: node.column?.inputIndex,
        tickIds: node.column
          ? node.column.contexts.map((context: VF.TickContext): number => context.getTickID())
          : [],
      }),
    );
    const addedWidthByMeasurePx: number[] = Array(measures.length).fill(0);
    const contextPadding: Map<VF.TickContext, { leftPx: number, rightPx: number }> = new Map<
      VF.TickContext,
      { leftPx: number, rightPx: number }
    >();

    for (let gapIndex: number = 0; gapIndex < constraintResult.addedGaps.length; gapIndex++) {
      const addedGapPx: number = constraintResult.addedGaps[gapIndex];
      if (addedGapPx <= 0.001) {
        continue;
      }
      const leftNode: CandidateNode = nodes[gapIndex];
      const rightNode: CandidateNode = nodes[gapIndex + 1];
      if (leftNode.column) {
        if (
          rightNode.column &&
          leftNode.column.inputIndex !== rightNode.column.inputIndex
        ) {
          const leftSharePx: number = addedGapPx / 2;
          addedWidthByMeasurePx[leftNode.column.inputIndex] += leftSharePx;
          addedWidthByMeasurePx[rightNode.column.inputIndex] += addedGapPx - leftSharePx;
          continue;
        }
        addedWidthByMeasurePx[leftNode.column.inputIndex] += addedGapPx;
        continue;
      }

      const firstColumnNode: CandidateNode = nodes.find(
        (node: CandidateNode): boolean => !!node.column,
      );
      if (firstColumnNode?.column) {
        addedWidthByMeasurePx[firstColumnNode.column.inputIndex] += addedGapPx;
      }
    }

    for (let gapIndex: number = 0; gapIndex < hardLayoutResult.addedGaps.length; gapIndex++) {
      const addedGapPx: number = hardLayoutResult.addedGaps[gapIndex];
      if (addedGapPx <= 0.001) {
        continue;
      }
      const leftNode: CandidateNode = nodes[gapIndex];
      const rightNode: CandidateNode = nodes[gapIndex + 1];
      if (leftNode.column) {
        if (
          rightNode.column &&
          leftNode.column.inputIndex !== rightNode.column.inputIndex
        ) {
          const leftSharePx: number = addedGapPx / 2;
          addColumnContextPadding(contextPadding, leftNode.column, 0, leftSharePx);
          addColumnContextPadding(
            contextPadding,
            rightNode.column,
            addedGapPx - leftSharePx,
            0,
          );
          continue;
        }
        addColumnContextPadding(contextPadding, leftNode.column, 0, addedGapPx);
        continue;
      }

      const firstColumnNode: CandidateNode = nodes.find(
        (node: CandidateNode): boolean => !!node.column,
      );
      if (firstColumnNode?.column) {
        addColumnContextPadding(contextPadding, firstColumnNode.column, addedGapPx, 0);
      }
    }

    return {
      addedWidthByMeasurePx,
      baseVariableWidthsPx,
      columns,
      constraintResult,
      constraints,
      contextPadding,
      intrinsicHardWidthsPx,
      minimumVariableWidthPx: sum(baseVariableWidthsPx) + sum(constraintResult.addedGaps),
      rhythmicWeights,
    };
  }
}

function addColumnContextPadding(
  contextPadding: Map<VF.TickContext, { leftPx: number, rightPx: number }>,
  column: CandidateColumn,
  leftPx: number,
  rightPx: number,
): void {
  for (const context of column.contexts) {
    const current: { leftPx: number, rightPx: number } = contextPadding.get(context) ?? {
      leftPx: 0,
      rightPx: 0,
    };
    current.leftPx += leftPx;
    current.rightPx += rightPx;
    contextPadding.set(context, current);
  }
}

function collectMeasureProfiles(
  graphicalMusicSheet: GraphicalMusicSheet,
): Map<GraphicalMeasure, MeasureProfile> {
  const profiles: Map<GraphicalMeasure, MeasureProfile> = new Map<
    GraphicalMeasure,
    MeasureProfile
  >();
  for (const verticalMeasures of graphicalMusicSheet.MeasureList) {
    const graphicalMeasures: GraphicalMeasure[] = (verticalMeasures ?? []).filter(
      (measure: GraphicalMeasure): boolean => !!measure?.isVisible(),
    );
    if (graphicalMeasures.length === 0) {
      continue;
    }
    const contextSet: Set<VF.TickContext> = collectContexts(graphicalMeasures);
    const columns: ProfileColumn[] = groupContextsByTick(contextSet);
    const intrinsicHardWidthPx: number = sum(
      columns.map((column: ProfileColumn): number => column.intrinsicHardWidthPx),
    );
    const lastColumn: ProfileColumn = columns[columns.length - 1];
    const minimumRequiredWidthPx: number = lastColumn
      ? lastColumn.basePositionPx + lastColumn.notationRightExtentPx
      : 0;
    const rhythmicWeight: number = Math.max(
      FIXED_GAP_WEIGHT,
      sum(columns.map((column: ProfileColumn): number => column.rhythmicWeight)),
    );
    const profile: MeasureProfile = {
      columns,
      graphicalMeasures,
      intrinsicHardWidthPx,
      minimumRequiredWidthPx,
      rhythmicWeight,
    };
    for (const graphicalMeasure of graphicalMeasures) {
      profiles.set(graphicalMeasure, profile);
    }
  }
  return profiles;
}

function groupContextsByTick(contexts: Set<VF.TickContext>): ProfileColumn[] {
  const contextsByTick: Map<number, VF.TickContext[]> = new Map<number, VF.TickContext[]>();
  for (const context of contexts) {
    const tickId: number = context.getTickID();
    const group: VF.TickContext[] = contextsByTick.get(tickId) ?? [];
    group.push(context);
    contextsByTick.set(tickId, group);
  }
  return Array.from(contextsByTick.values())
    .map((group: VF.TickContext[]): ProfileColumn => {
      for (const context of group) {
        context.preFormat();
      }
      return {
        basePositionPx: Math.min(...group.map((context: VF.TickContext): number => context.getX())),
        contexts: group,
        intrinsicHardWidthPx: Math.max(
          ...group.map((context: VF.TickContext): number => context.getWidth()),
        ),
        notationLeftExtentPx: Math.max(
          ...group.map((context: VF.TickContext): number => context.getMetrics().totalLeftPx),
        ),
        notationRightExtentPx: Math.max(
          ...group.map(
            (context: VF.TickContext): number =>
              context.getMetrics().notePx + context.getMetrics().totalRightPx,
          ),
        ),
        rhythmicWeight: Math.max(
          ...group.map((context: VF.TickContext): number => vexFlowRhythmicWeight(context)),
        ),
      };
    })
    .sort(
      (left: ProfileColumn, right: ProfileColumn): number =>
        left.basePositionPx - right.basePositionPx,
    );
}

/**
 * Build the positions VexFlow would produce with no elastic rhythmic space.
 *
 * Candidate positions include rhythmic justification and are appropriate for
 * choosing a system width. Final formatting recalculates that justification,
 * though, so only these drawable/context extents and fixed instructions can
 * count towards an unshrinkable lyric clearance.
 */
function collectHardLayoutBasePositions(
  nodes: CandidateNode[],
  measures: SystemMeasureSpacingInput[],
): number[] {
  if (nodes.length === 0) {
    return [];
  }
  const positions: number[] = [0];
  for (let index: number = 1; index < nodes.length; index++) {
    positions.push(
      positions[index - 1] + hardDistanceBetweenNodes(nodes[index - 1], nodes[index], measures),
    );
  }
  return positions;
}

function hardDistanceBetweenNodes(
  previousNode: CandidateNode,
  currentNode: CandidateNode,
  measures: SystemMeasureSpacingInput[],
): number {
  const previousColumn: CandidateColumn = previousNode.column;
  const currentColumn: CandidateColumn = currentNode.column;
  if (!previousColumn && currentColumn) {
    return (
      fullWidthsOfMeasures(measures, 0, currentColumn.inputIndex) +
      measures[currentColumn.inputIndex].beginInstructionsWidth * unitInPixels +
      currentColumn.notationLeftExtentPx
    );
  }
  if (previousColumn && currentColumn) {
    let distance: number =
      previousColumn.notationRightExtentPx + currentColumn.notationLeftExtentPx;
    if (previousColumn.inputIndex !== currentColumn.inputIndex) {
      distance +=
        measures[previousColumn.inputIndex].endInstructionsWidth * unitInPixels +
        fullWidthsOfMeasures(measures, previousColumn.inputIndex + 1, currentColumn.inputIndex) +
        measures[currentColumn.inputIndex].beginInstructionsWidth * unitInPixels;
    }
    return distance;
  }
  if (previousColumn && !currentColumn) {
    return (
      previousColumn.notationRightExtentPx +
      measures[previousColumn.inputIndex].endInstructionsWidth * unitInPixels +
      fullWidthsOfMeasures(measures, previousColumn.inputIndex + 1, measures.length)
    );
  }
  return fullWidthsOfMeasures(measures, 0, measures.length);
}

function fullWidthsOfMeasures(
  measures: SystemMeasureSpacingInput[],
  startIndex: number,
  endIndex: number,
): number {
  let widthPx: number = 0;
  for (let index: number = startIndex; index < endIndex; index++) {
    const measure: SystemMeasureSpacingInput = measures[index];
    widthPx +=
      (measure.beginInstructionsWidth + measure.baseVariableWidth + measure.endInstructionsWidth) *
      unitInPixels;
  }
  return widthPx;
}

function collectSystemNotationConstraints(nodes: CandidateNode[]): HorizontalSpacingConstraint[] {
  const columnIndexes: number[] = [];
  for (let index: number = 0; index < nodes.length; index++) {
    if (nodes[index].column) {
      columnIndexes.push(index);
    }
  }
  if (columnIndexes.length === 0) {
    return [];
  }

  const firstIndex: number = columnIndexes[0];
  const firstColumn: CandidateColumn = nodes[firstIndex].column;
  const constraints: HorizontalSpacingConstraint[] = [
    {
      fromColumn: 0,
      minimumDistance: firstColumn.notationLeftExtentPx,
      reason: "system-edge",
      toColumn: firstIndex,
    },
  ];
  for (let index: number = 1; index < columnIndexes.length; index++) {
    const previousIndex: number = columnIndexes[index - 1];
    const currentIndex: number = columnIndexes[index];
    constraints.push({
      fromColumn: previousIndex,
      minimumDistance:
        nodes[previousIndex].column.notationRightExtentPx +
        nodes[currentIndex].column.notationLeftExtentPx,
      reason: "notation",
      toColumn: currentIndex,
    });
  }
  const lastIndex: number = columnIndexes[columnIndexes.length - 1];
  constraints.push({
    fromColumn: lastIndex,
    minimumDistance: nodes[lastIndex].column.notationRightExtentPx,
    reason: "system-edge",
    toColumn: nodes.length - 1,
  });
  return constraints;
}

function collectSystemLyricConstraints(
  measures: SystemMeasureSpacingInput[],
  contextToColumn: Map<VF.TickContext, number>,
  endColumnIndex: number,
  rules: EngravingRules,
): HorizontalSpacingConstraint[] {
  if (!rules.RenderLyrics || !rules.LyricsUseXPaddingForLongLyrics) {
    return [];
  }

  const lyrics: CandidateLyric[] = [];
  const lyricsByStaff: Map<Staff, GraphicalLyricEntry[]> = new Map<Staff, GraphicalLyricEntry[]>();
  for (const input of measures) {
    for (const measure of input.graphicalMeasures) {
      if (!measure?.isVisible()) {
        continue;
      }
      const staffLyrics: GraphicalLyricEntry[] = lyricsByStaff.get(measure.ParentStaff) ?? [];
      for (const staffEntry of measure.staffEntries) {
        for (const lyricEntry of staffEntry.LyricsEntries) {
          if (!isVisibleLyric(lyricEntry)) {
            continue;
          }
          staffLyrics.push(lyricEntry);
        }
      }
      lyricsByStaff.set(measure.ParentStaff, staffLyrics);
    }
  }

  const renderedRowsByEntry: Map<GraphicalLyricEntry, number> =
    calculateRenderedLyricRows(lyricsByStaff);
  for (const input of measures) {
    for (const measure of input.graphicalMeasures) {
      if (!measure?.isVisible()) {
        continue;
      }
      for (const staffEntry of measure.staffEntries) {
        for (const lyricEntry of staffEntry.LyricsEntries) {
          if (!isVisibleLyric(lyricEntry)) {
            continue;
          }
          const owningVoiceEntry: GraphicalVoiceEntry = findOwningVoiceEntry(
            staffEntry,
            lyricEntry,
          );
          const note: VF.Note = (
            owningVoiceEntry as GraphicalVoiceEntry & {
              vfStaveNote?: VF.Note;
            }
          )?.vfStaveNote;
          const context: VF.TickContext = note?.getTickContext?.();
          const columnIndex: number = contextToColumn.get(context);
          if (!Number.isInteger(columnIndex)) {
            continue;
          }
          const voiceId: number = owningVoiceEntry.parentVoiceEntry.ParentVoice.VoiceId;
          const row: number = renderedRowsByEntry.get(lyricEntry) ?? 0;
          lyrics.push({
            anchorOffsetPx:
              lyricEntry.getAnchorX(staffEntry.PositionAndShape.RelativePosition.x) * unitInPixels -
              context.getX(),
            columnIndex,
            entry: lyricEntry,
            renderedRow: row,
            staff: measure.ParentStaff,
            voiceId,
          });
        }
      }
    }
  }

  const constraints: HorizontalSpacingConstraint[] = [];
  const semanticTracksByStaff: Map<Staff, Map<string, CandidateLyric[]>> = new Map<
    Staff,
    Map<string, CandidateLyric[]>
  >();
  const physicalRowsByStaff: Map<Staff, Map<number, CandidateLyric[]>> = new Map<
    Staff,
    Map<number, CandidateLyric[]>
  >();
  for (const lyric of lyrics) {
    const staffTracks: Map<string, CandidateLyric[]> =
      semanticTracksByStaff.get(lyric.staff) ?? new Map<string, CandidateLyric[]>();
    const semanticTrackKey: string = `${lyric.voiceId}:${lyric.renderedRow}`;
    const semanticTrack: CandidateLyric[] = staffTracks.get(semanticTrackKey) ?? [];
    semanticTrack.push(lyric);
    staffTracks.set(semanticTrackKey, semanticTrack);
    semanticTracksByStaff.set(lyric.staff, staffTracks);

    const staffRows: Map<number, CandidateLyric[]> =
      physicalRowsByStaff.get(lyric.staff) ?? new Map<number, CandidateLyric[]>();
    const physicalRow: CandidateLyric[] = staffRows.get(lyric.renderedRow) ?? [];
    physicalRow.push(lyric);
    staffRows.set(lyric.renderedRow, physicalRow);
    physicalRowsByStaff.set(lyric.staff, staffRows);

    const footprint: LyricFootprint = lyric.entry.getFootprint();
    constraints.push({
      fromColumn: 0,
      minimumDistance: Math.max(0, footprint.leftExtent * unitInPixels - lyric.anchorOffsetPx),
      reason: "system-edge",
      toColumn: lyric.columnIndex,
    });
    const terminalConnectorWidth: number = lyric.entry.hasDashFromLyricWord()
      ? lyric.entry.getDashWidth() + rules.BetweenSyllableMinimumDistance
      : 0;
    constraints.push({
      fromColumn: lyric.columnIndex,
      minimumDistance: Math.max(
        0,
        (footprint.rightExtent + terminalConnectorWidth) * unitInPixels + lyric.anchorOffsetPx,
      ),
      reason: "system-edge",
      toColumn: endColumnIndex,
    });
  }

  semanticTracksByStaff.forEach((staffTracks: Map<string, CandidateLyric[]>): void => {
    staffTracks.forEach((track: CandidateLyric[]): void => {
      track.sort(
        (left: CandidateLyric, right: CandidateLyric): number =>
          left.columnIndex - right.columnIndex,
      );
      for (let index: number = 1; index < track.length; index++) {
        const previous: CandidateLyric = track[index - 1];
        const current: CandidateLyric = track[index];
        if (current.columnIndex <= previous.columnIndex) {
          continue;
        }
        const previousFootprint: LyricFootprint = previous.entry.getFootprint();
        const currentFootprint: LyricFootprint = current.entry.getFootprint();
        const hasDash: boolean = previous.entry.hasDashFromLyricWord();
        const isExtender: boolean = previous.entry.LyricsEntry.extend;
        const connectorClearance: number = hasDash
          ? previous.entry.getDashWidth() + rules.BetweenSyllableMinimumDistance
          : rules.HorizontalBetweenLyricsDistance;
        constraints.push(
          lyricPairConstraint(
            previous,
            current,
            previousFootprint,
            currentFootprint,
            connectorClearance,
            hasDash ? "hyphen" : isExtender ? "extender" : "lyric",
          ),
        );
      }
    });
  });

  // Semantic lyric tracks must stay voice-aware so a syllabic "begin" in
  // one voice cannot create a dash to another voice. Physical rows are a
  // separate concern: lyrics rendered on the same visible row still need
  // ordinary clearance at a polyphonic handoff.
  physicalRowsByStaff.forEach((staffRows: Map<number, CandidateLyric[]>): void => {
    staffRows.forEach((row: CandidateLyric[]): void => {
      const columnGroups: CandidateLyric[][] = groupLyricsByColumn(row);
      for (let groupIndex: number = 1; groupIndex < columnGroups.length; groupIndex++) {
        const previousGroup: CandidateLyric[] = columnGroups[groupIndex - 1];
        const currentGroup: CandidateLyric[] = columnGroups[groupIndex];
        for (const previous of previousGroup) {
          for (const current of currentGroup) {
            if (previous.voiceId === current.voiceId) {
              continue;
            }
            constraints.push(
              lyricPairConstraint(
                previous,
                current,
                previous.entry.getFootprint(),
                current.entry.getFootprint(),
                rules.HorizontalBetweenLyricsDistance,
                "lyric",
              ),
            );
          }
        }
      }
    });
  });
  return constraints;
}

function groupLyricsByColumn(lyrics: CandidateLyric[]): CandidateLyric[][] {
  const sortedLyrics: CandidateLyric[] = [...lyrics].sort(
    (left: CandidateLyric, right: CandidateLyric): number =>
      left.columnIndex - right.columnIndex || left.voiceId - right.voiceId,
  );
  const groups: CandidateLyric[][] = [];
  for (const lyric of sortedLyrics) {
    const currentGroup: CandidateLyric[] = groups[groups.length - 1];
    if (!currentGroup || currentGroup[0].columnIndex !== lyric.columnIndex) {
      groups.push([lyric]);
    } else {
      currentGroup.push(lyric);
    }
  }
  return groups;
}

function lyricPairConstraint(
  previous: CandidateLyric,
  current: CandidateLyric,
  previousFootprint: LyricFootprint,
  currentFootprint: LyricFootprint,
  connectorClearance: number,
  reason: HorizontalSpacingConstraint["reason"],
): HorizontalSpacingConstraint {
  return {
    fromColumn: previous.columnIndex,
    minimumDistance: Math.max(
      0,
      (previousFootprint.rightExtent + connectorClearance + currentFootprint.leftExtent) *
        unitInPixels +
        previous.anchorOffsetPx -
        current.anchorOffsetPx,
    ),
    reason,
    toColumn: current.columnIndex,
  };
}

function calculateRenderedLyricRows(
  lyricsByStaff: Map<Staff, GraphicalLyricEntry[]>,
): Map<GraphicalLyricEntry, number> {
  const result: Map<GraphicalLyricEntry, number> = new Map<GraphicalLyricEntry, number>();
  lyricsByStaff.forEach((entries: GraphicalLyricEntry[], staff: Staff): void => {
    const relevantVerseNumbers: Map<string, boolean> = new Map<string, boolean>();
    for (const entry of entries) {
      relevantVerseNumbers.set(entry.LyricsEntry.VerseNumber, entry.LyricsEntry.IsChorus);
    }
    const verseNumbers: string[] = [...staff.ParentInstrument.LyricVersesNumbers].sort();
    const chorusVerseNumbers: string[] = verseNumbers.filter(
      (verseNumber: string): boolean => relevantVerseNumbers.get(verseNumber) === true,
    );
    const nonChorusVerseNumbers: string[] = verseNumbers.filter(
      (verseNumber: string): boolean => relevantVerseNumbers.get(verseNumber) === false,
    );
    const entriesByStaffEntry: Map<GraphicalStaffEntry, GraphicalLyricEntry[]> = new Map<
      GraphicalStaffEntry,
      GraphicalLyricEntry[]
    >();
    for (const entry of entries) {
      const siblings: GraphicalLyricEntry[] = entriesByStaffEntry.get(entry.StaffEntryParent) ?? [];
      siblings.push(entry);
      entriesByStaffEntry.set(entry.StaffEntryParent, siblings);
    }
    entriesByStaffEntry.forEach((siblings: GraphicalLyricEntry[]): void => {
      const allChorus: boolean = siblings.every(
        (entry: GraphicalLyricEntry): boolean => entry.LyricsEntry.IsChorus,
      );
      for (const entry of siblings) {
        const verseNumber: string = entry.LyricsEntry.VerseNumber;
        if (allChorus) {
          const chorusIndex: number = Math.max(0, chorusVerseNumbers.indexOf(verseNumber));
          const chorusBaseIndex: number =
            nonChorusVerseNumbers.length > 0
              ? Math.max(0, (nonChorusVerseNumbers.length - chorusVerseNumbers.length) / 2)
              : 0;
          result.set(entry, chorusBaseIndex + chorusIndex);
        } else {
          result.set(entry, Math.max(0, nonChorusVerseNumbers.indexOf(verseNumber)));
        }
      }
    });
  });
  return result;
}

function collectCurrentContexts(graphicalMusicSheet: GraphicalMusicSheet): Set<VF.TickContext> {
  const contexts: Set<VF.TickContext> = new Set<VF.TickContext>();
  for (const verticalMeasures of graphicalMusicSheet.MeasureList ?? []) {
    for (const measure of verticalMeasures ?? []) {
      if (!measure) {
        continue;
      }
      for (const staffEntry of measure.staffEntries) {
        for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
          const note: VF.Note = (
            voiceEntry as GraphicalVoiceEntry & {
              vfStaveNote?: VF.Note;
            }
          ).vfStaveNote;
          const context: VF.TickContext = note?.getTickContext?.();
          if (context) {
            contexts.add(context);
          }
        }
      }
    }
  }
  return contexts;
}

function collectContexts(graphicalMeasures: GraphicalMeasure[]): Set<VF.TickContext> {
  const contexts: Set<VF.TickContext> = new Set<VF.TickContext>();
  for (const measure of graphicalMeasures) {
    for (const staffEntry of measure.staffEntries) {
      for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
        if (voiceEntry.parentVoiceEntry?.IsGrace) {
          continue;
        }
        const note: VF.Note = (
          voiceEntry as GraphicalVoiceEntry & {
            vfStaveNote?: VF.Note;
          }
        ).vfStaveNote;
        const context: VF.TickContext = note?.getTickContext?.();
        if (context) {
          contexts.add(context);
        }
      }
    }
  }
  return contexts;
}

function findOwningVoiceEntry(
  staffEntry: GraphicalStaffEntry,
  lyricEntry: GraphicalLyricEntry,
): GraphicalVoiceEntry {
  return staffEntry.graphicalVoiceEntries.find(
    (voiceEntry: GraphicalVoiceEntry): boolean =>
      voiceEntry?.parentVoiceEntry === lyricEntry.LyricsEntry.Parent &&
      !!(
        voiceEntry as GraphicalVoiceEntry & {
          vfStaveNote?: VF.Note;
        }
      ).vfStaveNote,
  );
}

function isVisibleLyric(entry: GraphicalLyricEntry): boolean {
  return !!(entry.LyricsEntry.LyricText?.trim() || entry.LyricsEntry.StanzaNumberPrefix?.trim());
}

function vexFlowRhythmicWeight(context: VF.TickContext): number {
  const ticks: number = context.getMaxTicks()?.value?.() ?? 0;
  const tickable: VF.Tickable = context.getMaxTickable?.();
  const weight: number = tickable?.getVoice?.()?.softmax?.(ticks);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

function applyContextPadding(context: VF.TickContext, leftPx: number, rightPx: number): void {
  const namedContext: VF.TickContext & {
    applyLayoutPaddingForSource?: (
      source: string,
      leftDelta: number,
      rightDelta: number,
    ) => VF.TickContext;
  } = context;
  if (namedContext.applyLayoutPaddingForSource) {
    namedContext.applyLayoutPaddingForSource(SYSTEM_LYRIC_PADDING_SOURCE, leftPx, rightPx);
    return;
  }

  for (const tickable of context.getTickables()) {
    const note: VF.Tickable & {
      getLayoutPadding?: () => { leftPx: number, rightPx: number };
      setLayoutPaddingForSource?: (source: string, left: number, right: number) => VF.Tickable;
    } = tickable;
    if (!note.getLayoutPadding || !note.setLayoutPaddingForSource) {
      continue;
    }
    const baseline: { leftPx: number, rightPx: number } = note.getLayoutPadding();
    note.setLayoutPaddingForSource(
      SYSTEM_LYRIC_PADDING_SOURCE,
      baseline.leftPx + leftPx,
      baseline.rightPx + rightPx,
    );
  }
}

function setDiagnostics(
  graphicalMusicSheet: GraphicalMusicSheet,
  diagnostics: VexFlowHorizontalSpacingDiagnostics,
): void {
  (
    graphicalMusicSheet as GraphicalMusicSheet & {
      HorizontalSpacingDiagnostics?: VexFlowHorizontalSpacingDiagnostics;
    }
  ).HorizontalSpacingDiagnostics = {
    ...diagnostics,
    resolvedConstraints: [...diagnostics.resolvedConstraints],
  };
}

function emptyDiagnostics(): VexFlowHorizontalSpacingDiagnostics {
  return {
    addedGapCount: 0,
    addedWidthPx: 0,
    candidateEvaluations: [],
    constraintCount: 0,
    resolvedConstraints: [],
    selectedSystems: [],
    selectedSystemCount: 0,
  };
}

function emptySolution(): CandidateSolution {
  return {
    addedWidthByMeasurePx: [],
    baseVariableWidthsPx: [],
    columns: [],
    constraintResult: {
      addedGaps: [],
      positions: [],
      resolvedConstraints: [],
    },
    constraints: [],
    contextPadding: new Map<VF.TickContext, { leftPx: number, rightPx: number }>(),
    intrinsicHardWidthsPx: [],
    minimumVariableWidthPx: 0,
    rhythmicWeights: [],
  };
}

function sum(values: number[]): number {
  return values.reduce((total: number, value: number): number => total + value, 0);
}

function measureNumbers(measures: SystemMeasureSpacingInput[]): number[] {
  return measures.map(
    (measure: SystemMeasureSpacingInput): number => measure.graphicalMeasures[0]?.MeasureNumber,
  );
}
