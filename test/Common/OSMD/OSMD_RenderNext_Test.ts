import { expect } from "chai";
import { IRenderNextResult, OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { TestUtils } from "../../Util/TestUtils";

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

    /** What is drawn, independent of the order and grouping of the elements (each batch draws into groups of its own):
     *  the size of the SVG and its paths, rectangles and texts with their positions, sorted. The numbers are rounded to
     *  0.1 pixels: the browser measures texts like the fret numbers of a TAB staff a few millionths of a pixel differently
     *  when the SVG has another width, as it has while the incremental render grows it. */
    function drawnElements(): string[] {
        const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll("svg");
        expect(svgs.length, "one SVG in the container").to.equal(1);
        const elements: string[] = [`svg ${svgs[0].getAttribute("width")} x ${svgs[0].getAttribute("height")}`];
        for (const element of Array.from(svgs[0].querySelectorAll("path, rect, text"))) {
            const attributes: string[] = ["d", "x", "y", "width", "height"].map((name: string): string => element.getAttribute(name));
            elements.push(`${element.tagName} ${attributes.join(" ")} ${element.textContent}`);
        }
        const round: (numberText: string) => string = (numberText: string): string => Number(numberText).toFixed(1).replace(/^-0\.0$/, "0.0");
        return elements.map((element: string): string => element.replace(/-?\d+\.\d+/g, round)).sort();
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
});
