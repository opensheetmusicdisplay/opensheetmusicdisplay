import { expect } from "chai";
import { ColoringModes } from "../../../src/Common/Enums/ColoringModes";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/** The colors notes are drawn in (VexFlowVoiceEntry.color()): with coloring (EngravingRules.ColoringEnabled,
 *  OSMDOptions.coloringEnabled), the colors from the XML or from the coloring mode, without it, the default colors.
 *  Either way, hidden notes (print-object="no") and stems hidden with <stem>none</stem> are drawn transparent.
 *  With ColorBeams, a beam takes the color of its stems (VexFlowMeasure.finalizeBeams()), e.g. the noteheads' color with
 *  ColorStemsLikeNoteheads, but not the color of the noteheads alone. With ColorFlags, a flag takes the color of its stem,
 *  and a transparent stem hides its flag either way. */
describe("Coloring", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /**
     * A score of one measure with the given notes.
     * @param notes the MusicXML of the notes
     * @returns the MusicXML of the score
     */
    function score(notes: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
              <part-list><score-part id="P1"><part-name>Colors</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  ${notes}
                </measure>
              </part>
            </score-partwise>`;
    }

    /**
     * The MusicXML of a note in the 4th octave.
     * @param step the note's step, e.g. "C"
     * @param type the note type, e.g. "quarter"
     * @param elements elements after the type, e.g. a notehead with a color
     * @param attributes attributes of the note element, e.g. ` print-object="no"`
     * @returns the note element
     */
    function note(step: string, type: string, elements: string = "", attributes: string = ""): string {
        const duration: number = type === "eighth" ? 1 : 2;
        return `<note${attributes}><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration>` +
            `<type>${type}</type>${elements}</note>`;
    }

    /**
     * A color as drawn in the SVG, in upper case: "black" for an element drawn without a style.
     * @param color the fill or stroke attribute
     * @returns the color as "#RRGGBB" or "#RRGGBBAA"
     */
    function drawnColor(color: string): string {
        return color === "black" ? "#000000" : color?.toUpperCase();
    }

    /**
     * Expects the drawn colors of the notes of the first measure, listing them in the message if they differ.
     * @param expected one text per note, e.g. "C4: head #FF0000, stem #000000"
     * @param message what is checked, for a failure
     */
    function expectNoteColors(expected: string[], message: string): void {
        const actual: string[] = osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries.map((staffEntry): string => {
            const gNote: VexFlowGraphicalNote = staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            const head: string = drawnColor(gNote.getNoteheadSVGs()[0].querySelector("path").getAttribute("fill"));
            const stem: string = drawnColor(gNote.getStemSVG().getAttribute("stroke"));
            return `${gNote.sourceNote.Pitch.ToStringShort(3)}: head ${head}, stem ${stem}`;
        });
        expect(actual, `${message}: ${actual.join("; ")}`).to.deep.equal(expected);
    }

    /**
     * Expects the drawn colors of the beams of the first measure, listing them in the message if they differ.
     * @param expected the color of each beam, e.g. "#FF0000"
     * @param message what is checked, for a failure
     */
    function expectBeamColors(expected: string[], message: string): void {
        const actual: string[] = [];
        for (const staffEntry of osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries) {
            for (const beam of (staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote).getBeamSVGs()) {
                actual.push(drawnColor(beam.querySelector("path").getAttribute("fill")));
            }
        }
        expect(actual, `${message}: ${actual.join(", ")}`).to.deep.equal(expected);
    }

    /**
     * Expects the drawn colors of the flags of the first measure, listing them in the message if they differ.
     * @param expected one text per note with a flag, e.g. "F4: flag #FF0000"
     * @param message what is checked, for a failure
     */
    function expectFlagColors(expected: string[], message: string): void {
        const actual: string[] = [];
        for (const staffEntry of osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) { // with grace notes
                const gNote: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
                const flag: HTMLElement = gNote.getFlagSVG();
                if (flag) {
                    const color: string = drawnColor(flag.querySelector("path").getAttribute("fill"));
                    actual.push(`${gNote.sourceNote.Pitch.ToStringShort(3)}: flag ${color}`);
                }
            }
        }
        expect(actual, `${message}: ${actual.join("; ")}`).to.deep.equal(expected);
    }

    it("keeps hidden notes and stems hidden without coloring, and draws the other notes in the default colors", async (): Promise<void> => {
        osmd.setOptions({ coloringEnabled: false }); // also when the notes are created without coloring
        await osmd.load(score(note("C", "quarter", "<notehead color=\"#FF0000\">normal</notehead>") +
            note("D", "quarter", "", " print-object=\"no\"") +
            note("E", "quarter", "<stem>none</stem>") +
            note("F", "quarter", "<stem color=\"#0000FF\">up</stem>")));
        const defaultColors: string[] = [
            "C4: head #000000, stem #000000",
            "D4: head #00000000, stem #00000000",
            "E4: head #000000, stem #00000000",
            "F4: head #000000, stem #000000"];
        osmd.render();
        expectNoteColors(defaultColors, "without coloring");

        osmd.setOptions({ coloringEnabled: true });
        osmd.render();
        expectNoteColors([
            "C4: head #FF0000, stem #000000",
            "D4: head #00000000, stem #00000000",
            "E4: head #000000, stem #00000000",
            "F4: head #000000, stem #0000FF"], "with coloring");

        // the Vexflow notes are reused across renders, and keep their colors until set again
        osmd.setOptions({ coloringEnabled: false });
        osmd.render();
        expectNoteColors(defaultColors, "coloring switched off");

        osmd.setOptions({ coloringMode: ColoringModes.AutoColoring });
        osmd.render();
        expectNoteColors(defaultColors, "the coloring mode needs coloring too");

        osmd.setOptions({ drawHiddenNotes: true });
        osmd.updateGraphic(); // RenderHiddenNotes needs the graphic created anew
        osmd.render();
        expectNoteColors([
            "C4: head #000000, stem #000000",
            "D4: head #000000, stem #000000",
            "E4: head #000000, stem #00000000",
            "F4: head #000000, stem #000000"], "a hidden note drawn with drawHiddenNotes, not in hiddenNotesColor");
    });

    it("draws a beam in the color of its stems with ColorBeams, so like the noteheads only with colorStemsLikeNoteheads", async (): Promise<void> => {
        /** Two beamed eighths, G4 and A4, with the given elements after their type. */
        const beamed: (first: string, second: string) => string = (first: string, second: string): string =>
            note("G", "eighth", first + "<beam number=\"1\">begin</beam>") + note("A", "eighth", second + "<beam number=\"1\">end</beam>");
        const redHead: string = "<notehead color=\"#FF0000\">normal</notehead>";
        const blueStem: string = "<stem color=\"#0000FF\">up</stem>";
        await osmd.load(score(beamed(redHead, redHead) +
            beamed(redHead, "<notehead color=\"#0000FF\">normal</notehead>") +
            beamed(blueStem, blueStem) +
            beamed("", "")));
        osmd.render();
        expectBeamColors(["#000000", "#000000", "#0000FF", "#000000"], "the stems' color, not the noteheads'");

        osmd.setOptions({ colorStemsLikeNoteheads: true }); // also the blue stems, which take the default color of their heads
        osmd.render();
        expectBeamColors(["#FF0000", "#000000", "#000000", "#000000"], "with colorStemsLikeNoteheads");

        osmd.EngravingRules.ColorBeams = false;
        osmd.render();
        expectBeamColors(["#000000", "#000000", "#000000", "#000000"], "without ColorBeams");
    });

    it("draws flags in the default color with ColorFlags false, still hiding those of hidden notes and of <stem>none</stem>", async (): Promise<void> => {
        osmd.EngravingRules.ColorFlags = false; // also when the notes are created without it
        // the grace note's flag is drawn in the notehead style of its main note, the hidden D4, unless it has a style of its own
        const graceNote: string = "<note><grace/><pitch><step>C</step><octave>5</octave></pitch><voice>1</voice><type>eighth</type></note>";
        await osmd.load(score(graceNote + note("D", "eighth", "", " print-object=\"no\"") +
            note("E", "eighth", "<stem>none</stem>") +
            note("F", "eighth", "<stem color=\"#FF0000\">up</stem>") +
            note("G", "eighth") +
            "<note><rest/><duration>4</duration><type>half</type></note>"));
        const withoutColorFlags: string[] = ["C5: flag #000000", "D4: flag #00000000", "E4: flag #00000000", "F4: flag #000000",
            "G4: flag #000000"];
        osmd.render();
        expectFlagColors(withoutColorFlags, "without ColorFlags");

        osmd.EngravingRules.ColorFlags = true;
        osmd.render();
        expectFlagColors(["C5: flag #000000", "D4: flag #00000000", "E4: flag #00000000", "F4: flag #FF0000", "G4: flag #000000"],
            "with ColorFlags");

        // the Vexflow notes are reused across renders, and keep their colors until set again
        osmd.EngravingRules.ColorFlags = false;
        osmd.render();
        expectFlagColors(withoutColorFlags, "ColorFlags switched off");
    });
});
