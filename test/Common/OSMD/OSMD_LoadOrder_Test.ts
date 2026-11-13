import { expect, onTestFinished, vi } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * A load() that reads its content asynchronously (a URL, a Blob, an MXL string) and is superseded before it has finished, by
 * another load(), clear() or dispose(), doesn't set the sheet anymore. Before, the file that arrived last won: with
 * load("/a.xml") answered after 300 ms and load("/b.xml") after 20 ms, both promises resolved and the instance showed A,
 * and a file that arrived after clear() or dispose() was still set as the sheet.
 */
describe("OSMD load() order", () => {
    /** Stands in for XMLHttpRequest, as far as AJAX.ajax() uses it: the test answers each request when it chooses to. */
    class FakeXMLHttpRequest {
        public static readonly DONE: number = 4;
        /** The requests sent, in order. */
        public static requests: FakeXMLHttpRequest[] = [];
        public readyState: number = 0;
        public status: number = 0;
        public responseText: string = "";
        public timeout: number = 0;
        public url: string;
        public aborted: boolean = false;
        public onreadystatechange: () => void;
        public ontimeout: () => void;

        public open(method: string, url: string): void {
            this.url = url;
        }
        public overrideMimeType(): void {
            // not needed
        }
        public send(): void {
            FakeXMLHttpRequest.requests.push(this);
        }
        /** Like the browser's: the request is done, with status 0. */
        public abort(): void {
            this.aborted = true;
            this.readyState = FakeXMLHttpRequest.DONE;
            this.onreadystatechange?.();
        }
        /** The server's answer. An aborted request gets none. */
        public respond(text: string): void {
            if (this.aborted) {
                return;
            }
            this.status = 200;
            this.responseText = text;
            this.readyState = FakeXMLHttpRequest.DONE;
            this.onreadystatechange?.();
        }
    }

    /** Replaces XMLHttpRequest by the fake one until the test ends. */
    function useFakeRequests(): void {
        FakeXMLHttpRequest.requests = [];
        vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
        onTestFinished((): void => { vi.unstubAllGlobals(); });
    }

    /** How a load() ended: "loaded", or the Error it was rejected with. */
    function outcome(loading: Promise<{}>): Promise<"loaded" | Error> {
        return loading.then((): "loaded" => "loaded", (error: Error): Error => error);
    }

    function xmlString(sampleName: string): string {
        return new XMLSerializer().serializeToString(TestUtils.getScore(sampleName));
    }

    const sampleA: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
    const sampleB: string = "HelloWorld.xml";
    /** The number of measures of sample B, which sample A doesn't have. */
    let measuresOfB: number;
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        const measures: number[] = [];
        for (const sample of [sampleA, sampleB]) {
            await osmd.load(TestUtils.getScore(sample));
            measures.push(osmd.Sheet.SourceMeasures.length);
        }
        expect(measures[0], "the samples differ in their number of measures").not.to.equal(measures[1]);
        measuresOfB = measures[1];
        osmd.clear();
    });

    afterEach(() => {
        osmd.dispose();
        container.remove();
    });

    function expectAborted(result: "loaded" | Error, message: string): void {
        expect(result instanceof Error && result.name, message).to.equal("AbortError");
        expect((result as Error).message, message).to.match(/load\(\) was aborted/);
    }

    it("the last load() sets the sheet, also when an earlier URL is answered later; the earlier load() is rejected and its request aborted",
       async () => {
        useFakeRequests();
        const loadingA: Promise<"loaded" | Error> = outcome(osmd.load("/a.xml"));
        const loadingB: Promise<"loaded" | Error> = outcome(osmd.load("/b.xml"));
        const [requestA, requestB] = FakeXMLHttpRequest.requests;
        expect([requestA.url, requestB.url], "requests").to.deep.equal(["/a.xml", "/b.xml"]);
        expect([requestA.aborted, requestB.aborted], "aborted requests after the second load()").to.deep.equal([true, false]);

        requestB.respond(xmlString(sampleB));
        requestA.respond(xmlString(sampleA)); // nothing: it was aborted
        expect(await loadingB, "the second load()").to.equal("loaded");
        expectAborted(await loadingA, "the first load()");
        expect(osmd.Sheet.SourceMeasures.length, "measures of the loaded sheet (B's)").to.equal(measuresOfB);
    });

    it("without AbortController, a superseded load() is rejected too, and its file isn't set when it arrives last", async () => {
        useFakeRequests();
        vi.stubGlobal("AbortController", undefined); // e.g. Chrome before 66
        const loadingA: Promise<"loaded" | Error> = outcome(osmd.load("/a.xml"));
        const loadingB: Promise<"loaded" | Error> = outcome(osmd.load("/b.xml"));
        const [requestA, requestB] = FakeXMLHttpRequest.requests;
        expect(requestA.aborted, "the first request is aborted").to.equal(false);

        requestB.respond(xmlString(sampleB));
        expect(await loadingB, "the second load()").to.equal("loaded");
        requestA.respond(xmlString(sampleA));
        expectAborted(await loadingA, "the first load()");
        expect(osmd.Sheet.SourceMeasures.length, "measures of the loaded sheet (B's)").to.equal(measuresOfB);
    });

    it("a Blob that is still being read doesn't replace a sheet loaded after it", async () => {
        const loadingA: Promise<"loaded" | Error> = outcome(osmd.load(new Blob([xmlString(sampleA)])));
        const loadingB: Promise<"loaded" | Error> = outcome(osmd.load(TestUtils.getScore(sampleB))); // a Document: read at once
        expect(await loadingB, "the second load()").to.equal("loaded");
        expectAborted(await loadingA, "the first load()");
        expect(osmd.Sheet.SourceMeasures.length, "measures of the loaded sheet (B's)").to.equal(measuresOfB);
    });

    it("clear() and dispose() abort a load() in progress: its file isn't set as the sheet", async () => {
        useFakeRequests();
        for (const end of ["clear", "dispose"] as const) {
            const loading: Promise<"loaded" | Error> = outcome(osmd.load(`/${end}.xml`));
            const request: FakeXMLHttpRequest = FakeXMLHttpRequest.requests[FakeXMLHttpRequest.requests.length - 1];
            osmd[end]();
            expect(request.aborted, `the request is aborted by ${end}()`).to.equal(true);
            expectAborted(await loading, `load() before ${end}()`);
            expect(osmd.Sheet === undefined, `no sheet after ${end}()`).to.equal(true);

            const loadingBlob: Promise<"loaded" | Error> = outcome(osmd.load(new Blob([xmlString(sampleB)])));
            osmd[end]();
            expectAborted(await loadingBlob, `load() of a Blob before ${end}()`);
            expect(osmd.Sheet === undefined, `no sheet after ${end}(), Blob`).to.equal(true);
        }
    });

    it("a load() that fails is rejected with its own error, and the next load() works", async () => {
        useFakeRequests();
        const failing: Promise<"loaded" | Error> = outcome(osmd.load("/missing.xml"));
        const request: FakeXMLHttpRequest = FakeXMLHttpRequest.requests[0];
        request.status = 404;
        request.readyState = FakeXMLHttpRequest.DONE;
        request.onreadystatechange();
        const error: "loaded" | Error = await failing;
        expect(error instanceof Error && error.name, "the error's name").to.equal("Error");
        expect((error as Error).message).to.match(/Could not retrieve requested URL 404/);
        expect(await outcome(osmd.load(TestUtils.getScore(sampleB))), "a load() after the failed one").to.equal("loaded");
    });
});
