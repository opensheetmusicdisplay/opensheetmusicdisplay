import {expect} from "chai";
import Vex from "vexflow";
import {TestUtils} from "../../../Util/TestUtils";

describe("SVG text measurement", (): void => {
    it("can measure text advances without changing the default bounding-box measurement", (): void => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        try {
            const renderer: Vex.Flow.Renderer = new Vex.Flow.Renderer(div, Vex.Flow.Renderer.Backends.SVG);
            const context: any = renderer.getContext();
            for (const [text, size] of [["=", 14], ["3", 11], ["13:8", 11]] as [string, number][]) {
                context.setFont("times", size, "bold");
                context.fillText(text, 0, 0);
                const element: SVGTextElement = div.querySelector("svg").lastElementChild as SVGTextElement;
                expect(context.measureText(text).width, `default bounds for ${text}`).to.equal(element.getBBox().width);
                expect(context.measureText(text, true).width, `advance for ${text}`).to.equal(element.getComputedTextLength());
                element.remove();
            }
        } finally {
            div.remove();
        }
    });
});
