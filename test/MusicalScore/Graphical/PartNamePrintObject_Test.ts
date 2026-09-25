import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

/**
 * <part-name print-object="no"> hides a part's name (#808): the part's name label isn't created, while the other
 * parts keep theirs. Previously only shown by ActorPreludeSample_PartName.xml, a 1.2 MB copy of ActorPreludeSample.xml
 * with the attribute on every part, in the demo sample list.
 * An empty or whitespace-only <part-name> is rendered without a label and without space for one; an empty one isn't
 * replaced with the placeholder "Instr. P1".
 */
describe("Part name print-object", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** Texts of the part name labels of the first system */
    function firstSystemPartNames(osmd: OpenSheetMusicDisplay): string[] {
        const labels: GraphicalLabel[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].Labels;
        return labels.map((label: GraphicalLabel) => label.Label.text);
    }

    it("renders the name of a part with print-object=\"no\" neither in the model's label nor in the first system", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_part_name_print_object_no.musicxml"));
        expect(osmd.Sheet.Instruments[0].Name, "part name is still read").to.equal("Flute");
        expect(osmd.Sheet.Instruments[0].NameLabel.print, "hidden part name").to.equal(false);
        expect(osmd.Sheet.Instruments[1].NameLabel.print, "visible part name").to.equal(true);

        osmd.render();
        const partNames: string[] = firstSystemPartNames(osmd);
        expect(partNames, "only the visible part name is rendered").to.deep.equal(["Oboe"]);
    });

    it("renders both part names when print-object is not set (same score without the attribute)", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        const score: Document = TestUtils.getScore("test_part_name_print_object_no.musicxml").cloneNode(true) as Document;
        score.querySelectorAll("part-name").forEach((partName: Element) => partName.removeAttribute("print-object"));
        await osmd.load(score);
        osmd.render();
        expect(firstSystemPartNames(osmd)).to.deep.equal(["Flute", "Oboe"]);
    });

    for (const emptyName of ["", " "]) {
        it(`renders the part-name "${emptyName}" without a label and without space for one`, async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            const score: Document = TestUtils.getScore("test_part_name_print_object_no.musicxml").cloneNode(true) as Document;
            const partNames: NodeListOf<Element> = score.querySelectorAll("part-name");
            partNames.forEach((partName: Element) => partName.removeAttribute("print-object"));
            partNames[0].textContent = emptyName;
            await osmd.load(score);
            expect(osmd.Sheet.Instruments[0].Name, "no placeholder like \"Instr. P1\"").to.equal(emptyName);
            osmd.render();
            expect(firstSystemPartNames(osmd).filter((name: string) => name.trim() !== ""), "only the named part").to.deep.equal(["Oboe"]);
            osmd.Sheet.Instruments[1].Visible = false;
            osmd.render();
            expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].PositionAndShape.RelativePosition.x,
                   "no space for the label when it is the only part").to.equal(0);
        });
    }
});
