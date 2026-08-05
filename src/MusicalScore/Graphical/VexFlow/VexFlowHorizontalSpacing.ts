import * as VF from "./VexFlowAdapter";
import { EngravingRules } from "../EngravingRules";
import { GraphicalLyricEntry, LyricFootprint } from "../GraphicalLyricEntry";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalChordSymbolContainer } from "../GraphicalChordSymbolContainer";
import { SystemLinesEnum } from "../SystemLinesEnum";
import {
  HorizontalSystemSpacingCandidate,
  HorizontalSystemSpacingLayout,
  IHorizontalSystemSpacingPlanner,
  SystemMeasureSpacingInput,
} from "../HorizontalSystemSpacing";
import { Staff } from "../../VoiceData/Staff";
import { Note as SourceNote } from "../../VoiceData/Note";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import {
  LyricAlignmentMode,
  LyricExtendType,
} from "../../VoiceData/Lyrics/LyricsEntry";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import {
  HorizontalSpacingConstraint,
  HorizontalSpacingConstraintResult,
  solveHorizontalSpacingConstraints,
} from "./HorizontalSpacingConstraintSolver";
import { VexFlowMeasure } from "./VexFlowMeasure";

const SYSTEM_LYRIC_PADDING_SOURCE: string = "osmd-system-lyrics";
const FIXED_GAP_WEIGHT: number = 0.000001;

interface MeasureProfile {
  compactPickup: boolean;
  compactTerminal: boolean;
  columns: ProfileColumn[];
  graphicalMeasures: GraphicalMeasure[];
  intrinsicHardWidthPx: number;
  leadingRhythmicWeight: number;
  minimumRequiredWidthPx: number;
  preferredTerminalRhythmicWidthPx?: number;
  rhythmicWeight: number;
  terminalHasVisibleRest: boolean;
  terminalRestOpticalTailPx: number;
}

interface ProfileColumn {
  basePositionPx: number;
  contexts: VF.TickContext[];
  intrinsicHardWidthPx: number;
  notationLeftExtentPx: number;
  notationRightExtentPx: number;
  hasVisibleRest: boolean;
  preferredTerminalOpticalTailPx?: number;
  preferredTerminalRhythmicWidthPx?: number;
  terminalBarlineInwardExtentPx?: number;
  rhythmicWeight: number;
  timestamp: number;
}

interface CandidateColumn extends ProfileColumn {
  inputIndex: number;
}

interface CandidateNode {
  basePositionPx: number;
  boundaryInputIndex?: number;
  column?: CandidateColumn;
  kind: "system-start" | "measure-boundary" | "rhythmic" | "system-end";
}

interface CandidateLyric {
  anchorOffsetPx: number;
  columnIndex: number;
  connectorTerminalOffsetPx?: number;
  entry: GraphicalLyricEntry;
  renderedRow: number;
  staff: Staff;
  voiceId: number;
}

interface CandidateHarmony {
  columnIndex: number;
  leftOffsetPx: number;
  measureEndColumnIndex: number;
  placement: number;
  rightOffsetPx: number;
  staff: Staff;
}

interface HarmonyFootprint {
  leftOffsetPx: number;
  rightOffsetPx: number;
}

interface MeasureHarmonyEvent extends HarmonyFootprint {
  timestamp: number;
}

interface CandidateSolution {
  addedWidthByMeasurePx: number[];
  baseHardWidthsPx: number[];
  baseVariableWidthsPx: number[];
  columns: VexFlowHorizontalSpacingColumnDiagnostics[];
  constraintResult: HorizontalSpacingConstraintResult;
  constraints: HorizontalSpacingConstraint[];
  gapWeights: number[];
  intrinsicHardWidthsPx: number[];
  minimumVariableWidthPx: number;
  nodes: CandidateNode[];
  residualGapWeights: number[];
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
  gaps: VexFlowHorizontalSpacingGapDiagnostics[];
  intrinsicHardWidthPx: number;
  measureNumbers: number[];
  minimumVariableWidth: number;
  resolvedConstraints: HorizontalSpacingConstraintResult["resolvedConstraints"];
  selectedHardWidthPx: number;
  systemIndex: number;
  terminalPreferenceScale: number;
  targetVariableWidthPx: number;
}

export interface VexFlowHorizontalSpacingColumnDiagnostics {
  baseX: number;
  columnIndex: number;
  finalX: number;
  kind: "system-start" | "measure-boundary" | "rhythmic" | "system-end";
  measureIndex?: number;
  tickIds: number[];
}

export type VexFlowHorizontalSpacingGapKind =
  "empty-measure" |
  "measure-leading" |
  "measure-terminal" |
  "rhythmic";

