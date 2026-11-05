import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * With EngravingRules.NewPartAndSystemAfterFinalBarline, the measure numbers start again at 1 after a final barline, so a
 * measure number can repeat: the layout finds the measures by their index in SourceMeasures (SourceMeasure.measureListIndex),
 * which is their index in GraphicalMusicSheet.MeasureList. A rehearsal mark after the final barline was drawn in the measure of
 * the first part that has its number, and a time signature at the first measure of the second part was left out if the sheet
 * begins with a pickup measure: it was taken for the measure after the pickup.
 */
describe("Measures after the measure numbers start again", (): void => {
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

    /** A rehearsal mark direction. */
    function mark(label: string): string {
        return `<direction placement="above"><direction-type><rehearsal>${label}</rehearsal></direction-type></direction>`;
    }

    /** A note of the given duration and type (one division per quarter), with the given elements after its type. */
    function note(duration: number, type: string, extra: string = ""): string {
        return `<note><pitch><step>B</step><octave>4</octave></pitch><duration>${duration}</duration><type>${type}</type>${extra}</note>`;
    }

    const finalBarline: string = "<barline location=\"right\"><bar-style>light-heavy</bar-style></barline>";

    /** A one-part score of the given measures (contents), the first one with the clef, 4/4 and one division per quarter. */
    function score(measures: string[], firstImplicit: boolean): string {
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const content: string = measures.map((measure: string, index: number): string => {
            const number: number = firstImplicit ? index : index + 1;
            const implicit: string = firstImplicit && index === 0 ? " implicit=\"yes\"" : "";
            return `<measure number="${number}"${implicit}>${index === 0 ? attributes : ""}${measure}</measure>`;
        }).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name></part-name></score-part></part-list><part id="P1">${content}</part></score-partwise>`;
    }

    /** The SVG elements with the class in each measure of the first staff (MeasureList, i.e. SourceMeasures order). */
    function elementsPerMeasure(cls: string): Element[][] {
        return osmd.GraphicSheet.MeasureList.map((staves: GraphicalMeasure[]): Element[] =>
            Array.from(staves[0].getSVGGElement().querySelectorAll(`.${cls}`)));
    }

    /** The texts of the rehearsal marks drawn in each measure, e.g. [["A"], [], ["B"]]. */
    function marksPerMeasure(): string[][] {
        return elementsPerMeasure("vf-stavesection").map((sections: Element[]): string[] =>
            sections.map((section: Element): string => section.querySelector("text")?.textContent));
    }

    /**
     * A pickup with mark A, measure 1, measure 2 with mark B and a final barline, then a one-beat measure with mark C (not a
     * pickup for the reader, which reads only a first measure, or the rest of the measure before it, as one), a measure with
     * mark D and another one.
     */
    const marksScore: string = score([
        mark("A") + note(1, "quarter"),
        note(4, "whole"),
        mark("B") + note(4, "whole") + finalBarline,
        mark("C") + note(1, "quarter"),
        mark("D") + note(4, "whole"),
        note(4, "whole") + finalBarline,
    ], true);

    it("draws a rehearsal mark in its measure", async (): Promise<void> => {
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = true; // (read when loading)
        await osmd.load(marksScore);
        osmd.render();
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.MeasureNumber), "measure numbers").to.deep.equal([0, 1, 2, 1, 2, 3]);
        expect(marksPerMeasure(), "rehearsal marks per measure").to.deep.equal([["A"], [], ["B"], ["C"], ["D"], []]);
    });

    it("draws a rehearsal mark in its measure with consecutive measure numbers", async (): Promise<void> => {
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = false;
        await osmd.load(marksScore);
        osmd.render();
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.MeasureNumber), "measure numbers").to.deep.equal([0, 1, 2, 3, 4, 5]);
        expect(marksPerMeasure(), "rehearsal marks per measure").to.deep.equal([["A"], [], ["B"], ["C"], ["D"], []]);
    });

    it("draws the time signature at the first measure of the second part after a pickup measure", async (): Promise<void> => {
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = true; // (read when loading)
        // a pickup, measures 1 and 2 in 4/4 with a final barline, then measures 1 and 2 in 3/4
        await osmd.load(score([
            note(1, "quarter"),
            note(4, "whole"),
            note(4, "whole") + finalBarline,
            "<attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>" + note(3, "half", "<dot/>"),
            note(3, "half", "<dot/>") + finalBarline,
        ], true));
        osmd.render();
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.MeasureNumber), "measure numbers").to.deep.equal([0, 1, 2, 1, 2]);
        const timeSignatures: number[] = elementsPerMeasure("vf-timesignature").map((elements: Element[]): number => elements.length);
        expect(timeSignatures, "time signatures per measure: 4/4 at the pickup, 3/4 at the second part").to.deep.equal([1, 0, 0, 1, 0]);
    });
});
