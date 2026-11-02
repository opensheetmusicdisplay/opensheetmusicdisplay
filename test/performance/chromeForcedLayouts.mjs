// Counts the forced layouts of one render() per sample over the whole test/data corpus in headless Chrome: the getBBox()
// calls, e.g. of VexFlow's SVGContext.measureText(), which make the browser lay out everything drawn so far. Reports them by
// VexFlow caller (from a stack trace; readable with a bundle built with webpack.names.mjs) and the samples with the most time
// in them (page: chromeProfile.html).
// Note: the time of a forced layout is mostly layout work that the browser would do anyway after render() (it lays out
// incrementally), so avoiding them makes render() return sooner, but not the score appear sooner (measure with chromeAB.mjs
// --mode=layout).
//
// Usage (from the repository root): node test/performance/chromeForcedLayouts.mjs [--bundle=export/bundles/names/opensheetmusicdisplay.min.js]
//   [--filter=regex] [--port=8097]
import FS from "fs";
import { launchChrome, parseArgs, serveRepository } from "./chromeHarness.mjs";

const { options } = parseArgs();
const BUNDLE = options.bundle || "export/bundles/names/opensheetmusicdisplay.min.js";
const PORT = Number(options.port || 8097);
let samples = FS.readdirSync("test/data").filter(f => /\.(xml|musicxml|mxl)$/i.test(f) && !/^OSMD_function_test_Error/.test(f));
if (options.filter) {
    samples = samples.filter(f => new RegExp(options.filter).test(f));
}

const server = serveRepository(PORT);
const chrome = await launchChrome("forcedlayouts");
await chrome.navigate(`http://localhost:${PORT}/test/performance/chromeProfile.html?bundle=${encodeURIComponent(BUNDLE)}&timers=0`);
await chrome.evaluate("window.ready");
// log every getBBox() call with its caller (the stack frame below SVGContext.measureText, if any), the text and the time
await chrome.evaluate(`(() => {
    const orig = SVGGraphicsElement.prototype.getBBox;
    window.bboxLog = [];
    SVGGraphicsElement.prototype.getBBox = function (...args) {
        const t0 = performance.now();
        const result = orig.apply(this, args);
        const stack = new Error().stack.split("\\n").map(s => s.trim().split(" ")[1]).filter(Boolean);
        const i = stack.indexOf("SVGContext.measureText");
        window.bboxLog.push({ caller: i >= 0 ? stack[i + 1] : stack[1], text: (this.textContent || "").slice(0, 12), ms: performance.now() - t0 });
        return result;
    };
    return true;
})()`);
const byCaller = new Map();
let rendered = 0;
let withCalls = 0;
let totalCalls = 0;
let totalMs = 0;
const perSample = [];
for (const sample of samples) {
    let log;
    try {
        await chrome.evaluate(`(async () => {
            await prepare(${JSON.stringify(sample)}, 0);
            window.bboxLog = [];
            osmd.render();
        })()`);
        log = await chrome.evaluate("window.bboxLog");
    } catch (e) {
        console.log(`skipped ${sample}: ${e.message.slice(0, 100)}`);
        continue;
    }
    rendered++;
    withCalls += log.length ? 1 : 0;
    totalCalls += log.length;
    const ms = log.reduce((sum, entry) => sum + entry.ms, 0);
    totalMs += ms;
    perSample.push({ sample, calls: log.length, ms });
    for (const entry of log) {
        const v = byCaller.get(entry.caller) || { calls: 0, ms: 0, samples: new Set(), texts: new Set() };
        v.calls++;
        v.ms += entry.ms;
        v.samples.add(sample);
        v.texts.add(entry.text);
        byCaller.set(entry.caller, v);
    }
}
console.log(`${rendered} samples rendered, ${withCalls} with forced layouts, ${totalCalls} getBBox() calls, ${totalMs.toFixed(0)} ms in them`);
for (const [caller, v] of [...byCaller.entries()].sort((a, b) => b[1].ms - a[1].ms)) {
    console.log(`${String(caller).padEnd(40)} ${String(v.calls).padStart(5)} calls ${v.ms.toFixed(0).padStart(6)} ms in ${String(v.samples.size).padStart(3)}`
        + ` samples, texts: ${[...v.texts].slice(0, 8).map(t => JSON.stringify(t)).join(" ")}`);
}
console.log("samples with the most time in getBBox():");
for (const s of perSample.sort((a, b) => b.ms - a.ms).slice(0, 12)) {
    console.log(`  ${s.ms.toFixed(1).padStart(7)} ms ${String(s.calls).padStart(4)} calls  ${s.sample}`);
}
await chrome.close();
server.close();
process.exit(0);
