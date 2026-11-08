import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../../Util/TestUtils";

describe("Explicit TAB sustain tie placement", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, newSystemFromXML: true});
        await osmd.load(TestUtils.getScore("test_tab_tie_xml_placement.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function ties(measure: number): GraphicalTie[] {
        return osmd.GraphicSheet.MeasureList[measure][0].staffEntries.flatMap(entry => entry.GraphicalTies);
    }
    /** For each part of the tie (two across a system break): whether it curves downwards from its start. */
    function below(tie: GraphicalTie): boolean[] {
        return tie.SVGElements.map((part: Element) => {
            const curve: SVGGeometryElement = part.querySelector("path");
            const box: DOMRect = curve.getBBox();
            return box.y + box.height / 2 > curve.getPointAtLength(0).y;
        });
    }
    function check(): void {
        expect(ties(0).map(below)).to.deep.equal([[false], [false]]);
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
    it("honours an explicit placement change inside a sustain chain", async () => {
        await render();
        const first: GraphicalTie = ties(4).find(tie => tie.StartNote.sourceNote.ParentVoiceEntry.Timestamp.RealValue === 0);
        const next: GraphicalTie = ties(4).find(tie => tie.StartNote.sourceNote.ParentVoiceEntry.Timestamp.RealValue === 0.25);
        expect(below(first)).to.deep.equal([true]);
        expect(below(next)).to.deep.equal([false]);
        expect(first.Tie.getTieDirectionFromXml(first.StartNote.sourceNote)).to.equal(PlacementEnum.Below);
        expect(first.Tie.getTieDirectionFromXml(next.StartNote.sourceNote)).to.equal(PlacementEnum.Above);
    });
});
