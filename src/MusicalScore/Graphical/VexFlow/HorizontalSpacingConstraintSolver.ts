export type HorizontalSpacingConstraintReason =
    "notation" |
    "lyric" |
    "hyphen" |
    "extender" |
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
 * additional forward edge. Because the graph is acyclic, its longest paths are
 * the unique pointwise-minimum positions satisfying every edge. In particular,
 * overlapping constraints cannot cause the same deficit to be allocated more
 * than once.
 *
 * `gapFlexibility` remains in the public signature for compatibility. It is an
 * elastic-justification concern and deliberately does not influence hard
 * minimum distances.
 */
export function solveHorizontalSpacingConstraints(
    basePositions: number[],
    constraints: HorizontalSpacingConstraint[],
    _gapFlexibility: number[] = [],
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

    const constraintsByDestination: HorizontalSpacingConstraint[][] =
        Array.from({ length: basePositions.length }, (): HorizontalSpacingConstraint[] => []);
    for (const constraint of constraints) {
        constraintsByDestination[constraint.toColumn].push(constraint);
    }

    const positions: number[] = Array(basePositions.length);
    positions[0] = basePositions[0];
    for (let columnIndex: number = 1; columnIndex < basePositions.length; columnIndex++) {
        const baseGap: number = basePositions[columnIndex] - basePositions[columnIndex - 1];
        let minimumPosition: number = positions[columnIndex - 1] + baseGap;
        for (const constraint of constraintsByDestination[columnIndex]) {
            minimumPosition = Math.max(
                minimumPosition,
                positions[constraint.fromColumn] + constraint.minimumDistance,
            );
        }
        positions[columnIndex] = minimumPosition;
    }

    const addedGaps: number[] = positions
        .slice(1)
        .map((position: number, gapIndex: number): number =>
            Math.max(
                0,
                position - positions[gapIndex] -
                (basePositions[gapIndex + 1] - basePositions[gapIndex]),
            ),
        );
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
