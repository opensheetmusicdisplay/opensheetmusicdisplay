import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The SVG groups of the stafflines, the strokes of tremolos between two notes and the buzz rolls have ids of their own, unique in
 * the sheet's drawing: osmd-staffline<system index>-<staff index>, osmd-trem<measure index>-<staff index>-<number in the measure>
 * and osmd-buzz<measure index>-<staff index>-<number in the measure>, all counted from 0 (the staff index is the one in
 * Sheet.Staves). Until 2.3 the staffline groups had "<instrument name><instrument id>-<staff number in the instrument>" in every
 * system, e.g. "Piano (right)0-1", the strokes vf-tremoloBetweenNotes-<measure number>-<staff number in the instrument>-<number> and
 * the buzz rolls vf-buzzRoll<number in the measure>.
 */
describe("SVG ids of stafflines, tremolo strokes and buzz rolls", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    afterEach((): void => {
        osmd?.clear();
        div?.remove();
    });

    /**
     * A flute and a piano, three staves, in three measures, a system each, the third on page 2: buzz rolls in measures 1 and 3 of
     * the flute (two in measure 3), and two-note tremolos with 3 strokes in measure 2 of the flute and of the piano's upper staff.
     * Until 2.3 the ids of both tremolos' strokes were vf-tremoloBetweenNotes-2-1-0 to -2 (both staves are the first of their
     * instrument), and the first buzz rolls of measures 1 and 3 were both vf-buzzRoll0.
     */
    const score: string = ((): string => {
        /** A note of the given pitch, duration (2 divisions per quarter) and type, with the given elements after its type. */
        const note: (step: string, octave: number, duration: number, type: string, extra?: string) => string =
            (step: string, octave: number, duration: number, type: string, extra: string = ""): string =>
                `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><type>${type}</type>${extra}</note>`;
        const staff: (number: number) => string = (number: number): string => `<staff>${number}</staff>`;
        const buzzRoll: string = "<notations><ornaments><tremolo type=\"unmeasured\">0</tremolo></ornaments></notations>";
        /** A note of a two-note tremolo with 3 strokes (start or stop): a half note in the time of a quarter. */
        const tremoloNote: (step: string, type: string, staffElement?: string) => string =
            (step: string, type: string, staffElement: string = ""): string =>
                note(step, 4, 2, "half", "<time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes></time-modification>" +
                    `${staffElement}<notations><ornaments><tremolo type="${type}">3</tremolo></ornaments></notations>`);
        const backup: string = "<backup><duration>8</duration></backup>";
        const lowerStaff: string = backup + note("C", 3, 8, "whole", staff(2));
        const flute: string[] = [
            note("C", 5, 4, "half", buzzRoll) + note("D", 5, 4, "half"),
            tremoloNote("G", "start") + tremoloNote("B", "stop") + note("D", 5, 4, "half"),
            note("E", 5, 4, "half", buzzRoll) + note("F", 5, 4, "half", buzzRoll),
        ];
        const piano: string[] = [
            note("C", 5, 8, "whole", staff(1)) + lowerStaff,
            tremoloNote("E", "start", staff(1)) + tremoloNote("G", "stop", staff(1)) + note("C", 5, 4, "half", staff(1)) + lowerStaff,
            note("C", 5, 8, "whole", staff(1)) + lowerStaff,
        ];
        const time: string = "<divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>";
        /** The part's measures, the attributes in the first one, a system break before measure 2 and a page break before measure 3. */
        const measures: (contents: string[], attributes: string) => string = (contents: string[], attributes: string): string =>
            contents.map((content: string, index: number): string => `<measure number="${index + 1}">` +
                [`<attributes>${time}${attributes}</attributes>`, "<print new-system=\"yes\"/>", "<print new-page=\"yes\"/>"][index] +
                `${content}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Flute</part-name></score-part><score-part id=\"P2\"><part-name>Piano</part-name></score-part>" +
            `</part-list><part id="P1">${measures(flute, "<clef><sign>G</sign><line>2</line></clef>")}</part>` +
            `<part id="P2">${measures(piano, "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
                "<clef number=\"2\"><sign>F</sign><line>4</line></clef>")}</part></score-partwise>`;
    })();

    /** The ids of the elements matching the selector, in document order. */
    function ids(selector: string): string[] {
        return Array.from(div.querySelectorAll(selector)).map((element: Element): string => element.id);
    }

    it("gives the staffline groups, tremolo strokes and buzz rolls unique ids on all pages: osmd-staffline<system>-<staff>, " +
        "osmd-trem and osmd-buzz<measure>-<staff>-<number in the measure>", async (): Promise<void> => {
        div = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, pageFormat: "A4_P", newSystemFromXML: true, newPageFromXML: true });
        await osmd.load(score);
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages.map((page: GraphicalMusicPage): number => page.MusicSystems.length), "systems per page")
            .to.deep.equal([2, 1]);
        expect(ids("g.osmd-staffline"), "staffline groups, each system's staves from the top").to.deep.equal([
            "osmd-staffline0-0", "osmd-staffline0-1", "osmd-staffline0-2", "osmd-staffline1-0", "osmd-staffline1-1", "osmd-staffline1-2",
            "osmd-staffline2-0", "osmd-staffline2-1", "osmd-staffline2-2", // page 2
        ]);
        expect(ids("g.osmd-tremolo"), "tremolo strokes and buzz rolls").to.deep.equal([
            "osmd-buzz0-0-0", // the flute's measure 1
            "osmd-trem1-0-0", "osmd-trem1-0-1", "osmd-trem1-0-2", "osmd-trem1-1-0", "osmd-trem1-1-1", "osmd-trem1-1-2", // measure 2
            "osmd-buzz2-0-0", "osmd-buzz2-0-1", // the flute's measure 3
        ]);
        expect(div.querySelectorAll("#osmd-staffline1-1 [id^='osmd-trem1-1-']").length, "the piano's strokes in its staffline's group")
            .to.equal(3);
    });
});
