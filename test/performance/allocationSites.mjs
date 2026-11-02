// Top allocation sites of OSMD's render() from sampling heap profiles (*.render.heapprofile from chromeProfile.mjs --alloc):
// allocated bytes by function (with its class, from the profiled bundle built with webpack.names.mjs) and by function + caller,
// as % of all sampled bytes (mean over the profiles). The profiles include the objects that the GC already collected.
// Usage (from the repository root): node test/performance/allocationSites.mjs <dir>
//   [--bundle=export/bundles/names/opensheetmusicdisplay.min.js] [--top=40]
import FS from "fs";
import path from "path";
import * as acorn from "acorn";

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => { const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.slice(2), "1"]; }));
const dir = args.find(a => !a.startsWith("--"));
const BUNDLE = argMap.bundle || "export/bundles/names/opensheetmusicdisplay.min.js";
const TOP = Number(argMap.top || 40);
const src = FS.readFileSync(BUNDLE, "utf8");
const lineStarts = [0];
for (let i = 0; i < src.length; i++) { if (src.charCodeAt(i) === 10) { lineStarts.push(i + 1); } }
const classes = [];
{
    const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true, allowReturnOutsideFunction: true });
    const stack = [ast];
    while (stack.length) {
        const node = stack.pop();
        if (node.type === "ClassDeclaration" || node.type === "ClassExpression") { classes.push({ name: node.id?.name || "(class)", start: node.start, end: node.end }); }
        for (const key of Object.keys(node)) {
            const v = node[key];
            if (Array.isArray(v)) { for (const c of v) { if (c && typeof c.type === "string") { stack.push(c); } } } else if (v && typeof v.type === "string") { stack.push(v); }
        }
    }
    classes.sort((a, b) => a.start - b.start);
}
const vexStart = src.split("\n").findIndex(l => l.startsWith(";// ./node_modules/vexflow/"));
function label (cf) {
    const fn = cf.functionName || "(anon)";
    if (!cf.url || !(/opensheetmusicdisplay/.test(cf.url) || cf.url.includes(path.basename(BUNDLE)))) { return fn + (cf.url ? "" : " [native]"); }
    const off = lineStarts[cf.lineNumber] + cf.columnNumber;
    let best;
    for (const c of classes) { if (c.start > off) { break; } if (off < c.end) { best = c; } }
    return (best ? best.name + "." : "") + fn + (cf.lineNumber >= vexStart ? " [vf]" : "");
}
const files = FS.readdirSync(dir).filter(f => f.endsWith(".render.heapprofile"));
const bySelf = new Map(), byPair = new Map();
for (const f of files) {
    const profile = JSON.parse(FS.readFileSync(path.join(dir, f), "utf8"));
    let total = 0;
    const walk = (node) => { total += node.selfSize; for (const c of node.children) { walk(c); } };
    walk(profile.head);
    const acc = (node, parentLabel) => {
        const me = label(node.callFrame);
        if (node.selfSize) {
            bySelf.set(me, (bySelf.get(me) || 0) + node.selfSize / total / files.length);
            const k = me + "  <-  " + parentLabel;
            byPair.set(k, (byPair.get(k) || 0) + node.selfSize / total / files.length);
        }
        for (const c of node.children) { acc(c, me); }
    };
    acc(profile.head, "");
    console.log(`${f}: ${(total / 1e6).toFixed(0)} MB sampled`);
}
console.log(`\n== top ${TOP} allocating functions (self bytes, mean % over ${files.length} scores)`);
for (const [k, v] of [...bySelf.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) { console.log(`${(100 * v).toFixed(2).padStart(6)}%  ${k}`); }
console.log(`\n== top ${TOP} allocating function <- caller`);
for (const [k, v] of [...byPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) { console.log(`${(100 * v).toFixed(2).padStart(6)}%  ${k}`); }
