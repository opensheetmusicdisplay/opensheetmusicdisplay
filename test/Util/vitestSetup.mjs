// Vitest setup file (vitest.config.mjs): the test data that karma's preprocessors put into the page (window.__xml__,
//   window.__raw__, read by TestUtils and a few tests); here these read a file from the test server when a test asks
//   for it. And after each test file, it frees the OSMD instances and the containers that the file leaves.

import { afterAll, afterEach, beforeAll, inject } from "vitest";
import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

// After each test file, free what it leaves: with isolate: false (vitest.config.mjs), Vitest keeps every test file's
//   functions until the run ends, and with them the OSMD instances that the files keep in variables (e.g. one per
//   describe()), each with its loaded sheet and its drawing; and the containers that tests added to the page stay in it.
//   clear() releases the sheet and the drawing, dispose() the listeners, and the containers are removed. Measured in
//   2026-11 (2 Firefox pages, 4 runs each): the 951 tests here peaked at 2.8 instead of 2.9 GB, as fast as before, and a
//   page no longer keeps 44,000 elements in 177 containers until the end; a suite whose instances hold more per sheet
//   (e.g. playback data) peaked at 3.2 instead of 4.1-4.7 GB, and ran 5% faster. Only the containers, without clear(),
//   saved nothing.
const loadedInstances = new Set();
const load = OpenSheetMusicDisplay.prototype.load;
OpenSheetMusicDisplay.prototype.load = function (...args) {
    loadedInstances.add(this);
    return load.apply(this, args);
};
let elementsBefore;
beforeAll(() => {
    elementsBefore = new Set(document.body.children);
});
// setup files' hooks come first, so this runs after the file's own afterAll() hooks
afterAll(() => {
    for (const osmd of loadedInstances) {
        osmd.clear();
        osmd.dispose();
    }
    loadedInstances.clear();
    for (const element of [...document.body.children]) {
        if (!elementsBefore.has(element)) {
            element.remove();
        }
    }
});

/** Reads a file of test/data from the test server (base/test/data/, see vitest.config.mjs) synchronously, as the tests
 *  read window.__xml__ and window.__raw__.
 *  @param {string} path The file's path in the repository, e.g. test/data/HelloWorld.xml.
 *  @param {string} [mimeType] The type to decode the response as, e.g. "text/plain; charset=x-user-defined" for bytes.
 *  @returns {string | undefined} The file's text (a byte order mark decides the encoding and is removed, as
 *    karma-xml2js-preprocessor does for UTF-16 MusicXML), undefined if the server doesn't have the file. */
function readTestFile(path, mimeType) {
    const request = new XMLHttpRequest();
    request.open("GET", "/base/" + path, false);
    if (mimeType) {
        request.overrideMimeType(mimeType);
    }
    request.send();
    return request.status === 200 ? request.responseText : undefined;
}

const scores = new Map();
// karma-xml2js-preprocessor's window.__xml__: the parsed MusicXML documents by path, each parsed once
window.__xml__ = new Proxy({}, {
    get(target, path) {
        if (typeof path !== "string") {
            return undefined;
        }
        if (!scores.has(path)) {
            const xml = readTestFile(path);
            scores.set(path, xml === undefined ? undefined : new DOMParser().parseFromString(xml, "text/xml"));
        }
        return scores.get(path);
    },
});
// karma-base64-to-js-preprocessor's window.__raw__: MXL files by path (without .base64), one character per byte
window.__raw__ = new Proxy({}, {
    get(target, path) {
        if (typeof path !== "string") {
            return undefined;
        }
        const bytes = readTestFile(path, "text/plain; charset=x-user-defined");
        // x-user-defined decodes the bytes 0x80-0xff as U+F780-U+F7FF
        return bytes?.replace(/[-]/g, (char) => String.fromCharCode(char.charCodeAt(0) & 0xff));
    },
});

// TEST_LOW_MEMORY (see browserInstances() in vitest.config.mjs): in Chrome, which then has gc() and exact heap sizes,
//   collect the garbage of a test that left over 100 MB of JS heap in use. After every test would make the run 5 times
//   slower; 100 MB keeps it 10-15% slower and takes most of what collecting saves.
if (inject("lowMemory") && typeof globalThis.gc === "function" && performance.memory) {
    afterEach(() => {
        if (performance.memory.usedJSHeapSize > 100 * 2 ** 20) {
            globalThis.gc();
        }
    });
}
