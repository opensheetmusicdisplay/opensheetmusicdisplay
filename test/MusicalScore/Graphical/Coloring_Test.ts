import { expect } from "chai";
import { ColoringModes } from "../../../src/Common/Enums/ColoringModes";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/** The colors notes are drawn in (VexFlowVoiceEntry.color()): with coloring (EngravingRules.ColoringEnabled,
 *  OSMDOptions.coloringEnabled), the colors from the XML or from the coloring mode, without it, the default colors.
 *  Either way, hidden notes (print-object="no") and stems hidden with <stem>none</stem> are drawn transparent. */
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
});
