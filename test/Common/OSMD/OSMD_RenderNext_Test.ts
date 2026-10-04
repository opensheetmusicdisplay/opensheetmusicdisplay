import { expect } from "chai";
import { IRenderNextOptions, IRenderNextResult, OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
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

    beforeEach((done: Mocha.Done): void => {
        // a fresh container per test: an OSMD instance only removes its own previous rendering from the container
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
        osmd.setOptions({ drawCredits: true, newSystemFromXML: true }); // the sample's system breaks: 4 systems regardless of width
        osmd.EngravingRules.RenderCopyright = true; // default false
        osmd.load(TestUtils.getScore(sampleFilename)).then((): void => done(), done);
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
        //   (Now the layout of the first batch reaches the end of the crescendo, in the last system, so it is the only batch.)
        osmd.setOptions({ newSystemFromXML: true });
        for (const [sampleFilename, measures] of [["test_wedge_multiline_crescendo.musicxml", 2],
                                                 ["test_grace_notes_only_measure_spanners.musicxml", 1]] as [string, number][]) {
            await osmd.load(TestUtils.getScore(sampleFilename));
            renderNextInOneBatch();
            const pagesInOneBatch: string[][] = drawnPages();
            renderNextUntilDone({ measures });
            expect(drawnPages(), sampleFilename).to.deep.equal(pagesInOneBatch);
        }
    });

    it("draws the stems and beams exactly where one batch draws them", async () => {
        // A batch's layout reuses the sky and bottom lines of the systems an earlier one calculated. Its beams then extended the
        //   stems only when drawn, at the systems' final position instead of where the skyline calculation draws them, as in
        //   render(): a few stems and beams ended a few trillionths of a pixel off. The comparison isn't rounded here.
        await osmd.load(TestUtils.getScore("Dichterliebe01.xml"));
        const stemsAndBeams: () => string[] = (): string[] => Array.from(container.querySelectorAll("path.vf-stem, g.vf-beam path"))
            .map((path: Element): string => path.getAttribute("d")).sort();
        renderNextInOneBatch();
        const stemsAndBeamsInOneBatch: string[] = stemsAndBeams();
        expect(stemsAndBeamsInOneBatch.length, "stems and beams").to.be.greaterThan(100);
        expect(renderNextUntilDone({ systems: 1 }), "batches").to.be.greaterThan(2);
        expect(stemsAndBeams()).to.deep.equal(stemsAndBeamsInOneBatch);
    });

    it("lays out all batches at the width of the first one", async () => {
        // Each batch used to read the container's width. When the container got narrower after the first batch, e.g. by the
        //   vertical scrollbar of the page the first batch made longer than the window (Chrome on Windows), the later batches laid
        //   out their systems narrower than the ones drawn before, and the batches that draw all systems again because an earlier
        //   one moved (some of this sample's) made the SVG narrower.
        await osmd.load(TestUtils.getScore("Dichterliebe01.xml"));
        renderNextInOneBatch();
        const pagesInOneBatch: string[][] = drawnPages();
        const narrower: () => void = (): void => {
            container.style.width = "1425px"; // 15 pixels narrower, like with a vertical scrollbar
        };
        expect(renderNextUntilDone({ systems: 1 }, narrower), "batches").to.be.greaterThan(2);
        expect(drawnPages()).to.deep.equal(pagesInOneBatch);
    });
});
