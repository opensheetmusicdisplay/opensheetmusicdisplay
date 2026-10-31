import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../Util/TestUtils";

/**
 * GraphicalMeasure.getSVGGElement() gets the SVG group a measure was drawn into. The id of these groups is the measure
 * number, the same in every staff, so the id doesn't tell one staff's measure from another's.
 */
describe("GraphicalMeasure.getSVGGElement()", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    afterEach((): void => {
        osmd?.clear();
        div?.remove();
    });

    /** Two measures of a piano part: a C on each of its two staves. */
    const score: string = ((): string => {
        const notes: string =
            "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note>" +
            "<backup><duration>4</duration></backup>" +
            "<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>5</voice><type>whole</type><staff>2</staff></note>";
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef>" +
            `</attributes>${notes}</measure><measure number="2">${notes}</measure></part></score-partwise>`;
    })();

    /** Renders the score with the given backend and returns its measures, all staves. */
    async function renderMeasures(backend: string): Promise<GraphicalMeasure[]> {
        div = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: backend });
        await osmd.load(score);
        osmd.render();
        return osmd.GraphicSheet.MeasureList.flat();
    }

    it("gets the group each staff's measure is drawn into, though the groups' ids repeat in every staff", async (): Promise<void> => {
        const measures: GraphicalMeasure[] = await renderMeasures("svg");
        expect(measures.length, "measures").to.equal(4);
        const groups: SVGGElement[] = measures.map((measure: GraphicalMeasure): SVGGElement => measure.getSVGGElement());
        expect(groups.every((group: SVGGElement): boolean => group?.matches(".vf-measure") && div.contains(group)),
               "each a drawn g.vf-measure").to.equal(true);
        expect(new Set(groups).size, "different groups").to.equal(div.querySelectorAll(".vf-measure").length);
        expect(groups.map((group: SVGGElement): string => group.id), "ids").to.deep.equal(["1", "1", "2", "2"]);
        for (const measure of measures) {
            const note: VexFlowGraphicalNote = measure.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            const group: SVGGElement = measure.getSVGGElement();
            expect(group.contains(note.getSVGGElement()) && group.querySelector(":scope > .vf-stave") !== null,
                   `measure ${measure.MeasureNumber}, staff ${measure.ParentStaff.Id}: its notes and staff lines`).to.equal(true);
        }
    });

    it("is undefined with the canvas backend", async (): Promise<void> => {
        const measures: GraphicalMeasure[] = await renderMeasures("canvas");
        expect(measures.map((measure: GraphicalMeasure): SVGGElement => measure.getSVGGElement())).to.deep.equal(Array(4).fill(undefined));
    });
});
