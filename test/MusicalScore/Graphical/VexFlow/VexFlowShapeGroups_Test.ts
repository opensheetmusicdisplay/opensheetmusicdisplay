import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Voltas, repetitions (D.C., Fine, coda, segno), rehearsal marks, octave brackets, pedals, wavy lines and ornaments are drawn
 * in groups named after the VexFlow class that draws them: g.vf-volta, g.vf-repetition, g.vf-stavesection, g.vf-textbracket,
 * g.vf-pedalmarking, g.vf-vibratobracket, g.vf-ornament (see the VexFlowPatch's Volta.draw() etc.). One of a single shape,
 * e.g. the line of a volta's middle measure, a wavy line or a trill without accidental marks, gets the class instead
 * (EngravingRules.SVGMergeSingleChildGroups). A multi-rest measure's connectors are drawn in g.vf-connector like the other
 * measures' connectors, and a grace note's slash in the grace note's group. So no shape is left without a class in a
 * measure's or staffline's group, and an ornament's shapes have one in their note's g.vf-modifiers.
 */
describe("SVG groups of voltas, repetitions, rehearsal marks, octave brackets, pedals, wavy lines, ornaments and grace-note slashes", (): void => {
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

    /** A one-part score in 4/4 with the given measures, one division per quarter. */
    function score(measures: string[], attributes: string = "<clef><sign>G</sign><line>2</line></clef>"): string {
        const firstAttributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            `${attributes}</attributes>`;
        const content: string = measures.map((measure: string, index: number): string =>
            `<measure number="${index + 1}">${index === 0 ? firstAttributes : ""}${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name></part-name></score-part></part-list><part id="P1">${content}</part></score-partwise>`;
    }

    /** A note of the given pitch, duration and type, with the given elements after its type, e.g. notations. */
    function note(step: string, octave: number, duration: number, type: string, extra: string = ""): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<type>${type}</type>${extra}</note>`;
    }

    /** A direction with the given direction type, e.g. <segno/>. */
    function direction(directionType: string, placement: string = "above"): string {
        return `<direction placement="${placement}"><direction-type>${directionType}</direction-type></direction>`;
    }

    /** The elements with the class in the element as tags, a group with its elements' tags, e.g. ["g: rect text", "rect"]. */
    function shapes(element: Element, cls: string): string[] {
        return Array.from(element.querySelectorAll(`.${cls}`)).map((shape: Element): string => shape.tagName === "g" ?
            `g: ${Array.from(shape.children).map((child: Element): string => child.tagName).join(" ")}` : shape.tagName);
    }

    /** The elements with the class in each measure of the first staff, see shapes(). */
    function shapesPerMeasure(cls: string): string[][] {
        return osmd.GraphicSheet.MeasureList.map((staves: GraphicalMeasure[]): string[] => shapes(staves[0].getSVGGElement(), cls));
    }

    /** The rects, paths and texts without a class right in a measure's or staffline's group. */
    function unnamedShapes(): number {
        return div.querySelectorAll([".vf-measure", ".osmd-staffline"].map((container: string): string =>
            ["rect", "path", "text"].map((tag: string): string => `${container} > ${tag}:not([class])`).join(", ")).join(", ")).length;
    }

    /** The number of groups with one of the classes that have no elements. */
    function emptyGroups(classes: string[]): number {
        return Array.from(div.querySelectorAll(classes.map((cls: string): string => `g.${cls}`).join(", ")))
            .filter((group: Element): boolean => group.childElementCount === 0).length;
    }

    it("draws voltas, repetitions and rehearsal marks in g.vf-volta, g.vf-repetition and g.vf-stavesection", async (): Promise<void> => {
        const whole: string = note("B", 4, 4, "whole");
        await osmd.load(score([
            direction("<rehearsal>A</rehearsal>") + direction("<segno/>") + whole,
            "<barline location=\"left\"><ending number=\"1\" type=\"start\"/></barline>" + whole,
            whole,
            whole + direction("<words>Fine</words>") + "<barline location=\"right\"><bar-style>light-heavy</bar-style>" +
                "<ending number=\"1\" type=\"stop\"/><repeat direction=\"backward\"/></barline>",
            whole + direction("<words>D.S. al Coda</words>") + "<barline location=\"right\"><bar-style>light-heavy</bar-style></barline>",
        ]));
        osmd.render();
        // the volta of measures 2-4: the start hook, the number and the line; the line; the line and the end hook
        expect(shapesPerMeasure("vf-volta"), "voltas per measure").to.deep.equal([[], ["g: rect text rect"], ["rect"], ["g: rect rect"], []]);
        // the segno, "Fine", "D.S. al" with its coda
        expect(shapesPerMeasure("vf-repetition"), "repetitions per measure").to.deep.equal([["path"], [], [], ["text"], ["g: path text"]]);
        // the rehearsal mark's box (a rect, and an empty path from its stroke) and text
        expect(shapesPerMeasure("vf-stavesection"), "rehearsal marks per measure").to.deep.equal([["g: rect path text"], [], [], [], []]);
        expect(unnamedShapes(), "shapes without a class in the measures").to.equal(0);

        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.render();
        expect(shapesPerMeasure("vf-volta"), "voltas, SVGMergeSingleChildGroups false")
            .to.deep.equal([[], ["g: rect text rect"], ["g: rect"], ["g: rect rect"], []]);
        expect(shapesPerMeasure("vf-repetition"), "repetitions, SVGMergeSingleChildGroups false")
            .to.deep.equal([["g: path"], [], [], ["g: text"], ["g: path text"]]);
        expect(emptyGroups(["vf-volta", "vf-repetition", "vf-stavesection"]), "empty groups").to.equal(0);
    });

    it("draws octave brackets, pedals and wavy lines in g.vf-textbracket, g.vf-pedalmarking and g.vf-vibratobracket", async (): Promise<void> => {
        await osmd.load(score([
            direction("<octave-shift type=\"down\" size=\"8\"/>") + direction("<pedal type=\"start\" line=\"yes\"/>", "below") +
                note("B", 5, 2, "half", "<notations><ornaments><trill-mark/><wavy-line type=\"start\"/></ornaments></notations>") +
                note("B", 5, 2, "half", "<notations><ornaments><wavy-line type=\"stop\"/></ornaments></notations>") +
                direction("<pedal type=\"stop\" line=\"yes\"/>", "below") + direction("<octave-shift type=\"stop\" size=\"8\"/>"),
            direction("<pedal type=\"start\" line=\"no\" sign=\"yes\"/>", "below") + note("B", 4, 2, "half") + note("B", 4, 2, "half") +
                direction("<pedal type=\"stop\" line=\"no\" sign=\"yes\"/>", "below"),
        ]));
        osmd.render();
        const staffline: Element = div.querySelector(".osmd-staffline");
        // "8", "va", the dashed line and the end hook
        expect(shapes(staffline, "vf-textbracket"), "octave brackets").to.deep.equal(["g: text text path path"]);
        // the bracket of measure 1 (its start and end), the "Ped." and "*" of measure 2
        expect(shapes(staffline, "vf-pedalmarking"), "pedals").to.deep.equal(["g: path path", "g: path path"]);
        expect(shapes(staffline, "vf-vibratobracket"), "wavy lines").to.deep.equal(["path"]);
        expect(unnamedShapes(), "shapes without a class in the measures and the staffline").to.equal(0);

        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.render();
        expect(shapes(div.querySelector(".osmd-staffline"), "vf-vibratobracket"), "wavy lines, SVGMergeSingleChildGroups false")
            .to.deep.equal(["g: path"]);
        expect(emptyGroups(["vf-textbracket", "vf-pedalmarking", "vf-vibratobracket"]), "empty groups").to.equal(0);
    });

    it("draws a multi-rest measure's connectors in g.vf-connector, like the other measures' connectors", async (): Promise<void> => {
        const notes: string = note("B", 4, 4, "whole", "<staff>1</staff>") + "<backup><duration>4</duration></backup>" +
            note("D", 3, 4, "whole", "<staff>2</staff>");
        const rests: string = "<note><rest measure=\"yes\"/><duration>4</duration><staff>1</staff></note>" +
            "<backup><duration>4</duration></backup><note><rest measure=\"yes\"/><duration>4</duration><staff>2</staff></note>";
        await osmd.load(score([
            notes,
            "<attributes><measure-style><multiple-rest>3</multiple-rest></measure-style></attributes>" + rests,
            rests,
            rests,
            notes,
        ], "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef>"));
        osmd.render();
        // the multi-rest measure of the lower staff draws the connector of its end barline after its group
        const multiRest: Element = div.querySelectorAll("g.vf-measure.osmd-multi")[1];
        expect(multiRest.nextElementSibling?.getAttribute("class"), "the element after the multi-rest measure").to.equal("vf-connector");
        expect(unnamedShapes(), "shapes without a class in the measures and the stafflines").to.equal(0);
    });

    it("draws a grace note's slash in the grace note's group, so that setVisible(false) hides it", async (): Promise<void> => {
        await osmd.load(score(["<note><grace slash=\"yes\"/><pitch><step>D</step><octave>5</octave></pitch><type>eighth</type></note>" +
            note("B", 4, 4, "whole")]));
        osmd.render();
        const graceEntry: GraphicalVoiceEntry = osmd.GraphicSheet.MeasureList[0][0].staffEntries
            .flatMap(entry => entry.graphicalVoiceEntries).find(entry => entry.parentVoiceEntry.IsGrace);
        const graceNote: VexFlowGraphicalNote = graceEntry.notes[0] as VexFlowGraphicalNote;
        const slash: Element = graceNote.getSVGGElement().querySelector(":scope > path:not([class])");
        expect(slash, "the slash in the grace note's group").to.not.equal(null);
        expect(unnamedShapes(), "shapes without a class in the measures").to.equal(0);

        graceNote.setVisible(false);
        expect(window.getComputedStyle(slash).visibility, "the slash after setVisible(false)").to.equal("hidden");
    });

    it("draws an ornament with its accidental marks in g.vf-ornament, a lone glyph as path.vf-ornament, colored by setColor()", async (): Promise<void> => {
        await osmd.load(score([[
            "<trill-mark/>",
            "<inverted-mordent/><accidental-mark placement=\"above\">sharp</accidental-mark>",
            "<turn/><accidental-mark placement=\"above\">flat</accidental-mark><accidental-mark placement=\"below\">sharp</accidental-mark>",
            "<mordent/><accidental-mark placement=\"below\">sharp-sharp</accidental-mark>",
        ].map((ornament: string): string => note("B", 4, 1, "quarter", `<notations><ornaments>${ornament}</ornaments></notations>`)).join("")]));
        osmd.render();
        /** The notes of the measure, read again after each render(). */
        const notes: () => VexFlowGraphicalNote[] = (): VexFlowGraphicalNote[] => osmd.GraphicSheet.MeasureList[0][0].staffEntries
            .map(entry => entry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
        const ornamentsPerNote: () => string[][] = (): string[][] =>
            notes().map((graphicalNote: VexFlowGraphicalNote): string[] => shapes(graphicalNote.getSVGGElement(), "vf-ornament"));
        // the trill alone; the mordent and its sharp above; the turn with its sharp below and flat above; the mordent with its
        //   sharp-sharp below, two sharps
        expect(ornamentsPerNote(), "ornaments per note")
            .to.deep.equal([["path"], ["g: path path"], ["g: path path path"], ["g: path path path"]]);
        expect(div.querySelectorAll(".vf-modifiers > .vf-ornament").length, "ornaments in their note's modifiers group").to.equal(4);
        expect(div.querySelectorAll(".vf-modifiers > path:not([class])").length, "shapes without a class in the modifiers").to.equal(0);

        const turn: VexFlowGraphicalNote = notes()[2];
        turn.setColor("#FF0000");
        expect(Array.from(turn.getSVGGElement().querySelectorAll(".vf-ornament > path"))
            .map((path: Element): string => window.getComputedStyle(path).fill), "the turn and its accidental marks after setColor()")
            .to.deep.equal(["rgb(255, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 0, 0)"]);

        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.render();
        expect(ornamentsPerNote(), "ornaments per note, SVGMergeSingleChildGroups false")
            .to.deep.equal([["g: path"], ["g: path path"], ["g: path path path"], ["g: path path path"]]);
        expect(emptyGroups(["vf-ornament"]), "empty groups").to.equal(0);
    });
});
