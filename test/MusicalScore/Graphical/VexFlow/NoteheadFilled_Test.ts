import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * <notehead filled="no|yes">normal</notehead>: a hollow eighth or quarter head, a black half head. VexFlow draws the head from
 * the duration, so VexFlowConverter.NoteHeadCode() asks for the head of the XML fill (VexFlowPatch tables.js: N1 hollow,
 * N2 black) where it differs from the duration's head.
 */
describe("Notehead filled attribute", () => {
    it("draws the XML fill of a normal notehead", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_notehead_filled.musicxml"));
        osmd.render();
        const head: (m: number, e: number) => string = (m: number, e: number): string =>
            ((osmd.GraphicSheet.MeasureList[m][0].staffEntries[e].graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote as any)
                .note_heads[0].glyph_code;
        const hollowHead: string = head(1, 0); // plain half
        const blackHead: string = head(1, 1); // plain quarter
        expect(hollowHead).to.not.equal(blackHead);
        expect(head(0, 0), "eighth with filled=\"no\"").to.equal(hollowHead);
        expect(head(0, 1), "plain eighth").to.equal(blackHead);
        expect(head(0, 2), "half with filled=\"yes\"").to.equal(blackHead);
        expect(head(0, 3), "quarter with filled=\"yes\" (same as its duration's head)").to.equal(blackHead);
        expect(head(1, 2), "quarter with filled=\"no\"").to.equal(hollowHead);
    });
});
