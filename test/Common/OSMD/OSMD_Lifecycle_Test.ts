import { expect, vi } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { IRenderInfo } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";

/**
 * An instance's life in a single-page app, where a component makes an instance for a container, and unmounts, remounts,
 * hides or resizes it: an instance only removes its own elements from the container, a new instance replaces the drawing
 * an earlier one left there, destroy() leaves the container as OSMD found it, autoResize follows the container's width
 * (not only the window's), a hidden container is rendered when it's shown, and onRender is called after each render.
 */
describe("OSMD instance lifecycle", () => {
    const sampleName: string = "HelloWorld.xml";
    let container: HTMLElement;
    const instances: OpenSheetMusicDisplay[] = [];

    /** Creates an instance that the test's cleanup destroys. */
    function createInstance(options: object = { autoResize: false }): OpenSheetMusicDisplay {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, options);
        instances.push(osmd);
        return osmd;
    }

    /** The page elements of OSMD instances in the container. */
    function pages(): Element[] {
        return Array.from(container.children).filter((child: Element) => child.id.startsWith("osmdCanvasPage"));
    }

    /** An element of the app in the container, e.g. an overlay. */
    function addAppElement(): HTMLElement {
        const element: HTMLElement = document.createElement("div");
        element.className = "app-element";
        container.appendChild(element);
        return element;
    }

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
    });

    afterEach(() => {
        instances.splice(0).forEach((osmd: OpenSheetMusicDisplay) => osmd.destroy());
        container.remove();
    });

    it("a new instance for a container replaces the drawing an earlier instance left in it, disposed or not", async () => {
        for (const disposeFirst of [true, false]) {
            const first: OpenSheetMusicDisplay = createInstance();
            await first.load(TestUtils.getScore(sampleName));
            first.render();
            if (disposeFirst) {
                first.dispose(); // keeps the drawing
            }
            expect(pages().length, "pages of the first instance").to.equal(1);
            // e.g. a component that is unmounted and mounted again (React's StrictMode)
            const second: OpenSheetMusicDisplay = createInstance();
            await second.load(TestUtils.getScore(sampleName));
            second.render();
            expect(pages().length, `pages after the second instance's render, first one disposed: ${disposeFirst}`).to.equal(1);
            expect(pages()[0] === second.Drawer.Backends[0].getInnerElement(), "the page is the second instance's").to.equal(true);
            second.render();
            expect(pages().length, "pages after its second render").to.equal(1);
            second.destroy();
        }
    });

    it("render() removes the instance's own pages only: the container's other children stay", async () => {
        for (const backend of ["svg", "canvas"]) {
            const before: HTMLElement = addAppElement(); // e.g. a loading indicator the app put there before the first render
            const osmd: OpenSheetMusicDisplay = createInstance({ autoResize: false, backend: backend });
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            const after: HTMLElement = addAppElement(); // e.g. an overlay added to the rendered score
            osmd.render();
            osmd.render();
            expect(pages().length, `pages after three renders (${backend})`).to.equal(1);
            expect(before.parentElement === container && after.parentElement === container,
                   `the app's elements are still in the container (${backend})`).to.equal(true);
            osmd.destroy();
            expect(Array.from(container.children).every((child: Element) => child === before || child === after),
                   `only the app's elements are left after destroy() (${backend})`).to.equal(true);
            before.remove();
            after.remove();
        }
    });

    it("destroy() removes the pages and cursors, aborts a load, and ends the instance's use", async () => {
        const osmd: OpenSheetMusicDisplay = createInstance({ autoResize: true });
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        osmd.cursor.show();
        expect(container.querySelectorAll("img").length, "cursor elements while shown").to.equal(1);
        const loading: Promise<unknown> = osmd.load(new Blob(["<score-partwise/>"])).then(() => "loaded", (error: Error) => error.name);

        osmd.destroy();
        expect(container.children.length, "children of the container after destroy()").to.equal(0);
        expect(await loading, "a load() in progress").to.equal("AbortError");
        expect(osmd.Sheet === undefined, "the sheet is released").to.equal(true);
        expect(() => osmd.render(), "render() after destroy()").to.throw(/render\(\) was called after destroy\(\)/);
        expect(() => osmd.renderNext(), "renderNext() after destroy()").to.throw(/after destroy\(\)/);
        await expect(osmd.load(TestUtils.getScore(sampleName)), "load() after destroy()").rejects.toThrow(/load\(\) was called after destroy\(\)/);
        osmd.destroy(); // does nothing

        // the container is free for a new instance
        const next: OpenSheetMusicDisplay = createInstance();
        await next.load(TestUtils.getScore(sampleName));
        next.render();
        expect(pages().length, "pages of a new instance").to.equal(1);
    });

    it("autoResize renders again when the container's width changes without a window resize, not for a change of its height", async () => {
        if (typeof ResizeObserver !== "function") {
            return; // the window's resize listener is used instead (see OSMD_ClearDispose_Test)
        }
        const renders: IRenderInfo[] = [];
        const osmd: OpenSheetMusicDisplay = createInstance({ onRender: (info: IRenderInfo) => renders.push(info) }); // autoResize is on by default
        await osmd.load(TestUtils.getScore(sampleName));
        // the app hasn't rendered yet: the observer's first report doesn't render the loaded sheet
        await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 300));
        expect(renders.length, "renders before the app's render()").to.equal(0);
        osmd.render();
        const widthBefore: number = osmd.Sheet.pageWidth;

        container.style.height = "2000px";
        await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 300)); // longer than the 200 ms after a resize
        expect(renders.length, "renders after a change of the height").to.equal(1);

        container.style.width = "600px"; // e.g. a sidebar opens
        await vi.waitFor(() => expect(renders.length, "renders after a change of the width").to.equal(2), { timeout: 3000 });
        expect(osmd.Sheet.pageWidth / widthBefore, "the page width follows the container's (600 / 800)").to.be.closeTo(0.75, 0.001);
        expect(renders[1], "the automatic render's info").to.deep.equal({ incremental: false, done: true });
        expect(pages().length, "pages").to.equal(1);
    });

    it("render() in a container without a width (hidden) is skipped with a warning; with autoResize, it's rendered when shown", async () => {
        const logs: string[] = TestUtils.catchLogs();
        container.style.display = "none";
        const manual: OpenSheetMusicDisplay = createInstance({ autoResize: false });
        await manual.load(TestUtils.getScore(sampleName));
        manual.render();
        expect(pages().length, "pages rendered into the hidden container").to.equal(0);
        expect(logs.length, "warnings").to.equal(1);
        expect(logs[0]).to.match(/container's width is 0.*Call render\(\) again/);
        manual.destroy();

        if (typeof ResizeObserver !== "function") {
            return;
        }
        const osmd: OpenSheetMusicDisplay = createInstance({}); // autoResize is on by default
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        expect(pages().length, "pages rendered into the hidden container, with autoResize").to.equal(0);
        expect(logs[1]).to.match(/container's width is 0.*will be rendered when the container gets a width/);

        container.style.display = ""; // e.g. its tab is selected
        await vi.waitFor(() => expect(pages().length, "pages once the container is shown").to.equal(1), { timeout: 3000 });
        expect(osmd.Sheet.pageWidth, "the page width is the container's (800 px)").to.be.closeTo(80, 0.001);
        expect(logs.length, "warnings").to.equal(2);
    });

    it("renderNext() in a container without a width starts no session and is done, so that a loop over the batches ends", async () => {
        const logs: string[] = TestUtils.catchLogs();
        container.style.display = "none";
        const osmd: OpenSheetMusicDisplay = createInstance();
        await osmd.load(TestUtils.getScore(sampleName));
        let batches: number = 0;
        while (!osmd.renderNext().done && batches < 100) {
            batches++;
        }
        expect(batches, "batches that weren't the last one").to.equal(0);
        expect(osmd.IncrementalRenderingActive, "a session was started").to.equal(false);
        expect(pages().length, "pages rendered into the hidden container").to.equal(0);
        expect(logs[0]).to.match(/renderNext\(\): the container's width is 0/);
        osmd.enableIncrementalRenderingOnScroll();
        expect(osmd.IncrementalRenderingActive, "a session was started on scroll").to.equal(false);

        container.style.display = "";
        expect(osmd.renderNext().renderedMeasures > 0, "measures rendered in the shown container").to.equal(true);
    });

    it("the page's scrollbar that appears with the sheet's pages doesn't make autoResize render again", async () => {
        if (typeof ResizeObserver !== "function") {
            return;
        }
        // A scrollbar that takes 16 px of the container's width while a page of the sheet is in it, like the page's scrollbar
        //   for a sheet taller than the window on Linux and Windows. Simulated: headless browsers' scrollbars take no space.
        Object.defineProperty(container, "offsetWidth", { configurable: true, get: (): number => pages().length > 0 ? 784 : 800 });
        const osmd: OpenSheetMusicDisplay = createInstance({}); // autoResize is on by default
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        expect(osmd.Sheet.pageWidth * 10, "the layout's width is the container's before the scrollbar").to.be.closeTo(800, 0.001);
        container.style.width = "784px"; // the scrollbar's effect on the container, which its observer reports
        await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 400)); // longer than the 200 ms after a resize
        expect(osmd.EngravingRules.RenderCount, "renders: the observer didn't render again").to.equal(1);

        osmd.render(); // by the app: it starts with the scrollbar
        expect(osmd.Sheet.pageWidth * 10, "the layout's width of the app's next render").to.be.closeTo(784, 0.001);
        expect(parseFloat(container.querySelector("svg").getAttribute("width")), "its page is as wide as the layout")
            .to.be.closeTo(784, 0.001);
        // another width renders again
        delete (container as any).offsetWidth;
        container.style.width = "600px";
        await vi.waitFor(() => expect(osmd.EngravingRules.RenderCount, "renders after another change of the width").to.equal(3),
                         { timeout: 3000 });
        expect(osmd.Sheet.pageWidth * 10, "the layout's width after it").to.be.closeTo(600, 0.001);
    });

    it("a container as wide as its content (flex-basis: auto) is laid out for the space it has, not for its previous pages", async () => {
        // a flexbox whose right item, the container, is as wide as its content wants and the flexbox allows
        const flexbox: HTMLElement = document.createElement("div");
        flexbox.style.cssText = "display: flex; width: 1100px;";
        const sidebar: HTMLElement = document.createElement("div");
        sidebar.style.cssText = "flex: 0 1 160px;";
        container.style.cssText = "flex: 1 1 auto; min-width: 0;";
        flexbox.appendChild(sidebar);
        flexbox.appendChild(container);
        document.body.appendChild(flexbox);
        try {
            const osmd: OpenSheetMusicDisplay = createInstance();
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            expect(container.offsetWidth, "the container's width in the flexbox of 1100 px").to.equal(940);
            expect(osmd.Sheet.pageWidth * 10, "the layout's width").to.be.closeTo(940, 0.001);

            flexbox.style.width = "800px";
            // with the page of 940 px in it, the container gets more than the 640 px it has without: the sidebar shrinks too
            expect(container.offsetWidth > 640, "the container's width with the previous page in it").to.equal(true);
            osmd.render();
            expect(osmd.Sheet.pageWidth * 10, "the layout's width in the flexbox of 800 px").to.be.closeTo(640, 0.001);
            expect(parseFloat(container.querySelector("svg").getAttribute("width")), "the page's width").to.be.closeTo(640, 0.001);
            expect(container.offsetWidth, "the container's width with the new page").to.equal(640);
            expect(container.style.minHeight, "the container's min-height is as before").to.equal("");
            expect((pages()[0] as HTMLElement).style.display, "the page is shown").to.equal("");
        } finally {
            document.body.appendChild(container); // removed by the test's cleanup
            flexbox.remove();
        }
    });

    it("onRender is called after render() and after each batch of renderNext()", async () => {
        const renders: IRenderInfo[] = [];
        const osmd: OpenSheetMusicDisplay = createInstance({ autoResize: false, onRender: (info: IRenderInfo) => renders.push(info) });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        expect(renders, "after render()").to.deep.equal([{ incremental: false, done: true }]);

        renders.length = 0;
        const firstBatchDone: boolean = osmd.renderNext({ measures: 8 }).done;
        osmd.renderRemaining();
        expect(firstBatchDone, "the first batch draws the whole sheet").to.equal(false);
        expect(renders[0], "after the first batch").to.deep.equal({ incremental: true, done: false });
        expect(renders[renders.length - 1], "after the last batch").to.deep.equal({ incremental: true, done: true });

        renders.length = 0;
        osmd.OnRender = undefined;
        osmd.render();
        expect(renders.length, "calls after OnRender was removed").to.equal(0);
    });
});
