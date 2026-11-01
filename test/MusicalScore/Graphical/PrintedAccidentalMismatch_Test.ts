import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * In MusicXML the sounding pitch comes from `<alter>` and the printed sign from `<accidental>`. When they disagree, the
 * note draws the printed sign (as MuseScore and Finale do): e.g. a historical engraving (Eccles, Violin Sonata in
 * G minor, Largo m. 4) writes a sharp before an E to cancel the key's flat, sounding E natural — `<alter>0</alter>` with
 * `<accidental>sharp</accidental>`. It was drawn as a natural. A sharp or flat written without `<alter>` (some exports)
 * was dropped; it is drawn now. The measure keeps the sounding alteration, so the next E natural gets no natural sign.
 * Only plain signs (sharp, flat, natural, double-sharp, flat-flat); two-glyph signs (natural-sharp, ...) are unchanged.
 */
describe("Printed accidental that disagrees with <alter>", () => {
    function quarter(step: string, pitchExtra: string = "", noteExtra: string = ""): string {
        return `<note><pitch><step>${step}</step>${pitchExtra}<octave>4</octave></pitch><duration>1</duration>` +
            `<voice>1</voice><type>quarter</type>${noteExtra}</note>`;
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<part-list><score-part id=\"P1\"><part-name>Violin</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
        "<attributes><divisions>1</divisions><key><fifths>-2</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>" +
        quarter("E", "<alter>0</alter>", "<accidental>sharp</accidental>") + // sharp cancelling the key's flat, sounding E natural
        quarter("E") + // the same E natural again: implied, no sign
        quarter("F", "", "<accidental>sharp</accidental>") + // printed sharp without <alter>
        quarter("F") +
        "</measure></part></score-partwise>";

    it("draws the printed sign, and keeps the sounding alteration in the measure", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(xml);
        osmd.render();
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const drawn: string[][] = measure.staffEntries.map(entry =>
            ((entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote as any).modifiers
                .filter((modifier: any) => modifier.getCategory() === "accidentals").map((modifier: any) => modifier.type));
        expect(drawn, "E (alter 0, printed sharp) / E / F (no alter, printed sharp) / F").to.deep.equal([["#"], [], ["#"], []]);
        osmd.clear();
        div.remove();
    });
});
