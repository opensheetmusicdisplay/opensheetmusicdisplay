import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/** A re-render of a loaded sheet, e.g. by autoResize after a resize of the window, or after a zoom change, reuses the
 *  graphical objects of the sheet (including the VexFlow notes), and must not read anything a previous render wrote there:
 *  rendering the sheet again has to give the image of the first render, and a re-render at another width the image of a
 *  first render at that width. */
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

    // OSMD_function_test_Ornaments: delayed turns (between two notes), which keep the x position of the first layout.
    // test_quarter_accidentals, test_lyrics_unused_space_issue1272: lyrics, which are included in the bounding box of their
    //   staff entry at the position of the previous layout, making the page taller.
    // OSMD_function_test_chord_spacing: chord symbols, the same for the top of the page and the composer above it.
    for (const sampleName of ["OSMD_function_test_Ornaments.xml", "test_quarter_accidentals.musicxml",
        "test_lyrics_unused_space_issue1272.musicxml", "OSMD_function_test_chord_spacing.mxl"]) {
        it(`renders ${sampleName} after a resize like the first time at the new width`, async (): Promise<void> => {
            await load(sampleName);
            div.style.width = "900px";
            osmd.render();
            const firstRenderAt900: string[] = pageImages();

            await load(sampleName);
            div.style.width = "1440px";
            osmd.render();
            div.style.width = "900px";
            osmd.render();
            expectSameImages(pageImages(), firstRenderAt900, "render at 900px after a render at 1440px");
        });
    }

    // The chord symbols of a staffline are aligned at the height of the highest one: at 1440px, the G7 over the high note in
    //   measure 4 lifts the C over the whole measure rest in measure 1, at 500px, measure 4 is in the next system. The chord
    //   symbol over a whole measure rest is attached to the measure, whose bounding box isn't recalculated from its children
    //   during a render, so the chord symbol kept its top border of the higher position, moving the composer up.
    it("renders a chord symbol over a whole measure rest after a resize like the first time at the new width", async (): Promise<void> => {
        const harmony: (step: string, kind: string) => string = (step: string, kind: string): string =>
            `<harmony><root><root-step>${step}</root-step></root><kind>${kind}</kind></harmony>`;
        const wholeNote: (step: string, octave: number) => string = (step: string, octave: number): string =>
            `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration><type>whole</type></note>`;
        const score: string = `<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
              <identification><creator type="composer">Composer</creator></identification>
              <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  ${harmony("C", "major")}<note><rest measure="yes"/><duration>4</duration><type>whole</type></note>
                </measure>
                <measure number="2">${harmony("F", "major")}${wholeNote("F", 4)}</measure>
                <measure number="3">${harmony("D", "minor")}${wholeNote("D", 4)}</measure>
                <measure number="4">${harmony("G", "dominant")}${wholeNote("E", 6)}</measure>
                <measure number="5">${harmony("C", "major")}${wholeNote("C", 5)}</measure>
              </part>
            </score-partwise>`;
        await osmd.load(score);
        div.style.width = "500px";
        osmd.render();
        const firstRenderAt500: string[] = pageImages();

        await osmd.load(score);
        div.style.width = "1440px";
        osmd.render();
        div.style.width = "500px";
        osmd.render();
        expectSameImages(pageImages(), firstRenderAt500, "render at 500px after a render at 1440px");
    });
});
