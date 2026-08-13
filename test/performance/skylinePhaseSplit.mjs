// Splits the geometric skyline phase into: VexFlow format(), the context's own contour merging
// (all GeometricSkyBottomLineContext entry points), and the remaining draw traversal.
// Usage: node test/performance/skylinePhaseSplit.mjs
import FS from "fs";
import jsdom from "jsdom";
import OSMD from "../../build/opensheetmusicdisplay.min.js";

const SAMPLES = (process.argv[2] || "Beethoven_AnDieFerneGeliebte.xml,MuzioClementi_SonatinaOpus36No3_Part1.xml,ActorPreludeSample.xml").split(",");

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
let skylineMs = 0, formatMs = 0, drawMs = 0, contextMs = 0;
const calcProto = OSMD.VexFlowMusicSheetCalculator.prototype;
const origCalc = calcProto.calculateSkyBottomLines;
calcProto.calculateSkyBottomLines = function () {
    inSkyline = true;
    const t0 = performance.now();
    origCalc.call(this);
    skylineMs += performance.now() - t0;
    inSkyline = false;
};
for (const [proto, name, acc] of [
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
        acc(performance.now() - t0);
        return result;
    };
}
// time the context's own work: every public entry point that builds paths or merges contours
const ctxProto = OSMD.GeometricSkyBottomLineContext.prototype;
for (const name of ["fill", "stroke", "fillRect", "fillText", "drawCachedGlyphOutline", "measureText",
                    "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arc", "rect", "closePath"]) {
    const orig = ctxProto[name];
    ctxProto[name] = function (...args) {
        const t0 = performance.now();
        const result = orig.apply(this, args);
        contextMs += performance.now() - t0;
        return result;
    };
}

for (const sample of SAMPLES) {
    let loadParameter = FS.readFileSync("test/data/" + sample);
    if (sample.endsWith(".mxl")) { loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter); }
    else { loadParameter = loadParameter.toString(); }
    await osmd.load(loadParameter, sample);
    osmd.render(); // warmup (also fills the glyph/text caches)
    osmd.render();
    skylineMs = 0; formatMs = 0; drawMs = 0; contextMs = 0;
    osmd.render();
    const traversal = drawMs - contextMs;
    const rest = skylineMs - formatMs - drawMs;
    console.log(`${sample}: skyline ${skylineMs.toFixed(1)}ms = `
        + `format ${formatMs.toFixed(1)} (${(100 * formatMs / skylineMs).toFixed(0)}%)`
        + ` + traversal ${traversal.toFixed(1)} (${(100 * traversal / skylineMs).toFixed(0)}%)`
        + ` + contourMerging ${contextMs.toFixed(1)} (${(100 * contextMs / skylineMs).toFixed(0)}%)`
        + ` + rest ${rest.toFixed(1)} (${(100 * rest / skylineMs).toFixed(0)}%)`);
}
