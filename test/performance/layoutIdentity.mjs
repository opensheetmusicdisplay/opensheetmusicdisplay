// Corpus check in node (jsdom) for changes that must not change the layout: are the skyline/bottom-line arrays of every staff
// line (right after calculateSkyBottomLines() and after the whole render), the bounding boxes of all measures, staff entries,
// voice entries and notes, and every bounding box of every page tree (positions, borders, margins, sizes, rectangles)
// bit-identical between bundles? Compares hashes of the numbers' bit patterns (so -0 differs from 0).
// Usage (from the repository root): node test/performance/layoutIdentity.mjs export/ab/a.min.js,export/ab/b.min.js [filterRegex]
//   [--pageFormat=Endless|A4_P|...] [--renders=1 (compare the n-th render)] [--alignRests=0|1|2]
import FS from "fs";
import path from "path";
import { pathToFileURL } from "url";
import jsdom from "jsdom";

const positional = process.argv.slice(2).filter(a => !a.startsWith("--"));
const opt = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith("--")).map(a => a.slice(2).split("=")));
const [bundleList, filter] = positional;
const PAGE_FORMAT = opt.pageFormat || "Endless";
const RENDERS = Number(opt.renders || 1);
const ALIGN_RESTS = opt.alignRests !== undefined ? Number(opt.alignRests) : undefined;
const dom = new jsdom.JSDOM("<!DOCTYPE html></html>");
global.window = dom.window; global.document = dom.window.document; global.HTMLElement = dom.window.HTMLElement;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement; global.XMLHttpRequest = dom.window.XMLHttpRequest;
global.DOMParser = dom.window.DOMParser; global.Node = dom.window.Node;
Object.defineProperties(window.HTMLElement.prototype, {
    offsetLeft: { get: () => 0 }, offsetTop: { get: () => 0 }, offsetHeight: { get: () => 32767 }, offsetWidth: { get: () => 1440 } });

const f64 = new Float64Array(1); const u32 = new Uint32Array(f64.buffer);
/** FNV-1a over the bit patterns of the numbers (distinguishes -0, NaN payloads aside), plus undefined markers. */
function hashArrays (arrays) {
    let h = 0x811c9dc5;
    const mix = (v) => { h ^= v; h = Math.imul(h, 0x01000193) >>> 0; };
    for (const arr of arrays) {
        mix(arr ? arr.length : 0xffffffff);
        if (!arr) { continue; }
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (v === undefined) { mix(0xdeadbeef); continue; }
            f64[0] = v; mix(u32[0]); mix(u32[1]);
        }
    }
    return h.toString(16);
}
function staffLineArrays (graphic) {
    const arrays = [];
    for (const page of graphic.MusicPages) {
        for (const system of page.MusicSystems) {
            for (const staffLine of system.StaffLines) {
                arrays.push(staffLine.SkyBottomLineCalculator.SkyLine, staffLine.SkyBottomLineCalculator.BottomLine);
            }
        }
    }
    return arrays;
}

/** Absolute positions and borders of all staff entries, voice entries and notes (click detection, cursor, ...). */
function bboxArrays (graphic) {
    const values = [];
    const push = (ps) => {
        if (!ps) { values.push(NaN); return; }
        values.push(ps.AbsolutePosition.x, ps.AbsolutePosition.y, ps.RelativePosition.x, ps.RelativePosition.y,
            ps.BorderLeft, ps.BorderRight, ps.BorderTop, ps.BorderBottom);
    };
    for (const verticalMeasures of graphic.MeasureList) {
        for (const measure of verticalMeasures) {
            if (!measure) { continue; }
            push(measure.PositionAndShape);
            for (const staffEntry of measure.staffEntries) {
                push(staffEntry.PositionAndShape);
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    push(gve.PositionAndShape);
                    for (const note of gve.notes) { push(note.PositionAndShape); }
                }
            }
        }
    }
    return [values];
}

