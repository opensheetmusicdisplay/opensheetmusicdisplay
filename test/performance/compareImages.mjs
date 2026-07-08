// Compares two directories of rendered PNGs (baseline vs new) pixel-wise.
// Usage: node test/performance/compareImages.mjs <dirA> <dirB> [diffThreshold] [maxDiffImages]
// Writes red-overlay diff images for the worst offenders next to dirB as *_DIFF.png.
import FS from "fs";
import Path from "path";
import canvasPkg from "canvas";

const dirA = process.argv[2] || "export/ab_base";
const dirB = process.argv[3] || "export/ab_new";
const channelThreshold = parseInt(process.argv[4] || "24", 10); // channel delta to count a pixel as different
const maxDiffImages = parseInt(process.argv[5] || "12", 10);

const filesA = new Set(FS.readdirSync(dirA).filter(f => f.endsWith(".png")));
const filesB = new Set(FS.readdirSync(dirB).filter(f => f.endsWith(".png")));
const common = [...filesA].filter(f => filesB.has(f)).sort();
const onlyA = [...filesA].filter(f => !filesB.has(f));
const onlyB = [...filesB].filter(f => !filesA.has(f));
if (onlyA.length) { console.log(`only in ${dirA}: ${onlyA.length} files: ${onlyA.slice(0, 5).join(", ")}…`); }
if (onlyB.length) { console.log(`only in ${dirB}: ${onlyB.length} files: ${onlyB.slice(0, 5).join(", ")}…`); }

const results = [];
let identicalBytes = 0;
for (const file of common) {
    const bufA = FS.readFileSync(Path.join(dirA, file));
    const bufB = FS.readFileSync(Path.join(dirB, file));
    if (bufA.equals(bufB)) {
        identicalBytes++;
        continue;
    }
    const imgA = await canvasPkg.loadImage(bufA);
    const imgB = await canvasPkg.loadImage(bufB);
    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        results.push({ file, dims: `${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`, diffPixels: Infinity });
        continue;
    }
    const w = imgA.width, h = imgA.height;
    const cA = canvasPkg.createCanvas(w, h); const xA = cA.getContext("2d"); xA.drawImage(imgA, 0, 0);
    const cB = canvasPkg.createCanvas(w, h); const xB = cB.getContext("2d"); xB.drawImage(imgB, 0, 0);
    const dataA = xA.getImageData(0, 0, w, h).data;
    const dataB = xB.getImageData(0, 0, w, h).data;
    let diffPixels = 0;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let i = 0; i < dataA.length; i += 4) {
        if (Math.abs(dataA[i] - dataB[i]) > channelThreshold
            || Math.abs(dataA[i + 1] - dataB[i + 1]) > channelThreshold
            || Math.abs(dataA[i + 2] - dataB[i + 2]) > channelThreshold
            || Math.abs(dataA[i + 3] - dataB[i + 3]) > channelThreshold) {
            diffPixels++;
            const p = i / 4; const x = p % w; const y = Math.floor(p / w);
            if (x < minX) { minX = x; } if (x > maxX) { maxX = x; }
            if (y < minY) { minY = y; } if (y > maxY) { maxY = y; }
        }
    }
    results.push({ file, diffPixels, total: w * h, region: maxX >= 0 ? `x${minX}-${maxX} y${minY}-${maxY}` : "-" });
}

results.sort((a, b) => b.diffPixels - a.diffPixels);
console.log(`\n${common.length} common files; ${identicalBytes} byte-identical; ${results.length} differing:`);
for (const r of results) {
    if (r.dims) {
        console.log(`  ${r.file}: DIMENSIONS DIFFER ${r.dims}`);
    } else {
        console.log(`  ${r.file}: ${r.diffPixels} px (${(100 * r.diffPixels / r.total).toFixed(4)}%) region ${r.region}`);
    }
}

// write red-overlay diffs for the worst
let written = 0;
for (const r of results) {
    if (written >= maxDiffImages || r.dims || r.diffPixels === 0) { continue; }
    const imgA = await canvasPkg.loadImage(Path.join(dirA, r.file));
    const imgB = await canvasPkg.loadImage(Path.join(dirB, r.file));
    const w = imgA.width, h = imgA.height;
    const c = canvasPkg.createCanvas(w, h); const ctx = c.getContext("2d");
    ctx.drawImage(imgB, 0, 0);
    const cA = canvasPkg.createCanvas(w, h); const xA = cA.getContext("2d"); xA.drawImage(imgA, 0, 0);
    const dataA = xA.getImageData(0, 0, w, h).data;
    const imgDataB = ctx.getImageData(0, 0, w, h);
    const dataB = imgDataB.data;
    for (let i = 0; i < dataA.length; i += 4) {
        if (Math.abs(dataA[i] - dataB[i]) > channelThreshold
            || Math.abs(dataA[i + 1] - dataB[i + 1]) > channelThreshold
            || Math.abs(dataA[i + 2] - dataB[i + 2]) > channelThreshold
            || Math.abs(dataA[i + 3] - dataB[i + 3]) > channelThreshold) {
            dataB[i] = 255; dataB[i + 1] = 0; dataB[i + 2] = 0; dataB[i + 3] = 255;
        }
    }
    ctx.putImageData(imgDataB, 0, 0);
    const out = Path.join(dirB, r.file.replace(/\.png$/, "_DIFF.png"));
    FS.writeFileSync(out, c.toBuffer("image/png"));
    written++;
}
if (written) { console.log(`\nwrote ${written} *_DIFF.png overlays into ${dirB}`); }