export interface VexFlowHorizontalSpacingGapDiagnostics {
  baseTerminalPaddingPx?: number;
  baseWidthPx: number;
  directConstraintReasons: HorizontalSpacingConstraint["reason"][];
  endInstructionsWidthPx?: number;
  finalWidthPx: number;
  fromColumn: number;
  hardAddedWidthPx: number;
  hardWeight: number;
  kind: VexFlowHorizontalSpacingGapKind;
  measureIndex?: number;
  measureNumber?: number;
  notationRightExtentPx?: number;
  preferredTerminalOpticalTailPx?: number;
  preferredTerminalRhythmicWidthPx?: number;
  residualAddedWidthPx: number;
  residualWeight: number;
  terminalBarlineInwardExtentPx?: number;
  terminalHasVisibleRest?: boolean;
  toColumn: number;
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
    this.profiles = collectMeasureProfiles(graphicalMusicSheet, rules);
  }

  public evaluateCandidate(
    measures: SystemMeasureSpacingInput[],
  ): HorizontalSystemSpacingCandidate {
    // Keep Stage 5's line-break evaluation widths. Terminal compaction is a
    // selected-system refinement: allowing preferred (rather than hard)
    // terminal space to admit another measure can orphan the following
    // system even though no notation or lyric constraint changed.
    const solution: CandidateSolution = this.solveCandidate(measures, false);
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
    const availableVariableWidthPx: number = Math.max(0, availableVariableWidth * unitInPixels);
    const baselineSolution: CandidateSolution = this.solveCandidate(measures, true, 0);
    const targetVariableWidthPx: number = selectedTargetVariableWidth(
      baselineSolution,
      availableVariableWidthPx,
      maximumSoftScalingFactor,
    );
    const selectedPreference: {
      scale: number;
      solution: CandidateSolution;
    } = this.solveSelectedTerminalPreference(
      measures,
      baselineSolution,
      targetVariableWidthPx,
    );
    const solution: CandidateSolution = selectedPreference.solution;
    const intrinsicHardTotalPx: number = sum(solution.intrinsicHardWidthsPx);
    const selectedHardWidthsPx: number[] = solution.baseHardWidthsPx.map(
      (width: number, index: number): number => width + solution.addedWidthByMeasurePx[index],
    );
    const selectedHardTotalPx: number = sum(selectedHardWidthsPx);
    const softWidthsPx: number[] = solution.baseVariableWidthsPx.map(
      (width: number, index: number): number =>
        Math.max(0, width - solution.baseHardWidthsPx[index]),
    );
    const softTotalPx: number = sum(softWidthsPx);
    const targetSoftWidthPx: number = Math.max(
      softTotalPx,
      targetVariableWidthPx - selectedHardTotalPx,
    );
    const residualWidthPx: number = Math.max(0, targetSoftWidthPx - softTotalPx);
    const totalGapWeight: number = Math.max(
      FIXED_GAP_WEIGHT,
      sum(solution.residualGapWeights),
    );
    const residualAddedGaps: number[] = solution.residualGapWeights.map(
      (weight: number): number => residualWidthPx * weight / totalGapWeight,
    );
    const finalPositionsPx: number[] = [solution.constraintResult.positions[0]];
    let accumulatedResidualWidthPx: number = 0;
    for (let nodeIndex: number = 1; nodeIndex < solution.nodes.length; nodeIndex++) {
      accumulatedResidualWidthPx += residualAddedGaps[nodeIndex - 1];
      finalPositionsPx.push(
        solution.constraintResult.positions[nodeIndex] +
        accumulatedResidualWidthPx,
      );
    }
    const measureBoundaryIndexes: number[] = measures.map(
      (_measure: SystemMeasureSpacingInput, inputIndex: number): number =>
        solution.nodes.findIndex(
          (node: CandidateNode): boolean =>
            (inputIndex === 0 && node.kind === "system-start") ||
            (node.kind === "measure-boundary" && node.boundaryInputIndex === inputIndex),
        ),
    );
    const measureVariableWidths: number[] = measures.map(
      (measure: SystemMeasureSpacingInput, inputIndex: number): number => {
        const startNodeIndex: number = measureBoundaryIndexes[inputIndex];
        const endNodeIndex: number =
          inputIndex + 1 < measures.length
            ? measureBoundaryIndexes[inputIndex + 1]
            : solution.nodes.length - 1;
        const fullWidthPx: number =
          finalPositionsPx[endNodeIndex] - finalPositionsPx[startNodeIndex];
        return Math.max(
          0,
          fullWidthPx / unitInPixels -
          measure.beginInstructionsWidth -
          measure.endInstructionsWidth,
        );
      },
    );
    installHorizontalSpacingTargets(
      measures,
      solution.nodes,
      finalPositionsPx,
      measureBoundaryIndexes,
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
      columns: solution.columns.map(
        (
          column: VexFlowHorizontalSpacingColumnDiagnostics,
          columnIndex: number,
        ): VexFlowHorizontalSpacingColumnDiagnostics => ({
          ...column,
          finalX: finalPositionsPx[columnIndex],
        }),
      ),
      constraintCount: solution.constraints.length,
      gaps: solution.nodes.slice(0, -1).map(
        (
          leftNode: CandidateNode,
          gapIndex: number,
        ): VexFlowHorizontalSpacingGapDiagnostics => {
          const rightNode: CandidateNode = solution.nodes[gapIndex + 1];
          const kind: VexFlowHorizontalSpacingGapKind = gapKind(
            leftNode,
            rightNode,
          );
          const measureIndex: number = measureIndexForGap(
            leftNode,
            rightNode,
            measures.length,
          );
          const baseWidthPx: number =
            rightNode.basePositionPx -
            leftNode.basePositionPx;
          const endInstructionsWidthPx: number | undefined =
            kind === "measure-terminal" && measureIndex >= 0
              ? measures[measureIndex].endInstructionsWidth * unitInPixels
              : undefined;
          const notationRightExtentPx: number | undefined =
            kind === "measure-terminal"
              ? leftNode.column?.notationRightExtentPx
              : undefined;
          return {
            baseTerminalPaddingPx:
              kind === "measure-terminal"
                ? baseWidthPx -
                  (notationRightExtentPx ?? 0) -
                  (endInstructionsWidthPx ?? 0)
                : undefined,
            baseWidthPx,
            directConstraintReasons: Array.from(
              new Set(
                solution.constraints
                  .filter(
                    (constraint: HorizontalSpacingConstraint): boolean =>
                      constraint.fromColumn === gapIndex &&
                      constraint.toColumn === gapIndex + 1,
                  )
                  .map(
                    (constraint: HorizontalSpacingConstraint): HorizontalSpacingConstraint["reason"] =>
                      constraint.reason,
                  ),
              ),
            ),
            endInstructionsWidthPx,
            finalWidthPx:
              finalPositionsPx[gapIndex + 1] -
              finalPositionsPx[gapIndex],
            fromColumn: gapIndex,
            hardAddedWidthPx: addedGaps[gapIndex],
            hardWeight: solution.gapWeights[gapIndex],
            kind,
            measureIndex: measureIndex >= 0 ? measureIndex : undefined,
            measureNumber:
              measureIndex >= 0
                ? measures[measureIndex].graphicalMeasures[0]?.MeasureNumber
                : undefined,
            notationRightExtentPx,
            preferredTerminalOpticalTailPx:
              kind === "measure-terminal"
                ? leftNode.column?.preferredTerminalOpticalTailPx
                : undefined,
            preferredTerminalRhythmicWidthPx:
              kind === "measure-terminal"
                ? leftNode.column?.preferredTerminalRhythmicWidthPx
                : undefined,
            residualAddedWidthPx: residualAddedGaps[gapIndex],
            residualWeight: solution.residualGapWeights[gapIndex],
            terminalBarlineInwardExtentPx:
              kind === "measure-terminal"
                ? leftNode.column?.terminalBarlineInwardExtentPx
                : undefined,
            terminalHasVisibleRest:
              kind === "measure-terminal"
                ? leftNode.column?.hasVisibleRest === true
                : undefined,
            toColumn: gapIndex + 1,
          };
        },
      ),
      intrinsicHardWidthPx: intrinsicHardTotalPx,
      measureNumbers: measureNumbers(measures),
      minimumVariableWidth: solution.minimumVariableWidthPx / unitInPixels,
      resolvedConstraints: [...solution.constraintResult.resolvedConstraints],
      selectedHardWidthPx: selectedHardTotalPx,
      systemIndex: this.diagnostics.selectedSystems.length,
      terminalPreferenceScale: selectedPreference.scale,
      targetVariableWidthPx,
    });
    this.diagnostics.selectedSystemCount++;
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);

    return {
      measureVariableWidths,
      minimumVariableWidth:
        (selectedHardTotalPx + softTotalPx) / unitInPixels,
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
    for (const verticalMeasures of this.graphicalMusicSheet.MeasureList ?? []) {
      for (const measure of verticalMeasures ?? []) {
        (measure as VexFlowMeasure)?.setHorizontalSpacingTargetPositions?.(undefined);
      }
    }
    this.diagnostics = emptyDiagnostics();
    this.candidateId = 0;
    setDiagnostics(this.graphicalMusicSheet, this.diagnostics);
  }

  /**
   * Terminal rhythm and optical preferences are soft: consume the system's
   * existing justification budget, but never make a selected system wider
   * than the layout chosen without those preferences.
   */
  private solveSelectedTerminalPreference(
    measures: SystemMeasureSpacingInput[],
    baselineSolution: CandidateSolution,
    targetVariableWidthPx: number,
  ): { scale: number, solution: CandidateSolution } {
    const fullSolution: CandidateSolution = this.solveCandidate(measures, true, 1);
    if (fullSolution.minimumVariableWidthPx <= targetVariableWidthPx + 0.001) {
      return { scale: 1, solution: fullSolution };
    }

    const availablePreferencePx: number = Math.max(
      0,
      targetVariableWidthPx - baselineSolution.minimumVariableWidthPx,
    );
    const requestedPreferencePx: number = Math.max(
      0,
      fullSolution.minimumVariableWidthPx - baselineSolution.minimumVariableWidthPx,
    );
    if (availablePreferencePx <= 0.001 || requestedPreferencePx <= 0.001) {
      return { scale: 0, solution: baselineSolution };
    }

    let scale: number = Math.min(1, availablePreferencePx / requestedPreferencePx);
    let solution: CandidateSolution = this.solveCandidate(measures, true, scale);
    for (let attempt: number = 0;
      attempt < 3 && solution.minimumVariableWidthPx > targetVariableWidthPx + 0.001;
      attempt++) {
      const achievedPreferencePx: number = Math.max(
        0.001,
        solution.minimumVariableWidthPx - baselineSolution.minimumVariableWidthPx,
      );
      scale *= Math.min(1, availablePreferencePx / achievedPreferencePx) * 0.999;
      solution = this.solveCandidate(measures, true, scale);
    }
    if (solution.minimumVariableWidthPx > targetVariableWidthPx + 0.001) {
      return { scale: 0, solution: baselineSolution };
    }
    return { scale, solution };
  }

  private solveCandidate(
    measures: SystemMeasureSpacingInput[],
    compactPreferredTerminals: boolean,
    terminalPreferenceScale: number = 1,
  ): CandidateSolution {
    if (measures.length === 0) {
      return emptySolution();
    }

    const baseVariableWidthsPx: number[] = [];
    const baseHardWidthsPx: number[] = [];
    const intrinsicHardWidthsPx: number[] = [];
    const nodes: CandidateNode[] = [{
      basePositionPx: 0,
      boundaryInputIndex: 0,
      kind: "system-start",
    }];
    const contextToColumn: Map<VF.TickContext, number> = new Map<VF.TickContext, number>();
    const profilesByInput: MeasureProfile[] = [];
    let systemPositionPx: number = 0;

    for (let inputIndex: number = 0; inputIndex < measures.length; inputIndex++) {
      const input: SystemMeasureSpacingInput = measures[inputIndex];
      const profile: MeasureProfile = input.graphicalMeasures
        .map((measure: GraphicalMeasure): MeasureProfile => this.profiles.get(measure))
        .find((candidate: MeasureProfile): boolean => !!candidate);
      profilesByInput.push(profile);
      const intrinsicHardWidthPx: number = profile?.intrinsicHardWidthPx ?? 0;
      const intrinsicBaseFloorPx: number = profile?.compactPickup
        ? 0
        : intrinsicHardWidthPx;
      const uncappedBaseVariableWidthPx: number = Math.max(
        input.baseVariableWidth * unitInPixels,
        profile?.minimumRequiredWidthPx ?? 0,
        intrinsicBaseFloorPx,
      );
      const baseVariableWidthPx: number = compactPreferredTerminals
        ? capPreferredTerminalWidth(
          uncappedBaseVariableWidthPx,
          profile,
          terminalPreferenceScale,
        )
        : uncappedBaseVariableWidthPx;
      baseVariableWidthsPx.push(baseVariableWidthPx);
      baseHardWidthsPx.push(Math.min(baseVariableWidthPx, intrinsicHardWidthPx));
      intrinsicHardWidthsPx.push(intrinsicHardWidthPx);
      if (inputIndex > 0) {
        nodes.push({
          basePositionPx: systemPositionPx,
          boundaryInputIndex: inputIndex,
          kind: "measure-boundary",
        });
      }
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
          kind: "rhythmic",
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
    nodes.push({
      basePositionPx: systemPositionPx,
      boundaryInputIndex: measures.length,
      kind: "system-end",
    });

    const constraints: HorizontalSpacingConstraint[] = [
      ...collectSystemNotationConstraints(nodes),
      ...collectSystemLyricConstraints(measures, contextToColumn, nodes.length - 1, this.rules),
      ...collectSystemHarmonyConstraints(measures, contextToColumn, nodes, this.rules),
    ];
    const basePositions: number[] = nodes.map((node: CandidateNode): number => node.basePositionPx);
    const gapWeights: number[] = nodes
      .slice(0, -1)
      .map(
        (node: CandidateNode, gapIndex: number): number =>
          hardWeightBetweenNodes(
            node,
            nodes[gapIndex + 1],
            profilesByInput,
          ),
      );
    const residualGapWeights: number[] = nodes
      .slice(0, -1)
      .map(
        (node: CandidateNode, gapIndex: number): number =>
          residualWeightBetweenNodes(
            node,
            nodes[gapIndex + 1],
            profilesByInput,
          ),
      );
    const constraintResult: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
      basePositions,
      constraints,
      gapWeights,
    );
    const columns: VexFlowHorizontalSpacingColumnDiagnostics[] = nodes.map(
      (node: CandidateNode, columnIndex: number): VexFlowHorizontalSpacingColumnDiagnostics => ({
        baseX: basePositions[columnIndex],
        columnIndex,
        finalX: constraintResult.positions[columnIndex],
        kind: node.kind,
        measureIndex: node.column?.inputIndex ?? node.boundaryInputIndex,
        tickIds: node.column
          ? node.column.contexts.map((context: VF.TickContext): number => context.getTickID())
          : [],
      }),
    );
    const addedWidthByMeasurePx: number[] = Array(measures.length).fill(0);
    for (let gapIndex: number = 0; gapIndex < constraintResult.addedGaps.length; gapIndex++) {
      const addedGapPx: number = constraintResult.addedGaps[gapIndex];
      if (addedGapPx <= 0.001) {
        continue;
      }
      const leftNode: CandidateNode = nodes[gapIndex];
      const rightNode: CandidateNode = nodes[gapIndex + 1];
      const measureIndex: number = measureIndexForGap(
        leftNode,
        rightNode,
        measures.length,
      );
      if (measureIndex >= 0) {
        addedWidthByMeasurePx[measureIndex] += addedGapPx;
      }
    }

    return {
      addedWidthByMeasurePx,
      baseHardWidthsPx,
      baseVariableWidthsPx,
      columns,
      constraintResult,
      constraints,
      gapWeights,
      intrinsicHardWidthsPx,
      minimumVariableWidthPx: sum(baseVariableWidthsPx) + sum(constraintResult.addedGaps),
      nodes,
      residualGapWeights,
    };
  }
}

