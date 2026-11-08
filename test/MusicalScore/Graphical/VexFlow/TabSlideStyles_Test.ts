import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB slide line types", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(systemBreak: boolean = false, dotted: boolean = false): Promise<void> {
        const name: string = systemBreak ? "test_tab_slide_line_types_system_break.musicxml" : "test_tab_slide_line_types.musicxml";
        const score: Document = TestUtils.getScore(name).cloneNode(true) as Document;
        if (dotted) {
            score.querySelector('slide[line-type="dashed"]').setAttribute("line-type", "dotted");
        }
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, newSystemFromXML: true});
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
        for (const path of paths) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
            if (getComputedStyle(path).strokeDasharray === "none") {
                expect(path.hasAttribute("stroke-dasharray")).to.equal(false);
            }
        }
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
    it("renders dotted lines", async () => {
        await render(false, true);
        const paths: Element[] = Array.from(div.querySelectorAll(".vf-glissando path"));
        expect(paths.filter(path => getComputedStyle(path).strokeDasharray === "1px, 2px")).to.have.length(1);
    });
    for (const dotted of [false, true]) {
        it(`uses custom ${dotted ? "dotted" : "dashed"} EngravingRules on both sides of a system break`, async () => {
            await render(true, dotted);
            if (dotted) {
                osmd.EngravingRules.TabSlideLineDashDotted = [2, 4];
            } else {
                osmd.EngravingRules.TabSlideLineDashDashed = [6, 2];
            }
            for (const width of [1000, 700]) {
                div.style.width = width + "px";
                osmd.render();
                const paths: Element[] = Array.from(div.querySelectorAll(".vf-glissando path"));
                expect(paths).to.have.length(4);
                expect(paths.filter(path => getComputedStyle(path).strokeDasharray ===
                    (dotted ? "2px, 4px" : "6px, 2px"))).to.have.length(2);
                const solid: Element[] = paths.filter(path => getComputedStyle(path).strokeDasharray === "none");
                expect(solid).to.have.length(2);
                expect(solid.every(path => !path.hasAttribute("stroke-dasharray"))).to.equal(true);
            }
        });
    }
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
