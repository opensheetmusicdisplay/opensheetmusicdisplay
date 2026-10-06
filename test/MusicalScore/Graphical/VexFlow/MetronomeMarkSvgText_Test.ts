import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

describe("Metronome mark text in SVG", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("keeps the space between the note and \"=\"", async () => {
        await osmd.load(TestUtils.getScore("test_metronome_mark_with_pickup_measure.musicxml"));
        osmd.render();
        const texts: SVGTextElement[] = Array.from(container.querySelectorAll<SVGTextElement>(".vf-bpm text"));
        expect(texts.length, "the sample has metronome marks").to.be.greaterThan(0);
        for (const text of texts) {
            const withoutSpace: SVGTextElement = text.cloneNode() as SVGTextElement;
            withoutSpace.textContent = text.textContent.trim();
            text.after(withoutSpace);
            expect(text.getComputedTextLength(), `"${text.textContent}" is wider than without its leading space`)
                .to.be.greaterThan(withoutSpace.getComputedTextLength() + 1);
            withoutSpace.remove();
        }
    });
});
