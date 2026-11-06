// Vitest browser mode: runs test/**/*.ts in headless browsers through Playwright (karma did until 2026).
//   The Vite dev server transpiles each TypeScript file when the browser requests it (no type check: tsc does that) and
//   pre-bundles the CommonJS/UMD dependencies. VexFlow is served from its source, node_modules/vexflow/src, so a changed
//   VexFlowPatch is used right after its copy there, without a stale pre-bundle. The config makes the copy itself when
//   Vitest starts (copyDependencyPatches()), also for a direct npx vitest, which skips npm test's pretest.
// Test data: test/Util/vitestSetup.mjs gives the tests karma's window.__xml__ and window.__raw__, read from this server on
//   first use, and base/test/data/ URLs work as in karma.
// Browsers: TEST_BROWSERS, comma-separated: firefox and chrome, the installed ones. Default: firefox, as with karma.
// CI set: names in src and VexFlow are mangled, like in the minified build, which karma tested then (see mangleNames()).
// TEST_LOW_MEMORY set: the browsers collect garbage more often, for machines with little free RAM (see browserInstances()).
// The config comes first, the functions it calls after it: function declarations, which JavaScript hoists.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { playwright } from "@vitest/browser-playwright";
// Vite 8's bundler (Oxc's parser and minifier), installed with vite
import { minifySync, parseSync } from "rolldown/utils";
import { defineConfig } from "vitest/config";

copyDependencyPatches();

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
        // for vitestSetup.mjs: whether to collect garbage after a test that left much in use (TEST_LOW_MEMORY)
        provide: { lowMemory: Boolean(process.env.TEST_LOW_MEMORY) },
        testTimeout: 20000, // the mocha timeout under karma
        // the diff a failing comparison prints (to.equal(), deep.equal(), toEqual(), members(), ...): values 4 levels deep,
        //   not 20 (Vitest's default). Two different OSMD objects lead to most of the sheet in 20 levels: two graphical
        //   measures of a 4-measure sample printed 1.4 MB (21,600 lines), 600 lines now. Data nested up to 4 levels (e.g. an
        //   array of objects of arrays of objects) prints in full, as before. For objects, expect(a === b, "the same
        //   measure").to.equal(true) prints only the message, also with b undefined (to.equal(undefined) prints the object)
        diff: { maxDepth: 4 },
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

/** Copies the dependency patches into node_modules, as npm run prebuild does (which npm test and test:watch run first),
 *  so that Vitest started directly (npx vitest, an editor's Vitest extension) doesn't test the previous patch after a
 *  merge, rebase or checkout that changed one. The copies are the ncp calls of package.json's prebuild scripts (here
 *  src/VexFlowPatch/src/ -> node_modules/vexflow/src/), so further copies a fork adds there come along.
 *  Writes only the files whose content differs, each through a temporary file renamed over the copy, so that parallel
 *  Vitest runs don't read a half-written file. */
function copyDependencyPatches() {
    const root = import.meta.dirname;
    const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {};
    let copied = 0;
    for (const [name, command] of Object.entries(scripts)) {
        if (!name.startsWith("prebuild")) {
            continue;
        }
        for (const [, from, to] of command.matchAll(/\bncp\s+(\S+)\s+(\S+)/g)) {
            const fromFolder = path.join(root, from);
            if (!fs.existsSync(fromFolder) || !fs.existsSync(path.dirname(path.join(root, to)))) {
                continue; // no patches, or the dependency isn't installed: npm install copies them
            }
            for (const file of fs.readdirSync(fromFolder, { recursive: true })) {
                const source = path.join(fromFolder, file);
                const target = path.join(root, to, file);
                if (!fs.statSync(source).isFile()) {
                    continue;
                }
                const content = fs.readFileSync(source);
                if (fs.existsSync(target) && content.equals(fs.readFileSync(target))) {
                    continue;
                }
                fs.mkdirSync(path.dirname(target), { recursive: true });
                const temp = `${target}.${process.pid}.tmp`;
                fs.writeFileSync(temp, content);
                try {
                    fs.renameSync(temp, target);
                } catch {
                    fs.rmSync(temp, { force: true }); // Windows: another process has the file open
                    fs.writeFileSync(target, content);
                }
                copied++;
            }
        }
    }
    if (copied > 0) {
        process.stdout.write(`vitest.config.mjs: copied ${copied} changed patch file(s) into node_modules (npm run prebuild)\n`);
    }
}

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
 *  drives Firefox through WebDriver BiDi (Playwright's own Firefox build needs patches).
 *  With TEST_LOW_MEMORY, they collect garbage more often: most of what the tests allocate is garbage soon, but it's
 *  collected only as the heap grows, so it piles up to about 1 GB over the run (on top of the fixed cost, see below).
 *  Chrome gets gc() and exact heap sizes, and vitestSetup.mjs collects after a test that leaves over 100 MB of JS heap in
 *  use; Firefox (no gc() for pages) grows its heap by 20% instead of 50-200% before it collects, and collects after
 *  every 8 MB allocated instead of 27 MB. Measured in 2026-11 with the 936 tests, 2 pages (two runs each; time, the memory
 *  peak of Vitest and the browser together, and how much less free RAM the machine had at the low point):
 *    Chrome:  7.6-7.8 s, 2.4-2.6 GB, 1.8-1.9 GB  ->  8.8-9.0 s, 2.0-2.1 GB, 1.4-1.5 GB
 *             (gc() after each test: 36.5 s, 1.9 GB, 1.1 GB)
 *    Firefox: 11.4-12.2 s, 3.0 GB, 2.4-2.6 GB  ->  12.8-13.3 s, 2.6-2.7 GB, 2.0-2.4 GB
 *  About 1.8 GB of it is Vitest, the browser and OSMD's modules in both pages, which no garbage collection frees.
 *  One page (--maxWorkers=1) saves about as much again, but takes 50% longer: Firefox 18.7 s, 2.2 GB, 1.8 GB with
 *  TEST_LOW_MEMORY. */
function browserInstances() {
    const lowMemory = Boolean(process.env.TEST_LOW_MEMORY);
    const firefoxPrefs = lowMemory ? {
        "javascript.options.mem.gc_high_frequency_small_heap_growth": 120,
        "javascript.options.mem.gc_high_frequency_large_heap_growth": 120,
        "javascript.options.mem.gc_low_frequency_heap_growth": 120,
        "javascript.options.mem.gc_allocation_threshold_mb": 8,
    } : undefined;
    const chromeArgs = lowMemory ? ["--js-flags=--expose-gc", "--enable-precise-memory-info"] : undefined;
    const instances = {
        firefox: {
            browser: "firefox",
            provider: playwright({
                launchOptions: { channel: "moz-firefox", executablePath: linuxFirefox(), firefoxUserPrefs: firefoxPrefs },
            }),
        },
        chrome: {
            browser: "chromium",
            name: "chrome",
            provider: playwright({ launchOptions: { channel: "chrome", args: chromeArgs } }),
        },
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
