import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The continued note of a tie (same letter as the start note) implies its accidental, so it draws none — unless the
 * file writes an `<accidental>` on it: then the engraver repeats the sign (e.g. a tie across a beat or a system break
 * in an engraving that restates it), and OSMD draws it as written. Without `<accidental>` it stays implied.
 */
describe("Tie stop with an XML accidental", () => {
    function aSharp(tie: string, accidental: boolean = true): string {
        return "<note><pitch><step>A</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration>" +
            `<tie type="${tie}"/><voice>1</voice><type>eighth</type>${accidental ? "<accidental>sharp</accidental>" : ""}` +
            `<notations><tied type="${tie}"/></notations></note>`;
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
        "<attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>" +
        aSharp("start") + aSharp("stop") + aSharp("start") + aSharp("stop", false) +
        "</measure></part></score-partwise>";

    it("draws the XML accidental of a continued note, and none without it", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(xml);
        osmd.render();
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const drawn: AccidentalEnum[] = [];
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                for (const note of gve.notes) {
                    drawn.push(note.DrawnAccidental);
                }
            }
        }
        // A# (start) - A# (stop, <accidental>) - A# (start, <accidental>: repeated sharp in the measure) - A# (stop, none)
        expect(drawn).to.deep.equal([AccidentalEnum.SHARP, AccidentalEnum.SHARP, AccidentalEnum.SHARP, AccidentalEnum.NONE]);
        osmd.clear();
        div.remove();
    });
});
