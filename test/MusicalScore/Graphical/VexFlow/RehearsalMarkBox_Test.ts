import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * The box of a rehearsal mark follows the font size, not the measured height of its text, which is the font's line height
 * and differs per platform: on macOS, the box's top line touched the capitals.
 */
describe("Rehearsal mark box", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });
    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /** Renders a rehearsal mark and returns the top and height of its box and the baseline of its text. */
    async function renderMark(): Promise<number[]> {
        await osmd.load(TestUtils.getScore("test_rehearsal_marks_simple_one_measure.musicxml"));
        osmd.render();
        const text: SVGTextElement = Array.from(div.querySelectorAll("text")).find(
            (element: SVGTextElement): boolean => element.textContent === "A");
        let sibling: Element = text; // the box is drawn before the text, followed by the (empty) path of its stroke
        do {
            sibling = sibling.previousElementSibling;
        } while (sibling.tagName !== "rect");
        const box: SVGRectElement = sibling as SVGRectElement;
        return [box.y.baseVal.value, box.height.baseVal.value, Number(text.getAttribute("y"))];
    }

    it("is the same whatever line height the platform measures for the font", async (): Promise<void> => {
        const measured: number[] = await renderMark();
        const getBBox: (options?: SVGBoundingBoxOptions) => DOMRect = SVGGraphicsElement.prototype.getBBox;
        // a line height 10 % smaller, as on macOS
        SVGGraphicsElement.prototype.getBBox = function (this: SVGGraphicsElement, options?: SVGBoundingBoxOptions): DOMRect {
            const bbox: DOMRect = getBBox.call(this, options);
            return this instanceof SVGTextElement ? new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height * 0.9) : bbox;
        };
        try {
            expect(await renderMark()).to.deep.equal(measured);
        } finally {
            SVGGraphicsElement.prototype.getBBox = getBBox;
        }
    });
});
