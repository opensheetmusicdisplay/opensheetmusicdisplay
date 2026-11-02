// Breakdown of CPU profiles of OSMD's render() or load() (*.render.cpuprofile / *.load.cpuprofile from chromeProfile.mjs):
// a table of the phases (skyline, X layout, final format, line breaks, ..., drawing), the share of VexFlow's Formatter, self
// time by code origin (VexFlow / OSMD / native, e.g. DOM calls / GC), the top self time by Class.method, and optionally the
// aggregated call tree. Times are weighted by the profile's timeDeltas. The frames are mapped to classes (with acorn, which
// webpack depends on) and to modules (webpack's ";// ./path" markers) of the profiled bundle, which must be built with
// webpack.names.mjs (readable function names, module markers).
// Usage (from the repository root): node test/performance/profileBreakdown.mjs <dir with *.render.cpuprofile | files...>
//   [--bundle=export/bundles/names/opensheetmusicdisplay.min.js] [--kind=render|load] [--top=40]
//   [--tree --root=render --depth=4 --min=1 (call tree below a function, entries >= min %)] [--selfPhase=draw]
import FS from "fs";
import path from "path";
import * as acorn from "acorn";

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.slice(2), "1"];
}));
const KIND = argMap.kind || "render";
let files = args.filter(a => !a.startsWith("--"));
if (files.length === 1 && FS.statSync(files[0]).isDirectory()) {
    const dir = files[0];
    files = FS.readdirSync(dir).filter(f => f.endsWith(`.${KIND}.cpuprofile`)).map(f => path.join(dir, f));
}
const BUNDLE = argMap.bundle || "export/bundles/names/opensheetmusicdisplay.min.js";
const TOP = Number(argMap.top || 40);

// ---- bundle mapping: line -> module path, (line, column) -> innermost class
const src = FS.readFileSync(BUNDLE, "utf8");
const lineStarts = [0];
for (let i = 0; i < src.length; i++) { if (src.charCodeAt(i) === 10) { lineStarts.push(i + 1); } }
const moduleMarkers = []; // [line (0-based), path]
const srcLines = src.split("\n");
srcLines.forEach((l, i) => { const m = l.match(/^;\/\/ (\.\/\S+)/); if (m) { moduleMarkers.push([i, m[1]]); } });
function moduleOf (line) {
    let lo = 0, hi = moduleMarkers.length - 1, best = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (moduleMarkers[mid][0] <= line) { best = mid; lo = mid + 1; } else { hi = mid - 1; } }
    return best >= 0 ? moduleMarkers[best][1] : "(bundle)";
}
const classes = [];
(function collect () {
    const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true, allowReturnOutsideFunction: true });
    const stack = [[ast, undefined]];
    while (stack.length) {
        const [node, hint] = stack.pop();
        if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
            classes.push({ name: node.id?.name || hint || "(class)", start: node.start, end: node.end });
        }
        for (const key of Object.keys(node)) {
            const v = node[key];
            const childHint = node.type === "VariableDeclarator" && key === "init" ? node.id?.name
                : node.type === "AssignmentExpression" && key === "right" ? (node.left.property?.name || node.left.name) : undefined;
            if (Array.isArray(v)) { for (const c of v) { if (c && typeof c.type === "string") { stack.push([c, childHint]); } } }
            else if (v && typeof v.type === "string") { stack.push([v, childHint]); }
        }
    }
    classes.sort((a, b) => a.start - b.start);
})();
const classCache = new Map();
function classOf (line, col) {
    const key = line * 100000 + col;
    if (classCache.has(key)) { return classCache.get(key); }
    const off = lineStarts[line] + col;
    let best;
    for (const c of classes) { if (c.start > off) { break; } if (off < c.end && (!best || c.start >= best.start)) { best = c; } }
    const name = best?.name;
    classCache.set(key, name);
    return name;
}

