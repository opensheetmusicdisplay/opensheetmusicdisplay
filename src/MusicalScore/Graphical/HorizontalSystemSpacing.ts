import { GraphicalMeasure } from "./GraphicalMeasure";

/**
 * Width information known by MusicSystemBuilder for one vertical measure
 * group. Instruction widths are fixed; baseVariableWidth contains the
 * renderer's minimum rhythmic width before system-level constraints.
 */
export interface SystemMeasureSpacingInput {
    graphicalMeasures: GraphicalMeasure[];
    beginInstructionsWidth: number;
    endInstructionsWidth: number;
    baseVariableWidth: number;
}

export interface HorizontalSystemSpacingCandidate {
    candidateId?: number;
    minimumVariableWidth: number;
}

export interface HorizontalSystemSpacingLayout extends HorizontalSystemSpacingCandidate {
    measureVariableWidths: number[];
}

/**
 * Renderer-specific system spacing hook used by MusicSystemBuilder.
 *
 * Candidate evaluation must be pure: line breaking tries several candidate
 * ranges. applySelectedSystem is called exactly once for a selected range and
 * may install renderer-owned layout state before the final format pass.
 */
export interface IHorizontalSystemSpacingPlanner {
    evaluateCandidate(measures: SystemMeasureSpacingInput[]): HorizontalSystemSpacingCandidate;
    recordCandidateDecision(
        candidate: HorizontalSystemSpacingCandidate,
        accepted: boolean,
    ): void;
    applySelectedSystem(
        measures: SystemMeasureSpacingInput[],
        availableVariableWidth: number,
        maximumSoftScalingFactor?: number,
    ): HorizontalSystemSpacingLayout;
    clearAppliedPadding(): void;
}
