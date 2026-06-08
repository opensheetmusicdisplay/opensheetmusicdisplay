// Drill-down: shows where geo and single-raster skylines diverge in one sample, mapped to measures,
// and dumps the geometric draw calls that touched the divergent columns.
// Usage: node test/performance/skylineDrill.mjs <sampleFilename> [threshold]
import FS from "fs";
import jsdom from "jsdom";
import OSMD from "../../build/opensheetmusicdisplay.min.js";

const sample = process.argv[2] || "OSMD_function_test_all.xml";
const threshold = parseFloat(process.argv[3] || "0.2");
const extraWarmups = parseInt(process.argv[4] || "0", 10);

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
const width = 1080;
const height = 32767;
Object.defineProperties(window.HTMLElement.prototype, {
    offsetLeft: { get: function () { return 0; } },
    offsetTop: { get: function () { return 0; } },
    offsetHeight: { get: function () { return height; } },
    offsetWidth: { get: function () { return width; } }
});

const osmd = new OSMD.OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", pageFormat: "Endless" });
osmd.setLogLevel("warn");
if (process.env.NEWSYSTEM_RULE) { // e.g. for test_octaveshift_extragraphicalmeasure, like generateImages --osmdtesting
    osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
}

// ---- capture hook (updateLines) ----
let capture = null;
function installUpdateLinesHook() {
    const calculator = osmd.graphic.MusicPages[0].MusicSystems[0].StaffLines[0].SkyBottomLineCalculator;
    const proto = Object.getPrototypeOf(calculator);
    const orig = proto.updateLines;
    proto.updateLines = function (results) {
        orig.call(this, results);
        if (capture) {
            const measures = this.StaffLineParent.Measures.map(m => ({
                number: m.MeasureNumber,
                x: m.PositionAndShape.RelativePosition.x,
                w: m.PositionAndShape.Size.width,
            }));
            capture.push({ sky: Array.from(this.SkyLine), bottom: Array.from(this.BottomLine), measures });
        }
    };
}

// ---- draw-call log hook (GeometricSkyBottomLineContext) ----
let drawLog = null; // array of per-measure call arrays; a new entry is started by each initialize(width>0)
function installContextHook() {
    const proto = OSMD.GeometricSkyBottomLineContext.prototype;
    const origInit = proto.initialize;
    proto.initialize = function (w, h) {
        if (drawLog !== null && w > 0) { drawLog.push({ width: Math.floor(w), calls: [] }); }
        return origInit.call(this, w, h);
    };
    for (const methodName of ["fill", "stroke"]) {
        const orig = proto[methodName];
        proto[methodName] = function () {
            if (drawLog !== null && drawLog.length > 0 && this.pathSegments.length > 0) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                const s = this.pathSegments;
                for (let i = 0; i < s.length; i += 2) {
                    if (s[i] < minX) { minX = s[i]; }
                    if (s[i] > maxX) { maxX = s[i]; }
                    if (s[i + 1] < minY) { minY = s[i + 1]; }
                    if (s[i + 1] > maxY) { maxY = s[i + 1]; }
                }
                drawLog[drawLog.length - 1].calls.push({
                    m: methodName, minX, maxX, minY, maxY,
                    lw: methodName === "stroke" ? this.currentLineWidth : undefined,
                    style: methodName === "stroke" ? this.currentStrokeStyle : this.currentFillStyle,
                });
            }
            return orig.call(this);
        };
    }
    const origFillRect = proto.fillRect;
    proto.fillRect = function (x, y, w, h) {
        if (drawLog !== null && drawLog.length > 0) {
            drawLog[drawLog.length - 1].calls.push({ m: "fillRect", minX: x, maxX: x + w, minY: y, maxY: y + h, style: this.currentFillStyle });
        }
        return origFillRect.call(this, x, y, w, h);
    };
    const origFillText = proto.fillText;
    proto.fillText = function (t, x, y) {
        if (drawLog !== null && drawLog.length > 0) {
            drawLog[drawLog.length - 1].calls.push({ m: "fillText", text: t, minX: x, maxX: x, minY: y, maxY: y, font: this.currentFont });
        }
        return origFillText.call(this, t, x, y);
    };
}

