import { expect } from "vitest";
import { IRenderNextOptions, IRenderNextResult, OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { TestUtils } from "../../Util/TestUtils";

/** What is drawn in an SVG, independent of the order and grouping of the elements (each batch of an incremental render
 *  draws into groups of its own): the size of the SVG and its paths, rectangles and texts with their positions, sorted.
 *  The numbers are rounded to 0.1 pixels: the browser measures texts like the fret numbers of a TAB staff a few
 *  millionths of a pixel differently when the SVG has another size, as it has while an incremental render grows it. */
function drawnElementsOf(svg: SVGSVGElement): string[] {
    const elements: string[] = [`svg ${svg.getAttribute("width")} x ${svg.getAttribute("height")}`];
    for (const element of Array.from(svg.querySelectorAll("path, rect, text"))) {
        const attributes: string[] = ["d", "x", "y", "width", "height"].map((name: string): string => element.getAttribute(name));
        elements.push(`${element.tagName} ${attributes.join(" ")} ${element.textContent}`);
    }
    const round: (numberText: string) => string = (numberText: string): string => Number(numberText).toFixed(1).replace(/^-0\.0$/, "0.0");
    return elements.map((element: string): string => element.replace(/-?\d+\.\d+/g, round)).sort();
}

describe("OpenSheetMusicDisplay incremental rendering (renderNext)", () => {
    // 16 measures with a system break every 4 measures (4 systems), a title, a composer and a <rights> element (copyright)
    const sampleFilename: string = "test_renderNext_copyright_below_last_system_1710.musicxml";
    const copyrightPrefix: string = "©"; // the copyright is found by its text, independent of OSMD internals
    const titlePrefix: string = "Incremental rendering";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async (): Promise<void> => {
        // a fresh container per test: an OSMD instance only removes its own previous rendering from the container
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
        osmd.setOptions({ drawCredits: true, newSystemFromXML: true }); // the sample's system breaks: 4 systems regardless of width
        osmd.EngravingRules.RenderCopyright = true; // default false
        await osmd.load(TestUtils.getScore(sampleFilename));
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** The SVG <text> elements whose text starts with prefix. */
    function textNodesStartingWith(prefix: string): SVGTextElement[] {
        const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll("svg");
        expect(svgs.length, "one SVG in the container (endless page)").to.equal(1);
        return Array.from(svgs[0].querySelectorAll("text")).filter(
            (text: SVGTextElement): boolean => (text.textContent ?? "").trim().startsWith(prefix));
    }

    /** Bottom edge of the last music system in pixels. The copyright is positioned below it. */
    function lastSystemBottomPx(): number {
        const page: GraphicalMusicPage = osmd.GraphicSheet.MusicPages[0];
        const lastSystem: MusicSystem = page.MusicSystems[page.MusicSystems.length - 1];
        return (lastSystem.PositionAndShape.AbsolutePosition.y + lastSystem.PositionAndShape.BorderBottom) * unitInPixels * osmd.Zoom;
    }

    /** Renders the loaded sheet incrementally, one system per batch, until it is complete. Returns the number of batches. */
    function renderNextUntilDone(): number {
        let batches: number = 1;
        let result: IRenderNextResult = osmd.renderNext({ systems: 1 });
        while (!result.done && batches < 20) {
            result = osmd.renderNext({ systems: 1 });
            batches++;
        }
        expect(result.done, "incremental render complete").to.equal(true);
        return batches;
    }

    /** Checks that the copyright is drawn exactly once, below the last system, where the layout model puts it, inside the SVG.
     *  Returns its distance below the last system in pixels. */
    function expectCopyrightBelowLastSystem(): number {
        const nodes: SVGTextElement[] = textNodesStartingWith(copyrightPrefix);
        expect(nodes.length, "one copyright text node in the SVG").to.equal(1);
        const bbox: DOMRect = nodes[0].getBBox();
        const lastSystemBottom: number = lastSystemBottomPx();
        expect(bbox.y, "copyright drawn below the last system").to.be.greaterThan(lastSystemBottom);
        // the drawn text has to match the layout model (the label's position is its bottom center, CenterBottom alignment):
        const modelBottomPx: number = osmd.GraphicSheet.Copyright.PositionAndShape.AbsolutePosition.y * unitInPixels * osmd.Zoom;
        const fontHeightPx: number = osmd.EngravingRules.SheetCopyrightHeight * unitInPixels * osmd.Zoom;
        expect(Math.abs(bbox.y + bbox.height - modelBottomPx), "drawn copyright matches the layout model").to.be.lessThan(fontHeightPx);
        // and lie within the SVG, not clipped below its bottom edge:
        const svgHeight: number = Number.parseFloat(container.querySelector("svg").getAttribute("height"));
        expect(bbox.y + bbox.height, "copyright inside the SVG").to.be.at.most(svgHeight + 1);
        return bbox.y - lastSystemBottom;
    }

    it("draws the copyright below the last system once the incremental render is complete (#1710)", () => {
        const batches: number = renderNextUntilDone();
        expect(batches, "several batches, so the page bottom moved after the first one").to.be.greaterThan(1);
        expectCopyrightBelowLastSystem();
        expect(textNodesStartingWith(titlePrefix).length, "title drawn once, not redrawn by later batches").to.equal(1);
    });

    it("draws the copyright only with the final batch, not while the page bottom can still move", () => {
        const first: IRenderNextResult = osmd.renderNext({ systems: 1 });
        expect(first.done).to.equal(false);
        expect(textNodesStartingWith(titlePrefix).length, "title block drawn with the first batch").to.equal(1);
        expect(textNodesStartingWith(copyrightPrefix).length, "no copyright while the last system isn't final").to.equal(0);
        osmd.renderRemaining(); // the issue's path: one system, then the rest at once
        expectCopyrightBelowLastSystem();
        expect(textNodesStartingWith(titlePrefix).length, "title drawn once").to.equal(1);
    });

    it("places the copyright like a normal render()", () => {
        renderNextUntilDone();
        const gapIncremental: number = expectCopyrightBelowLastSystem();
        osmd.render(); // supersedes the incremental session
        const gapNormal: number = expectCopyrightBelowLastSystem();
        expect(Math.abs(gapIncremental - gapNormal), "same distance below the last system").to.be.lessThan(1.5);
    });
});

describe("OpenSheetMusicDisplay incremental rendering of a single horizontal staffline (renderNext)", () => {
    // the whole score is laid out once, and each batch draws the measures entering its x-window
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
        osmd.setOptions({ renderSingleHorizontalStaffline: true });
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** The path data of the lines drawn in the SVG, e.g. lyric extenders, sorted. */
    function drawnLines(): string[] {
        return Array.from(container.querySelectorAll("svg g.vf-line path"))
            .map((path: Element): string => path.getAttribute("d")).sort();
    }

    /** What is drawn in the SVG, see drawnElementsOf(). */
    function drawnElements(): string[] {
        const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll("svg");
        expect(svgs.length, "one SVG in the container").to.equal(1);
        return drawnElementsOf(svgs[0]);
    }

    /** Renders the loaded sheet incrementally, with the given number of measures per batch, until it is complete.
     *  Returns the number of batches. */
    function renderNextUntilDone(measures: number): number {
        let batches: number = 1;
        let result: IRenderNextResult = osmd.renderNext({ measures });
        while (!result.done && batches < 50) {
            result = osmd.renderNext({ measures });
            batches++;
        }
        expect(result.done, "incremental render complete").to.equal(true);
        return batches;
    }

    it("draws each lyric extender once, where render() draws it", async () => {
        await osmd.load(TestUtils.getScore("test_lyrics_extend_verses.musicxml")); // two staves with lyric extenders
        osmd.render();
        const linesOfRender: string[] = drawnLines();
        expect(linesOfRender.length, "lyric extenders drawn").to.be.greaterThan(0);
        expect(renderNextUntilDone(1), "several batches").to.be.greaterThan(1);
        expect(drawnLines()).to.deep.equal(linesOfRender);
    });

    it("renders a single-staff sheet in batches of any size, and draws it like render()", async () => {
        // one staff, 4 measures with lyrics. A batch used to lay out only the measures up to its own: with one measure per batch,
        //   no batch drew anything, and with two, the second batch drew its staffline lower than the first one.
        await osmd.load(TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml"));
        osmd.render();
        const elementsOfRender: string[] = drawnElements();
        for (const measures of [1, 2]) {
            osmd.resetIncrementalRendering(); // start again
            expect(renderNextUntilDone(measures), `batches of ${measures} measures`).to.equal(4 / measures);
            expect(drawnElements(), `batches of ${measures} measures`).to.deep.equal(elementsOfRender);
        }
    });

    it("renders a staffline broken into several systems, and draws it like render()", async () => {
        // two staves, 6 measures in 3 systems (system breaks from the XML), with a trill line across all of them, and extra
        //   measures at the ends of the first two systems for the key and time changes in the next one. The batches used to
        //   stop at the end of the first system, or fail there with a TypeError.
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_wavy_line_multiline_extragraphicalmeasure.musicxml"));
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(3);
        const elementsOfRender: string[] = drawnElements();
        expect(renderNextUntilDone(2), "batches").to.equal(3);
        expect(drawnElements()).to.deep.equal(elementsOfRender);
    });

    it("draws each glissando once, and labels also where they reach into the next measure, like render()", async () => {
        // slides in a standard and a TAB staff, in 2 systems, used to be drawn again by every batch reaching their system, and
        //   chord symbols wider than their measures by none
        osmd.setOptions({ newSystemFromXML: true });
        for (const sampleFilename of ["test_slides_standard_and_tab_staff.musicxml", "test_chord_symbols_overlap_narrow_measure_1688.musicxml"]) {
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.render();
            const elementsOfRender: string[] = drawnElements();
            renderNextUntilDone(1);
            expect(drawnElements(), sampleFilename).to.deep.equal(elementsOfRender);
        }
    });

    it("draws the part of a pedal line going on in the next system with its last measure in the system, like render()", async () => {
        // 5 measures in 2 systems (a system break from the XML before the last one), a pedal from measure 4 into measure 5. Its
        //   part in the first system used to be drawn with the first batch, before measure 4 was drawn: in the wrong place, from
        //   the start of the system. The batch whose window reached the x of the pedal's end in the next system drew it, instead
        //   of the batch drawing the part's last measure.
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_pedal_resume_discontinue.musicxml"));
        osmd.render();
        const elementsOfRender: string[] = drawnElements();
        expect(renderNextUntilDone(1), "batches").to.equal(5);
        expect(drawnElements()).to.deep.equal(elementsOfRender);
    });

    it("draws the sky and bottom lines and the bounding boxes of the debug drawing once, like render()", async () => {
        osmd.DrawSkyLine = true;
        osmd.DrawBottomLine = true;
        osmd.setDrawBoundingBox("VexFlowMeasure", false);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_wavy_line_multiline_extragraphicalmeasure.musicxml")); // 3 systems
        osmd.render();
        const elementsOfRender: string[] = drawnElements();
        renderNextUntilDone(1);
        expect(drawnElements()).to.deep.equal(elementsOfRender);
    });

    it("gives a staffline's id (osmd-staffline<system>-<staff>) only to its group of the batch drawing its start", async () => {
        // each batch draws its part of a staffline into a group of its own: two staves in 3 systems of 2 measures, a measure a batch
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_wavy_line_multiline_extragraphicalmeasure.musicxml"));
        expect(renderNextUntilDone(1), "batches").to.equal(6);
        const ids: string[] = Array.from(container.querySelectorAll("g.osmd-staffline")).map((group: Element): string => group.id);
        expect(ids).to.deep.equal(["osmd-staffline0-0", "osmd-staffline0-1", "", "", "osmd-staffline1-0", "osmd-staffline1-1", "", "",
            "osmd-staffline2-0", "osmd-staffline2-1", "", ""]);
    });

    /**
     * Counts the pixels of a canvas that aren't fully opaque, i.e. not covered by the page background.
     * @param canvas the canvas of a page (canvas backend)
     * @returns the number of pixels with an alpha below 255
     */
    function notOpaquePixels(canvas: HTMLCanvasElement): number {
        const data: Uint8ClampedArray = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let count: number = 0;
        for (let i: number = 3; i < data.length; i += 4) {
            if (data[i] !== 255) {
                count++;
            }
        }
        return count;
    }

    it("fills the canvas with the page background, also the part each batch adds to the right", async () => {
        // the canvas backend keeps the drawn batches when the next one makes the canvas wider, and used to leave the added
        //   part transparent instead of filling it with the page background (e.g. black in dark mode)
        osmd.setOptions({ backend: "canvas", pageBackgroundColor: "#FFFFFF" });
        await osmd.load(TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml")); // one staff, 4 measures
        const canvasWidths: number[] = [];
        let result: IRenderNextResult;
        do {
            result = osmd.renderNext({ measures: 1 });
            const canvas: HTMLCanvasElement = container.querySelector("canvas");
            canvasWidths.push(canvas.width);
            expect(notOpaquePixels(canvas), `pixels without the background after batch ${canvasWidths.length}`).to.equal(0);
        } while (!result.done && canvasWidths.length < 10);
        expect(canvasWidths.length, "batches").to.equal(4);
        expect(canvasWidths[3], "canvas width after the last batch").to.be.greaterThan(canvasWidths[0]);
    });

    it("fills the canvas of a page with the page background when a later batch reaches the page", async () => {
        // until then, the canvas of the page is 0 wide, so it has nothing to keep, and it was left transparent as a whole
        osmd.setOptions({ backend: "canvas", pageBackgroundColor: "#FFFFFF", newPageFromXML: true });
        await osmd.load(TestUtils.getScore("test_pagebreak_implies_systembreak.musicxml")); // a page break before measure 2
        expect(osmd.renderNext({ measures: 1 }).done, "done after the first batch").to.equal(false);
        const canvases: HTMLCanvasElement[] = Array.from(container.querySelectorAll("canvas"));
        expect(canvases.map((canvas: HTMLCanvasElement): boolean => canvas.width > 0), "pages drawn on").to.deep.equal([true, false]);
        expect(osmd.renderNext({ measures: 1 }).done, "done after the second batch").to.equal(true);
        expect(canvases.map(notOpaquePixels), "pixels without the background per page").to.deep.equal([0, 0]);
    });
});

describe("OpenSheetMusicDisplay incremental rendering of the endless page in batches (renderNext)", () => {
    // Each batch lays out the sheet from its first measure and draws the systems that are complete: in batches of a few systems
    //   or measures, the sheet has to be drawn as in one batch, which draws all systems of the sheet's layout at once like render().
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        // The sheet is laid out at the container's width. A container as wide as the window (e.g. 727 pixels in ChromeHeadless,
        //   1350 in FirefoxHeadless) gets narrower once the page has a vertical scrollbar (e.g. 15 pixels in Chrome on Windows):
        //   then the one batch and the batches of a test were laid out at different widths, unless the containers earlier tests
        //   left in the page made it long enough for the scrollbar already. A fixed width makes the layout the same in every
        //   browser, independent of earlier tests.
        container.style.width = "1440px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** What is drawn on each page (one SVG each), see drawnElementsOf(). */
    function drawnPages(): string[][] {
        return Array.from(container.querySelectorAll("svg")).map((svg: SVGSVGElement): string[] => drawnElementsOf(svg));
    }

    /** Renders the loaded sheet incrementally in one batch, from the start. */
    function renderNextInOneBatch(): void {
        osmd.resetIncrementalRendering();
        expect(osmd.renderNext({ measures: osmd.Sheet.SourceMeasures.length }).done, "done in one batch").to.equal(true);
    }

    /** Renders the loaded sheet incrementally with the given batch options from the start until it is complete, calling
     *  afterFirstBatch (if given) after the first batch. Returns the number of batches. */
    function renderNextUntilDone(options: IRenderNextOptions, afterFirstBatch?: () => void): number {
        osmd.resetIncrementalRendering();
        let batches: number = 1;
        let result: IRenderNextResult = osmd.renderNext(options);
        afterFirstBatch?.();
        while (!result.done && batches < 100) {
            result = osmd.renderNext(options);
            batches++;
        }
        expect(result.done, "incremental render complete").to.equal(true);
        return batches;
    }

    it("renders a sheet with several pages, each into an SVG of its own", async () => {
        // page breaks from the XML: 3 pages. The batch whose layout reached a page not laid out by the first batch failed with a
        //   TypeError: only the pages of the first batch had a backend.
        osmd.setOptions({ newPageFromXML: true });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        renderNextInOneBatch();
        expect(container.querySelectorAll("svg").length, "pages").to.equal(3);
        const pagesInOneBatch: string[][] = drawnPages();
        expect(renderNextUntilDone({ systems: 1 }), "batches").to.be.greaterThan(2);
        expect(drawnPages()).to.deep.equal(pagesInOneBatch);
    });

    it("draws the bounding boxes of the debug drawing once", async () => {
        // every batch used to draw the bounding boxes of the whole layout again, also of the systems not drawn yet
        osmd.setDrawBoundingBox("VexFlowMeasure", false);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml")); // 4 systems
        renderNextInOneBatch();
        const pagesInOneBatch: string[][] = drawnPages();
        expect(renderNextUntilDone({ systems: 1 }), "batches").to.be.greaterThan(1);
        expect(drawnPages()).to.deep.equal(pagesInOneBatch);
    });

    it("draws measure repeats", async () => {
        // repeat signs for one and two measures (EngravingRules.RenderMeasureRepeats), in 3 systems of up to 4 measures. Incremental
        //   rendering used to draw the notes instead, also in one batch.
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
        renderNextInOneBatch();
        const pagesInOneBatch: string[][] = drawnPages();
        expect(renderNextUntilDone({ systems: 1 }), "batches").to.be.greaterThan(1);
        // RenderXMeasuresPerLineAkaSystem is a maximum: in a narrower container, e.g. with 2 measures in the first system, measures 6
        //   and 7 can be in different systems, and a unit split by a system break stays written out (also with render()).
        const measureNumbersOfSystems: number[][] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map((system: MusicSystem): number[] =>
            system.StaffLines[0].Measures.map((measure: GraphicalMeasure): number => measure.MeasureNumber));
        expect(measureNumbersOfSystems, "measures of the systems").to.deep.equal([[1, 2, 3, 4], [5, 6, 7, 8], [9]]);
        expect(container.querySelectorAll("g.vf-measure-repeat").length, "repeat signs").to.equal(3);
        expect(drawnPages()).to.deep.equal(pagesInOneBatch);
    });

    it("draws wedges and octave shifts continued in the next systems", async () => {
        // a crescendo through 4 systems, and an 8vb that ends in a system where the bass staff has no notes yet. The batches
        //   drew the systems before such a wedge's or octave shift's end without it: the batch's layout didn't reach the end.
        //   Now the layout of a batch reaches the end of an octave shift that goes on after the systems it draws. A wedge is drawn
        //   to the end of a layout that ends before it does, like at a system break (it was left without lines, which logged "Not
        //   enough lines for SkyBottomLine calculation"), and its part in a system doesn't depend on later systems: the crescendo
        //   is drawn by several batches.
        const messages: string[] = TestUtils.catchLogs();
        osmd.setOptions({ newSystemFromXML: true });
        for (const [sampleFilename, measures, minBatches] of [["test_wedge_multiline_crescendo.musicxml", 2, 2],
                                                             ["test_grace_notes_only_measure_spanners.musicxml", 1, 1]] as [string, number, number][]) {
            await osmd.load(TestUtils.getScore(sampleFilename));
            renderNextInOneBatch();
            const pagesInOneBatch: string[][] = drawnPages();
            expect(renderNextUntilDone({ measures }), `${sampleFilename}: batches`).to.be.at.least(minBatches);
            expect(drawnPages(), sampleFilename).to.deep.equal(pagesInOneBatch);
        }
        expect(messages, "nothing logged").to.deep.equal([]);
    });

    it("lays out all batches at the width of the first one, and draws the stems and beams exactly where one batch draws them", async () => {
        // Each batch used to read the container's width. When the container got narrower after the first batch, e.g. by the
        //   vertical scrollbar of the page the first batch made longer than the window (Chrome on Windows), the later batches laid
        //   out their systems narrower than the ones drawn before, and the batches that draw all systems again because an earlier
        //   one moved (some of this sample's) made the SVG narrower.
        // A batch's layout reuses the sky and bottom lines of the systems an earlier one calculated. Its beams then extended the
        //   stems only when drawn, at the systems' final position instead of where the skyline calculation draws them, as in
        //   render(): a few stems and beams ended a few trillionths of a pixel off. Their comparison isn't rounded.
        await osmd.load(TestUtils.getScore("Dichterliebe01.xml"));
        const stemsAndBeams: () => string[] = (): string[] => Array.from(container.querySelectorAll("path.vf-stem, path.vf-beam"))
            .map((path: Element): string => path.getAttribute("d")).sort();
        renderNextInOneBatch();
        const pagesInOneBatch: string[][] = drawnPages();
        const stemsAndBeamsInOneBatch: string[] = stemsAndBeams();
        expect(stemsAndBeamsInOneBatch.length, "stems and beams").to.be.greaterThan(100);
        const narrower: () => void = (): void => {
            container.style.width = "1425px"; // 15 pixels narrower, like with a vertical scrollbar
        };
        expect(renderNextUntilDone({ systems: 1 }, narrower), "batches").to.be.greaterThan(2);
        expect(drawnPages(), "drawn pages").to.deep.equal(pagesInOneBatch);
        expect(stemsAndBeams(), "stems and beams, unrounded").to.deep.equal(stemsAndBeamsInOneBatch);
    });
});

describe("OpenSheetMusicDisplay incremental rendering of a draw range (renderNext)", () => {
    // drawFromMeasureNumber and drawUpToMeasureNumber limit render() to a range of measures. renderNext() used to render the
    //   whole sheet anyway, and to count its progress in the whole sheet.
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1440px"; // the same layout in every browser, see the tests of the endless page in batches
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** What is drawn in the SVG, see drawnElementsOf(). */
    function drawnElements(): string[] {
        const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll("svg");
        expect(svgs.length, "one SVG in the container").to.equal(1);
        return drawnElementsOf(svgs[0]);
    }

    /** The measure numbers in the systems laid out, e.g. "6 7 8 | 9 10 11 12". An extra measure ending a system for the key or
     *  time of the next one has the number -1. */
    function systemsLaidOut(): string {
        return osmd.GraphicSheet.MusicPages.map((page: GraphicalMusicPage): string => page.MusicSystems.map((system: MusicSystem): string =>
            system.StaffLines[0].Measures.map((measure: GraphicalMeasure): number => measure.MeasureNumber).join(" ")).join(" | ")).join(" || ");
    }

    /** The progress a renderNext() result reports, e.g. "3/8, last 8, next 9": the measures rendered and to render, and the
     *  numbers of the last measure rendered and the next one ("none" if there is none). */
    function progress(result: IRenderNextResult): string {
        const measureNumber: (measures: GraphicalMeasure[]) => string =
            (measures: GraphicalMeasure[]): string => measures.length > 0 ? String(measures[0].MeasureNumber) : "none";
        return `${result.renderedMeasures}/${result.totalMeasures}, last ${measureNumber(result.lastRenderedMeasure)}, ` +
            `next ${measureNumber(result.nextUnrenderedMeasure)}`;
    }

    /** Renders the loaded sheet incrementally until it is complete. Returns the progress of each batch, see progress(). */
    function renderNextUntilDone(options: IRenderNextOptions): string[] {
        const results: IRenderNextResult[] = [osmd.renderNext(options)];
        while (!results[results.length - 1].done && results.length < 50) {
            results.push(osmd.renderNext(options));
        }
        expect(results[results.length - 1].done, "incremental render complete").to.equal(true);
        return results.map(progress);
    }

    it("renders the measures of the draw range system by system, counting the progress in them, and draws them as in one batch", async () => {
        // 16 measures with a system break every 4 measures: the measures 2 to 15 are in 4 systems
        osmd.setOptions({ newSystemFromXML: true, drawFromMeasureNumber: 2, drawUpToMeasureNumber: 15 });
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        expect(progress(osmd.IncrementalRenderProgress), "before the first batch").to.equal("0/14, last none, next none");
        osmd.render();
        expect(systemsLaidOut(), "render()").to.equal("2 3 4 | 5 6 7 8 | 9 10 11 12 | 13 14 15");
        expect(renderNextUntilDone({ measures: 100 }), "one batch").to.deep.equal(["14/14, last 15, next none"]);
        const elementsOfOneBatch: string[] = drawnElements();
        osmd.resetIncrementalRendering(); // start again
        expect(renderNextUntilDone({ systems: 1 })).to.deep.equal(
            ["3/14, last 4, next 5", "7/14, last 8, next 9", "11/14, last 12, next 13", "14/14, last 15, next none"]);
        expect(progress(osmd.IncrementalRenderProgress), "after the last batch").to.equal("14/14, last 15, next none");
        expect(systemsLaidOut()).to.equal("2 3 4 | 5 6 7 8 | 9 10 11 12 | 13 14 15");
        expect(drawnElements()).to.deep.equal(elementsOfOneBatch);
    });

    it("renders the measures of the draw range on a single horizontal staffline, counting the progress in them, like render()", async () => {
        // 6 measures in 3 systems (system breaks from the XML), the first two ending with an extra measure for the key and time
        //   of the next one: the measures 2 to 5 reach into all three
        osmd.setOptions({ renderSingleHorizontalStaffline: true, newSystemFromXML: true, drawFromMeasureNumber: 2, drawUpToMeasureNumber: 5 });
        await osmd.load(TestUtils.getScore("test_wavy_line_multiline_extragraphicalmeasure.musicxml"));
        osmd.render();
        expect(systemsLaidOut(), "render()").to.equal("2 -1 | 3 4 -1 | 5");
        const elementsOfRender: string[] = drawnElements();
        expect(renderNextUntilDone({ measures: 1 })).to.deep.equal(
            ["1/4, last 2, next 3", "2/4, last 3, next 4", "3/4, last 4, next 5", "4/4, last 5, next none"]);
        expect(systemsLaidOut()).to.equal("2 -1 | 3 4 -1 | 5");
        expect(drawnElements()).to.deep.equal(elementsOfRender);
    });

    it("starts at the measure render() starts at in a sheet beginning with a pickup measure", async () => {
        // the measures 0 (pickup) to 3: measure number n is at index n, not n - 1
        osmd.setOptions({ drawFromMeasureNumber: 2, drawUpToMeasureNumber: 3 });
        await osmd.load(TestUtils.getScore("test_metronome_mark_with_pickup_measure.musicxml"));
        for (const horizontal of [false, true]) {
            osmd.EngravingRules.RenderSingleHorizontalStaffline = horizontal;
            osmd.render(); // also ends the incremental render before
            expect(systemsLaidOut(), `render(), horizontal ${horizontal}`).to.equal("2 3");
            expect(renderNextUntilDone({ measures: 1 }), `horizontal ${horizontal}`).to.deep.equal(horizontal
                ? ["1/2, last 2, next 3", "2/2, last 3, next none"]
                : ["2/2, last 3, next none"]); // one system: drawn by the first batch
            expect(systemsLaidOut(), `horizontal ${horizontal}`).to.equal("2 3");
        }
    });

    it("renders the draw range of a sheet loaded after one with a pickup measure, starting the cursor at its first measure", async () => {
        // render() and renderNext() left the indices for a pickup measure in the rules (measure number n at index n, not n - 1),
        //   which the next sheet took as the ones set: without a pickup measure, it was drawn from measure 3 to 4. And load() started
        //   the cursor with the indices of the sheet before: at measure 1 of a sheet with a pickup measure.
        osmd.setOptions({ newSystemFromXML: true, drawFromMeasureNumber: 2, drawUpToMeasureNumber: 3 });
        const withoutPickup: string = "test_renderNext_copyright_below_last_system_1710.musicxml"; // measures 1-16
        const withPickup: string = "test_metronome_mark_with_pickup_measure.musicxml"; // measures 0 (pickup) to 3
        for (const sampleFilename of [withoutPickup, withPickup, withoutPickup]) {
            const sheet: string = sampleFilename === withPickup ? "with a pickup measure" : "without a pickup measure";
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.render();
            expect(systemsLaidOut(), `render(), ${sheet}`).to.equal("2 3");
            expect(osmd.cursor.Iterator.CurrentMeasure.MeasureNumber, `cursor, ${sheet}`).to.equal(2);
            expect(renderNextUntilDone({ measures: 1 }), sheet).to.deep.equal(["2/2, last 3, next none"]); // one system: the first batch
            expect(systemsLaidOut(), `renderNext(), ${sheet}`).to.equal("2 3");
        }
    });

    it("renders the last measure for a draw range beginning after the sheet, like render(), with the same range in the rules", async () => {
        osmd.setOptions({ newSystemFromXML: true, drawFromMeasureNumber: 20 }); // 16 measures
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        expect(renderNextUntilDone({ measures: 1 })).to.deep.equal(["1/1, last 16, next none"]);
        expect(systemsLaidOut()).to.equal("16");
        const rangeOfRenderNext: number[] = [osmd.EngravingRules.MinMeasureToDrawIndex, osmd.EngravingRules.MaxMeasureToDrawIndex];
        osmd.render(); // the layout begins at the last measure, and puts its index into the rules
        expect(systemsLaidOut(), "render()").to.equal("16");
        expect(rangeOfRenderNext, "draw range in the rules").to.deep.equal(
            [osmd.EngravingRules.MinMeasureToDrawIndex, osmd.EngravingRules.MaxMeasureToDrawIndex]);
    });

    it("moves the cursor through the measures of the draw range during an incremental render, like after render()", async () => {
        osmd.setOptions({ newSystemFromXML: true, drawFromMeasureNumber: 6, drawUpToMeasureNumber: 13 });
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        /** The indices of the measures the cursor passes, from its start to its end. */
        const cursorMeasureIndices: () => number[] = (): number[] => {
            const cursor: Cursor = osmd.cursor;
            cursor.show();
            cursor.reset();
            const measureIndices: number[] = [];
            while (!cursor.Iterator.EndReached && measureIndices.length < 1000) {
                measureIndices.push(cursor.Iterator.CurrentMeasureIndex);
                cursor.next();
            }
            return measureIndices;
        };
        osmd.render();
        const measureIndicesOfRender: number[] = cursorMeasureIndices();
        expect(measureIndicesOfRender[0], "first: measure 6").to.equal(5);
        expect(measureIndicesOfRender[measureIndicesOfRender.length - 1], "last: measure 13").to.equal(12);
        expect(osmd.renderNext({ systems: 1 }).done, "only the first system rendered").to.equal(false);
        expect(cursorMeasureIndices()).to.deep.equal(measureIndicesOfRender);
    });

    it("renders the draw range set before load() or render() ends the incremental render before", async () => {
        // load() and render() used to put the draw range back to the one before the session, also when it had been changed since
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        osmd.renderNext({ measures: 4 }); // a session over the whole sheet
        osmd.setOptions({ drawFromMeasureNumber: 6, drawUpToMeasureNumber: 13 });
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        expect(renderNextUntilDone({ measures: 8 }).pop()).to.equal("8/8, last 13, next none");
        osmd.setOptions({ drawFromMeasureNumber: 2, drawUpToMeasureNumber: 3 });
        osmd.render();
        expect(systemsLaidOut()).to.equal("2 3");
    });
});

describe("OpenSheetMusicDisplay rendering with nothing to draw (render, renderNext)", () => {
    // With no instrument visible or a draw range without measures, nothing is laid out: there's no page, and render() removes the
    //   previous drawing from the container.
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async (): Promise<void> => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml")); // 16 measures
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** Shows or hides all instruments (Instrument.Visible). */
    function setInstrumentsVisible(visible: boolean): void {
        for (const instrument of osmd.Sheet.Instruments) {
            instrument.Visible = visible;
        }
    }

    /** The ways to leave nothing to draw in the sheet: a description, a function that leaves nothing to draw, and one that undoes it. */
    const nothingToDrawCases: [string, () => void, () => void][] = [
        ["no instrument visible", (): void => setInstrumentsVisible(false), (): void => setInstrumentsVisible(true)],
        ["a draw range without measures", (): void => osmd.setOptions({ drawFromMeasureNumber: 3, drawUpToMeasureNumber: 2 }),
            (): void => osmd.setOptions({ drawFromMeasureNumber: 1, drawUpToMeasureNumber: 16 })]
    ];

    /** Draws the sheet with render() and renders it again with renderAgain in each case of nothingToDrawCases. Checks that no page
     *  is laid out then and that the previous drawing is removed from the container. */
    function expectPreviousDrawingRemoved(renderAgain: (situation: string) => void): void {
        for (const [description, leaveNothingToDraw, undo] of nothingToDrawCases) {
            osmd.render();
            expect(container.querySelectorAll("svg").length, `${description}: drawn before`).to.equal(1);
            leaveNothingToDraw();
            renderAgain(description);
            expect(osmd.GraphicSheet.MusicPages.length, `${description}: pages laid out`).to.equal(0);
            expect(container.children.length, `${description}: elements left in the container`).to.equal(0);
            // with no page drawn, the cursor stays hidden. On the drawing renderNext() used to leave, with no instrument visible,
            //   it threw a TypeError: there was no visible measure to put it on.
            osmd.cursor.show();
            undo();
        }
    }

    it("removes the previous drawing with render() on a single horizontal staffline, without a TypeError", (): void => {
        // the drawing's width was taken from the first page
        osmd.EngravingRules.RenderSingleHorizontalStaffline = true;
        expectPreviousDrawingRemoved((): void => osmd.render());
    });

    for (const horizontal of [false, true]) {
        const layout: string = horizontal ? "on a single horizontal staffline" : "on the endless page";
        it(`removes the previous drawing with the first batch of renderNext(), like render(), ${layout}`, (): void => {
            // The first batch used to leave the previous drawing in the container, and to report done at once with a draw range
            //   without measures, without laying it out.
            osmd.EngravingRules.RenderSingleHorizontalStaffline = horizontal;
            expectPreviousDrawingRemoved((situation: string): void => {
                expect(osmd.renderNext({ measures: 4 }).done, `${situation}: done`).to.equal(true);
            });
        });
    }
});
