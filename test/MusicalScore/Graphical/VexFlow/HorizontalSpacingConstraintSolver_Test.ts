import { expect } from "chai";
import {
    HorizontalSpacingConstraint,
    HorizontalSpacingConstraintResult,
    solveHorizontalSpacingConstraints,
} from "../../../../src/MusicalScore/Graphical/VexFlow/HorizontalSpacingConstraintSolver";

describe("HorizontalSpacingConstraintSolver", (): void => {
    it("adds exactly the hard deficit without treating flexibility as hard space", (): void => {
        const constraints: HorizontalSpacingConstraint[] = [{
            fromColumn: 0,
            minimumDistance: 50,
            reason: "lyric",
            toColumn: 3,
        }];

        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            constraints,
            [1, 2, 1],
        );

        expect(result.addedGaps).to.deep.equal([5, 10, 5]);
        expect(result.positions).to.deep.equal([0, 15, 35, 50]);
        expect(result.resolvedConstraints[0].finalDistance).to.equal(50);
        expect(result.addedGaps.reduce((total, gap): number => total + gap, 0)).to.equal(20);
    });

    it("finds the minimum total addition for overlapping constraints", (): void => {
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            [
                {
                    fromColumn: 0,
                    minimumDistance: 30,
                    reason: "hyphen",
                    toColumn: 2,
                },
                {
                    fromColumn: 1,
                    minimumDistance: 35,
                    reason: "lyric",
                    toColumn: 3,
                },
            ],
        );

        expect(result.positions[2] - result.positions[0]).to.be.at.least(30);
        expect(result.positions[3] - result.positions[1]).to.be.at.least(35);
        expect(result.addedGaps).to.deep.equal([0, 10, 5]);
        expect(result.positions[3] - 30).to.equal(15);
    });

    it("is independent of constraint input order", (): void => {
        const constraints: HorizontalSpacingConstraint[] = [
            {
                fromColumn: 0,
                minimumDistance: 30,
                reason: "hyphen",
                toColumn: 2,
            },
            {
                fromColumn: 1,
                minimumDistance: 35,
                reason: "lyric",
                toColumn: 3,
            },
            {
                fromColumn: 0,
                minimumDistance: 42,
                reason: "extender",
                toColumn: 3,
            },
        ];
        const forward: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            constraints,
        );
        const reverse: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            [...constraints].reverse(),
        );

        expect(reverse.positions).to.deep.equal(forward.positions);
        expect(reverse.addedGaps).to.deep.equal(forward.addedGaps);
    });

    it("does not alter rhythmic positions when every hard constraint already fits", (): void => {
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 20, 50],
            [{
                fromColumn: 0,
                minimumDistance: 45,
                reason: "lyric",
                toColumn: 2,
            }],
        );

        expect(result.addedGaps).to.deep.equal([0, 0]);
        expect(result.positions).to.deep.equal([0, 20, 50]);
    });

    it("spreads terminal clearance across rhythmic columns without increasing width", (): void => {
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            [{
                fromColumn: 0,
                minimumDistance: 60,
                reason: "system-edge",
                toColumn: 3,
            }],
            [1, 2, 1],
        );

        expect(result.addedGaps).to.deep.equal([7.5, 15, 7.5]);
        expect(result.positions).to.deep.equal([0, 17.5, 42.5, 60]);
        expect(result.addedGaps.reduce((total, gap): number => total + gap, 0)).to.equal(30);
    });

    it("balances successive hard intervals when a global target alone would concentrate one", (): void => {
        const constraints: HorizontalSpacingConstraint[] = [
            {
                fromColumn: 0,
                minimumDistance: 30,
                reason: "lyric",
                toColumn: 2,
            },
            {
                fromColumn: 2,
                minimumDistance: 50,
                reason: "lyric",
                toColumn: 4,
            },
        ];
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30, 40],
            constraints,
            [1, 1, 1, 1],
        );

        expect(result.addedGaps).to.deep.equal([5, 5, 15, 15]);
        expect(result.addedGaps.reduce((total, gap): number => total + gap, 0)).to.equal(40);
        for (const constraint of constraints) {
            expect(
                result.positions[constraint.toColumn] -
                result.positions[constraint.fromColumn],
            ).to.be.at.least(constraint.minimumDistance);
        }
    });

    it("preserves sub-micro-pixel hard deficits during balancing", (): void => {
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 18, 28],
            [
                {
                    fromColumn: 1,
                    minimumDistance: 8.0000004,
                    reason: "notation",
                    toColumn: 2,
                },
                {
                    fromColumn: 1,
                    minimumDistance: 37,
                    reason: "lyric",
                    toColumn: 3,
                },
            ],
            [100, 0, 0.001],
        );

        expect(result.positions[2] - result.positions[1]).to.be.closeTo(
            8.0000004,
            0.000000000001,
        );
    });

    it("normalizes extreme finite rhythmic weights", (): void => {
        const result: HorizontalSpacingConstraintResult = solveHorizontalSpacingConstraints(
            [0, 10, 20, 30],
            [{
                fromColumn: 0,
                minimumDistance: 60,
                reason: "lyric",
                toColumn: 3,
            }],
            [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
        );

        expect(result.positions.every(Number.isFinite)).to.equal(true);
        expect(result.addedGaps).to.deep.equal([10, 10, 10]);
    });

    it("rejects backward or out-of-range constraints", (): void => {
        expect(() => solveHorizontalSpacingConstraints(
            [0, 10],
            [{
                fromColumn: 1,
                minimumDistance: 1,
                reason: "lyric",
                toColumn: 0,
            }],
        )).to.throw("forward column interval");
    });
});
