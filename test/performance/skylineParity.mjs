// Validation harness: compares skyline/bottomline arrays between the geometric calculation
// (GeometricSkyBottomLineContext) and the pixel-based (raster) calculations, for all test samples.
// The arrays are captured directly after SkyBottomLineCalculator.updateLines(), i.e. before later layout
// steps (lyrics, dynamics, ...) modify them, isolating the calculator difference.
// Values are in OSMD units (1 unit = 1 staff space = 10px). Differences < ~0.1 units are expected
// (raster quantizes to pixels and includes the anti-aliasing halo, geometric is exact).
//
// Usage: node test/performance/skylineParity.mjs [filterRegex] [maxSamples] [--with-batch]
// Captures come from the first render after a fresh load per mode - which equals all re-renders,
// since renders are deterministic (see the state resets in VexFlowMusicSheetCalculator).
import FS from "fs";
import jsdom from "jsdom";
import OSMD from "../../build/opensheetmusicdisplay.min.js";

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const withBatch = process.argv.includes("--with-batch");
const filterRegex = args[0] && args[0] !== "all" ? args[0] : "";
const maxSamples = args[1] ? parseInt(args[1], 10) : Infinity;

const dom = new jsdom.JSDOM("<!DOCTYPE html></html>");
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;
global.XMLHttpRequest = dom.window.XMLHttpRequest;
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;
global.Canvas = dom.window.Canvas;

const div = document.createElement("div");
div.id = "browserlessDiv";
document.body.appendChild(div);
const width = 1080;
const height = 32767;
div.width = width;
div.height = height;
div.setAttribute("width", width);
div.setAttribute("height", height);
div.setAttribute("offsetWidth", width);
Object.defineProperties(window.HTMLElement.prototype, {
    offsetLeft: { get: function () { return 0; } },
    offsetTop: { get: function () { return 0; } },
    offsetHeight: { get: function () { return height; } },
    offsetWidth: { get: function () { return width; } }
});

const osmd = new OSMD.OpenSheetMusicDisplay(div, {
    autoResize: false,
    backend: "svg",
    pageFormat: "Endless"
});
osmd.setLogLevel("warn");

// ---- capture hook ----
let capture = null; // when set to an array, every updateLines() result is pushed into it
let hookInstalled = false;
function installHook() {
    if (hookInstalled) { return; }
    const calculator = osmd.graphic.MusicPages[0]?.MusicSystems[0]?.StaffLines[0]?.SkyBottomLineCalculator;
    if (!calculator) { return; }
    const proto = Object.getPrototypeOf(calculator);
    const orig = proto.updateLines;
    proto.updateLines = function (results) {
        orig.call(this, results);
        if (capture) {
            capture.push({ sky: Array.from(this.SkyLine), bottom: Array.from(this.BottomLine) });
        }
    };
    hookInstalled = true;
}

const MODES = {
    geo: (r) => {
        r.UseGeometricSkyBottomLineCalculation = true;
    },
    single: (r) => { // per-staffline raster path (what the geometric code mirrors)
        r.UseGeometricSkyBottomLineCalculation = false;
        r.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        r.SkyBottomLineBatchMinMeasures = 9999999;
    },
    batch: (r) => { // batched Plain raster path (the production default for >= 5 measures)
        r.UseGeometricSkyBottomLineCalculation = false;
        r.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        r.SkyBottomLineBatchMinMeasures = 2;
        r.PreferredSkyBottomLineBatchCalculatorBackend = 0; // Plain
    },
};
const modeNames = withBatch ? ["geo", "single", "batch"] : ["geo", "single"];

// Per mode: fresh load + one captured (first) render with the mode under test.
// Re-renders are identical to the first render (state resets in
// VexFlowMusicSheetCalculator.calculateMeasureXLayout()/clearRecreatedObjects()), so the first
// render is the canonical state, and fresh loads give every mode identical input state.
// (--first-render is accepted for backwards compatibility, but is the default and only behavior now.)
async function capturedModeRender(modeName, loadParameter, sampleName) {
    MODES[modeName](osmd.EngravingRules);
    await osmd.load(loadParameter, sampleName);
    capture = [];
    osmd.render();
    const result = capture;
    capture = null;
    // restore defaults
    osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
    osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = true;
    osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 5;
    return result;
}

// ---- comparison ----
function compareCaptures(a, b) {
    const stats = {
        stafflineCountMismatch: a.length !== b.length,
        lengthMismatches: 0,
        nanMismatches: 0,
        total: 0,
        above02: 0,
        above05: 0,
        sumAbs: 0,
        maxSky: 0,
        maxBottom: 0,
        maxStaffline: -1,
        maxIndex: -1,
    };
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        const sa = a[i], sb = b[i];
        if (sa.sky.length !== sb.sky.length) { stats.lengthMismatches++; }
        const len = Math.min(sa.sky.length, sb.sky.length);
        for (let j = 0; j < len; j++) {
            for (const part of ["sky", "bottom"]) {
                const va = sa[part][j], vb = sb[part][j];
                const aNaN = Number.isNaN(va) || va === undefined;
                const bNaN = Number.isNaN(vb) || vb === undefined;
                if (aNaN || bNaN) {
                    if (aNaN !== bNaN) { stats.nanMismatches++; }
                    continue;
                }
                const d = Math.abs(va - vb);
                stats.total++;
                stats.sumAbs += d;
                if (d > 0.2) { stats.above02++; }
                if (d > 0.5) { stats.above05++; }
                const maxKey = part === "sky" ? "maxSky" : "maxBottom";
                if (d > stats[maxKey]) {
                    stats[maxKey] = d;
                    if (d >= Math.max(stats.maxSky, stats.maxBottom)) {
                        stats.maxStaffline = i;
                        stats.maxIndex = j;
                    }
                }
            }
        }
    }
    return stats;
}

