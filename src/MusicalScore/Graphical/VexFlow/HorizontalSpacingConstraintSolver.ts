export type HorizontalSpacingConstraintReason =
    "notation" |
    "lyric" |
    "hyphen" |
    "extender" |
    "harmony" |
    "system-edge";

export interface HorizontalSpacingConstraint {
    fromColumn: number;
    toColumn: number;
    minimumDistance: number;
    reason: HorizontalSpacingConstraintReason;
}

export interface HorizontalSpacingConstraintResult {
    addedGaps: number[];
    positions: number[];
    resolvedConstraints: ResolvedHorizontalSpacingConstraint[];
}

export interface ResolvedHorizontalSpacingConstraint extends HorizontalSpacingConstraint {
    addedDistance: number;
    finalDistance: number;
}

/**
 * Add the least forward-only space needed to satisfy hard column constraints.
 *
 * The supplied positions are VexFlow's rhythmic targets. They form zero-cost
 * forward edges between adjacent columns, while each hard constraint forms an
 * additional forward edge. The first pass finds the graph's longest paths, and
 * therefore the minimum possible final width. A backwards feasibility pass
 * then redistributes that exact amount of added width towards VexFlow's
 * rhythmic targets. This matters for constraints spanning several rhythmic
 * columns: putting their whole deficit in the final gap would squeeze the
 * intervening notes or rests together and leave a conspicuous blank area at
 * the end of the measure.
 *
 * `gapFlexibility` controls only where the already-required width is placed.
 * It cannot alter a hard minimum distance or increase the minimum final width.
 */
export function solveHorizontalSpacingConstraints(
    basePositions: number[],
    constraints: HorizontalSpacingConstraint[],
    gapFlexibility: number[] = [],
): HorizontalSpacingConstraintResult {
    validatePositions(basePositions);
    for (const constraint of constraints) {
        validateConstraint(constraint, basePositions.length);
    }
    if (basePositions.length < 2) {
        return {
            addedGaps: [],
            positions: [...basePositions],
            resolvedConstraints: [],
        };
    }

    const edgesByDestination: HorizontalSpacingEdge[][] =
        Array.from({ length: basePositions.length }, (): HorizontalSpacingEdge[] => []);
    const edgesBySource: HorizontalSpacingEdge[][] =
        Array.from({ length: basePositions.length }, (): HorizontalSpacingEdge[] => []);
    for (let index: number = 1; index < basePositions.length; index++) {
        addEdge(
            edgesByDestination,
            edgesBySource,
            index - 1,
            index,
            basePositions[index] - basePositions[index - 1],
        );
    }
    for (const constraint of constraints) {
        addEdge(
            edgesByDestination,
            edgesBySource,
            constraint.fromColumn,
            constraint.toColumn,
            constraint.minimumDistance,
        );
    }

    const minimumPositions: number[] = Array(basePositions.length);
    minimumPositions[0] = basePositions[0];
    for (let columnIndex: number = 1; columnIndex < basePositions.length; columnIndex++) {
        let minimumPosition: number = Number.NEGATIVE_INFINITY;
        for (const edge of edgesByDestination[columnIndex]) {
            minimumPosition = Math.max(
                minimumPosition,
                minimumPositions[edge.fromColumn] + edge.minimumDistance,
            );
        }
        minimumPositions[columnIndex] = minimumPosition;
    }

    const lastColumnIndex: number = basePositions.length - 1;
    const minimumEndPosition: number = minimumPositions[lastColumnIndex];
    const totalAddedWidth: number = Math.max(
        0,
        minimumEndPosition - basePositions[lastColumnIndex],
    );
    const weights: number[] = normalizedGapFlexibility(
        gapFlexibility,
        basePositions.length - 1,
    );
    const totalWeight: number = weights.reduce(
        (total: number, weight: number): number => total + weight,
        0,
    );
    const preferredPositions: number[] = [basePositions[0]];
    let accumulatedWeight: number = 0;
    for (let columnIndex: number = 1; columnIndex < basePositions.length; columnIndex++) {
        accumulatedWeight += weights[columnIndex - 1];
        preferredPositions.push(
            basePositions[columnIndex] + totalAddedWidth * accumulatedWeight / totalWeight,
        );
    }

    // The latest position for each column that still permits the minimum end
    // position. Since every edge points forwards, this is another linear DAG
    // pass and does not need an iterative constraint solver.
    const latestPositions: number[] = Array(basePositions.length);
    latestPositions[lastColumnIndex] = minimumEndPosition;
    for (let columnIndex: number = lastColumnIndex - 1; columnIndex >= 0; columnIndex--) {
        let latestPosition: number = Number.POSITIVE_INFINITY;
        for (const edge of edgesBySource[columnIndex]) {
            latestPosition = Math.min(
                latestPosition,
                latestPositions[edge.toColumn] - edge.minimumDistance,
            );
        }
        latestPositions[columnIndex] = latestPosition;
    }

    const positions: number[] = Array(basePositions.length);
    positions[0] = basePositions[0];
    for (let columnIndex: number = 1; columnIndex < lastColumnIndex; columnIndex++) {
        let minimumPosition: number = Number.NEGATIVE_INFINITY;
        for (const edge of edgesByDestination[columnIndex]) {
            minimumPosition = Math.max(
                minimumPosition,
                positions[edge.fromColumn] + edge.minimumDistance,
            );
        }
        positions[columnIndex] = Math.min(
            latestPositions[columnIndex],
            Math.max(preferredPositions[columnIndex], minimumPosition),
        );
    }
    positions[lastColumnIndex] = minimumEndPosition;

    const initialAddedGaps: number[] = positions
        .slice(1)
        .map((position: number, gapIndex: number): number =>
            Math.max(
                0,
                position - positions[gapIndex] -
                (basePositions[gapIndex + 1] - basePositions[gapIndex]),
            ),
        );
    const addedGaps: number[] = rhythmicallyBalanceAddedGaps(
        initialAddedGaps,
        basePositions,
        constraints,
        weights,
    );
    positions[0] = basePositions[0];
    for (let columnIndex: number = 1; columnIndex < basePositions.length; columnIndex++) {
        positions[columnIndex] =
            positions[columnIndex - 1] +
            basePositions[columnIndex] - basePositions[columnIndex - 1] +
            addedGaps[columnIndex - 1];
    }
    const resolvedConstraints: ResolvedHorizontalSpacingConstraint[] = constraints.map(
        (constraint: HorizontalSpacingConstraint): ResolvedHorizontalSpacingConstraint => {
            const baseDistance: number =
                basePositions[constraint.toColumn] - basePositions[constraint.fromColumn];
            const finalDistance: number =
                positions[constraint.toColumn] - positions[constraint.fromColumn];
            return {
                ...constraint,
                addedDistance: Math.max(0, finalDistance - baseDistance),
                finalDistance,
            };
        },
    );

    return {
        addedGaps,
        positions,
        resolvedConstraints,
    };
}

