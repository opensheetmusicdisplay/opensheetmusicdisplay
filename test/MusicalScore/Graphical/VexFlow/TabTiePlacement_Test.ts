import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { TestUtils } from "../../../Util/TestUtils";

describe("Explicit TAB sustain tie placement", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(backend: "svg" | "canvas" = "svg"): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend, newSystemFromXML: true});
        await osmd.load(TestUtils.getScore("test_tab_tie_xml_placement.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function ties(measure: number): GraphicalTie[] {
        return osmd.GraphicSheet.MeasureList[measure][0].staffEntries.flatMap(entry => entry.GraphicalTies);
    }
    function below(tie: GraphicalTie): boolean[] {
        return tie.vfTies.map((vf: any) => {
            const path: SVGGraphicsElement = vf.getAttribute("el").querySelector("path");
            const note: any = vf.first_note ?? vf.last_note;
            const index: number = (vf.first_note ? vf.first_indices : vf.last_indices)[0];
            return path.getBBox().y > note.getYs()[index];
        });
    }
    function check(): void {
        expect(below(ties(0)[0])).to.deep.equal([false]);
        expect(below(ties(1)[0])).to.deep.equal([true]);
        expect(below(ties(2)[0])).to.deep.equal([true, true]);
    }
    it("honours explicit below placement while preserving the upward default", async () => {
        await render();
        check();
        osmd.render();
        check();
        div.style.width = "700px";
        osmd.render();
        check();
    });
    it("supports the native canvas ties", async () => {
        await render("canvas");
        expect(ties(2)[0].vfTies).to.have.length(2);
        expect(div.querySelector("canvas")).not.to.equal(null);
    });
    it("honours an explicit placement change inside a sustain chain", async () => {
        await render();
        const first: GraphicalTie = ties(4).find(tie => tie.StartNote.sourceNote.ParentVoiceEntry.Timestamp.RealValue === 0);
        const next: GraphicalTie = ties(4).find(tie => tie.StartNote.sourceNote.ParentVoiceEntry.Timestamp.RealValue === 0.25);
        expect(below(first)).to.deep.equal([true]);
        expect(below(next)).to.deep.equal([false]);
        expect(first.Tie.getTieDirectionFromXml(first.StartNote.sourceNote)).to.equal(1);
        expect(first.Tie.getTieDirectionFromXml(next.StartNote.sourceNote)).to.equal(0);
    });
});
