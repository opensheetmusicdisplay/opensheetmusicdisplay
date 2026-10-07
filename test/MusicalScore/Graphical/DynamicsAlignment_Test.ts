import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";

/**
 * Close dynamics of a staff line are aligned at one height, that of the one farthest from the staff
 * (AlignmentManager.alignDynamicExpressions()).
 */
describe("Dynamics alignment", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** The y positions of the drawn instantaneous dynamics (p, mf, ...) by their text. */
    function dynamicYs(osmd: OpenSheetMusicDisplay): Map<string, number> {
        const ys: Map<string, number> = new Map<string, number>();
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                        ys.set(expression.Label.Label.text, expression.PositionAndShape.AbsolutePosition.y);
                    }
                }
            }
        }
        return ys;
    }

    it("aligns close dynamics exactly, above and below the staff (they moved only 80 % of the way)", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_dynamics_alignment_placement_change.musicxml"));
        osmd.render();
        const ys: Map<string, number> = dynamicYs(osmd);
        // above the staff, the p moves up to the mf above a C6; below it, the ff moves down to the f
        expect(ys.get("p"), "p at the height of the mf").to.be.closeTo(ys.get("mf"), 1e-6);
        expect(ys.get("ff"), "ff at the height of the f").to.be.closeTo(ys.get("f"), 1e-6);
    });

    it("points a wedge at the middle of the letters of a dynamic next to it, whichever of the two moved", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("OSMD_function_test_expressions_overlap.musicxml"));
        osmd.render();
        const dynamics: GraphicalInstantaneousDynamicExpression[] = [];
        const wedges: GraphicalContinuousDynamicExpression[] = [];
        for (const expression of osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions) {
            if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                dynamics.push(expression);
            } else if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal) {
                wedges.push(expression);
            }
        }
        /** How far the center of the wedge right after the dynamic is below the dynamic's center. */
        function wedgeBelowDynamic(dynamic: GraphicalInstantaneousDynamicExpression): number {
            const x: number = dynamic.PositionAndShape.AbsolutePosition.x;
            const wedge: GraphicalContinuousDynamicExpression = wedges.filter(w => w.PositionAndShape.AbsolutePosition.x > x)
                .sort((a, b) => a.PositionAndShape.AbsolutePosition.x - b.PositionAndShape.AbsolutePosition.x)[0];
            return wedge.PositionAndShape.AbsolutePosition.y - dynamic.PositionAndShape.AbsolutePosition.y;
        }
        // measure 1: the ppp moves down to the crescendo after it; measure 2: the crescendo moves down to the pp and sff around it
        const ppp: GraphicalInstantaneousDynamicExpression = dynamics.find(d => d.Label.Label.text === "ppp");
        const pp: GraphicalInstantaneousDynamicExpression = dynamics.find(d => d.Label.Label.text === "pp");
        const offset: number = wedgeBelowDynamic(ppp);
        expect(wedgeBelowDynamic(pp), "wedge at the same place next to the pp as next to the ppp").to.be.closeTo(offset, 1e-6);
        // the center of a text's box is at the top of its lowercase letters, its baseline 0.8 half heights below the center
        const halfHeight: number = ppp.PositionAndShape.BorderBottom;
        expect(offset, "wedge below the top of the ppp's letters").to.be.greaterThan(0.1 * halfHeight);
        expect(offset, "wedge above the ppp's baseline").to.be.lessThan(0.8 * halfHeight);
    });
});
