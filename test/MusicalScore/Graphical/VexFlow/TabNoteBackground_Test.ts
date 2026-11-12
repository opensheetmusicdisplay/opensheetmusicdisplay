import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../../Util/TestUtils";

/** The box behind a fret number, which interrupts the string line, has the page background color of each render():
 *  a white box under a white number made the numbers invisible in dark mode when it was turned on after load(). */
describe("TAB note background box", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(backend: "svg" | "canvas"): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend });
        await osmd.load(TestUtils.getScore("test_tab_note_colors.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function firstNote(): VexFlowGraphicalNote {
        return osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
    }
    /** The fill colors of the first note's box and fret number (SVG). */
    function svgColors(): string {
        const fret: HTMLElement = firstNote().getNoteheadSVGs()[0];
        return `box ${getComputedStyle(fret.previousElementSibling).fill}, number ${getComputedStyle(fret).fill}`;
    }
    /** The canvas pixel (r,g,b,a) on the string line inside the first note's box, left of its fret number. */
    function canvasBoxPixel(): string {
        const center: PointF2D = firstNote().PositionAndShape.AbsolutePosition; // the number's center, on its string line
        const canvas: HTMLCanvasElement = div.querySelector("canvas");
        return Array.from(canvas.getContext("2d").getImageData(Math.round(center.x * 10 - 5), Math.round(center.y * 10), 1, 1).data).join(",");
    }

    it("follows dark mode and the page background color set after load (SVG)", async () => {
        await render("svg");
        expect(svgColors(), "light mode").to.equal("box rgb(255, 255, 255), number rgb(0, 0, 0)");
        osmd.setOptions({ darkMode: true });
        osmd.render();
        expect(svgColors(), "dark mode").to.equal("box rgb(0, 0, 0), number rgb(255, 255, 255)");
        osmd.setOptions({ pageBackgroundColor: "#223344" });
        osmd.render();
        expect(svgColors(), "custom page background").to.equal("box rgb(34, 51, 68), number rgb(255, 255, 255)");
        osmd.setOptions({ darkMode: false });
        osmd.render();
        expect(svgColors(), "light mode again").to.equal("box rgb(255, 255, 255), number rgb(0, 0, 0)");
    });

    it("follows dark mode and the page background color set after load (canvas)", async () => {
        await render("canvas");
        expect(canvasBoxPixel(), "light mode: cleared").to.equal("0,0,0,0");
        osmd.setOptions({ darkMode: true });
        osmd.render();
        expect(canvasBoxPixel(), "dark mode").to.equal("0,0,0,255");
        osmd.setOptions({ pageBackgroundColor: "#223344" });
        osmd.render();
        expect(canvasBoxPixel(), "custom page background").to.equal("34,51,68,255");
        osmd.setOptions({ darkMode: false });
        osmd.render();
        expect(canvasBoxPixel(), "light mode again: cleared").to.equal("0,0,0,0");
    });
});
