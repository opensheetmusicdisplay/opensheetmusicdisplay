// Benchmark: osmd.render() total time and skyline-phase time, geometric vs raster calculations.
// Note: node-canvas getImageData is CPU-backed; in browsers (GPU canvases) the raster path pays an
// additional GPU->CPU sync penalty, so real-world raster numbers are typically worse than here.
// Usage: node test/performance/skylineBench.mjs [runsPerMode]
import FS from "fs";
import jsdom from "jsdom";
import OSMD from "../../build/opensheetmusicdisplay.min.js";

const RUNS = parseInt(process.argv[2] || "3", 10);
const SAMPLES = [
    "OSMD_function_test_all.xml",
    "Beethoven_AnDieFerneGeliebte.xml",
    "MuzioClementi_SonatinaOpus36No3_Part1.xml",
    "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
    "ScottJoplin_The_Entertainer.xml",
    "JosephHaydn_ConcertanteCello.xml",
    "ActorPreludeSample.xml",
];

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
document.body.appendChild(div);
Object.defineProperties(window.HTMLElement.prototype, {
    offsetLeft: { get: function () { return 0; } },
    offsetTop: { get: function () { return 0; } },
    offsetHeight: { get: function () { return 32767; } },
    offsetWidth: { get: function () { return 1080; } }
});

const osmd = new OSMD.OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", pageFormat: "Endless" });
osmd.setLogLevel("warn");

// wrap the skyline phase for timing
let skylineMs = 0;
const calcProto = OSMD.VexFlowMusicSheetCalculator.prototype;
const origCalcSkyBottomLines = calcProto.calculateSkyBottomLines;
calcProto.calculateSkyBottomLines = function () {
    const t0 = performance.now();
    origCalcSkyBottomLines.call(this);
    skylineMs += performance.now() - t0;
};

const MODES = {
    geo: (r) => { r.UseGeometricSkyBottomLineCalculation = true; },
    single: (r) => {
        r.UseGeometricSkyBottomLineCalculation = false;
        r.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        r.SkyBottomLineBatchMinMeasures = 9999999;
    },
    batch: (r) => {
        r.UseGeometricSkyBottomLineCalculation = false;
        r.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        r.SkyBottomLineBatchMinMeasures = 2;
        r.PreferredSkyBottomLineBatchCalculatorBackend = 0; // Plain
    },
};

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

const rows = [];
for (const sample of SAMPLES) {
    let loadParameter = FS.readFileSync("test/data/" + sample);
    if (sample.endsWith(".mxl")) { loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter); }
    else { loadParameter = loadParameter.toString(); }
    await osmd.load(loadParameter, sample);
    osmd.render(); // warmup + builds graphic
    let numMeasures = 0;
    let numStaffLines = 0;
    for (const page of osmd.graphic.MusicPages) {
        for (const system of page.MusicSystems) {
            for (const staffLine of system.StaffLines) {
                numStaffLines++;
                numMeasures += staffLine.Measures.length;
            }
        }
    }
    const result = { sample, numMeasures, numStaffLines, modes: {} };
    for (const [modeName, applyMode] of Object.entries(MODES)) {
        applyMode(osmd.EngravingRules);
        osmd.render(); // mode warmup
        const totals = [];
        const skylines = [];
        for (let i = 0; i < RUNS; i++) {
            skylineMs = 0;
            const t0 = performance.now();
            osmd.render();
            totals.push(performance.now() - t0);
            skylines.push(skylineMs);
        }
        result.modes[modeName] = { total: median(totals), skyline: median(skylines) };
        // restore defaults
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = true;
        osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 5;
    }
    rows.push(result);
    const g = result.modes.geo, s = result.modes.single, b = result.modes.batch;
    console.log(`${sample} (${numMeasures} measures, ${numStaffLines} stafflines)`);
    console.log(`  geo:    total ${g.total.toFixed(1)}ms, skyline ${g.skyline.toFixed(1)}ms (${(100 * g.skyline / g.total).toFixed(1)}%)`);
    console.log(`  single: total ${s.total.toFixed(1)}ms, skyline ${s.skyline.toFixed(1)}ms (${(100 * s.skyline / s.total).toFixed(1)}%)`
        + ` -> total x${(s.total / g.total).toFixed(2)}, skyline x${(s.skyline / g.skyline).toFixed(1)}`);
    console.log(`  batch:  total ${b.total.toFixed(1)}ms, skyline ${b.skyline.toFixed(1)}ms (${(100 * b.skyline / b.total).toFixed(1)}%)`
        + ` -> total x${(b.total / g.total).toFixed(2)}, skyline x${(b.skyline / g.skyline).toFixed(1)}`);
}

console.log("\n==== SUMMARY (median of " + RUNS + " runs; speedup factors are raster/geometric) ====");
console.log("sample | measures | geo total | geo skyline | single total (x) | batch total (x) | skyline x(single) | skyline x(batch)");
for (const r of rows) {
    const g = r.modes.geo, s = r.modes.single, b = r.modes.batch;
    console.log(`${r.sample} | ${r.numMeasures} | ${g.total.toFixed(0)}ms | ${g.skyline.toFixed(1)}ms`
        + ` | ${s.total.toFixed(0)}ms (x${(s.total / g.total).toFixed(2)}) | ${b.total.toFixed(0)}ms (x${(b.total / g.total).toFixed(2)})`
        + ` | x${(s.skyline / g.skyline).toFixed(1)} | x${(b.skyline / g.skyline).toFixed(1)}`);
}
