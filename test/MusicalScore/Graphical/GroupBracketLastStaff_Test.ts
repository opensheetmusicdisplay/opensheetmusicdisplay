import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A part-group groups whole parts, so its bracket reaches the last staff of its last part: a group that ends with a piano
 * brackets both piano staves. It ended at the piano's upper staff (MusicSystem.createGroupBrackets() looked for the
 * last part's Staves[0]).
 */
describe("Part group bracket and a multi-staff part", () => {
    const rendered: { container: HTMLElement, osmd: OpenSheetMusicDisplay }[] = [];

    async function firstSystem(xml: string | Document): Promise<{ system: MusicSystem, staffHeight: number }> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        rendered.push({ container, osmd });
        await osmd.load(xml);
        osmd.render();
        return { system: osmd.GraphicSheet.MusicPages[0].MusicSystems[0], staffHeight: osmd.EngravingRules.StaffHeight };
    }
    afterEach(() => {
        for (const { container, osmd } of rendered.splice(0)) {
            osmd.clear();
            container.remove();
        }
    });

    /** [top, bottom] of a system's staffline in OSMD units. */
    function staffSpan(system: MusicSystem, index: number, staffHeight: number): [number, number] {
        const top: number = system.StaffLines[index].PositionAndShape.AbsolutePosition.y;
        return [top, top + staffHeight];
    }

    /** [top, bottom] of a group bracket (set by its draw()) in OSMD units. */
    function bracketSpan(system: MusicSystem, index: number): [number, number] {
        const box: BoundingBox = system.GroupBrackets[index].PositionAndShape;
        return [box.AbsolutePosition.y, box.AbsolutePosition.y + box.Size.height];
    }

    it("ends at the piano's lower staff when the piano is the group's last part", async () => {
        const { system, staffHeight } = await firstSystem(TestUtils.getScore("test_part_group_bracket_ending_in_piano.musicxml"));
        expect(system.StaffLines.length, "violin + piano").to.equal(3);
        expect(system.GroupBrackets.length).to.equal(1);
        const [top, bottom] = bracketSpan(system, 0);
        expect(top, "starts at the violin").to.be.closeTo(staffSpan(system, 0, staffHeight)[0], 0.1);
        // the bracket is drawn to the last line of the lower staff, plus its line thickness
        expect(bottom, "ends at the piano's lower staff").to.be.closeTo(staffSpan(system, 2, staffHeight)[1], 0.3);
    });

    it("starts at the piano's upper staff when the piano is the group's first part", async () => {
        const xml: string = new XMLSerializer().serializeToString(TestUtils.getScore("test_part_group_bracket_ending_in_piano.musicxml"))
            // swap the two parts in the part list: Piano, Violin
            .replace(/<score-part id="P1">.*?<\/score-part>\s*(<score-part id="P2">.*?<\/score-part>)/s, (match, piano) =>
                piano + match.substring(0, match.length - piano.length));
        expect(xml.indexOf("Piano")).to.be.lessThan(xml.indexOf("Violin"));
        const { system, staffHeight } = await firstSystem(xml);
        expect(system.StaffLines.map(line => line.ParentStaff.ParentInstrument.Name), "piano, piano, violin")
            .to.deep.equal(["Piano", "Piano", "Violin"]);
        const [top, bottom] = bracketSpan(system, 0);
        expect(top, "starts at the piano's upper staff").to.be.closeTo(staffSpan(system, 0, staffHeight)[0], 0.1);
        expect(bottom, "ends at the violin").to.be.closeTo(staffSpan(system, 2, staffHeight)[1], 0.3);
    });
});
