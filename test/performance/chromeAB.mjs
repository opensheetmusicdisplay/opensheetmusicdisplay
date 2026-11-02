// Paired, shuffled A/B timing of OSMD bundles in headless Chrome (page: chromeAB.html).
// All bundles are loaded into one page, each with its own OSMD instance. In every round, each bundle renders the sample once,
// in a shuffled order, and its time is divided by the first bundle's time of the same round. This is repeated in several
// fresh page sessions (each session compiles every bundle anew, so the JIT luck of one page averages out). Per sample and
// bundle, the result is the median of all paired ratios, and the range of the session medians.
// Measure a bundle against a copy of itself (null test) to see the noise: ~0.2-0.7% on average over the samples.
//
// Usage (from the repository root): node test/performance/chromeAB.mjs --bundles=export/ab/a.min.js,export/ab/b.min.js
//   [--samples=a.xml,b.musicxml] [--sessions=4] [--rounds=12] [--warm=3] [--mode=render|layout|frame|load] [--json=out.json]
//   [--port=8098]
// Modes:
//   render: the time of render() (JavaScript only; the browser's layout of the drawing happens after it, untimed),
//   layout: render() plus the browser's layout of the drawing (forced right after render()): the time until the score can
//     be shown. Use this for changes that can move work between render() and the browser, e.g. to or from forced layouts.
//   frame: render() until the next frame is painted (only the measured instance visible; noisier: waits for the frame),
//   load: the time of load().
// Besides the total, the phase timers of chromeAB.html are compared: layout (reCalculate(), including the skyline
// calculation), sky (calculateSkyBottomLines()) and draw (drawSheet()).
import FS from "fs";
import path from "path";
import { DEFAULT_SAMPLES, launchChrome, median, parseArgs, serveRepository } from "./chromeHarness.mjs";

const { options } = parseArgs();
if (!options.bundles) {
    console.log("Usage: node test/performance/chromeAB.mjs --bundles=a.min.js,b.min.js [--samples=...] [--sessions=4] [--rounds=12] "
        + "[--warm=3] [--mode=render|layout|frame|load] [--json=out.json] [--port=8098]");
    process.exit(1);
}
const BUNDLES = options.bundles.split(",");
const SAMPLES = options.samples ? options.samples.split(",") : DEFAULT_SAMPLES;
const SESSIONS = Number(options.sessions || 4);
const ROUNDS = Number(options.rounds || 12);
const WARM = Number(options.warm || 3);
const MODE = options.mode || "render";
const PORT = Number(options.port || 8098);

const server = serveRepository(PORT);
const chrome = await launchChrome("ab");
console.log(`${chrome.version}, mode ${MODE}, ${SESSIONS} sessions x ${ROUNDS} rounds, ${WARM} warm-up; base = ${BUNDLES[0]}`);

// raw[sample][bundle] = the timings of all rounds of all sessions, and per session
const raw = {};
for (let session = 0; session < SESSIONS; session++) {
    const query = new URLSearchParams({ bundles: BUNDLES.join(","), seed: String(1000 + session * 7919) });
    await chrome.navigate(`http://localhost:${PORT}/test/performance/chromeAB.html?${query}`);
    await chrome.evaluate("window.ready");
    for (const sample of SAMPLES) {
        const result = await chrome.evaluate(`runSample(${JSON.stringify(sample)}, ${ROUNDS}, ${WARM}, ${JSON.stringify(MODE)})`);
        raw[sample] ??= {};
        for (const bundle of BUNDLES) {
            raw[sample][bundle] ??= { total: [], layout: [], sky: [], draw: [], sessions: [] };
            const r = raw[sample][bundle];
            for (const key of ["total", "layout", "sky", "draw"]) {
                r[key].push(...result[bundle][key]);
            }
            r.sessions.push(result[bundle]);
        }
    }
    console.log(`session ${session + 1}/${SESSIONS} done`);
}

const percent = (x) => (x >= 0 ? "+" : "") + (100 * x).toFixed(1) + "%";
const shortName = (bundle) => path.basename(bundle).replace(/(\.min)?\.js$/, "");
const summary = {};
for (const sample of SAMPLES) {
    const base = raw[sample][BUNDLES[0]];
    let line = `${sample.slice(0, 30).padEnd(30)} base ${median(base.total).toFixed(1).padStart(6)} ms`;
    summary[sample] = {};
    for (const bundle of BUNDLES.slice(1)) {
        const r = raw[sample][bundle];
        const paired = (key) => median(r[key].map((t, i) => t / base[key][i] - 1));
        const sessionMedians = r.sessions.map((s, si) => median(s.total.map((t, i) => t / base.sessions[si].total[i] - 1)));
        const p = { total: paired("total"), layout: paired("layout"), sky: paired("sky"), draw: paired("draw"),
            sessionMin: Math.min(...sessionMedians), sessionMax: Math.max(...sessionMedians) };
        summary[sample][bundle] = p;
        line += ` | ${shortName(bundle)}: ${percent(p.total)} [${percent(p.sessionMin)}..${percent(p.sessionMax)}]`
            + ` (layout ${percent(p.layout)}, sky ${percent(p.sky)}, draw ${percent(p.draw)})`;
    }
    console.log(line);
}
const means = BUNDLES.slice(1).map(bundle => {
    const values = SAMPLES.map(sample => summary[sample][bundle]);
    const mean = (key) => values.reduce((sum, v) => sum + v[key], 0) / values.length;
    return `${shortName(bundle)}: total ${percent(mean("total"))}, layout ${percent(mean("layout"))}, sky ${percent(mean("sky"))}, `
        + `draw ${percent(mean("draw"))}`;
});
console.log("MEAN over samples: " + means.join(" | "));
if (options.json) {
    FS.writeFileSync(options.json, JSON.stringify({ version: chrome.version, bundles: BUNDLES, samples: SAMPLES, mode: MODE, raw, summary }));
}
await chrome.close();
server.close();
process.exit(0);
