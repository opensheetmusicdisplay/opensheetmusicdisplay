/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

(globalThis as any).__DEBUG__ = true;

function renderToSVG(scorePath: string): Promise<SVGElement> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1200px";
    container.style.height = "1600px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const scoreDoc: Document = TestUtils.getScore(scorePath);
    return osmd.load(scoreDoc).then(() => {
        osmd.render();
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) { throw new Error("No SVG element after render"); }
        return svg;
    });
}

describe("John Field cross-stave alignment", () => {
    describe("stave line alignment", () => {
        let svg: SVGElement;

        beforeAll(function (): Promise<void> {
            return renderToSVG(".john-field-piano-concerto-7_m533-537.musicxml").then(
                (s: SVGElement) => { svg = s; }
            );
        });

        it("should dump debug info", () => {
            // Just triggers rendering with __DEBUG__ logging
            expect(svg).to.exist;
        });
    });
});
