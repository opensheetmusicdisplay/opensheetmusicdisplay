// CPU profiles (and wall-clock phase timers) of OSMD's render() and load() in headless Chrome, over the DevTools protocol
// (page: chromeProfile.html). For readable function names, profile a bundle built with webpack.names.mjs. Analyze the saved
// profiles with profileBreakdown.mjs (phases, origins, call tree) and allocationSites.mjs (--alloc).
//
// Usage (from the repository root): node test/performance/chromeProfile.mjs [--bundle=export/bundles/names/opensheetmusicdisplay.min.js]
//   [--samples=a.xml,b.musicxml] [--renders=10] [--warm=3] [--interval=100 (sampling interval, us)] [--save=export/prof/<name>]
//   [--profile=0 (timing only)] [--alloc (also a sampling heap profile of the renders)] [--loads=N (also profile N load() calls)]
//   [--paint=N (also time N renders until the next frame)] [--options={"drawTitle":false}] [--port=8095]
import FS from "fs";
import path from "path";
import { DEFAULT_SAMPLES, launchChrome, median, parseArgs, serveRepository } from "./chromeHarness.mjs";

const { options } = parseArgs();
const BUNDLE = options.bundle || "export/bundles/names/opensheetmusicdisplay.min.js";
const SAMPLES = options.samples ? options.samples.split(",") : DEFAULT_SAMPLES;
const RENDERS = Number(options.renders || 10);
const WARM = Number(options.warm || 3);
const INTERVAL = Number(options.interval || 100);
const SAVE = options.save;
const PORT = Number(options.port || 8095);
const LOADS = Number(options.loads || 0);
const PAINT = Number(options.paint || 0);
const PROFILE = options.profile !== "0";
if (SAVE) {
    FS.mkdirSync(SAVE, { recursive: true });
}

const server = serveRepository(PORT);
const chrome = await launchChrome("profile");
const { send, evaluate } = chrome;
await send("Runtime.enable");
await send("Profiler.enable");
await send("Profiler.setSamplingInterval", { interval: INTERVAL });
console.log(`${chrome.version}, bundle ${BUNDLE}, ${RENDERS} renders, ${WARM} warm-up, ${INTERVAL} us sampling interval`);

/**
 * Runs the expression in the page with the CPU profiler on, and saves the profile as <sample>.<kind>.cpuprofile.
 * @returns {Promise<*>} the expression's value
 */
async function profiled (expression, sample, kind) {
    await send("HeapProfiler.collectGarbage");
    await send("Profiler.start");
    const value = await evaluate(expression);
    const { profile } = await send("Profiler.stop");
    if (SAVE) {
        FS.writeFileSync(path.join(SAVE, `${sample}.${kind}.cpuprofile`), JSON.stringify(profile));
    }
    return value;
}

const results = [];
for (const sample of SAMPLES) {
    const query = new URLSearchParams({ bundle: BUNDLE, options: options.options || "{}" });
    await chrome.navigate(`http://localhost:${PORT}/test/performance/chromeProfile.html?${query}`);
    const info = await evaluate(`prepare(${JSON.stringify(sample)}, ${WARM})`);
    await send("HeapProfiler.collectGarbage");
    const timing = await evaluate(`renderN(${RENDERS})`);
    const row = { sample, info, timing };
    if (PROFILE) {
        row.profiledTiming = await profiled(`renderN(${RENDERS})`, sample, "render");
    }
    if (options.alloc) {
        // a sampling heap profile of the renders, including the objects that the GC already collected (= all allocations)
        await send("HeapProfiler.enable");
        await send("HeapProfiler.collectGarbage");
        await send("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true,
            includeObjectsCollectedByMinorGC: true });
        await evaluate(`renderN(${RENDERS})`);
        const { profile } = await send("HeapProfiler.stopSampling");
        if (SAVE) {
            FS.writeFileSync(path.join(SAVE, `${sample}.render.heapprofile`), JSON.stringify(profile));
        }
    }
    if (PAINT) {
        row.paint = await evaluate(`paintN(${PAINT})`);
    }
    if (LOADS) {
        row.loadTiming = await evaluate(`loadN(${LOADS})`);
        if (PROFILE) {
            row.profiledLoadTiming = await profiled(`loadN(${LOADS})`, sample, "load");
        }
    }
    results.push(row);
    const m = (key) => median(timing.map(t => t[key]));
    const share = (key) => (100 * m(key) / m("total")).toFixed(0) + "%";
    let line = `${sample.slice(0, 34).padEnd(34)} ${String(info.measures).padStart(4)} measures ${String(info.staves).padStart(2)} staves `
        + `${String(info.elements).padStart(6)} SVG elements | render ${m("total").toFixed(1).padStart(6)} ms: layout ${share("layout")}`
        + ` (xLayout ${share("xlayout")}, formatMeasures ${share("formatMeasures")}, sky ${share("sky")}) draw ${share("draw")}`;
    if (row.paint) {
        const p = (key) => median(row.paint.map(x => x[key])).toFixed(1);
        line += ` | then style+layout ${p("styleLayout")} ms, until frame ${p("untilFrame")} ms (js ${p("js")})`;
    }
    if (row.loadTiming) {
        line += ` | load ${median(row.loadTiming).toFixed(1)} ms`;
    }
    console.log(line);
}
if (SAVE) {
    FS.writeFileSync(path.join(SAVE, "timing.json"), JSON.stringify({ version: chrome.version, bundle: BUNDLE, results }, null, 1));
}
await chrome.close();
server.close();
process.exit(0);