// ---- per-frame info
function frameInfo (cf) {
    const fn = cf.functionName || "(anon)";
    if (cf.url && (/opensheetmusicdisplay/.test(cf.url) || cf.url.includes(path.basename(BUNDLE)))) {
        const mod = moduleOf(cf.lineNumber);
        // OSMD's own modules (and small libs like loglevel/jszip) come before the concatenated VexFlow modules and have no marker
        const origin = mod.includes("node_modules/vexflow") ? "vexflow" : mod === "(bundle)" || mod.startsWith("./src/") ? "osmd"
            : "lib:" + mod.replace(/^\.\/node_modules\//, "").split("/")[0];
        const cls = classOf(cf.lineNumber, cf.columnNumber);
        return { fn, cls, label: (cls ? cls + "." : "") + fn, origin, mod };
    }
    if (fn.startsWith("(")) { return { fn, label: fn, origin: fn }; } // (garbage collector), (program), (idle), (root)
    if (!cf.url) { return { fn, label: "native " + fn, origin: "native" }; }
    return { fn, label: fn + " @" + path.basename(cf.url).slice(0, 30), origin: "other:" + path.basename(cf.url).slice(0, 20) };
}

// phase rules: first matching rule (outermost-first evaluation of fixed priority) on the stack's labels
const PHASES = [
    ["skyline", s => s.has("calculateSkyBottomLines")],
    ["xLayout (VexFlow pre-format, widths)", s => s.has("calculateXLayout")],
    ["formatMeasures (final VexFlow format)", s => s.has("formatMeasures")],
    ["buildMusicSystems (line breaks)", s => s.has("buildMusicSystems")],
    ["Y layout (calculateSystemYLayout)", s => s.has("calculateSystemYLayout")],
    ["slurs + ties", s => s.has("calculateSlurs") || s.has("calculateTieCurves")],
    ["lyrics", s => s.has("calculateLyricsPosition")],
    ["expressions/dynamics/tempo/rep.", s => ["calculateDynamicExpressions", "calculateMoodAndUnknownExpressions", "calculateExpressionAlignements",
        "calculateTempoExpressions", "calculateWordRepetitionInstructions", "calculateRehearsalMarks", "calculateOctaveShifts", "calculatePedals",
        "calculateWavyLines", "calculateRepetitionEndings"].some(n => s.has(n))],
    ["other in calculateMusicSystems", s => s.has("calculateMusicSystems")],
    ["other layout (calculate, abs. positions)", s => s.has("reCalculate")],
    ["draw (drawSheet)", s => s.has("drawSheet")],
    ["clear + backend (createOrRefreshRenderBackend)", s => s.has("createOrRefreshRenderBackend") || s.has("clear")],
    ["other in render()", s => s.has("render")],
];
const LOAD_PHASES = [
    ["XML parse (DOMParser.parseFromString)", s => s.has("parseFromString")],
    ["read: MusicSheetReader.createMusicSheet", s => s.has("createMusicSheet")],
    ["graphic: updateGraphic (graphical objects, VexFlow notes)", s => s.has("updateGraphic")],
    ["IXmlElement wrapping (score root)", s => s.has("IXmlElement")],
    ["other in load()", s => s.has("load")],
];

function analyze (file) {
    const profile = JSON.parse(FS.readFileSync(file, "utf8"));
    const parent = new Map();
    for (const n of profile.nodes) { for (const c of n.children || []) { parent.set(c, n.id); } }
    // time per node from timeDeltas (time until the next sample is attributed to the sample)
    const time = new Map();
    const { samples, timeDeltas } = profile;
    for (let i = 0; i < samples.length; i++) {
        const dt = i + 1 < timeDeltas.length ? timeDeltas[i + 1] : 0;
        time.set(samples[i], (time.get(samples[i]) || 0) + Math.max(0, dt));
    }
    const info = new Map(profile.nodes.map(n => [n.id, frameInfo(n.callFrame)]));
    const stackCache = new Map();
    const stackOf = (id) => {
        if (stackCache.has(id)) { return stackCache.get(id); }
        const s = [];
        for (let cur = id; cur !== undefined; cur = parent.get(cur)) { s.push(cur); }
        s.reverse();
        stackCache.set(id, s);
        return s;
    };
    const res = { file, total: 0, idle: 0, phase: {}, formatter: {}, origin: {}, originByPhase: {}, self: new Map(), tree: new Map() };
    const add = (obj, k, v) => { obj[k] = (obj[k] || 0) + v; };
    const phases = KIND === "load" ? LOAD_PHASES : PHASES;
    for (const [id, t] of time) {
        if (!t) { continue; }
        const me = info.get(id);
        if (me.fn === "(idle)") { res.idle += t; continue; }
        res.total += t;
        const stack = stackOf(id);
        const names = new Set(stack.map(x => info.get(x).fn));
        let phase = me.fn === "(garbage collector)" ? "GC" : me.fn === "(program)" ? "(program)" : "outside " + KIND + "()";
        if (!phase.startsWith("GC") && phase !== "(program)") {
            for (const [name, test] of phases) { if (test(names)) { phase = name; break; } }
        }
        add(res.phase, phase, t);
        const isFormatter = stack.some(x => info.get(x).cls === "Formatter" && info.get(x).origin === "vexflow");
        if (isFormatter) { add(res.formatter, phase, t); }
        const originKey = me.origin.startsWith("lib:") || me.origin.startsWith("other:") ? "other libs" : me.origin;
        add(res.origin, originKey, t);
        const coarse = phase === "draw (drawSheet)" ? "draw" : phase === "GC" || phase === "(program)" ? phase : "layout+other";
        add(res.originByPhase, coarse + " / " + originKey, t);
        const selfKey = `${me.label} [${me.origin}]`;
        if (!argMap.selfPhase || phase.startsWith(argMap.selfPhase)) { res.self.set(selfKey, (res.self.get(selfKey) || 0) + t); }
        // aggregated tree below the root function (by label path)
        const ROOT = argMap.root || KIND;
        const rootIdx = stack.findIndex(x => info.get(x).fn === ROOT);
        if (rootIdx >= 0) {
            let node = res.tree;
            for (let i = rootIdx; i < stack.length; i++) {
                const lbl = info.get(stack[i]).label;
                if (!node.has(lbl)) { node.set(lbl, { t: 0, self: 0, kids: new Map() }); }
                const entry = node.get(lbl);
                entry.t += t;
                if (i === stack.length - 1) { entry.self += t; }
                node = entry.kids;
            }
        }
    }
    return res;
}

const results = files.map(analyze);
const short = (f) => path.basename(f).replace(/\.(render|load)\.cpuprofile$/, "").slice(0, 12);
const pct = (v, d) => (100 * v / d).toFixed(1);
function table (title, getter, keys) {
    console.log(`\n== ${title} (% of ${KIND}() time incl. GC; mean = unweighted mean over scores)`);
    console.log("".padEnd(48) + results.map(r => short(r.file).padStart(13)).join("") + "         mean");
    for (const k of keys) {
        const vals = results.map(r => 100 * (getter(r)[k] || 0) / r.total);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        console.log(k.slice(0, 47).padEnd(48) + vals.map(v => v.toFixed(1).padStart(13)).join("") + mean.toFixed(1).padStart(13));
    }
}
const allKeys = (getter) => {
    const sum = {};
    for (const r of results) { for (const [k, v] of Object.entries(getter(r))) { sum[k] = (sum[k] || 0) + v / r.total; } }
    return Object.keys(sum).sort((a, b) => sum[b] - sum[a]);
};
console.log(`${results.length} profiles, ${KIND}(): ` + results.map(r => `${short(r.file)} ${(r.total / 1000).toFixed(0)} ms`).join(", "));
table("phases", r => r.phase, allKeys(r => r.phase));
table("VexFlow Formatter (inclusive), by phase", r => r.formatter, allKeys(r => r.formatter));
console.log("   Formatter total: " + results.map(r => `${short(r.file)} ${pct(Object.values(r.formatter).reduce((a, b) => a + b, 0), r.total)}%`).join(", "));
table("self time by origin", r => r.origin, allKeys(r => r.origin));
table("self time by phase / origin", r => r.originByPhase, allKeys(r => r.originByPhase));

// top self time, aggregated over scores (mean of per-score fractions)
const selfSum = new Map();
for (const r of results) { for (const [k, v] of r.self) { selfSum.set(k, (selfSum.get(k) || 0) + v / r.total / results.length); } }
console.log(`\n== top ${TOP} self time (mean % over scores)`);
for (const [k, v] of [...selfSum.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) { console.log(`${(100 * v).toFixed(2).padStart(7)}%  ${k}`); }

if (argMap.tree) {
    const DEPTH = Number(argMap.depth || 4);
    const MIN = Number(argMap.min || 1);
    // merge the trees (mean fractions)
    const merged = new Map();
    const mergeInto = (dst, srcMap, total) => {
        for (const [k, v] of srcMap) {
            if (!dst.has(k)) { dst.set(k, { t: 0, self: 0, kids: new Map() }); }
            const d = dst.get(k);
            d.t += v.t / total / results.length; d.self += v.self / total / results.length;
            mergeInto(d.kids, v.kids, total);
        }
    };
    for (const r of results) { mergeInto(merged, r.tree, r.total); }
    console.log(`\n== call tree below ${argMap.root || KIND}() (mean % over scores, >= ${MIN}%)`);
    const print = (map, depth, indent) => {
        for (const [k, v] of [...map.entries()].sort((a, b) => b[1].t - a[1].t)) {
            if (100 * v.t < MIN) { continue; }
            console.log(`${indent}${(100 * v.t).toFixed(1).padStart(5)}% (self ${(100 * v.self).toFixed(1)}%) ${k}`);
            if (depth < DEPTH) { print(v.kids, depth + 1, indent + "  "); }
        }
    };
    print(merged, 0, "");
}
