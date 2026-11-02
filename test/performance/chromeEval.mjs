// Evaluates a JavaScript expression against OSMD in headless Chrome for each sample (page: chromeProfile.html), after the
// sample was loaded and rendered (warm times), and prints the JSON values. For experiments: window.osmd is the OSMD instance,
// window.OSMD the bundle's exports, window.renderN(n) / paintN(n) / loadN(n) time renders and loads. The expression may
// return a promise.
//
// Usage (from the repository root): node test/performance/chromeEval.mjs --expr="renderN(3).map(t => t.total)"
//   [--bundle=export/bundles/names/opensheetmusicdisplay.min.js] [--samples=a.xml,b.musicxml] [--warm=1]
//   [--page=fakeBBox=1 (more chromeProfile.html parameters)] [--port=8096]
import { DEFAULT_SAMPLES, launchChrome, parseArgs, serveRepository } from "./chromeHarness.mjs";

const { options } = parseArgs();
if (!options.expr) {
    console.log("Usage: node test/performance/chromeEval.mjs --expr=\"...\" [--bundle=...] [--samples=...] [--warm=1] [--page=...]");
    process.exit(1);
}
const BUNDLE = options.bundle || "export/bundles/names/opensheetmusicdisplay.min.js";
const SAMPLES = options.samples ? options.samples.split(",") : DEFAULT_SAMPLES;
const WARM = Number(options.warm || 1);
const PORT = Number(options.port || 8096);

const server = serveRepository(PORT);
const chrome = await launchChrome("eval");
for (const sample of SAMPLES) {
    await chrome.navigate(`http://localhost:${PORT}/test/performance/chromeProfile.html?bundle=${encodeURIComponent(BUNDLE)}&${options.page || ""}`);
    await chrome.evaluate(`prepare(${JSON.stringify(sample)}, ${WARM})`);
    console.log(sample + " " + JSON.stringify(await chrome.evaluate(options.expr)));
}
await chrome.close();
server.close();
process.exit(0);
