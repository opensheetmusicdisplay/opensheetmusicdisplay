import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * A measure's staff lines are drawn in a group of their own, g.vf-stavelines, the first element of the measure's group.
 * The group has the lines' style, e.g. stroke="#000000", which the lines inherit (see the VexFlowPatch's Stave.draw() and
 * SVGContext.openGroup()), so that the group's stroke colors them, e.g. its stroke attribute or a CSS rule for its class.
 */
describe("Stave lines", (): void => {
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

    /** A score with one measure per part, each part one staff with the given number of lines (<staff-lines>). */
    function scoreWithStaffLines(lineCounts: number[]): string {
        const partList: string = lineCounts.map((_: number, index: number): string =>
            `<score-part id="P${index + 1}"><part-name></part-name></score-part>`).join("");
        const parts: string = lineCounts.map((lineCount: number, index: number): string =>
            `<part id="P${index + 1}"><measure number="1"><attributes><divisions>1</divisions>` +
            "<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>" +
            `<staff-details><staff-lines>${lineCount}</staff-lines></staff-details></attributes>` +
            "<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part>").join("");
        return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>${partList}</part-list>${parts}</score-partwise>`;
    }

    /** The computed fill and stroke of each element, e.g. ["none", "rgb(0, 0, 0)"]. */
    function fillAndStroke(elements: Element[]): string[][] {
        return elements.map((element: Element): string[] => [getComputedStyle(element).fill, getComputedStyle(element).stroke]);
    }

    it("draws a staff's lines in a group that has their style, so that its stroke colors them", async (): Promise<void> => {
        await osmd.load(scoreWithStaffLines([5]));
        osmd.render();
        const group: Element = div.querySelector(".vf-measure").firstElementChild;
        expect(group.getAttribute("class"), "the measure's first element").to.equal("vf-stavelines");
        const lines: Element[] = Array.from(group.children);
        expect(lines.map((line: Element): string => line.tagName), "the group's elements").to.deep.equal(Array(5).fill("path"));
        expect([group.getAttribute("fill"), group.getAttribute("stroke")], "the group's fill and stroke").to.deep.equal(["none", "#000000"]);
        expect(lines.filter((line: Element): boolean => line.hasAttribute("fill") || line.hasAttribute("stroke")).length,
               "lines with a fill or stroke of their own").to.equal(0);
        expect(fillAndStroke(lines), "the lines").to.deep.equal(Array(5).fill(["none", "rgb(0, 0, 0)"]));

        group.setAttribute("stroke", "#FF0000");
        expect(fillAndStroke(lines), "the lines after setting the group's stroke").to.deep.equal(Array(5).fill(["none", "rgb(255, 0, 0)"]));
    });

    it("draws the lines in the StaffLineColor, also a staff's only line, and draws no group for a staff without lines", async (): Promise<void> => {
        await osmd.load(scoreWithStaffLines([5, 1, 0]));
        osmd.EngravingRules.StaffLineColor = "#0000FF";
        osmd.render();
        const measures: Element[] = Array.from(div.querySelectorAll(".vf-measure"));
        expect(measures.map((measure: Element): number => measure.querySelectorAll(".vf-stavelines").length), "groups per staff")
            .to.deep.equal([1, 1, 0]);
        const groups: Element[] = measures.slice(0, 2).map((measure: Element): Element => measure.querySelector(".vf-stavelines"));
        expect(groups.map((group: Element): number => group.childElementCount), "lines per staff").to.deep.equal([5, 1]);
        expect(groups.map((group: Element): string => group.getAttribute("stroke")), "the groups' stroke").to.deep.equal(["#0000FF", "#0000FF"]);
        expect(fillAndStroke(groups.map((group: Element): Element => group.lastElementChild)), "a line of each staff")
            .to.deep.equal([["none", "rgb(0, 0, 255)"], ["none", "rgb(0, 0, 255)"]]);
    });
});
