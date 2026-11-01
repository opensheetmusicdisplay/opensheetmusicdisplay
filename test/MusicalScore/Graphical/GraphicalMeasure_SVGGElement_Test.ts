import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../Util/TestUtils";

/**
 * GraphicalMeasure.getSVGGElement() gets the SVG group a measure was drawn into. Each group has an id of its own,
 * "osmd-m" + the measure's index + "-" + its staff's index (until 2.3: the measure number, the same in every staff).
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

    /**
     * A flute and a piano, three staves, in six measures: a key change at a system break before measure 3, so the first system
     * ends with the courtesy key signature in an extra instruction measure, rests in measures 4 and 5, which become a multiple
     * rest measure, and a page break before measure 6.
     */
    const breaksScore: string = ((): string => {
        const whole: (step: string, octave: number, staff?: number) => string = (step: string, octave: number, staff?: number): string =>
            `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration><type>whole</type>` +
            `${staff ? `<staff>${staff}</staff>` : ""}</note>`;
        const rest: (staff?: number) => string = (staff?: number): string =>
            `<note><rest measure="yes"/><duration>4</duration>${staff ? `<staff>${staff}</staff>` : ""}</note>`;
        const backup: string = "<backup><duration>4</duration></backup>";
        const flute: string[] = [whole("C", 5), whole("D", 5), whole("E", 5), rest(), rest(), whole("F", 5)];
        const piano: string[] = flute.map((content: string, index: number): string =>
            index === 3 || index === 4 ? rest(1) + backup + rest(2) : whole("C", 4, 1) + backup + whole("C", 3, 2));
        const time: string = "<divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>";
        /** The part's measures, the attributes in the first one. */
        const measures: (contents: string[], attributes: string) => string = (contents: string[], attributes: string): string =>
            contents.map((content: string, index: number): string => `<measure number="${index + 1}">` +
                (index === 0 ? `<attributes>${time}${attributes}</attributes>` : "") +
                (index === 2 ? "<print new-system=\"yes\"/><attributes><key><fifths>2</fifths></key></attributes>" : "") +
                (index === 5 ? "<print new-page=\"yes\"/>" : "") + `${content}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Flute</part-name></score-part><score-part id=\"P2\"><part-name>Piano</part-name></score-part>" +
            `</part-list><part id="P1">${measures(flute, "<clef><sign>G</sign><line>2</line></clef>")}</part>` +
            `<part id="P2">${measures(piano, "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
                "<clef number=\"2\"><sign>F</sign><line>4</line></clef>")}</part></score-partwise>`;
    })();

    /** Renders the score with the given backend and returns its measures, all staves. */
    async function renderMeasures(backend: string): Promise<GraphicalMeasure[]> {
        div = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: backend });
        await osmd.load(score);
        osmd.render();
        return osmd.GraphicSheet.MeasureList.flat();
    }

    it("gets the group each staff's measure is drawn into, each with an id of its own", async (): Promise<void> => {
        const measures: GraphicalMeasure[] = await renderMeasures("svg");
        expect(measures.length, "measures").to.equal(4);
        const groups: SVGGElement[] = measures.map((measure: GraphicalMeasure): SVGGElement => measure.getSVGGElement());
        expect(groups.every((group: SVGGElement): boolean => group?.matches(".vf-measure") && div.contains(group)),
               "each a drawn g.vf-measure").to.equal(true);
        expect(new Set(groups).size, "different groups").to.equal(div.querySelectorAll(".vf-measure").length);
        expect(groups.map((group: SVGGElement): string => group.id), "ids").to.deep.equal(["osmd-m0-0", "osmd-m0-1", "osmd-m1-0", "osmd-m1-1"]);
        for (const measure of measures) {
            const note: VexFlowGraphicalNote = measure.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            const group: SVGGElement = measure.getSVGGElement();
            expect(group.contains(note.getSVGGElement()) && group.querySelector(":scope > .vf-stave") !== null,
                   `measure ${measure.MeasureNumber}, staff ${measure.ParentStaff.Id}: its notes and staff lines`).to.equal(true);
        }
    });

    it("gives the groups unique ids on all pages: osmd-m<measure index>-<staff index>, " +
        "osmd-x after the measure for a courtesy key", async (): Promise<void> => {
        div = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, pageFormat: "A4_P", newSystemFromXML: true, newPageFromXML: true });
        await osmd.load(breaksScore);
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages.length, "pages").to.equal(2);
        // in document order: each system's staves from the top, each staff's measures
        const ids: string[] = Array.from(div.querySelectorAll("g.vf-measure")).map((group: Element): string => group.id);
        expect(ids, "ids").to.deep.equal([
            "osmd-m0-0", "osmd-m1-0", "osmd-x1-0", "osmd-m0-1", "osmd-m1-1", "osmd-x1-1", "osmd-m0-2", "osmd-m1-2", "osmd-x1-2",
            "osmd-m2-0", "osmd-m3-0", "osmd-m2-1", "osmd-m3-1", "osmd-m2-2", "osmd-m3-2", // the multiple rest measure has measure 4's index
            "osmd-m5-0", "osmd-m5-1", "osmd-m5-2", // page 2
        ]);
        expect(new Set(ids).size, "different ids").to.equal(ids.length);
        // each the id of its measure: osmd-m<i>-<s> for MeasureList[i][s]
        osmd.GraphicSheet.MeasureList.forEach((measures: GraphicalMeasure[], measureIndex: number): void => {
            for (const measure of measures) {
                if (measure?.getSVGGElement()) { // not measure 5, which the multiple rest measure stands for
                    expect(measure.getSVGGElement().id, `measure ${measure.MeasureNumber}`)
                        .to.equal(`osmd-m${measureIndex}-${measure.ParentStaff.idInMusicSheet}`);
                }
            }
        });
    });

    it("is undefined with the canvas backend", async (): Promise<void> => {
        const measures: GraphicalMeasure[] = await renderMeasures("canvas");
        expect(measures.map((measure: GraphicalMeasure): SVGGElement => measure.getSVGGElement())).to.deep.equal(Array(4).fill(undefined));
    });
});
