import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB slide line types", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(systemBreak: boolean = false, backend: "svg" | "canvas" = "svg", dotted: boolean = false): Promise<void> {
        const name: string = systemBreak ? "test_tab_slide_line_types_system_break.musicxml" : "test_tab_slide_line_types.musicxml";
        const score: Document = TestUtils.getScore(name).cloneNode(true) as Document;
        if (dotted) {
            score.querySelector('slide[line-type="dashed"]').setAttribute("line-type", "dotted");
        }
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend, newSystemFromXML: true});
        await osmd.load(score);
        osmd.render();
    }
    function check(parts: number = 1): void {
        const paths: Element[] = Array.from(div.querySelectorAll(".vf-glissando path"));
        expect(paths).to.have.length(2 * parts);
        const dashed: Element[] = paths.filter(path => getComputedStyle(path).strokeDasharray !== "none");
        expect(dashed).to.have.length(parts);
        expect(dashed.every(path => getComputedStyle(path).strokeDasharray === "4px, 3px")).to.equal(true);
        for (const path of dashed as SVGPathElement[]) {
            const box: DOMRect = path.getBBox();
            expect(path.getTotalLength()).to.be.closeTo(Math.hypot(box.width, box.height), 0.02);
        }
        for (const path of paths) { expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/); }
    }
    it("retains the start's dashed style when the stop omits it, without affecting the next solid slide", async () => {
        await render();
        check();
        osmd.render();
        check();
        div.style.width = "700px";
        osmd.render();
        check();
    });
    it("keeps the style on both sides of a system break", async () => {
        await render(true);
        check(2);
        expect(div.querySelectorAll(".vf-glissando text")).to.have.length(2);
    });
    it("renders dotted lines and supports canvas", async () => {
        await render(false, "svg", true);
        const paths: Element[] = Array.from(div.querySelectorAll(".vf-glissando path"));
        expect(paths.filter(path => getComputedStyle(path).strokeDasharray === "1px, 2px")).to.have.length(1);
        osmd.clear();
        await render(false, "canvas");
        expect(div.querySelector("canvas")).not.to.equal(null);
    });
    it("uses stop-only styles as a fallback and lets explicit start styles win", async () => {
        const score: Document = TestUtils.getScore("test_tab_slide_line_types.musicxml").cloneNode(true) as Document;
        const start: Element = score.querySelector('slide[type="start"][line-type="dashed"]');
        const number: string = start.getAttribute("number");
        const stop: Element = score.querySelector('slide[type="stop"][number="' + number + '"]');
        start.removeAttribute("line-type");
        stop.setAttribute("line-type", "dotted");
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false});
        await osmd.load(score);
        osmd.render();
        expect(Array.from(div.querySelectorAll(".vf-glissando path")).filter(path =>
            getComputedStyle(path).strokeDasharray === "1px, 2px")).to.have.length(1);
        start.setAttribute("line-type", "dashed");
        await osmd.load(score);
        osmd.render();
        check();
    });
});