// per mode: fresh load + one captured (first) render with the mode under test.
// Renders are deterministic (re-renders equal the first render, see the state resets in
// VexFlowMusicSheetCalculator), so fresh loads give both modes identical input state.
// extraWarmups can insert extra renders before the capture (all equal anyway, kept for experiments).
async function render(geo) {
    osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geo;
    osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
    osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 9999999;
    await osmd.load(loadParameter, sample);
    for (let i = 0; i < extraWarmups; i++) { osmd.render(); }
    capture = [];
    if (geo) { drawLog = []; }
    osmd.render();
    const result = { capture, drawLog };
    capture = null;
    drawLog = null;
    return result;
}

let loadParameter = FS.readFileSync("test/data/" + sample);
if (sample.endsWith(".mxl")) {
    loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter);
} else {
    loadParameter = loadParameter.toString();
}
await osmd.load(loadParameter, sample);
osmd.render();
installUpdateLinesHook();
installContextHook();
const geoResult = await render(true);
const geo = geoResult.capture;
const log = geoResult.drawLog;
const single = (await render(false)).capture;

const samplingUnit = osmd.EngravingRules.SamplingUnit;
// global measure ordinal base per staffline (for drawLog lookup)
const measureOrdinalBase = [];
let ordinal = 0;
for (const g of geo) { measureOrdinalBase.push(ordinal); ordinal += g.measures.length; }
if (ordinal !== log.length) {
    console.log(`NOTE: drawLog has ${log.length} measures, captures have ${ordinal} (alignment may be off)`);
}

for (let i = 0; i < geo.length; i++) {
    const g = geo[i], s = single[i];
    const len = Math.min(g.sky.length, s.sky.length);
    const clusters = [];
    for (const part of ["sky", "bottom"]) {
        let current = null;
        for (let j = 0; j < len; j++) {
            const va = g[part][j], vb = s[part][j];
            const d = (Number.isNaN(va) || Number.isNaN(vb)) ? 0 : Math.abs(va - vb);
            if (d > threshold) {
                if (current && current.part === part && j === current.to + 1) {
                    current.to = j;
                    if (d > current.maxDiff) { current.maxDiff = d; current.geoVal = va; current.singleVal = vb; current.maxAt = j; }
                } else {
                    current = { part, from: j, to: j, maxDiff: d, geoVal: va, singleVal: vb, maxAt: j };
                    clusters.push(current);
                }
            }
        }
    }
    if (clusters.length === 0) { continue; }
    console.log(`staffline ${i}:`);
    for (const c of clusters) {
        const xUnits = c.maxAt / samplingUnit;
        const measureIndex = g.measures.findIndex(m => xUnits >= m.x && xUnits < m.x + m.w);
        const measure = g.measures[measureIndex];
        console.log(`  ${c.part} idx ${c.from}-${c.to} (x=${(c.from / samplingUnit).toFixed(1)}-${(c.to / samplingUnit).toFixed(1)}u)`
            + ` maxDiff=${c.maxDiff.toFixed(2)} geo=${c.geoVal?.toFixed(2)} raster=${c.singleVal?.toFixed(2)}`
            + ` -> measure ${measure ? measure.number : "?"} (globalOrdinal ${measureOrdinalBase[i] + measureIndex},`
            + ` localPx ${((c.maxAt / samplingUnit - (measure?.x ?? 0)) * 10).toFixed(0)})`);
        if (!measure) { continue; }
        // dump geometric draw calls overlapping the divergent columns (in measure-local device px)
        const localFrom = (c.from / samplingUnit - measure.x) * 10 - 2;
        const localTo = ((c.to + 1) / samplingUnit - measure.x) * 10 + 2;
        const entry = log[measureOrdinalBase[i] + measureIndex];
        if (!entry) { continue; }
        if (Math.abs(entry.width - Math.floor(measure.w * 10)) > 1) {
            console.log(`    (drawLog alignment mismatch: entry width ${entry.width} vs measure ${Math.floor(measure.w * 10)})`);
        }
        for (const call of entry.calls) {
            const xOverlap = call.maxX >= localFrom && call.minX <= localTo;
            const textNear = call.m === "fillText" && call.minX >= localFrom - 20 && call.minX <= localTo + 20;
            if (xOverlap || textNear) {
                if (call.m === "fillText") {
                    console.log(`    fillText "${call.text}" at x=${call.minX.toFixed(1)} y=${call.minY.toFixed(1)} font="${call.font}"`);
                } else {
                    console.log(`    ${call.m} x=[${call.minX.toFixed(1)}, ${call.maxX.toFixed(1)}] y=[${call.minY.toFixed(1)}, ${call.maxY.toFixed(1)}]`
                        + (call.lw !== undefined ? ` lw=${call.lw}` : "") + ` style=${call.style}`);
                }
            }
        }
    }
}
