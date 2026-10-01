import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * An end instruction like "D.C." in the last measure of a staff line is shifted to the right by a percent of the measure's width
 * (EngravingRules.RepetitionEndInstructionXShiftAsPercentOfStaveWidth). In a wide measure, e.g. in a stretched system,
 * that shifted it past the end barline, up to off the page.
 * test_repeat_da_capo_with_fine.musicxml has its D.C. in the last of its four measures.
 */
describe("Repetition end instructions in the last measure of a staff line", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1440px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ stretchLastSystemLine: true }); // a wide last measure
        await osmd.load(TestUtils.getScore("test_repeat_da_capo_with_fine.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("ends the D.C. of a wide measure at its end barline, not further right, e.g. off the page", () => {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[3][0];
        const measureEnd: number = measure.PositionAndShape.AbsolutePosition.x + measure.PositionAndShape.Size.width;
        const label: SVGTextElement = Array.from(container.querySelectorAll("text")).find(text => text.textContent === "D.C.");
        const box: DOMRect = label.getBBox();
        const labelEnd: number = (box.x + box.width) / 10; // in units
        expect(labelEnd, `the D.C. ends at ${labelEnd.toFixed(1)}, the measure at ${measureEnd.toFixed(1)}`)
            .to.be.within(measureEnd - 1, measureEnd + 0.2);
    });
});
