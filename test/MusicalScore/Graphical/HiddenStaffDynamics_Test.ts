import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * With a staff of a two-staff instrument hidden (Staff.Visible = false, e.g. "right hand only" for a piano), the dynamics
 * that are centered between the two staves when both are shown (below the upper staff, above the lower staff) were drawn
 * on the top staff line of the remaining staff, over its notes: MusicSheetCalculator.
 * calculateGraphicalInstantaneousDynamicExpression() set no y position when the neighboring staff line doesn't exist.
 */
describe("Dynamics of a staff whose neighboring staff of the instrument is hidden", () => {
    /** Piano, 4 measures. Upper staff: p (m.1) and f (m.3) below, a crescendo wedge below (m.2).
     *  Lower staff: mf (m.1) and pp (m.3) above, a diminuendo wedge above (m.4). */
    const sampleFilename: string = "test_hidden_staff_dynamics.musicxml";

    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore(sampleFilename));
    });

    afterEach(() => {
        osmd.clear();
        div.remove();
    });

    /** The bounding boxes of the drawn dynamics (p, mf, ...) by their text. Their positions are relative to their staff line,
     *  whose top line is at y = 0 and whose bottom line is at y = EngravingRules.StaffHeight. */
    function dynamicBoxes(): Map<string, BoundingBox> {
        const boxes: Map<string, BoundingBox> = new Map<string, BoundingBox>();
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                        boxes.set(expression.Label.Label.text, expression.PositionAndShape);
                    }
                }
            }
        }
        return boxes;
    }

    it("draws the right hand's dynamics below the staff when the left hand is hidden", () => {
        osmd.Sheet.Instruments[0].Staves[1].Visible = false;
        osmd.render();
        const boxes: Map<string, BoundingBox> = dynamicBoxes();
        expect([...boxes.keys()], "the right hand's dynamics").to.deep.equal(["p", "f"]);
        for (const [text, box] of boxes) {
            expect(box.RelativePosition.y + box.BorderMarginTop, `top of the ${text}`).to.be.at.least(osmd.EngravingRules.StaffHeight);
        }
    });

    it("draws the left hand's dynamics above the staff when the right hand is hidden", () => {
        osmd.Sheet.Instruments[0].Staves[0].Visible = false;
        osmd.render();
        const boxes: Map<string, BoundingBox> = dynamicBoxes();
        expect([...boxes.keys()], "the left hand's dynamics").to.deep.equal(["mf", "pp"]);
        for (const [text, box] of boxes) {
            expect(box.RelativePosition.y + box.BorderMarginBottom, `bottom of the ${text}`).to.be.at.most(0);
        }
    });
});
