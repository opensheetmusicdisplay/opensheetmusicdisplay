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

        expect(result.addedGaps).to.deep.equal([0, 0, 20]);
        expect(result.positions).to.deep.equal([0, 10, 20, 50]);
        expect(result.resolvedConstraints[0].finalDistance).to.equal(50);
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