function fmt(stats) {
    const mean = stats.total ? (stats.sumAbs / stats.total) : 0;
    let s = `maxSky=${stats.maxSky.toFixed(3)} maxBot=${stats.maxBottom.toFixed(3)} mean=${mean.toFixed(4)}`
        + ` >0.2u=${stats.above02} >0.5u=${stats.above05}`;
    if (stats.stafflineCountMismatch) { s += " STAFFLINE-COUNT-MISMATCH"; }
    if (stats.lengthMismatches) { s += ` LEN-MISMATCH=${stats.lengthMismatches}`; }
    if (stats.nanMismatches) { s += ` NaN-MISMATCH=${stats.nanMismatches}`; }
    return s;
}

// ---- main ----
const sampleDir = "test/data";
let samples = FS.readdirSync(sampleDir).filter(f => f.match(/^.*(([.]xml)|([.]musicxml)|([.]mxl))$/));
if (filterRegex) { samples = samples.filter(f => f.match(filterRegex)); }
samples = samples.slice(0, maxSamples);
console.log(`comparing ${modeNames.join(" vs ")} for ${samples.length} samples`);

const report = {};
let failed = 0;
const aggregate = { geoVsSingle: { maxSky: 0, maxBottom: 0, above05: 0, above02: 0, total: 0, sumAbs: 0 } };
for (const sample of samples) {
    let loadParameter = FS.readFileSync(sampleDir + "/" + sample);
    try {
        if (sample.endsWith(".mxl")) {
            loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter);
        } else {
            loadParameter = loadParameter.toString();
        }
        if (!hookInstalled) {
            await osmd.load(loadParameter, sample);
            osmd.render(); // throwaway render to get a calculator instance for the hook
            installHook();
            // self-consistency check: the same mode captured from two fresh loads must be identical
            for (const modeName of modeNames) {
                const c1 = await capturedModeRender(modeName, loadParameter, sample);
                const c2 = await capturedModeRender(modeName, loadParameter, sample);
                const selfStats = compareCaptures(c1, c2);
                if (selfStats.maxSky > 0 || selfStats.maxBottom > 0 || selfStats.stafflineCountMismatch) {
                    console.log(`WARNING: ${modeName} render not self-consistent: ${fmt(selfStats)}`);
                }
            }
        }
        const captures = {};
        for (const modeName of modeNames) {
            captures[modeName] = await capturedModeRender(modeName, loadParameter, sample);
        }
        const geoVsSingle = compareCaptures(captures.geo, captures.single);
        let line = `${sample} [${captures.geo.length} stafflines] geo~single: ${fmt(geoVsSingle)}`;
        report[sample] = { geoVsSingle };
        if (withBatch) {
            const singleVsBatch = compareCaptures(captures.single, captures.batch);
            line += ` | single~batch(noise): ${fmt(singleVsBatch)}`;
            report[sample].singleVsBatch = singleVsBatch;
        }
        console.log(line);
        const agg = aggregate.geoVsSingle;
        agg.maxSky = Math.max(agg.maxSky, geoVsSingle.maxSky);
        agg.maxBottom = Math.max(agg.maxBottom, geoVsSingle.maxBottom);
        agg.above02 += geoVsSingle.above02;
        agg.above05 += geoVsSingle.above05;
        agg.total += geoVsSingle.total;
        agg.sumAbs += geoVsSingle.sumAbs;
    } catch (ex) {
        failed++;
        console.log(`${sample} FAILED: ${ex.message?.split("\n")[0]}`);
    }
}

const agg = aggregate.geoVsSingle;
console.log("\n==== AGGREGATE geo~single ====");
console.log(`samples: ${samples.length - failed} ok, ${failed} failed to load/render`);
console.log(`values compared: ${agg.total}, mean abs diff: ${(agg.sumAbs / Math.max(1, agg.total)).toFixed(5)} units`);
console.log(`max sky diff: ${agg.maxSky.toFixed(3)}, max bottom diff: ${agg.maxBottom.toFixed(3)} units`);
console.log(`values >0.2u: ${agg.above02} (${(100 * agg.above02 / Math.max(1, agg.total)).toFixed(3)}%), >0.5u: ${agg.above05}`);
const worst = Object.entries(report)
    .sort((a, b) => Math.max(b[1].geoVsSingle.maxSky, b[1].geoVsSingle.maxBottom) - Math.max(a[1].geoVsSingle.maxSky, a[1].geoVsSingle.maxBottom))
    .slice(0, 12);
console.log("\nworst samples (geo~single):");
for (const [name, r] of worst) {
    console.log(`  ${name}: ${fmt(r.geoVsSingle)}`);
}
FS.writeFileSync("export/skylineParity.json", JSON.stringify(report, null, 1));
console.log("\ndetails written to export/skylineParity.json");
