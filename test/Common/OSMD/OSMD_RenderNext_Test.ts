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
    // two staves with lyric extenders: the whole score is laid out once, and each batch draws the measures entering its x-window
    const sampleFilename: string = "test_lyrics_extend_verses.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((done: Mocha.Done): void => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container); // autoResize: false
        osmd.setOptions({ renderSingleHorizontalStaffline: true });
        osmd.load(TestUtils.getScore(sampleFilename)).then((): void => done(), done);
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** The path data of the lines drawn in the SVG, e.g. lyric extenders, sorted. */
    function drawnLines(): string[] {
        return Array.from(container.querySelectorAll("svg g.vf-line path"))
            .map((path: Element): string => path.getAttribute("d")).sort();
    }

    it("draws each lyric extender once, where render() draws it", () => {
        osmd.render();
        const linesOfRender: string[] = drawnLines();
        expect(linesOfRender.length, "lyric extenders drawn").to.be.greaterThan(0);
        let batches: number = 1;
        let result: IRenderNextResult = osmd.renderNext({ measures: 1 });
        while (!result.done && batches < 50) {
            result = osmd.renderNext({ measures: 1 });
            batches++;
        }
        expect(result.done, "incremental render complete").to.equal(true);
        expect(batches, "several batches").to.be.greaterThan(1);
        expect(drawnLines()).to.deep.equal(linesOfRender);
    });
});