interface HorizontalSpacingEdge {
    fromColumn: number;
    minimumDistance: number;
    toColumn: number;
}

function addEdge(
    edgesByDestination: HorizontalSpacingEdge[][],
    edgesBySource: HorizontalSpacingEdge[][],
    fromColumn: number,
    toColumn: number,
    minimumDistance: number,
): void {
    const edge: HorizontalSpacingEdge = {
        fromColumn,
        minimumDistance,
        toColumn,
    };
    edgesByDestination[toColumn].push(edge);
    edgesBySource[fromColumn].push(edge);
}

function normalizedGapFlexibility(gapFlexibility: number[], gapCount: number): number[] {
    if (gapCount <= 0) {
        return [];
    }
    const weights: number[] = Array.from(
        { length: gapCount },
        (_unused: undefined, index: number): number => {
            const weight: number = gapFlexibility[index];
            return Number.isFinite(weight) && weight > 0 ? weight : 0;
        },
    );
    const maximumWeight: number = weights.reduce(
        (maximum: number, weight: number): number => Math.max(maximum, weight),
        0,
    );
    if (maximumWeight > 0) {
        return weights.map((weight: number): number => weight / maximumWeight);
    }
    return Array(gapCount).fill(1);
}

interface AddedGapInterval {
    fromGap: number;
    requiredAddedWidth: number;
    toGap: number;
}

/**
 * Minimise uneven layout-only padding without changing the minimum total
 * width found by the DAG passes.
 *
 * A transfer between two gaps keeps the total width fixed. It is permitted
 * only while every hard interval that contains the donor but not the receiver
 * retains its required added width. Repeatedly equalising `addition / weight`
 * therefore converges on the rhythmically balanced point inside the existing
 * minimum-width feasible region.
 */
