import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB slides on different chord strings", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    async function render(systemBreak: boolean): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg", newSystemFromXML: true});
        const filename: string = systemBreak ? "test_tabs_chord_slide_indices_system_break.musicxml" : "test_tabs_chord_slide_indices.musicxml";
        await osmd.load(TestUtils.getScore(filename).cloneNode(true) as Document);
        osmd.render();
    }

    function checkAnchors(systemBreak: boolean): void {
        const lines: SVGGraphicsElement[] = Array.from(div.querySelectorAll(".vf-glissando path")) as SVGGraphicsElement[];
        expect(lines).to.have.length(systemBreak ? 4 : 2);
        const actual: number[] = lines.map(line => { const box: DOMRect = line.getBBox(); return box.y + box.height / 2; }).sort((a, b) => a - b);
        const expected: number[] = [];
        for (const measure of systemBreak ? [0, 1] : [0]) {
            const note: VexFlowGraphicalNote = osmd.GraphicSheet.MeasureList[measure][0]
                .staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            expected.push(...note.getNoteheadSVGs().map(fret => {
                const box: DOMRect = (fret as unknown as SVGGraphicsElement).getBBox();
                return box.y + box.height / 2;
            }));
        }
        expected.sort((a, b) => a - b);
        expect(expected).to.have.length(actual.length);
        for (let i: number = 0; i < actual.length; i++) {
            expect(actual[i], "slide beside its marked string").to.be.closeTo(expected[i], 2);
        }
        for (const line of lines) { expect(line.getAttribute("d")).not.to.match(/NaN|Infinity/); }
    }

    it("draws two distinct slides at their chord strings and keeps them there on redraw", async () => {
        await render(false);
        checkAnchors(false);
        osmd.render();
        checkAnchors(false);
    });

    it("uses the marked strings at both sides of a system break", async () => {
        await render(true);
        checkAnchors(true);
        expect(Array.from(div.querySelectorAll(".vf-glissando text")).map(text => text.textContent)).to.deep.equal(["sl.", "sl."]);
    });
});
