import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";

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
});
