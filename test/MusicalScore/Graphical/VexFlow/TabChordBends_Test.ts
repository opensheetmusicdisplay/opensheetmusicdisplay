import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Bends on individual TAB chord strings", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(backend: "svg" | "canvas" = "svg"): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend});
        await osmd.load(TestUtils.getScore("test_tab_chord_bends.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function check(): void {
        for (const [measure, count] of [[0, 2], [1, 2], [2, 1]]) {
            const entry: VexFlowVoiceEntry = osmd.GraphicSheet.MeasureList[measure][0].staffEntries[0].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
            const note: VexFlowGraphicalNote = entry.notes[0] as VexFlowGraphicalNote;
            const curves: Element[] = Array.from(note.getSVGGElement().querySelectorAll('path[fill="none"]'));
            expect(curves).to.have.length(count);
            const starts: number[] = curves.map(path => Number(path.getAttribute("d").match(/^M\s*[-\d.]+[ ,]+([-\d.]+)/)[1])).sort((a, b) => a - b);
            const expected: number[] = entry.notes.filter(graphical => (graphical.sourceNote as TabNote).BendArray?.length > 0)
                .map(graphical => {
                    const vf: VexFlowGraphicalNote = graphical as VexFlowGraphicalNote;
                    return vf.vfnote[0].getYs()[vf.vfnote[1]] + 0.5;
                }).sort((a, b) => a - b);
            expect(starts).to.deep.equal(expected);
        }
        for (const path of Array.from(div.querySelectorAll("svg path"))) { expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/); }
    }
    it("anchors equal and unequal chord bends at their marked strings, including a single bent chord member", async () => {
        await render();
        check();
        osmd.render();
        check();
        div.style.width = "650px";
        osmd.render();
        check();
    });
    it("keeps each note's interval label and supports canvas", async () => {
        await render();
        const note: VexFlowGraphicalNote = osmd.GraphicSheet.MeasureList[1][0].staffEntries[0]
            .graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
        const group: SVGGElement = note.getSVGGElement();
        expect(Array.from(group.querySelectorAll("text")).map(text => text.textContent)).to.include.members(["1/2", "Full"]);
        osmd.clear();
        await render("canvas");
        expect(div.querySelector("canvas")).not.to.equal(null);
    });
});