function rhythmicallyBalanceAddedGaps(
    initialAddedGaps: number[],
    basePositions: number[],
    constraints: HorizontalSpacingConstraint[],
    weights: number[],
): number[] {
    const addedGaps: number[] = [...initialAddedGaps];
    const intervals: AddedGapInterval[] = constraints
        .map((constraint: HorizontalSpacingConstraint): AddedGapInterval => ({
            fromGap: constraint.fromColumn,
            requiredAddedWidth: Math.max(
                0,
                constraint.minimumDistance -
                (basePositions[constraint.toColumn] - basePositions[constraint.fromColumn]),
            ),
            toGap: constraint.toColumn,
        }))
        .filter((interval: AddedGapInterval): boolean => interval.requiredAddedWidth > 0);
    const intervalsByGap: AddedGapInterval[][] = Array.from(
        { length: addedGaps.length },
        (): AddedGapInterval[] => [],
    );
    for (const interval of intervals) {
        for (let gapIndex: number = interval.fromGap; gapIndex < interval.toGap; gapIndex++) {
            intervalsByGap[gapIndex].push(interval);
        }
    }
    // A feasible minimum-width solution exists before this optional balancing
    // pass, and every transfer preserves that feasibility. Keep the aesthetic
    // refinement strictly bounded for large scores and repeated line-break
    // candidate evaluation.
    const maxIterations: number = Math.min(
        64,
        Math.max(1, addedGaps.length * addedGaps.length * 2),
    );

    for (let iteration: number = 0; iteration < maxIterations; iteration++) {
        const addedWidthPrefixSums: number[] = [0];
        for (const width of addedGaps) {
            addedWidthPrefixSums.push(
                addedWidthPrefixSums[addedWidthPrefixSums.length - 1] + width,
            );
        }
        let bestDonor: number = -1;
        let bestReceiver: number = -1;
        let bestLevelDifference: number = 0.000001;
        let bestMaximumTransfer: number = 0;

        for (let donor: number = 0; donor < addedGaps.length; donor++) {
            if (addedGaps[donor] <= 0.000001) {
                continue;
            }
            const donorGapWeight: number = weights[donor];
            const donorLevel: number =
                donorGapWeight > 0
                    ? addedGaps[donor] / donorGapWeight
                    : Number.POSITIVE_INFINITY;
            for (let receiver: number = 0; receiver < addedGaps.length; receiver++) {
                const receiverGapWeight: number = weights[receiver];
                if (receiver === donor || receiverGapWeight <= 0) {
                    continue;
                }
                const receiverLevel: number = addedGaps[receiver] / receiverGapWeight;
                const levelDifference: number = donorLevel - receiverLevel;
                if (levelDifference <= bestLevelDifference) {
                    continue;
                }
                const maximumTransfer: number = maximumFeasibleGapTransfer(
                    addedGaps,
                    addedWidthPrefixSums,
                    intervalsByGap[donor],
                    donor,
                    receiver,
                );
                if (maximumTransfer <= 0.000001) {
                    continue;
                }
                bestDonor = donor;
                bestReceiver = receiver;
                bestLevelDifference = levelDifference;
                bestMaximumTransfer = maximumTransfer;
            }
        }

        if (bestDonor < 0 || bestReceiver < 0) {
            break;
        }
        const donorWeight: number = weights[bestDonor];
        const receiverWeight: number = weights[bestReceiver];
        const idealTransfer: number =
            donorWeight > 0
                ? bestLevelDifference / (1 / donorWeight + 1 / receiverWeight)
                : addedGaps[bestDonor];
        const transfer: number = Math.min(bestMaximumTransfer, idealTransfer);
        addedGaps[bestDonor] -= transfer;
        addedGaps[bestReceiver] += transfer;
    }
    return addedGaps;
}

function maximumFeasibleGapTransfer(
    addedGaps: number[],
    addedWidthPrefixSums: number[],
    donorIntervals: AddedGapInterval[],
    donor: number,
    receiver: number,
): number {
    let maximumTransfer: number = addedGaps[donor];
    for (const interval of donorIntervals) {
        const containsReceiver: boolean =
            receiver >= interval.fromGap && receiver < interval.toGap;
        if (containsReceiver) {
            continue;
        }
        const currentAddedWidth: number =
            addedWidthPrefixSums[interval.toGap] -
            addedWidthPrefixSums[interval.fromGap];
        maximumTransfer = Math.min(
            maximumTransfer,
            Math.max(0, currentAddedWidth - interval.requiredAddedWidth),
        );
    }
    return maximumTransfer;
}

function validatePositions(basePositions: number[]): void {
    for (let index: number = 0; index < basePositions.length; index++) {
        const position: number = basePositions[index];
        if (!Number.isFinite(position)) {
            throw new Error("Horizontal spacing positions must be finite.");
        }
        if (index > 0 && position < basePositions[index - 1]) {
            throw new Error("Horizontal spacing positions must be monotonic.");
        }
    }
}

function validateConstraint(constraint: HorizontalSpacingConstraint, columnCount: number): void {
    if (!Number.isInteger(constraint.fromColumn) ||
        !Number.isInteger(constraint.toColumn) ||
        constraint.fromColumn < 0 ||
        constraint.toColumn >= columnCount ||
        constraint.toColumn <= constraint.fromColumn) {
        throw new Error("Horizontal spacing constraints must reference a forward column interval.");
    }
    if (!Number.isFinite(constraint.minimumDistance) || constraint.minimumDistance < 0) {
        throw new Error("Horizontal spacing constraints require a finite non-negative distance.");
    }
}
