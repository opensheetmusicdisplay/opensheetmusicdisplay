import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlowTabMeasure", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1440px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    it("keeps the notes of the other staves inside a 4/4 measure where the top TAB staff only has a rest", async () => {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false});
        await osmd.load(TestUtils.getScore("test_tab_dont_switch_to_classical_from_clefinstruction.musicxml").cloneNode(true) as Document);
        osmd.render();

        let staffEntries: number = 0;
        for (const verticalMeasure of osmd.GraphicSheet.MeasureList) {
            for (const measure of verticalMeasure) {
                for (const staffEntry of measure.staffEntries) {
                    staffEntries++;
                    const x: number = staffEntry.PositionAndShape.RelativePosition.x;
                    expect(x, `x of a staff entry in measure ${measure.MeasureNumber}`).to.be.within(0, measure.PositionAndShape.Size.width);
                }
            }
        }
        expect(staffEntries).to.be.greaterThan(4);
    });
});
