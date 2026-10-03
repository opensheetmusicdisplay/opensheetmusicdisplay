import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/** A re-render of a loaded sheet, e.g. by autoResize after a resize of the window, or after a zoom change, reuses the
 *  graphical objects of the sheet (including the VexFlow notes), and must not read anything a previous render wrote there:
 *  rendering the sheet again has to give the image of the first render. */
describe("Re-rendering a loaded sheet", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1440px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "canvas" });
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /**
     * Loads a sample of test/data.
     * @param sampleName the file name of the sample
     * @returns the promise of the load
     */
    function load(sampleName: string): Promise<{}> {
        return osmd.load(sampleName.endsWith(".mxl") ? "base/test/data/" + sampleName : TestUtils.getScore(sampleName));
    }

    /**
     * The images of the rendered pages (canvas backend), as data URLs.
     * @returns one data URL per page
     */
    function pageImages(): string[] {
        return Array.from(div.querySelectorAll("canvas")).map((canvas: HTMLCanvasElement): string => canvas.toDataURL());
    }

    /**
     * Expects the same page images, without printing the (long) data URLs if they differ.
     * @param actual the page images to check
     * @param expected the expected page images
     * @param message what is compared, for a failure
     */
    function expectSameImages(actual: string[], expected: string[], message: string): void {
        expect(actual.length, message + ": number of pages").to.equal(expected.length);
        for (let i: number = 0; i < expected.length; i++) {
            expect(actual[i] === expected[i], `${message}: page ${i + 1} differs`).to.equal(true);
        }
    }

    // test_slurs_long_steep_arc_moonlight_sonata_issue1466: the unison of two voices with their stems up in measure 37,
    //   where the voice collision handling lengthens one stem (and turns the other one down), changing the slope of the beam.
    // test_chord_whole_rest_overlap: chord symbols not over a note (over a whole measure rest), attached to the measure
    //   during the render, which the y-alignment of the chord symbols of the staffline read on a re-render.
    for (const sampleName of ["test_slurs_long_steep_arc_moonlight_sonata_issue1466.musicxml", "test_chord_whole_rest_overlap.musicxml"]) {
        it(`renders ${sampleName} again like the first time`, async (): Promise<void> => {
            await load(sampleName);
            osmd.render();
            const firstRender: string[] = pageImages();
            osmd.render();
            expectSameImages(pageImages(), firstRender, "second render");
        });
    }
});
