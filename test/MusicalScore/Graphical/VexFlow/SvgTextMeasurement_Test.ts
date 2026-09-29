import {expect} from "chai";
import Vex from "vexflow";
import {TestUtils} from "../../../Util/TestUtils";

describe("SVG text measurement", (): void => {
    it("can measure text advances without changing the default bounding-box measurement", (): void => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        try {
            const renderer: Vex.Flow.Renderer = new Vex.Flow.Renderer(div, Vex.Flow.Renderer.Backends.SVG);
            const context: any = renderer.getContext();
            const text: string = "=";
            context.setFont("times", 14, "bold");
            context.fillText(text, 0, 0);
            const element: SVGTextElement = div.querySelector("svg").lastElementChild as SVGTextElement;
            expect(context.measureText(text).width, `default bounds for ${text}`).to.equal(element.getBBox().width);
            expect(context.measureText(text, true).width, `advance for ${text}`).to.equal(element.getComputedTextLength());
        } finally {
            div.remove();
        }
    });
});
