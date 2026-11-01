import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The SVG groups of OSMD's labels, slurs, wedges, lyric extender lines and tremolo strokes get a class naming what they show,
 * next to the one naming their shape, e.g. g.vf-text.osmd-title or g.vf-curve.osmd-slur (GraphicalLabel.SVGClass,
 * MusicSheetDrawer.addSVGClass()). OSMD's own classes are prefixed osmd-, so that a page's classes (e.g. a heading's .title)
 * don't reach them: also the staff lines' groups (osmd-staffline) and multiple rest measures (osmd-multi).
 */
describe("SVG classes naming what labels and lines show", (): void => {
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

    /** A note of the given pitch, duration (2 divisions per quarter) and type, with the given elements after its type. */
    function note(step: string, octave: number, duration: number, type: string, extra: string = ""): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><type>${type}</type>${extra}</note>`;
    }

    /** A direction with the given direction type and placement, e.g. words. */
    function direction(directionType: string, placement: string, extra: string = ""): string {
        return `<direction placement="${placement}"><direction-type>${directionType}</direction-type>${extra}</direction>`;
    }

    /** A note of a two-note tremolo with 3 strokes (start or stop): a half note in the time of a quarter (time-modification 2:1). */
    function tremoloNote(step: string, type: string): string {
        return note(step, 4, 2, "half", "<time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes></time-modification>" +
            `<notations><ornaments><tremolo type="${type}">3</tremolo></ornaments></notations>`);
    }

    /**
     * A violin and a viola in a group, over two systems, with credits, a tempo, a dynamic, a chord symbol, a fingering, a slur, a
     * wedge, lyrics with a dash and an extender line, a verbal crescendo, words, a two-note tremolo and a buzz roll.
     */
    function score(): string {
        const credit: (type: string, text: string) => string = (type: string, text: string): string =>
            `<credit page="1">${type ? `<credit-type>${type}</credit-type>` : ""}<credit-words justify="center">${text}</credit-words></credit>`;
        const attributes: string = "<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const newSystem: string = "<print new-system=\"yes\"/>";
        const violin: string = `<measure number="1">${attributes}` +
            direction("<words>Allegro</words>", "above", "<sound tempo=\"120\"/>") +
            direction("<dynamics><f/></dynamics>", "below") +
            "<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>" +
            note("C", 5, 2, "quarter", "<notations><technical><fingering>1</fingering></technical><slur type=\"start\"/></notations>") +
            note("D", 5, 2, "quarter", "<notations><slur type=\"stop\"/></notations>") +
            direction("<wedge type=\"crescendo\"/>", "below") +
            note("E", 5, 2, "quarter") + note("F", 5, 2, "quarter") +
            direction("<wedge type=\"stop\"/>", "below") +
            `</measure><measure number="2">${newSystem}` +
            direction("<words>cresc.</words>", "below") +
            tremoloNote("G", "start") + tremoloNote("B", "stop") + note("D", 5, 4, "half") + "</measure>";
        const lyric: (syllabic: string, text: string, extend?: boolean) => string = (syllabic: string, text: string, extend: boolean = false): string =>
            `<lyric number="1"><syllabic>${syllabic}</syllabic><text>${text}</text>${extend ? "<extend/>" : ""}</lyric>`;
        const viola: string = `<measure number="1">${attributes}` +
            note("G", 4, 1, "eighth", lyric("begin", "Hel")) + note("A", 4, 1, "eighth", lyric("end", "lo")) +
            note("B", 4, 2, "quarter", lyric("single", "la", true)) + note("C", 5, 2, "quarter") + note("D", 5, 2, "quarter") +
            `</measure><measure number="2">${newSystem}` + direction("<words>dolce</words>", "above") +
            note("G", 4, 4, "half", lyric("single", "da") + "<notations><ornaments><tremolo type=\"unmeasured\">0</tremolo></ornaments></notations>") +
            note("A", 4, 4, "half") + "</measure>";
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            credit("title", "Title") + credit("subtitle", "Subtitle") + credit("composer", "Composer") +
            credit("lyricist", "Lyricist") + credit("rights", "Copyright") + credit("", "Arranged") +
            "<part-list><part-group type=\"start\" number=\"1\"><group-name>Strings</group-name>" +
            "<group-abbreviation>Str.</group-abbreviation><group-symbol>bracket</group-symbol></part-group>" +
            "<score-part id=\"P1\"><part-name>Violin</part-name><part-abbreviation>Vln.</part-abbreviation></score-part>" +
            "<score-part id=\"P2\"><part-name>Viola</part-name><part-abbreviation>Vla.</part-abbreviation></score-part>" +
            "<part-group type=\"stop\" number=\"1\"/></part-list>" +
            `<part id="P1">${violin}</part><part id="P2">${viola}</part></score-partwise>`;
    }

    /** OSMD's classes without their prefix: none of them may be in the SVG, a page's CSS for them would reach OSMD's elements. */
    const plainClasses: string[] = ["title", "subtitle", "composer", "lyricist", "copyright", "credit", "part-name",
        "part-abbreviation", "part-group-name", "part-group-abbreviation", "measure-number", "chord-symbol", "fingering", "lyrics",
        "dash", "dynamic", "tempo", "words", "slur", "wedge", "extender", "tremolo", "staffline", "multi"];

    /** The texts of the groups with the class, in the order they were drawn. */
    function texts(cls: string): string[] {
        return Array.from(div.querySelectorAll(`g.${cls}`)).map((group: Element): string => group.textContent);
    }

    it("names the groups of labels, slurs, wedges, lyric extenders and tremolo strokes by what they show", async (): Promise<void> => {
        osmd.EngravingRules.ReadFirstPageCreditWords = true; // the untyped credit becomes a label of its own (osmd-credit)
        osmd.EngravingRules.RenderCopyright = true;
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(score());
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(2);

        const labels: { [cls: string]: string[] } = {};
        for (const cls of ["title", "subtitle", "composer", "lyricist", "copyright", "credit", "part-name", "part-abbreviation",
            "part-group-name", "part-group-abbreviation", "measure-number", "chord-symbol", "fingering", "lyrics", "dash", "dynamic",
            "tempo", "words"]) {
            labels[cls] = texts(`vf-text.osmd-${cls}`);
        }
        expect(labels).to.deep.equal({
            "title": ["Title"], "subtitle": ["Subtitle"], "composer": ["Composer"], "lyricist": ["Lyricist"],
            "copyright": ["Copyright"], "credit": ["Arranged"],
            "part-name": ["Violin", "Viola"], "part-abbreviation": ["Vln.", "Vla."],
            "part-group-name": ["Strings"], "part-group-abbreviation": ["Str."],
            "measure-number": ["2"], "chord-symbol": ["C"], "fingering": ["1"],
            "lyrics": ["Hel", "lo", "la", "da"], "dash": ["-"], "dynamic": ["f", "cresc."], "tempo": ["Allegro"], "words": ["dolce"],
        });
        expect(div.querySelectorAll("g.vf-curve.osmd-slur").length, "slurs").to.equal(1);
        expect(div.querySelectorAll("g.vf-line.osmd-wedge").length, "the two lines of the wedge").to.equal(2);
        expect(div.querySelectorAll("g.vf-line.osmd-extender").length, "lyric extender lines").to.equal(1);
        expect(div.querySelectorAll("g.vf-path.osmd-tremolo").length, "the 3 strokes of the two-note tremolo and the buzz roll").to.equal(4);
        expect(div.querySelectorAll("g.osmd-staffline").length, "the staff lines' groups, 2 parts in 2 systems").to.equal(4);
        expect(div.querySelectorAll(plainClasses.map((cls: string): string => `.${cls}`).join(", ")).length, "classes without osmd-")
            .to.equal(0);

        // every other label, line, curve and path has a class too (the following lines of a label are groups in its group)
        const unnamed: string[] = Array.from(div.querySelectorAll("g.vf-text, g.vf-line, g.vf-curve, g.vf-path"))
            .filter((group: Element): boolean => group.classList.length === 1 && !group.parentElement.closest(".vf-text"))
            .map((group: Element): string => group.outerHTML);
        expect(unnamed, "groups with only the class of their shape").to.deep.equal([]);
    });

    it("names the measure group of a multiple rest measure osmd-multi", async (): Promise<void> => {
        const rest: string = "<note><rest measure=\"yes\"/><duration>8</duration></note>";
        const measures: string = [note("C", 5, 8, "whole"), rest, rest, rest].map((content: string, index: number): string =>
            `<measure number="${index + 1}">${index === 0 ? "<attributes><divisions>2</divisions><time><beats>4</beats>" +
                "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" : ""}${content}</measure>`).join("");
        await osmd.load("<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            `<score-part id="P1"><part-name></part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`);
        osmd.render();
        expect(div.querySelectorAll("g.vf-measure.osmd-multi").length, "the multiple rest measure of measures 2 to 4").to.equal(1);
        expect(div.querySelectorAll(".multi").length, "the class without osmd-").to.equal(0);
    });
});
