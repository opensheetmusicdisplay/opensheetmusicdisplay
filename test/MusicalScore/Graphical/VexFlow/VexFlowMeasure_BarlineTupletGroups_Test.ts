import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * A measure's barlines are drawn in groups g.vf-stavebarline and its tuplets (bracket and number) in groups g.vf-tuplet, as
 * VexFlow 4 and 5 draw them (see the VexFlowPatch's Barline.draw() and Tuplet.draw()). A barline or tuplet of one shape, e.g.
 * a single barline's rect or a beamed triplet's number, gets the class instead (EngravingRules.SVGMergeSingleChildGroups),
 * and one without shapes, e.g. the begin barline of most measures, gets no group.
 */
describe("Barline and tuplet SVG groups", (): void => {
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

    /** A one-staff score in 4/4 with the given measures (6 divisions per quarter). */
    function score(measures: string[]): string {
        const attributes: string = "<attributes><divisions>6</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const content: string = measures.map((measure: string, index: number): string =>
            `<measure number="${index + 1}">${index === 0 ? attributes : ""}${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name></part-name></score-part></part-list><part id="P1">${content}</part></score-partwise>`;
    }

    /** A B4 note of the given duration and type, with the given elements after its type, e.g. a beam. */
    function note(duration: number, type: string, extra: string = ""): string {
        return `<note><pitch><step>B</step><octave>4</octave></pitch><duration>${duration}</duration><type>${type}</type>${extra}</note>`;
    }

    /** A triplet of three notes of the given duration and type, beamed for eighths, with the given tuplet attributes. */
    function triplet(duration: number, type: string, tupletAttributes: string): string {
        const beamed: boolean = type === "eighth";
        return [0, 1, 2].map((index: number): string => note(duration, type,
            "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>" +
            (beamed ? `<beam number="1">${["begin", "continue", "end"][index]}</beam>` : "") +
            (index === 0 ? `<notations><tuplet type="start" ${tupletAttributes}/></notations>` :
                index === 2 ? "<notations><tuplet type=\"stop\"/></notations>" : ""))).join("");
    }

    /** The elements with the class in each measure as tags, a group with its elements' tags, e.g. ["g: rect rect", "rect"]. */
    function shapesPerMeasure(cls: string): string[][] {
        return osmd.GraphicSheet.MeasureList.map((staves: GraphicalMeasure[]): string[] =>
            Array.from(staves[0].getSVGGElement().querySelectorAll(`.${cls}`)).map((element: Element): string => element.tagName === "g" ?
                `g: ${Array.from(element.children).map((child: Element): string => child.tagName).join(" ")}` : element.tagName));
    }

    /** The number of groups with the class that have no elements. */
    function emptyGroups(cls: string): number {
        return Array.from(div.querySelectorAll(`g.${cls}`)).filter((group: Element): boolean => group.childElementCount === 0).length;
    }

    it("draws each barline in a g.vf-stavebarline, a single barline as rect.vf-stavebarline, no group for a barline without shapes", async (): Promise<void> => {
        const forwardRepeat: string = "<barline location=\"left\"><bar-style>heavy-light</bar-style><repeat direction=\"forward\"/></barline>";
        const backwardRepeat: string = "<barline location=\"right\"><bar-style>light-heavy</bar-style><repeat direction=\"backward\"/></barline>";
        const finalBarline: string = "<barline location=\"right\"><bar-style>light-heavy</bar-style></barline>";
        await osmd.load(score([forwardRepeat + note(24, "whole"), note(24, "whole") + backwardRepeat, note(24, "whole") + finalBarline]));
        osmd.render();
        // measure 1: the forward repeat's bars and dots (after the clef at the start of a one-staff system: without a line at
        //   the staff's start, VexFlowMeasure.addMeasureLine() with renderInitialLine false) and a single barline;
        //   measure 2: the backward repeat; measure 3: the final barline
        expect(shapesPerMeasure("vf-stavebarline"), "barlines per measure")
            .to.deep.equal([["g: rect rect path path", "rect"], ["g: rect rect path path"], ["g: rect rect"]]);
        expect(osmd.GraphicSheet.MeasureList.map((staves: GraphicalMeasure[]): number =>
            staves[0].getSVGGElement().querySelectorAll(":scope > rect:not(.vf-stavebarline)").length), "rects in the measures without a class")
            .to.deep.equal([0, 0, 0]);

        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.render();
        expect(shapesPerMeasure("vf-stavebarline"), "barlines per measure, SVGMergeSingleChildGroups false")
            .to.deep.equal([["g: rect rect path path", "g: rect"], ["g: rect rect path path"], ["g: rect rect"]]);
        expect(emptyGroups("vf-stavebarline"), "empty groups, e.g. of the measures' begin barlines").to.equal(0);
    });

    it("draws a tuplet's bracket and number in a g.vf-tuplet, a beamed triplet's number as path.vf-tuplet, no group for one without shapes", async (): Promise<void> => {
        await osmd.load(score([
            triplet(2, "eighth", "bracket=\"no\"") + triplet(4, "quarter", "bracket=\"yes\"") + note(6, "quarter"),
            triplet(2, "eighth", "bracket=\"no\" show-number=\"none\"") + note(12, "half") + note(6, "quarter"),
        ]));
        osmd.render();
        expect(shapesPerMeasure("vf-tuplet"), "tuplets per measure").to.deep.equal([["path", "g: rect rect rect rect path"], []]);

        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.render();
        expect(shapesPerMeasure("vf-tuplet"), "tuplets per measure, SVGMergeSingleChildGroups false")
            .to.deep.equal([["g: path", "g: rect rect rect rect path"], []]);
        expect(emptyGroups("vf-tuplet"), "empty groups, e.g. of the triplet without a number").to.equal(0);
    });
});