function installHorizontalSpacingTargets(
  measures: SystemMeasureSpacingInput[],
  nodes: CandidateNode[],
  finalPositionsPx: number[],
  measureBoundaryIndexes: number[],
): void {
  const targetsByMeasure: Map<number, number>[] = measures.map(
    (): Map<number, number> => new Map<number, number>(),
  );
  for (let nodeIndex: number = 0; nodeIndex < nodes.length; nodeIndex++) {
    const column: CandidateColumn = nodes[nodeIndex].column;
    if (!column) {
      continue;
    }
    const inputIndex: number = column.inputIndex;
    const measureStartX: number = finalPositionsPx[measureBoundaryIndexes[inputIndex]];
    const beginInstructionsWidthPx: number =
      measures[inputIndex].beginInstructionsWidth * unitInPixels;
    const localTargetX: number =
      finalPositionsPx[nodeIndex] - measureStartX - beginInstructionsWidthPx;
    for (const context of column.contexts) {
      targetsByMeasure[inputIndex].set(context.getTickID(), localTargetX);
    }
  }

  for (let inputIndex: number = 0; inputIndex < measures.length; inputIndex++) {
    for (const graphicalMeasure of measures[inputIndex].graphicalMeasures) {
      if (!graphicalMeasure?.isVisible()) {
        continue;
      }
      (graphicalMeasure as VexFlowMeasure).setHorizontalSpacingTargetPositions(
        targetsByMeasure[inputIndex],
      );
    }
  }
}

