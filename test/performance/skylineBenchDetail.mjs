// Breakdown of the skyline phase: format() vs measure.draw() vs rest, per mode.
// Usage: node test/performance/skylineBenchDetail.mjs [sample1,sample2,...]
import FS from "fs";
import jsdom from "jsdom";
import OSMD from "../../build/opensheetmusicdisplay.min.js";

const SAMPLES = (process.argv[2] || "MuzioClementi_SonatinaOpus36No3_Part1.xml,Beethoven_AnDieFerneGeliebte.xml,ActorPreludeSample.xml").split(",");

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

let inSkyline = false;
let skylineMs = 0, formatMs = 0, drawMs = 0;
const calcProto = OSMD.VexFlowMusicSheetCalculator.prototype;
const origCalc = calcProto.calculateSkyBottomLines;
calcProto.calculateSkyBottomLines = function () {
    inSkyline = true;
    const t0 = performance.now();
    origCalc.call(this);
    skylineMs += performance.now() - t0;
    inSkyline = false;
};
for (const [proto, name, accumulate] of [
    [OSMD.VexFlowMeasure.prototype, "format", (ms) => { formatMs += ms; }],
    [OSMD.VexFlowMeasure.prototype, "draw", (ms) => { drawMs += ms; }],
    [OSMD.VexFlowMultiRestMeasure?.prototype, "draw", (ms) => { drawMs += ms; }],
]) {
    if (!proto) { continue; }
    const orig = proto[name];
    proto[name] = function (...args) {
        if (!inSkyline) { return orig.apply(this, args); }
        const t0 = performance.now();
        const result = orig.apply(this, args);
        accumulate(performance.now() - t0);
        return result;
    };
}

const MODES = {
    geo: (r) => { r.UseGeometricSkyBottomLineCalculation = true; },
    single: (r) => {
        r.UseGeometricSkyBottomLineCalculation = false;
        r.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        r.SkyBottomLineBatchMinMeasures = 9999999;
    },
};

for (const sample of SAMPLES) {
    let loadParameter = FS.readFileSync("test/data/" + sample);
    if (sample.endsWith(".mxl")) { loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter); }
    else { loadParameter = loadParameter.toString(); }
    await osmd.load(loadParameter, sample);
    osmd.render(); // warmup
    console.log(sample);
    for (const [modeName, applyMode] of Object.entries(MODES)) {
        applyMode(osmd.EngravingRules);
        osmd.render(); // mode warmup
        skylineMs = 0; formatMs = 0; drawMs = 0;
        const t0 = performance.now();
        osmd.render();
        const total = performance.now() - t0;
        const rest = skylineMs - formatMs - drawMs;
        console.log(`  ${modeName}: total ${total.toFixed(1)}ms | skyline ${skylineMs.toFixed(1)}ms`
            + ` = format ${formatMs.toFixed(1)} + draw ${drawMs.toFixed(1)} + rest ${rest.toFixed(1)}`);
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = true;
        osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 5;
    }
}