/** Every bounding box of every page tree (DFS over ChildElements): positions, borders, margins, size, rectangles. */
function treeArrays (graphic) {
    const values = [];
    const visit = (ps) => {
        values.push(ps.AbsolutePosition.x, ps.AbsolutePosition.y, ps.RelativePosition.x, ps.RelativePosition.y,
            ps.BorderLeft, ps.BorderRight, ps.BorderTop, ps.BorderBottom,
            ps.BorderMarginLeft, ps.BorderMarginRight, ps.BorderMarginTop, ps.BorderMarginBottom, ps.Size.width, ps.Size.height);
        for (const r of [ps.BoundingRectangle, ps.BoundingMarginRectangle]) { values.push(r?.x, r?.y, r?.width, r?.height); }
        values.push(ps.ChildElements.length);
        for (const child of ps.ChildElements) { visit(child); }
    };
    for (const page of graphic.MusicPages) { visit(page.PositionAndShape); }
    return [values];
}

const bundles = [];
for (const b of bundleList.split(",")) {
    const OSMD = (await import(pathToFileURL(path.resolve(b)).href + "?" + bundles.length)).default;
    const div = document.createElement("div"); document.body.appendChild(div);
    const osmd = new OSMD.OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", pageFormat: PAGE_FORMAT });
    osmd.setLogLevel("silent");
    if (ALIGN_RESTS !== undefined) { osmd.EngravingRules.AlignRests = ALIGN_RESTS; }
    const entry = { name: path.basename(b), OSMD, osmd, afterSky: [] };
    const proto = OSMD.VexFlowMusicSheetCalculator.prototype;
    const orig = proto.calculateSkyBottomLines;
    proto.calculateSkyBottomLines = function (...a) {
        const r = orig.apply(this, a);
        const arrays = [];
        for (const system of this.musicSystems) { for (const sl of system.StaffLines) { arrays.push(sl.SkyBottomLineCalculator.SkyLine, sl.SkyBottomLineCalculator.BottomLine); } }
        entry.afterSky.push(hashArrays(arrays));
        return r;
    };
    bundles.push(entry);
}
const files = FS.readdirSync("test/data").filter(f => /\.(xml|musicxml|mxl)$/.test(f) && (!filter || new RegExp(filter).test(f))).sort();
let same = 0; const diffs = []; let skipped = 0;
for (const f of files) {
    const raw = FS.readFileSync("test/data/" + f);
    const results = [];
    for (const b of bundles) {
        b.afterSky.length = 0;
        try {
            let input;
            if (f.endsWith(".mxl")) { input = await b.OSMD.MXLHelper.MXLtoXMLstring(raw); }
            else if (raw[0] === 0xFF && raw[1] === 0xFE) { input = raw.toString("utf16le", 2); }
            else { input = raw.toString(); }
            await b.osmd.load(input, f);
            for (let i = 1; i < RENDERS; i++) { b.osmd.render(); }
            b.afterSky.length = 0;
            b.osmd.render();
            results.push(b.afterSky.join("/") + "|" + hashArrays(staffLineArrays(b.osmd.GraphicSheet)) + "|bbox " + hashArrays(bboxArrays(b.osmd.GraphicSheet))
                + "|tree " + hashArrays(treeArrays(b.osmd.GraphicSheet)));
        } catch (e) {
            results.push("ERR " + (e?.message || e));
        }
    }
    if (results[0].startsWith("ERR") && results.every(r => r === results[0])) { skipped++; continue; }
    if (results.every(r => r === results[0])) { same++; } else { diffs.push(f + ": " + results.join(" vs ")); }
}
console.log(`[renders ${RENDERS}, pageFormat ${PAGE_FORMAT}, AlignRests ${ALIGN_RESTS ?? "default"}] ${files.length} samples: ${same} identical skyline/bottom-line arrays + bounding boxes, ${diffs.length} differing, ${skipped} not loadable in all bundles`);
for (const d of diffs) { console.log("  " + d); }