function rhythmicWeightBetweenNodes(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  profilesByInput: MeasureProfile[],
): number {
  if (leftNode.column) {
    return Math.max(FIXED_GAP_WEIGHT, leftNode.column.rhythmicWeight);
  }
  if (rightNode.column) {
    const leadingWeight: number =
      profilesByInput[rightNode.column.inputIndex]?.leadingRhythmicWeight;
    return Math.max(FIXED_GAP_WEIGHT, leadingWeight ?? 0);
  }
  const measureIndex: number = leftNode.boundaryInputIndex;
  const emptyMeasureWeight: number = profilesByInput[measureIndex]?.rhythmicWeight;
  return Math.max(FIXED_GAP_WEIGHT, emptyMeasureWeight ?? 0);
}

/**
 * A terminal cell may still grow when a hard constraint applies directly to
 * it, but it is not an aesthetic receiver when a spanning deficit can be
 * balanced across other rhythmic cells.
 */
function hardWeightBetweenNodes(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  profilesByInput: MeasureProfile[],
): number {
  if (isCompactTerminalGap(leftNode, rightNode, profilesByInput)) {
    return 0;
  }
  return rhythmicWeightBetweenNodes(leftNode, rightNode, profilesByInput);
}

/**
 * Keep eligible final rhythmic cells compact during system justification.
 * Their capped base width and all hard notation/lyric constraints still
 * apply; only optional residual width is redirected to the other eligible
 * rhythmic gaps in the system.
 */
function residualWeightBetweenNodes(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  profilesByInput: MeasureProfile[],
): number {
  if (isCompactPickupTerminalGap(leftNode, rightNode, profilesByInput)) {
    return 0;
  }
  const weight: number = rhythmicWeightBetweenNodes(
    leftNode,
    rightNode,
    profilesByInput,
  );
  // FIXED_GAP_WEIGHT keeps the hard-constraint solver numerically stable,
  // but a zero-duration gap must not receive optional system justification.
  return weight <= FIXED_GAP_WEIGHT ? 0 : weight;
}

function isCompactPickupTerminalGap(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  profilesByInput: MeasureProfile[],
): boolean {
  if (!isCompactTerminalGap(leftNode, rightNode, profilesByInput)) {
    return false;
  }
  return profilesByInput[leftNode.column.inputIndex]?.compactPickup === true;
}

function isCompactTerminalGap(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  profilesByInput: MeasureProfile[],
): boolean {
  if (!leftNode.column || rightNode.column) {
    return false;
  }
  const inputIndex: number = leftNode.column.inputIndex;
  const profile: MeasureProfile = profilesByInput[inputIndex];
  return profile?.compactTerminal === true &&
    rightNode.boundaryInputIndex === inputIndex + 1;
}

function gapKind(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
): VexFlowHorizontalSpacingGapKind {
  if (leftNode.column && rightNode.column) {
    return "rhythmic";
  }
  if (leftNode.column) {
    return "measure-terminal";
  }
  if (rightNode.column) {
    return "measure-leading";
  }
  return "empty-measure";
}

function measureIndexForGap(
  leftNode: CandidateNode,
  rightNode: CandidateNode,
  measureCount: number,
): number {
  if (leftNode.column) {
    return leftNode.column.inputIndex;
  }
  if (rightNode.column) {
    return rightNode.column.inputIndex;
  }
  const measureIndex: number = leftNode.boundaryInputIndex;
  return Number.isInteger(measureIndex) && measureIndex >= 0 && measureIndex < measureCount
    ? measureIndex
    : -1;
}

