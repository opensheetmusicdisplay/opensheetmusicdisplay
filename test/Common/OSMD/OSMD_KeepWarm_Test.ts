import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";
import { WarmKeeperScoreMxlBase64 } from "../../../src/OpenSheetMusicDisplay/WarmKeeperScore";

/**
 * The warm keeper (OpenSheetMusicDisplay.KeepWarm): after the first render() or renderNext() of an instance that uses it, OSMD
 * renders a built-in score when the page is idle, into a container that isn't in the page, and keeps it, so that the JavaScript
 * engine keeps the code it compiled for OSMD's objects after clear(). One keeper per page, shared by the instances that use it,
 * freed when the last of them stops (dispose(), KeepWarm = false). These tests check when it's made and freed, not the speed.
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

    async function renderedInstance(options: object = {}): Promise<OpenSheetMusicDisplay> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, ...options });
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
            expect(first.KeepWarm, "on by default").to.equal(true);
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
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        try {
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.renderNext();
            expect(await waitFor(() => pageKeeper() !== undefined, 5000), "a keeper is made when the page is idle").to.equal(true);
        } finally {
            remove(osmd);
        }
    });
});
