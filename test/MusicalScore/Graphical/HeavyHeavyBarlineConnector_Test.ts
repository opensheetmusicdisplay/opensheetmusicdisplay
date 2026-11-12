import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A heavy-heavy barline (bar-style heavy-heavy) in a part with two staves: the lines joining the staves are two heavy
 * lines at the measure's end, at the same x as each staff's heavy-heavy barline. Before, the joining line had VexFlow's
 * default connector type: a heavy line at the measure's start, and the barlines at its end weren't joined.
 * The same for the bar styles drawn as a regular barline in the staves, e.g. dashed (after m1): a single line at the end.
 */
describe("Heavy-heavy barline of a part with two staves", () => {
    const heavyMeasures: number[] = [3, 6]; // test_barline_heavy-heavy_two_staves.musicxml
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** Rounds to 0.1 px, for comparing x positions of the SVG and of OSMD's measures. */
    function round(x: number): number {
        return Math.round(x * 10) / 10;
    }

    it("joins the staves with two heavy lines at the end of the measure, where the staves' barlines are", async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_barline_heavy-heavy_two_staves.musicxml"));
        osmd.render();
        const systems: MusicSystem[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
        expect(systems.length, "systems").to.equal(1);
        const top: GraphicalMeasure[] = systems[0].StaffLines[0].Measures;
        const unitInPixels: number = 10; // zoom 1
        const systemTop: number = top[0].PositionAndShape.AbsolutePosition.y * unitInPixels;
        const staffHeight: number = 40; // 4 spaces of 10 px
        // the rects drawn from the top staff into the bottom staff: the lines joining the staves
        const joining: { x: number, width: number }[] = Array.from(container.querySelectorAll("rect"))
            .map(rect => ({ x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")),
                width: Number(rect.getAttribute("width")), height: Number(rect.getAttribute("height")) }))
            .filter(rect => Math.abs(rect.y - systemTop) < 1 && rect.height > staffHeight * 2)
            .map(rect => ({ x: round(rect.x), width: rect.width }));
        const expected: { x: number, width: number }[] = [{ x: round(top[0].PositionAndShape.AbsolutePosition.x * unitInPixels), width: 1 }];
        for (const measure of top) {
            const end: number = round((measure.PositionAndShape.AbsolutePosition.x + measure.PositionAndShape.Size.width) * unitInPixels);
            if (heavyMeasures.includes(measure.MeasureNumber)) {
                expected.push({ x: round(end - 5), width: 3 }, { x: end, width: 3 });
            } else {
                expected.push({ x: end, width: 1 });
            }
        }
        const byX: (a: { x: number }, b: { x: number }) => number = (a, b) => a.x - b.x;
        expect(joining.sort(byX)).to.deep.equal(expected.sort(byX));
    });
});