function finitePositive(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function measureRhythmicWeight(sourceMeasure: SourceMeasure): number {
  const duration: number = finitePositive(sourceMeasure?.Duration?.RealValue);
  const meter: number = finitePositive(sourceMeasure?.ActiveTimeSignature?.RealValue);
  if (!isShortImplicitMeasure(sourceMeasure) || duration === undefined || meter === undefined) {
    return 1;
  }
  return Math.max(FIXED_GAP_WEIGHT, Math.min(1, duration / meter));
}

function selectedTargetVariableWidth(
  solution: CandidateSolution,
  availableVariableWidthPx: number,
  maximumSoftScalingFactor?: number,
): number {
  const selectedHardTotalPx: number = sum(
    solution.baseHardWidthsPx.map(
      (width: number, index: number): number =>
        width + solution.addedWidthByMeasurePx[index],
    ),
  );
  const softTotalPx: number = sum(
    solution.baseVariableWidthsPx.map(
      (width: number, index: number): number =>
        Math.max(0, width - solution.baseHardWidthsPx[index]),
    ),
  );
  const availableSoftWidthPx: number = Math.max(
    softTotalPx,
    availableVariableWidthPx - selectedHardTotalPx,
  );
  const targetSoftWidthPx: number = maximumSoftScalingFactor === undefined
    ? availableSoftWidthPx
    : Math.min(availableSoftWidthPx, softTotalPx * maximumSoftScalingFactor);
  return selectedHardTotalPx + targetSoftWidthPx;
}

function capPreferredTerminalWidth(
  baseVariableWidthPx: number,
  profile?: MeasureProfile,
  terminalPreferenceScale: number = 1,
): number {
  if (!profile?.compactTerminal) {
    return baseVariableWidthPx;
  }
  // Stave.rightPadding is VexFlow's public view of
  // Metrics.get("Stave.endPaddingMax"), and is present in the fontless core
  // runtime used by OSMD.
  const configuredPaddingPx: number = VF.Stave.rightPadding;
  const maximumPaddingPx: number =
    Number.isFinite(configuredPaddingPx) && configuredPaddingPx >= 0
      ? configuredPaddingPx
      : 0;
  const maximumPreferredWidthPx: number =
    profile.minimumRequiredWidthPx + maximumPaddingPx;
  const lastColumn: ProfileColumn = profile.columns[profile.columns.length - 1];
  const rhythmicPreferredWidthPx: number =
    lastColumn?.preferredTerminalRhythmicWidthPx ?? 0;
  const rhythmicPreferredMeasureWidthPx: number = lastColumn
    ? lastColumn.basePositionPx + rhythmicPreferredWidthPx
    : 0;
  const terminalRestPreferredMeasureWidthPx: number = lastColumn
    ? lastColumn.basePositionPx +
      lastColumn.notationRightExtentPx +
      maximumPaddingPx +
      profile.terminalRestOpticalTailPx
    : 0;
  const cappedPreferredWidthPx: number = Math.max(
    profile.minimumRequiredWidthPx,
    Math.min(baseVariableWidthPx, maximumPreferredWidthPx),
  );
  const fullPreferredWidthPx: number = Math.max(
    cappedPreferredWidthPx,
    rhythmicPreferredMeasureWidthPx,
    terminalRestPreferredMeasureWidthPx,
  );
  const safePreferenceScale: number = Math.max(
    0,
    Math.min(1, terminalPreferenceScale),
  );
  return cappedPreferredWidthPx +
    (fullPreferredWidthPx - cappedPreferredWidthPx) * safePreferenceScale;
}

/**
 * Preserve a terminal onset's rhythmic cell without restoring VexFlow's
 * occasionally oversized end padding. The closest preceding duration is the
 * best local statement of the measure's spacing curve. When the terminal
 * glyph reaches farther right than that reference note, retain the same
 * usable optical space after the glyph as well as the rhythmic proportion.
 */
function preferredTerminalRhythmicWidth(
  columns: ProfileColumn[],
  endTimestamp: number,
): number | undefined {
  if (columns.length < 2) {
    return undefined;
  }
  const lastColumn: ProfileColumn = columns[columns.length - 1];
  const terminalSpan: number = endTimestamp - lastColumn.timestamp;
  const terminalWeight: number = lastColumn.rhythmicWeight;
  if (terminalSpan <= 0 || terminalWeight <= FIXED_GAP_WEIGHT) {
    return undefined;
  }

  let referenceIndex: number = -1;
  let closestDurationDifference: number = Number.POSITIVE_INFINITY;
  for (let index: number = columns.length - 2; index >= 0; index--) {
    const span: number = columns[index + 1].timestamp - columns[index].timestamp;
    const widthPx: number = columns[index + 1].basePositionPx - columns[index].basePositionPx;
    if (span <= 0 || widthPx <= 0 || columns[index].rhythmicWeight <= FIXED_GAP_WEIGHT) {
      continue;
    }
    const durationDifference: number = Math.abs(Math.log(span / terminalSpan));
    if (durationDifference < closestDurationDifference) {
      referenceIndex = index;
      closestDurationDifference = durationDifference;
    }
  }
  if (referenceIndex < 0) {
    return undefined;
  }

  const referenceColumn: ProfileColumn = columns[referenceIndex];
  const nextColumn: ProfileColumn = columns[referenceIndex + 1];
  const referenceWidthPx: number = nextColumn.basePositionPx - referenceColumn.basePositionPx;
  const scaledReferenceWidthPx: number =
    referenceWidthPx * terminalWeight / referenceColumn.rhythmicWeight;
  const opticalRightDifferencePx: number = Math.max(
    0,
    lastColumn.notationRightExtentPx - referenceColumn.notationRightExtentPx,
  );
  return scaledReferenceWidthPx + opticalRightDifferencePx;
}

function isShortImplicitMeasure(sourceMeasure: SourceMeasure): boolean {
  const duration: number = finitePositive(sourceMeasure?.Duration?.RealValue);
  const meter: number = finitePositive(sourceMeasure?.ActiveTimeSignature?.RealValue);
  return !!sourceMeasure?.ImplicitMeasure &&
    duration !== undefined &&
    meter !== undefined &&
    duration < meter;
}

function measureEndTimestamp(
  sourceMeasure: SourceMeasure,
  lastColumnTimestamp?: number,
): number {
  const duration: number = finitePositive(sourceMeasure?.Duration?.RealValue);
  const meter: number = finitePositive(sourceMeasure?.ActiveTimeSignature?.RealValue);
  let endTimestamp: number;
  if (meter === undefined) {
    endTimestamp = duration ?? 1;
  } else if (
    sourceMeasure?.ImplicitMeasure &&
    duration !== undefined &&
    duration < meter
  ) {
    endTimestamp = duration;
  } else if (duration !== undefined && duration > meter) {
    endTimestamp = duration;
  } else {
    endTimestamp = meter;
  }
  return Math.max(
    endTimestamp,
    Number.isFinite(lastColumnTimestamp) ? lastColumnTimestamp : 0,
  );
}

/**
 * Give flexibility to elapsed musical intervals, not to the longest note
 * beginning at an onset. This keeps equal vocal intervals equal even when
 * another staff begins a sustained note at the same column.
 */
function assignTemporalRhythmicWeights(
  columns: ProfileColumn[],
  endTimestamp: number,
  targetWeight: number,
  softmaxFactor: number,
): number {
  if (columns.length === 0) {
    return 0;
  }
  const spans: number[] = [Math.max(0, columns[0].timestamp)];
  for (let index: number = 1; index < columns.length; index++) {
    spans.push(Math.max(0, columns[index].timestamp - columns[index - 1].timestamp));
  }
  spans.push(Math.max(0, endTimestamp - columns[columns.length - 1].timestamp));

  const safeEndTimestamp: number = finitePositive(endTimestamp) ?? 1;
  const safeSoftmaxFactor: number = finitePositive(softmaxFactor) ?? 1;
  const rawWeights: number[] = spans.map(
    (span: number): number =>
      span > 0
        ? Math.pow(safeSoftmaxFactor, span / safeEndTimestamp)
        : 0,
  );
  const rawTotal: number = sum(rawWeights);
  if (!Number.isFinite(rawTotal) || rawTotal <= 0) {
    columns[columns.length - 1].rhythmicWeight = targetWeight;
    return 0;
  }
  const normalizedWeights: number[] = rawWeights.map(
    (weight: number): number => targetWeight * weight / rawTotal,
  );
  for (let index: number = 0; index < columns.length; index++) {
    columns[index].rhythmicWeight = normalizedWeights[index + 1];
  }
  return normalizedWeights[0];
}

function collectMeasureProfiles(
  graphicalMusicSheet: GraphicalMusicSheet,
  rules: EngravingRules,
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
    const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
    const contextTimestamps: Map<VF.TickContext, number> =
      collectContextTimestamps(graphicalMeasures);
    const visibleRestContexts: Set<VF.TickContext> =
      collectVisibleRestContexts(graphicalMeasures);
    const columns: ProfileColumn[] = groupContextsByTick(
      contextTimestamps,
      visibleRestContexts,
    );
    const rhythmicEndTimestamp: number = measureEndTimestamp(
      sourceMeasure,
      columns[columns.length - 1]?.timestamp,
    );
    const rhythmicWeight: number = measureRhythmicWeight(sourceMeasure);
    const leadingRhythmicWeight: number = assignTemporalRhythmicWeights(
      columns,
      rhythmicEndTimestamp,
      rhythmicWeight,
      rules.SoftmaxFactorVexFlow,
    );
    const preferredTerminalRhythmicWidthPx: number | undefined =
      preferredTerminalRhythmicWidth(columns, rhythmicEndTimestamp);
    if (columns.length > 0 && preferredTerminalRhythmicWidthPx !== undefined) {
      columns[columns.length - 1].preferredTerminalRhythmicWidthPx =
        preferredTerminalRhythmicWidthPx;
    }
    const intrinsicHardWidthPx: number = sum(
      columns.map((column: ProfileColumn): number => column.intrinsicHardWidthPx),
    );
    const lastColumn: ProfileColumn = columns[columns.length - 1];
    const notationMinimumRequiredWidthPx: number = lastColumn
      ? lastColumn.basePositionPx + lastColumn.notationRightExtentPx
      : 0;
    const minimumRequiredWidthPx: number = Math.max(
      notationMinimumRequiredWidthPx,
      unanchoredHarmonyMinimumWidthPx(graphicalMeasures, rhythmicEndTimestamp, rules),
    );
    const terminalHasVisibleRest: boolean = lastColumn?.hasVisibleRest === true;
    const terminalBarlineInwardExtentPx: number = terminalHasVisibleRest
      ? endBarlineInwardExtentPx(sourceMeasure.endingBarStyleEnum)
      : 0;
    const terminalRestOpticalTailPx: number = terminalHasVisibleRest &&
      !isShortImplicitMeasure(sourceMeasure)
      ? Math.max(0, rules.QuarterRestRightClearance * unitInPixels) +
        terminalBarlineInwardExtentPx
      : 0;
    if (lastColumn && terminalRestOpticalTailPx > 0) {
      lastColumn.preferredTerminalOpticalTailPx = terminalRestOpticalTailPx;
      lastColumn.terminalBarlineInwardExtentPx = terminalBarlineInwardExtentPx;
    }
    const profile: MeasureProfile = {
      compactPickup: isShortImplicitMeasure(sourceMeasure),
      compactTerminal: isShortImplicitMeasure(sourceMeasure) || columns.length > 1,
      columns,
      graphicalMeasures,
      intrinsicHardWidthPx,
      leadingRhythmicWeight,
      minimumRequiredWidthPx,
      preferredTerminalRhythmicWidthPx,
      rhythmicWeight,
      terminalHasVisibleRest,
      terminalRestOpticalTailPx,
    };
    for (const graphicalMeasure of graphicalMeasures) {
      profiles.set(graphicalMeasure, profile);
    }
  }
  return profiles;
}

