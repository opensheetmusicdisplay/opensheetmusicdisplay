import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";
import { WarmKeeperScoreMxlBase64 } from "../../../src/OpenSheetMusicDisplay/WarmKeeperScore";

/**
 * The warm keeper (OpenSheetMusicDisplay.KeepWarm): after the first render() or renderNext() of an instance that uses it, OSMD
 * renders a built-in score when the page is idle, into a container that isn't in the page, and keeps it, so that the JavaScript
 * engine keeps the code it compiled for OSMD's objects after clear(). One keeper per page, shared by the instances that use it,
 * freed when the last of them stops (dispose(), KeepWarm = false). KeepWarm "auto" (default) uses it in Chromium-based browsers
 * only, so the tests set KeepWarm = true where they need a keeper. These tests check when it's made and freed, not the speed.
 * Each test file runs in a page of its own, so other files' instances don't use this page's keeper.
 */
describe("OSMD KeepWarm", () => {
    const sampleName: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";

    /** The page's keeper (a private static field), or undefined. */
    function pageKeeper(): OpenSheetMusicDisplay {
        return (OpenSheetMusicDisplay as any).warmKeeper;
    }

    /** The instance's container (a protected field). */
    function containerOf(osmd: OpenSheetMusicDisplay): HTMLElement {
        return (osmd as any).container;
    }

    /** Waits until `condition` is true, at most `ms` milliseconds; returns whether it became true. */
    async function waitFor(condition: () => boolean, ms: number): Promise<boolean> {
        const end: number = performance.now() + ms;
        while (!condition() && performance.now() < end) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        return condition();
    }

    /** Resolves when the page is idle (requestIdleCallback), at the latest after 3 s. */
    function idle(): Promise<void> {
        return new Promise(resolve => requestIdleCallback(() => resolve(), { timeout: 3000 }));
    }

    /** Returns `document` as text without the whitespace-only text nodes, e.g. the indentation of a file. */
    function withoutWhitespace(document: Document): string {
        const clone: Document = document.cloneNode(true) as Document;
        const walker: TreeWalker = clone.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        const blank: Node[] = [];
        while (walker.nextNode()) {
            if (walker.currentNode.textContent.trim() === "") {
                blank.push(walker.currentNode);
            }
        }
        blank.forEach(node => node.parentNode.removeChild(node));
        return new XMLSerializer().serializeToString(clone.documentElement);
    }

    /** Whether `browser` counts as Chromium-based for KeepWarm "auto" (a private static method). */
    function isChromiumBrowser(browser: object): boolean {
        return (OpenSheetMusicDisplay as any).isChromiumBrowser(browser);
    }

    /** A loaded and rendered instance, with KeepWarm true unless `options` says otherwise. */
    async function renderedInstance(options: object = {}): Promise<OpenSheetMusicDisplay> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, keepWarm: true, ...options });
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        return osmd;
    }

    function remove(osmd: OpenSheetMusicDisplay): void {
        osmd.clear();
        osmd.dispose();
        containerOf(osmd).remove();
    }

    it("the built-in score is test/data/OSMD_function_test_warm_keeper.musicxml (bin/make_warm_keeper_score.mjs)", async () => {
        const embedded: string = await MXLHelper.MXLtoXMLstring(atob(WarmKeeperScoreMxlBase64));
        const embeddedDocument: Document = new DOMParser().parseFromString(embedded, "text/xml");
        expect(withoutWhitespace(embeddedDocument)).to.equal(withoutWhitespace(TestUtils.getScore("OSMD_function_test_warm_keeper.musicxml")));
    });

    it("makes one keeper for the page after the first render(), shared by the instances, freed when the last one stops", async () => {
        const first: OpenSheetMusicDisplay = await renderedInstance();
        let second: OpenSheetMusicDisplay = undefined;
        try {
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "a keeper is made when the page is idle").to.equal(true);
            const keeper: OpenSheetMusicDisplay = pageKeeper();
            expect(containerOf(keeper).isConnected, "the keeper's container isn't in the page").to.equal(false);
            expect(containerOf(keeper).getElementsByTagName("*").length > 100, "the keeper rendered its score").to.equal(true);
            expect(keeper.KeepWarm, "the keeper doesn't use a keeper itself").to.equal(false);

            second = await renderedInstance();
            await idle();
            await idle();
            expect(pageKeeper(), "a second instance uses the same keeper").to.equal(keeper);

            first.KeepWarm = false;
            expect(pageKeeper(), "the second instance still uses it").to.equal(keeper);
            second.dispose();
            expect(pageKeeper(), "the last instance to stop frees it").to.equal(undefined);
            expect(keeper.GraphicSheet, "the freed keeper released its sheet").to.equal(undefined);

            first.KeepWarm = true;
            first.render();
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "a render() makes a new one").to.equal(true);
            first.KeepWarm = false;
            expect(pageKeeper(), "KeepWarm = false of the only instance that uses it frees it").to.equal(undefined);
        } finally {
            remove(first);
            if (second) {
                remove(second);
            }
        }
    });

    it("the option keepWarm: false makes no keeper, also not with setOptions()", async () => {
        const osmd: OpenSheetMusicDisplay = await renderedInstance({ keepWarm: false });
        try {
            expect(osmd.KeepWarm).to.equal(false);
            await idle(); // where a keeper would be made
            await idle(); // and loaded (load() is asynchronous), before it renders
            expect(pageKeeper(), "no keeper").to.equal(undefined);
            osmd.setOptions({ keepWarm: true });
            expect(osmd.KeepWarm, "setOptions() turns it on").to.equal(true);
            osmd.setOptions({ keepWarm: false });
            expect(osmd.KeepWarm, "setOptions() turns it off").to.equal(false);
        } finally {
            remove(osmd);
        }
    });

    it("renderNext() makes a keeper too", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, keepWarm: true });
        try {
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.renderNext();
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "a keeper is made when the page is idle").to.equal(true);
        } finally {
            remove(osmd);
        }
    });

    it("KeepWarm \"auto\" (default) makes a keeper in Chromium-based browsers only, in any test browser", async () => {
        // the browser detection decided both ways, so that this runs in Firefox (the default test browser) as well
        const detection: (browser: object) => boolean = (OpenSheetMusicDisplay as any).isChromiumBrowser;
        let chromium: boolean = false;
        (OpenSheetMusicDisplay as any).isChromiumBrowser = (): boolean => chromium;
        let osmd: OpenSheetMusicDisplay = undefined;
        try {
            osmd = await renderedInstance({ keepWarm: undefined });
            expect(osmd.KeepWarm, "auto by default").to.equal("auto");
            await idle(); // where a keeper would be made
            await idle(); // and loaded, before it renders
            expect(pageKeeper(), "no keeper outside Chromium").to.equal(undefined);
            osmd.KeepWarm = true;
            osmd.render();
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "true makes one in any browser").to.equal(true);
            osmd.KeepWarm = "auto";
            expect(pageKeeper(), "\"auto\" frees it outside Chromium").to.equal(undefined);

            chromium = true;
            osmd.render();
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "a keeper in Chromium").to.equal(true);
            osmd.KeepWarm = "auto";
            expect(pageKeeper() !== undefined, "\"auto\" keeps it in Chromium").to.equal(true);
            osmd.KeepWarm = false;
            expect(pageKeeper(), "false frees it in Chromium too").to.equal(undefined);
        } finally {
            (OpenSheetMusicDisplay as any).isChromiumBrowser = detection;
            if (osmd) {
                remove(osmd);
            }
        }
    });

    it("counts this test browser as Chromium-based exactly if it has userAgentData with the brand Chromium", () => {
        // Firefox and Safari have no navigator.userAgentData; Chromium has it on secure pages, like the test page (localhost)
        const brands: { brand: string }[] = (navigator as any).userAgentData?.brands ?? [];
        expect(isChromiumBrowser(navigator), navigator.userAgent).to.equal(brands.some(b => b.brand === "Chromium"));
    });

    it("counts Chromium-based browsers for \"auto\" from userAgentData, else from the user agent", () => {
        const chrome: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
        const edge: string = chrome + " Edg/142.0.0.0";
        const safari: string = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15";
        const chromeIos: string = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) " +
            "CriOS/142.0.0.0 Mobile/15E148 Safari/604.1";
        const firefox: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0";
        expect(isChromiumBrowser({ userAgent: chrome }), "Chrome").to.equal(true);
        expect(isChromiumBrowser({ userAgent: edge }), "Edge").to.equal(true);
        expect(isChromiumBrowser({ userAgent: safari }), "Safari").to.equal(false);
        expect(isChromiumBrowser({ userAgent: chromeIos }), "Chrome on iOS (WebKit)").to.equal(false);
        expect(isChromiumBrowser({ userAgent: firefox }), "Firefox").to.equal(false);
        expect(isChromiumBrowser({}), "no user agent").to.equal(false);
        const brands: (names: string[]) => object = (names: string[]) => ({ brands: names.map(brand => ({ brand })) });
        expect(isChromiumBrowser({ userAgent: safari, userAgentData: brands(["Not)A;Brand", "Chromium", "Google Chrome"]) }),
            "userAgentData first").to.equal(true);
        expect(isChromiumBrowser({ userAgent: chrome, userAgentData: brands(["Not)A;Brand", "Some Browser"]) }),
            "userAgentData without Chromium").to.equal(false);
        expect(isChromiumBrowser({ userAgent: chrome, userAgentData: { brands: [] } }), "empty brands: the user agent").to.equal(true);
    });
});
