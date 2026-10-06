import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * test_repeat_da_capo_to_coda_german.musicxml writes its To Coda and D.C. in German words, which only their sound elements name:
 * « Zur Coda » at the end of measure 2, and « D.C. bis zur Coda » at the end of measure 3, which says more than the label "D.C.".
 */
describe("Repetition instructions drawn with the words of the score", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_repeat_da_capo_to_coda_german.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The text elements of the SVG that draw exactly the given text. */
    function drawnTexts(text: string): SVGTextElement[] {
        return Array.from(container.querySelectorAll("text")).filter(element => element.textContent === text);
    }

    it("draws the words instead of the labels of the To Coda and the D.C.", () => {
        expect(drawnTexts("Zur Coda").length, "the To Coda, which the D.C. takes").to.equal(1);
        expect(drawnTexts("D.C. bis zur Coda").length).to.equal(1);
        expect(drawnTexts("To").length, "the To Coda label").to.equal(0);
        expect(drawnTexts("D.C.").length, "the D.C. label").to.equal(0);
    });

    it("draws the words of a D.C. where its label goes, at the end of its measure, not over the next measure", () => {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
        const measureStart: number = measure.PositionAndShape.AbsolutePosition.x;
        const measureEnd: number = measureStart + measure.PositionAndShape.Size.width;
        const box: DOMRect = drawnTexts("D.C. bis zur Coda")[0].getBBox();
        const wordsEnd: number = (box.x + box.width) / 10; // in units
        expect(wordsEnd, `the words end at ${wordsEnd.toFixed(1)}, measure 3 is ${measureStart.toFixed(1)} to ${measureEnd.toFixed(1)}`)
            .to.be.within(measureEnd - 5, measureEnd);
    });
});