/**
 * VexFlow gives each end barline a nominal five-pixel instruction width, but
 * double, final, and repeat barlines draw additional ink to the left of their
 * anchor. Include that inward ink in a terminal rest's optical preference so
 * its visible clearance is the same as it would be before a regular barline.
 */
function endBarlineInwardExtentPx(line: SystemLinesEnum): number {
  let type: number;
  switch (line) {
    case SystemLinesEnum.DoubleThin:
      type = VF.Barline.type.DOUBLE;
      break;
    case SystemLinesEnum.ThinBold:
      type = VF.Barline.type.END;
      break;
    case SystemLinesEnum.DotsThinBold:
      type = VF.Barline.type.REPEAT_END;
      break;
    case SystemLinesEnum.DotsBoldBoldDots:
      type = VF.Barline.type.REPEAT_BOTH;
      break;
    default:
      return 0;
  }
  const metrics: VF.LayoutMetrics | undefined = new VF.Barline(type).getLayoutMetrics();
  return Math.max(0, -(metrics?.xMin ?? 0));
}

/**
 * Retain the legacy proportional width floor only for harmony that cannot be
 * tied to a rhythmic VexFlow column. Rhythmically anchored chord symbols are
 * handled by collectSystemHarmonyConstraints(), which applies their actual
 * local footprints without turning a late chord's terminal overhang into a
 * whole-measure width multiplier.
 */
function unanchoredHarmonyMinimumWidthPx(
  graphicalMeasures: GraphicalMeasure[],
  measureEnd: number,
  rules: EngravingRules,
): number {
  if (!rules.RenderChordSymbols || !Number.isFinite(measureEnd) || measureEnd <= 0) {
    return 0;
  }

  let minimumWidthPx: number = 0;
  for (const measure of graphicalMeasures) {
    const tracks: Map<number, Map<number, HarmonyFootprint>> =
      new Map<number, Map<number, HarmonyFootprint>>();
    for (const staffEntry of measure.staffEntries) {
      const timestamp: number =
        staffEntry.relInMeasureTimestamp?.RealValue ??
        staffEntry.sourceStaffEntry?.Timestamp?.RealValue ??
        0;
      const normalizedTimestamp: number = Math.max(
        0,
        Math.min(1, timestamp / measureEnd),
      );
      for (const container of (staffEntry.graphicalChordContainers ?? []) as GraphicalChordSymbolContainer[]) {
        if (
          container?.PositionAndShape.Parent === staffEntry.PositionAndShape &&
          findStaffEntryTickContext(staffEntry)
        ) {
          continue;
        }
        const placement: number = container.GetChordSymbolContainer.Placement;
        const track: Map<number, HarmonyFootprint> =
          tracks.get(placement) ??
          new Map<number, HarmonyFootprint>();
        const current: HarmonyFootprint =
          track.get(normalizedTimestamp);
        const leftOffsetPx: number =
          (
            container.PositionAndShape.RelativePosition.x +
            container.PositionAndShape.BorderMarginLeft
          ) * unitInPixels;
        const rightOffsetPx: number =
          (
            container.PositionAndShape.RelativePosition.x +
            container.PositionAndShape.BorderMarginRight
          ) * unitInPixels;
        if (normalizedTimestamp < 1) {
          // Direction-only harmony is positioned proportionally between the
          // first rhythmic entry and the end instruction area after final
          // formatting. Model that same interpolation here. The previous
          // origin-based estimate could leave a late slash-bass contour almost
          // touching the barline (and a number centred on it).
          const beginInstructionsWidth: number = measure.beginInstructionsWidth ?? 0;
          const endInstructionsWidth: number = measure.endInstructionsWidth ?? 0;
          const firstEntryX: number = measure.staffEntries[0]?.PositionAndShape.RelativePosition.x ??
            beginInstructionsWidth;
          const requiredTotalWidth: number = firstEntryX +
            (
              container.PositionAndShape.BorderMarginRight +
              harmonyBarlineClearance(rules) -
              endInstructionsWidth * normalizedTimestamp
            ) /
            (1 - normalizedTimestamp);
          minimumWidthPx = Math.max(
            minimumWidthPx,
            Math.max(
              0,
              requiredTotalWidth - beginInstructionsWidth - endInstructionsWidth,
            ) * unitInPixels,
          );
        }
        track.set(normalizedTimestamp, {
          leftOffsetPx: current
            ? Math.min(current.leftOffsetPx, leftOffsetPx)
            : leftOffsetPx,
          rightOffsetPx: current
            ? Math.max(current.rightOffsetPx, rightOffsetPx)
            : rightOffsetPx,
        });
        tracks.set(placement, track);
      }
    }
    tracks.forEach(
      (track: Map<number, HarmonyFootprint>): void => {
        const events: MeasureHarmonyEvent[] = Array.from(track.entries())
          .map(([timestamp, footprint]) => ({ timestamp, ...footprint }))
          .sort((left, right) => left.timestamp - right.timestamp);
        if (events.length === 0) {
          return;
        }
        const first: MeasureHarmonyEvent = events[0];
        if (first.timestamp > 0) {
          minimumWidthPx = Math.max(
            minimumWidthPx,
            Math.max(0, -first.leftOffsetPx) / first.timestamp,
          );
        }
        for (let index: number = 1; index < events.length; index++) {
          const previous: MeasureHarmonyEvent = events[index - 1];
          const current: MeasureHarmonyEvent = events[index];
          const elapsed: number = current.timestamp - previous.timestamp;
          if (elapsed <= 0) {
            continue;
          }
          minimumWidthPx = Math.max(
            minimumWidthPx,
            Math.max(
              0,
              previous.rightOffsetPx -
              current.leftOffsetPx +
              rules.ChordSymbolXSpacing * unitInPixels,
            ) / elapsed,
          );
        }
        const last: MeasureHarmonyEvent = events[events.length - 1];
        if (last.timestamp < 1) {
          minimumWidthPx = Math.max(
            minimumWidthPx,
            Math.max(0, last.rightOffsetPx) / (1 - last.timestamp),
          );
        }
      },
    );
  }
  return minimumWidthPx;
}

