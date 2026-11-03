// Vitest browser mode: runs test/**/*.ts in headless browsers through Playwright (karma did until 2026).
//   The Vite dev server transpiles each TypeScript file when the browser requests it (no type check: tsc does that) and
//   pre-bundles the CommonJS/UMD dependencies. VexFlow is served from its source, node_modules/vexflow/src, so a changed
//   VexFlowPatch is used right after npm run prebuild, without a stale pre-bundle.
// Test data: test/Util/vitestSetup.mjs gives the tests karma's window.__xml__ and window.__raw__, read from this server on
//   first use, and base/test/data/ URLs work as in karma.
// Browsers: TEST_BROWSERS, comma-separated: firefox and chrome, the installed ones. Default: firefox, as with karma.
// CI set: names in src and VexFlow are mangled, like in the minified build, which karma tested then (see mangleNames()).
// The config comes first, the functions it calls after it: function declarations, which JavaScript hoists.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { playwright } from "@vitest/browser-playwright";
// Vite 8's bundler (Oxc's parser and minifier), installed with vite
import { minifySync, parseSync } from "rolldown/utils";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [serveTestData(), ...(process.env.CI ? [mangleNames()] : [])],
    define: {
        global: "globalThis", // OSMD_ClearDispose_Test.ts uses Node's name, which webpack 5 provides
    },
    optimizeDeps: {
        // listed, so that they're pre-bundled before the first test file runs (found later, they'd reload the page)
        include: ["jszip", "loglevel", "typescript-collections"],
        exclude: ["vexflow"],
    },
    test: {
        include: ["test/**/*.ts"],
        exclude: ["test/Util/**"],
        globals: true,
        setupFiles: ["test/Util/vitestSetup.mjs"],
        testTimeout: 20000, // the mocha timeout under karma
        // no reporters set: on GitHub Actions (GITHUB_ACTIONS=true), Vitest's defaults are "default" and "github-actions",
        //   which shows failures as annotations in a PR's diff. --reporter=github-actions alone would replace "default":
        //   no test counts, durations or failure details in the log.
        // one page per worker for all its test files, like karma's one page: with a page per file (Vitest's default),
        //   Firefox took 78 s instead of 13 s for the 117 files, importing OSMD's ~450 modules again for each file
        isolate: false,
        // 2 pages at once, on every machine: about as fast as more pages, with much less memory. Measured in 2026-11 with
        //   the 861 tests on a laptop with 24 CPU threads (Windows, one run each; time, and the memory peak of Vitest and
        //   the browser together):
        //     pages                                    Firefox           Chrome
        //     1                                        17.6 s, 1.7 GB    12.5 s, 1.7 GB
        //     2                                        12.3 s, 2.4 GB     8.2 s, 2.3 GB
        //     4                                        10.8 s, 3.4 GB     6.4 s, 3.0 GB
        //     23, Vitest's default (CPU threads - 1)   16.1 s, 5.8 GB     7.1 s, 4.6 GB
        //   For one run: --maxWorkers=<pages>
        maxWorkers: 2,
        // localhost: Firefox took 4 s to reach the server (IPv6 first?), 127.0.0.1 0.2 s
        api: { host: "127.0.0.1" },
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: browserInstances(),
            // karma's FirefoxHeadless page size on Windows: the default 414 x 896 would break systems much earlier
            viewport: { width: 1366, height: 683 },
            screenshotFailures: false,
        },
    },
});

/** Serves test/data under base/test/data/, like karma (e.g. "base/test/data/x.mxl" in OSMD_Test.ts), relative to any
 *  page, and answers 404 for a missing file, as a web server does. */
function serveTestData() {
    const testData = path.join(import.meta.dirname, "test", "data");
    return {
        name: "osmd-test-data",
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                const match = /\/base\/test\/data\/([^?#]+)/.exec(request.url);
                if (!match) {
                    return next();
                }
                const file = path.join(testData, decodeURIComponent(match[1]));
                if (!file.startsWith(testData + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
                    response.statusCode = 404;
                    return response.end();
                }
                // bytes as they are: TestUtils decodes them (UTF-16 MusicXML through its byte order mark, MXL as binary)
                response.setHeader("Content-Type", "application/octet-stream");
                fs.createReadStream(file).pipe(response);
            });
        },
    };
}

/** Mangles the names of the classes and functions in src and VexFlow (e.g. OpenSheetMusicDisplay.name becomes "e"), like
 *  the minifier of the production build (build/opensheetmusicdisplay.min.js), so that tests catch code that depends on
 *  these names: karma tested the production build when CI was set. Oxc's mangler keeps the name of an exported
 *  declaration (`export class X`), so these become declarations plus an export list first (`class X {} export { X }`). */
function mangleNames() {
    return {
        name: "osmd-mangle-names",
        enforce: "post",
        transform(code, id) {
            const file = id.split("?")[0];
            if (!/[\\/](src|node_modules[\\/]vexflow[\\/]src)[\\/].*\.[jt]s$/.test(file)) {
                return undefined;
            }
            let unexported = "";
            let copiedUpTo = 0;
            const exported = [];
            for (const statement of parseSync(file + ".js", code, { sourceType: "module" }).program.body) {
                const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : undefined;
                if (declaration?.id && /^(ClassDeclaration|FunctionDeclaration)$/.test(declaration.type)) {
                    unexported += code.slice(copiedUpTo, statement.start); // without "export "
                    copiedUpTo = declaration.start;
                    exported.push(declaration.id.name);
                }
            }
            unexported += code.slice(copiedUpTo) + (exported.length ? `\nexport { ${exported.join(", ")} };\n` : "");
            const result = minifySync(file + ".js", unexported, { compress: false, mangle: { toplevel: true }, module: true });
            return { code: result.code, map: { mappings: "" } };
        },
    };
}

/** The browsers in TEST_BROWSERS (comma-separated: firefox, chrome; default: firefox), the installed ones: moz-firefox
 *  drives Firefox through WebDriver BiDi (Playwright's own Firefox build needs patches). */
function browserInstances() {
    const instances = {
        firefox: {
            browser: "firefox",
            provider: playwright({ launchOptions: { channel: "moz-firefox", executablePath: linuxFirefox() } }),
        },
        chrome: { browser: "chromium", name: "chrome", provider: playwright({ launchOptions: { channel: "chrome" } }) },
    };
    return (process.env.TEST_BROWSERS || "firefox").split(",").map((name) => instances[name.trim()]);
}

/** The installed Firefox on Linux, the first firefox on the PATH, as karma-firefox-launcher takes it: there, Playwright's
 *  moz-firefox channel looks only for /snap/bin/firefox, and GitHub's Ubuntu runners have /usr/bin/firefox.
 *  @returns {string | undefined} The path, undefined elsewhere (the channel finds it) or if there's none. */
function linuxFirefox() {
    if (process.platform !== "linux") {
        return undefined;
    }
    return (process.env.PATH || "").split(path.delimiter).map((folder) => path.join(folder, "firefox"))
        .find((file) => fs.existsSync(file));
}
