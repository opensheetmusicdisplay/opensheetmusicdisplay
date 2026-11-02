// Compares two directories of SVGs (e.g. from test/Util/generateImages_browserless.mjs ... svg) byte by byte, raw and after
// normalizing VexFlow's auto-generated element ids (vf-auto####), whose numbering shifts when a change constructs more or
// fewer VexFlow objects.
// Usage: node test/performance/compareSvgDirs.mjs <dirA> <dirB>
import FS from "fs";
import path from "path";

const [dirA, dirB] = process.argv.slice(2);
const normalize = (s) => s.replace(/vf-auto\d+/g, "vf-auto#");
const filesA = FS.readdirSync(dirA).filter(f => f.endsWith(".svg")).sort();
const filesB = new Set(FS.readdirSync(dirB).filter(f => f.endsWith(".svg")));
let identical = 0, identicalRaw = 0;
const differing = [], missing = [];
for (const f of filesA) {
    if (!filesB.has(f)) { missing.push(f); continue; }
    filesB.delete(f);
    const a = FS.readFileSync(path.join(dirA, f), "utf8");
    const b = FS.readFileSync(path.join(dirB, f), "utf8");
    if (a === b) { identicalRaw++; identical++; continue; }
    if (normalize(a) === normalize(b)) { identical++; continue; }
    differing.push(f);
}
console.log(`${filesA.length} SVGs in A: ${identical} identical (${identicalRaw} byte-identical without id normalization), `
    + `${differing.length} differing, ${missing.length} missing in B, ${filesB.size} only in B`);
for (const f of differing) { console.log("  DIFF " + f); }
for (const f of missing) { console.log("  MISSING in B " + f); }
for (const f of filesB) { console.log("  ONLY in B " + f); }
