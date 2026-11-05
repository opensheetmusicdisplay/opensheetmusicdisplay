// Vitest setup file (vitest.config.mjs): the test data that karma's preprocessors put into the page (window.__xml__,
//   window.__raw__, read by TestUtils and a few tests); here these read a file from the test server when a test asks
//   for it.

import { afterEach, inject } from "vitest";

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