function groupContextsByTick(
  contextTimestamps: Map<VF.TickContext, number>,
  visibleRestContexts: Set<VF.TickContext>,
): ProfileColumn[] {
  const contextsByTick: Map<number, VF.TickContext[]> = new Map<number, VF.TickContext[]>();
  contextTimestamps.forEach((_timestamp: number, context: VF.TickContext): void => {
    const tickId: number = context.getTickID();
    const group: VF.TickContext[] = contextsByTick.get(tickId) ?? [];
    group.push(context);
    contextsByTick.set(tickId, group);
  });
  return Array.from(contextsByTick.values())
    .map((group: VF.TickContext[]): ProfileColumn => {
      for (const context of group) {
        context.preFormat();
      }
      return {
        basePositionPx: Math.min(...group.map((context: VF.TickContext): number => context.getX())),
        contexts: group,
        hasVisibleRest: group.some(
          (context: VF.TickContext): boolean => visibleRestContexts.has(context),
        ),
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
        rhythmicWeight: 0,
        timestamp: Math.min(
          ...group.map(
            (context: VF.TickContext): number => contextTimestamps.get(context) ?? 0,
          ),
        ),
      };
    })
    .sort(
      (left: ProfileColumn, right: ProfileColumn): number =>
        left.timestamp - right.timestamp ||
        left.basePositionPx - right.basePositionPx,
    );
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
          if (!participatesInLyricSpacing(lyricEntry)) {
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
          if (!participatesInLyricSpacing(lyricEntry)) {
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
          const anchorOffsetPx: number = finalizedLyricAnchorOffsetPx(
            lyricEntry,
            staffEntry,
            note,
            context,
            measure,
          );
          const extendType: LyricExtendType = lyricEntry.LyricsEntry.ExtendType;
          lyrics.push({
            anchorOffsetPx,
            columnIndex,
            connectorTerminalOffsetPx:
              extendType === LyricExtendType.Continue || extendType === LyricExtendType.Stop
                ? finalizedLyricConnectorTerminalOffsetPx(
                  staffEntry,
                  note,
                  context,
                  measure,
                  rules,
                )
                : undefined,
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

    const footprint: LyricFootprint = lyricSpacingFootprint(lyric);
    constraints.push({
      fromColumn: 0,
      minimumDistance: Math.max(0, -lyricLeftOffsetPx(lyric, footprint)),
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
        lyricRightOffsetPx(lyric, footprint) + terminalConnectorWidth * unitInPixels,
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
        const previousFootprint: LyricFootprint = lyricSpacingFootprint(previous);
        const currentFootprint: LyricFootprint = lyricSpacingFootprint(current);
        const hasDash: boolean = previous.entry.hasDashFromLyricWord();
        const isExtender: boolean =
          previous.entry.LyricsEntry.ExtendType !== LyricExtendType.None;
        const endsExtender: boolean = previous.connectorTerminalOffsetPx !== undefined;
        const connectorClearance: number = hasDash
          ? previous.entry.getDashWidth() + rules.BetweenSyllableMinimumDistance
          : endsExtender
            ? rules.BetweenSyllableMinimumDistance
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
                lyricSpacingFootprint(previous),
                lyricSpacingFootprint(current),
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

function collectSystemHarmonyConstraints(
  measures: SystemMeasureSpacingInput[],
  contextToColumn: Map<VF.TickContext, number>,
  nodes: CandidateNode[],
  rules: EngravingRules,
): HorizontalSpacingConstraint[] {
  if (!rules.RenderChordSymbols) {
    return [];
  }

  const harmonyByStaffAndPlacement: Map<Staff, Map<number, CandidateHarmony[]>> =
    new Map<Staff, Map<number, CandidateHarmony[]>>();
  for (let inputIndex: number = 0; inputIndex < measures.length; inputIndex++) {
    const input: SystemMeasureSpacingInput = measures[inputIndex];
    const measureEndColumnIndex: number = nodes.findIndex(
      (node: CandidateNode): boolean =>
        node.boundaryInputIndex === inputIndex + 1 &&
        (node.kind === "measure-boundary" || node.kind === "system-end"),
    );
    for (const measure of input.graphicalMeasures) {
      if (!measure?.isVisible()) {
        continue;
      }
      for (const staffEntry of measure.staffEntries) {
        const context: VF.TickContext = findStaffEntryTickContext(staffEntry);
        const columnIndex: number = contextToColumn.get(context);
        if (!Number.isInteger(columnIndex)) {
          continue;
        }
        for (const container of (staffEntry.graphicalChordContainers ?? []) as GraphicalChordSymbolContainer[]) {
          if (
            !container ||
            container.PositionAndShape.Parent !== staffEntry.PositionAndShape
          ) {
            // Whole-rest and direction-only harmonies retain their existing
            // proportional positioning because they do not own a rhythmic
            // VexFlow column.
            continue;
          }
          const anchorOffsetPx: number =
            (
              staffEntry.PositionAndShape.RelativePosition.x +
              container.PositionAndShape.RelativePosition.x
            ) * unitInPixels -
            context.getX();
          const candidate: CandidateHarmony = {
            columnIndex,
            leftOffsetPx:
              anchorOffsetPx +
              container.PositionAndShape.BorderMarginLeft * unitInPixels,
            measureEndColumnIndex,
            placement: container.GetChordSymbolContainer.Placement,
            rightOffsetPx:
              anchorOffsetPx +
              container.PositionAndShape.BorderMarginRight * unitInPixels,
            staff: measure.ParentStaff,
          };
          const byPlacement: Map<number, CandidateHarmony[]> =
            harmonyByStaffAndPlacement.get(candidate.staff) ??
            new Map<number, CandidateHarmony[]>();
          const track: CandidateHarmony[] =
            byPlacement.get(candidate.placement) ?? [];
          track.push(candidate);
          byPlacement.set(candidate.placement, track);
          harmonyByStaffAndPlacement.set(candidate.staff, byPlacement);
        }
      }
    }
  }

  const constraints: HorizontalSpacingConstraint[] = [];
  harmonyByStaffAndPlacement.forEach(
    (byPlacement: Map<number, CandidateHarmony[]>): void => {
      byPlacement.forEach((track: CandidateHarmony[]): void => {
        const columnGroups: CandidateHarmony[][] = groupHarmonyByColumn(track);
        for (const group of columnGroups) {
          const columnIndex: number = group[0].columnIndex;
          const leftOffsetPx: number = Math.min(
            ...group.map((harmony: CandidateHarmony): number => harmony.leftOffsetPx),
          );
          const rightOffsetPx: number = Math.max(
            ...group.map((harmony: CandidateHarmony): number => harmony.rightOffsetPx),
          );
          constraints.push({
            fromColumn: 0,
            minimumDistance: Math.max(0, -leftOffsetPx),
            reason: "system-edge",
            toColumn: columnIndex,
          });
          constraints.push({
            fromColumn: columnIndex,
            minimumDistance: Math.max(
              0,
              rightOffsetPx + harmonyBarlineClearance(rules) * unitInPixels,
            ),
            reason: "system-edge",
            // A barline is a hard edge for its own harmony skyline. Constrain
            // the complete composite chord footprint to this measure boundary,
            // not merely to the end of the containing system.
            toColumn: Math.min(
              ...group.map((harmony: CandidateHarmony): number =>
                harmony.measureEndColumnIndex,
              ),
            ),
          });
        }
        for (let groupIndex: number = 1; groupIndex < columnGroups.length; groupIndex++) {
          const previousGroup: CandidateHarmony[] = columnGroups[groupIndex - 1];
          const currentGroup: CandidateHarmony[] = columnGroups[groupIndex];
          const previousRightOffsetPx: number = Math.max(
            ...previousGroup.map((harmony: CandidateHarmony): number => harmony.rightOffsetPx),
          );
          const currentLeftOffsetPx: number = Math.min(
            ...currentGroup.map((harmony: CandidateHarmony): number => harmony.leftOffsetPx),
          );
          constraints.push({
            fromColumn: previousGroup[0].columnIndex,
            minimumDistance: Math.max(
              0,
              previousRightOffsetPx -
              currentLeftOffsetPx +
              rules.ChordSymbolXSpacing * unitInPixels,
            ),
            reason: "harmony",
            toColumn: currentGroup[0].columnIndex,
          });
        }
      });
    },
  );
  return constraints;
}

/**
 * Leave enough room for a measure number centred on the barline, plus a small
 * optical gap. ChordSymbolXSpacing is normally wider than half a single-digit
 * measure number and therefore provides the desired one-staff-space clearance
 * without making every terminal cell conspicuously loose.
 */
function harmonyBarlineClearance(rules: EngravingRules): number {
  const measureNumberOverhang: number = rules.RenderMeasureNumbers
    ? rules.MeasureNumberLabelHeight / 2
    : 0;
  return Math.max(rules.ChordSymbolXSpacing, measureNumberOverhang);
}

function groupHarmonyByColumn(harmonies: CandidateHarmony[]): CandidateHarmony[][] {
  const sorted: CandidateHarmony[] = [...harmonies].sort(
    (left: CandidateHarmony, right: CandidateHarmony): number =>
      left.columnIndex - right.columnIndex,
  );
  const groups: CandidateHarmony[][] = [];
  for (const harmony of sorted) {
    const currentGroup: CandidateHarmony[] = groups[groups.length - 1];
    if (!currentGroup || currentGroup[0].columnIndex !== harmony.columnIndex) {
      groups.push([harmony]);
    } else {
      currentGroup.push(harmony);
    }
  }
  return groups;
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

function findStaffEntryTickContext(staffEntry: GraphicalStaffEntry): VF.TickContext {
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
      return context;
    }
  }
  return undefined;
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
      lyricRightOffsetPx(previous, previousFootprint) +
        connectorClearance * unitInPixels -
        lyricLeftOffsetPx(current, currentFootprint),
    ),
    reason,
    toColumn: current.columnIndex,
  };
}

function lyricSpacingFootprint(lyric: CandidateLyric): LyricFootprint {
  return lyric.entry.getFootprint();
}

function lyricLeftOffsetPx(lyric: CandidateLyric, footprint: LyricFootprint): number {
  return lyric.anchorOffsetPx - footprint.leftExtent * unitInPixels;
}

function lyricRightOffsetPx(lyric: CandidateLyric, footprint: LyricFootprint): number {
  return Math.max(
    lyric.anchorOffsetPx + footprint.rightExtent * unitInPixels,
    lyric.connectorTerminalOffsetPx ?? Number.NEGATIVE_INFINITY,
  );
}

function finalizedLyricAnchorOffsetPx(
  lyricEntry: GraphicalLyricEntry,
  staffEntry: GraphicalStaffEntry,
  note: VF.Note,
  context: VF.TickContext,
  measure: GraphicalMeasure,
): number {
  const staveNote: VF.Note & {
    getNoteHeadBeginX?: () => number;
    getNoteHeadEndX?: () => number;
  } = note;
  const noteheadBeginX: number = staveNote.getNoteHeadBeginX?.();
  const noteheadEndX: number = staveNote.getNoteHeadEndX?.();
  const staveX: number = (measure as VexFlowMeasure).getVFStave()?.getX?.();
  if (
    Number.isFinite(noteheadBeginX) &&
    Number.isFinite(noteheadEndX) &&
    Number.isFinite(staveX)
  ) {
    const anchorX: number =
      lyricEntry.LyricsEntry.AlignmentMode === LyricAlignmentMode.MelismaLeft
        ? noteheadBeginX
        : (noteheadBeginX + noteheadEndX) / 2;
    return anchorX - staveX - context.getX();
  }
  return lyricEntry.getAnchorX(staffEntry.PositionAndShape.RelativePosition.x) * unitInPixels -
    context.getX();
}

function finalizedLyricConnectorTerminalOffsetPx(
  staffEntry: GraphicalStaffEntry,
  note: VF.Note,
  context: VF.TickContext,
  measure: GraphicalMeasure,
  rules: EngravingRules,
): number {
  const graphicalEndpointOffsetPx: number =
    staffEntry.PositionAndShape.RelativePosition.x * unitInPixels +
    staffEntry.PositionAndShape.BorderMarginRight * unitInPixels -
    context.getX();
  const staveNote: VF.Note & { getNoteHeadEndX?: () => number } = note;
  const noteheadEndX: number = staveNote.getNoteHeadEndX?.();
  const staveX: number = (measure as VexFlowMeasure).getVFStave()?.getX?.();
  if (!Number.isFinite(noteheadEndX) || !Number.isFinite(staveX)) {
    return graphicalEndpointOffsetPx;
  }
  // The graphical staff-entry origin used by calculateLyricExtend can move
  // after system formatting (especially for an accidental at a system start).
  // Reserve through the finalized notehead's right edge plus one clearance
  // unit. This never shortens the extender; it moves the following word clear
  // of the latest plausible rendered endpoint.
  const finalizedEndpointOffsetPx: number =
    noteheadEndX - staveX - context.getX() +
    rules.HorizontalBetweenLyricsDistance * unitInPixels;
  return Math.max(graphicalEndpointOffsetPx, finalizedEndpointOffsetPx);
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

function collectContextTimestamps(
  graphicalMeasures: GraphicalMeasure[],
): Map<VF.TickContext, number> {
  const contextTimestamps: Map<VF.TickContext, number> = new Map<VF.TickContext, number>();
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
          const timestamp: number =
            staffEntry.relInMeasureTimestamp?.RealValue ??
            staffEntry.sourceStaffEntry?.Timestamp?.RealValue ??
            voiceEntry.parentVoiceEntry?.Timestamp?.RealValue ??
            0;
          const currentTimestamp: number = contextTimestamps.get(context);
          contextTimestamps.set(
            context,
            Number.isFinite(currentTimestamp)
              ? Math.min(currentTimestamp, Math.max(0, timestamp))
              : Math.max(0, timestamp),
          );
        }
      }
    }
  }
  return contextTimestamps;
}

function collectVisibleRestContexts(
  graphicalMeasures: GraphicalMeasure[],
): Set<VF.TickContext> {
  const contexts: Set<VF.TickContext> = new Set<VF.TickContext>();
  for (const measure of graphicalMeasures) {
    for (const staffEntry of measure.staffEntries) {
      for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
        const sourceNote: SourceNote = voiceEntry.notes?.[0]?.sourceNote;
        if (
          !sourceNote?.PrintObject ||
          !sourceNote.isRest?.()
        ) {
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

function participatesInLyricSpacing(entry: GraphicalLyricEntry): boolean {
  return isVisibleLyric(entry) ||
    entry.LyricsEntry.ExtendType === LyricExtendType.Continue ||
    entry.LyricsEntry.ExtendType === LyricExtendType.Stop;
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
    baseHardWidthsPx: [],
    baseVariableWidthsPx: [],
    columns: [],
    constraintResult: {
      addedGaps: [],
      positions: [],
      resolvedConstraints: [],
    },
    constraints: [],
    gapWeights: [],
    intrinsicHardWidthsPx: [],
    minimumVariableWidthPx: 0,
    nodes: [],
    residualGapWeights: [],
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
