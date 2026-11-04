import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * <part-name print-object="no"> hides a part's name (#808): the part's name label isn't created, while the other
 * parts keep theirs. Previously only shown by ActorPreludeSample_PartName.xml, a 1.2 MB copy of ActorPreludeSample.xml
 * with the attribute on every part, in the demo sample list.
 * An empty or whitespace-only <part-name> is rendered without a label and without space for one; an empty one isn't
 * replaced with the placeholder "Instr. P1". A part without a <part-name> element is treated like one with an empty
 * part-name: its part id ("P1") isn't used as its name.
 * On later systems, a part without an abbreviation to show (none, whitespace only, or print-object="no" on
 * <part-abbreviation> or <part-abbreviation-display>) gets no label, and the other parts keep theirs.
 * The reader drops spaces and line breaks at the start and end of a <part-name> or <part-abbreviation>, like those of
 * the title: Schubert_An_die_Musik.xml's abbreviation "Voice" ends with a line break, which gave its label an empty
 * second line and drew "Voice" a staff space above its staff's center. A line break inside starts a second line.
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

    // an empty and a whitespace-only part-name, and no part-name element (undefined)
    for (const emptyName of ["", " ", undefined]) {
        const partNameDescription: string = emptyName === undefined ? "a part without part-name element" : `the part-name "${emptyName}"`;
        it(`renders ${partNameDescription} without a label and without space for one`, async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            const score: Document = TestUtils.getScore("test_part_name_print_object_no.musicxml").cloneNode(true) as Document;
            const partNames: NodeListOf<Element> = score.querySelectorAll("part-name");
            partNames.forEach((partName: Element) => partName.removeAttribute("print-object"));
            if (emptyName === undefined) {
                partNames[0].remove();
            } else {
                partNames[0].textContent = emptyName;
            }
            await osmd.load(score);
            expect(osmd.Sheet.Instruments[0].Name, "no placeholder like \"Instr. P1\" or the part id").to.equal("");
            osmd.render();
            expect(firstSystemPartNames(osmd).filter((name: string) => name.trim() !== ""), "only the named part").to.deep.equal(["Oboe"]);
            osmd.Sheet.Instruments[1].Visible = false;
            osmd.render();
            expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].PositionAndShape.RelativePosition.x,
                   "no space for the label when it is the only part").to.equal(0);
        });
    }

    it("renders the abbreviations of the other parts, next to the staves, when a part has no abbreviation to show", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_part_abbreviations_partly_missing.musicxml"));
        osmd.render();
        const secondSystem: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[1];
        const labels: GraphicalLabel[] = secondSystem.Labels;
        expect(labels.map((label: GraphicalLabel) => label.Label.text),
            "flute and piano; the oboe has none, the clarinet's and the horn's are hidden, the bassoon's is only a space")
            .to.deep.equal(["Fl.", "Pno."]);
        const labelWidth: number = Math.max(...labels.map((label: GraphicalLabel) => label.PositionAndShape.Size.width));
        expect(secondSystem.StaffLines[0].PositionAndShape.RelativePosition.x, "the staves start right of the labels")
            .to.be.greaterThan(labelWidth);
    });

    it("reads part names and abbreviations without line breaks at their start and end, keeping one inside", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        const score: Document = TestUtils.getScore("test_part_abbreviations_partly_missing.musicxml").cloneNode(true) as Document;
        // the flute's, as indented XML has them, and an abbreviation followed by a line break, like Schubert's "Voice"
        score.querySelector("part-name").textContent = "\n        Flute\nin G\n      ";
        score.querySelector("part-abbreviation").textContent = "Fl.\n";
        await osmd.load(score);
        expect(osmd.Sheet.Instruments[0].Name).to.equal("Flute\nin G");
        expect(osmd.Sheet.Instruments[0].PartAbbreviation).to.equal("Fl.");

        osmd.render();
        const labels: GraphicalLabel[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[1].Labels;
        expect(labels.map((label: GraphicalLabel) => label.Label.text)).to.deep.equal(["Fl.", "Pno."]);
        expect(labels[0].PositionAndShape.Size.height, "one line, as high as the piano's")
            .to.equal(labels[1].PositionAndShape.Size.height);
    });
});
