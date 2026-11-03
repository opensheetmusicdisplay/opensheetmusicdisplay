// Vitest setup file (vitest.config.mjs): lets the tests written for karma and mocha run unchanged under Vitest.
// - Test data: karma's preprocessors put all of test/data into the page (window.__xml__, window.__raw__, read by
//   TestUtils and a few tests); here these read a file from the test server when a test asks for it.
// - mocha: its done callback (a test or hook function with a parameter), its `this` and it().timeout() (timeouts do
//   nothing: Vitest's testTimeout applies), and before()/after() as beforeAll()/afterAll().
//   Converting the tests (async functions, Vitest's hooks and timeouts) would make this part unnecessary.

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

/** Mocha's test context and the Test or Suite that it() and describe() return, as far as the tests use them. */
const mochaContext = {
    timeout: () => mochaContext,
    slow: () => mochaContext,
    retries: () => mochaContext,
};

/** Returns a mocha-style test or hook function as one Vitest runs the same way: a function with a parameter (mocha's
 *  done callback) as a promise that done() settles, and every function with mocha's context as `this`. */
function vitestFunction(fn) {
    if (typeof fn !== "function") {
        return fn;
    }
    if (fn.length === 0) {
        return () => fn.call(mochaContext);
    }
    return () => new Promise((resolve, reject) => {
        const done = (error) => {
            if (error) {
                reject(error instanceof Error ? error : new Error(`done() invoked with non-Error: ${error}`));
            } else {
                resolve();
            }
        };
        try {
            fn.call(mochaContext, done);
        } catch (error) {
            reject(error);
        }
    });
}

const vitestIt = globalThis.it;
const vitestDescribe = globalThis.describe;
/** Vitest's it() for a mocha-style test function. */
function it(name, fn, options) {
    vitestIt(name, vitestFunction(fn), options);
    return mochaContext;
}
it.only = (name, fn, options) => { vitestIt.only(name, vitestFunction(fn), options); return mochaContext; };
it.skip = (name, fn, options) => { vitestIt.skip(name, vitestFunction(fn), options); return mochaContext; };
globalThis.it = it;
/** Vitest's describe(), returning what mocha's does. */
function describe(name, fn, options) {
    vitestDescribe(name, fn, options);
    return mochaContext;
}
describe.only = (name, fn, options) => { vitestDescribe.only(name, fn, options); return mochaContext; };
describe.skip = (name, fn, options) => { vitestDescribe.skip(name, fn, options); return mochaContext; };
globalThis.describe = describe;

for (const hook of ["beforeAll", "afterAll", "beforeEach", "afterEach"]) {
    const vitestHook = globalThis[hook];
    globalThis[hook] = (fn, timeout) => vitestHook(vitestFunction(fn), timeout);
}
globalThis.before = globalThis.beforeAll;
globalThis.after = globalThis.afterAll;
