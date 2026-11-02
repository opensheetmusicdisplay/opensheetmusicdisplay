// Compares the SVGs that OSMD bundles render in headless Chrome (a real DOM, real text measurement) for the whole test/data
// corpus (page: chromeAB.html).
// Default: are the SVGs of all bundles identical to the first bundle's, raw and with VexFlow's vf-auto element ids normalized?
// --numbers (two bundles): for SVGs that differ, are they equal except for numbers, and by how much do the numbers differ?
//   With --pixels, the differing pages are also rasterized, and the differing pixels counted.
//
// Usage (from the repository root): node test/performance/chromeSvgCompare.mjs --bundles=export/ab/a.min.js,export/ab/b.min.js
//   [--filter=regex] [--numbers [--pixels]] [--port=8099]
import FS from "fs";
import { launchChrome, parseArgs, serveRepository } from "./chromeHarness.mjs";

const { options } = parseArgs();
if (!options.bundles) {
    console.log("Usage: node test/performance/chromeSvgCompare.mjs --bundles=a.min.js,b.min.js [--filter=regex] [--numbers [--pixels]]");
    process.exit(1);
}
const BUNDLES = options.bundles.split(",");
const PORT = Number(options.port || 8099);
let samples = FS.readdirSync("test/data").filter(f => /\.(xml|musicxml|mxl)$/i.test(f) && !/^OSMD_function_test_Error/.test(f));
if (options.filter) {
    samples = samples.filter(f => new RegExp(options.filter).test(f));
}

const server = serveRepository(PORT);
const chrome = await launchChrome("svgcompare");
await chrome.navigate(`http://localhost:${PORT}/test/performance/chromeAB.html?bundles=${encodeURIComponent(BUNDLES.join(","))}`);
await chrome.evaluate("window.ready");
let errors = 0;
if (options.numbers) {
    let identical = 0;
    let numbersOnly = 0;
    let otherwise = 0;
    let pixelIdentical = 0;
    let maxDiff = 0;
    let maxPixels = 0;
    for (const sample of samples) {
        let res;
        try {
            res = await chrome.evaluate(`compareSampleNumbers(${JSON.stringify(sample)}, ${Boolean(options.pixels)})`);
        } catch (e) {
            errors++;
            console.log(`error ${sample}: ${e.message.slice(0, 500)}`);
            continue;
        }
        if (res.rawEqual) {
            identical++;
        } else if (!res.structureEqual) {
            otherwise++;
            console.log(`DIFFERENT ${sample}: ${res.note}`);
        } else {
            numbersOnly++;
            maxDiff = Math.max(maxDiff, res.maxDiff);
            pixelIdentical += res.differingPixels === 0 ? 1 : 0;
            maxPixels = Math.max(maxPixels, res.differingPixels);
            console.log(`NUMBERS ${sample}: ${res.differingNumbers}/${res.numbers} numbers differ, max ${res.maxDiff.toExponential(2)}`
                + ` (${res.maxDiffContext.replace(/\s+/g, " ").slice(0, 160)})`
                + (options.pixels ? `; ${res.differingPixels}/${res.pixels} pixels differ, max channel difference ${res.maxChannelDiff}` : ""));
        }
    }
    console.log(`${samples.length} samples: ${identical} identical, ${numbersOnly} differing only in numbers (max difference ${maxDiff.toExponential(2)}`
        + (options.pixels ? `, ${pixelIdentical} of them pixel-identical, at most ${maxPixels} differing pixels` : "")
        + `), ${otherwise} differing otherwise, ${errors} errors`);
} else {
    let equal = 0;
    let rawEqual = 0;
    let differing = 0;
    for (const sample of samples) {
        let res;
        try {
            res = await chrome.evaluate(`compareSample(${JSON.stringify(sample)})`);
        } catch (e) {
            errors++;
            console.log(`error ${sample}: ${e.message.slice(0, 1500)}`);
            continue;
        }
        if (res.every(r => r.equal)) {
            equal++;
        } else {
            differing++;
            console.log(`DIFF ${sample}: ${JSON.stringify(res.find(r => !r.equal)).slice(0, 600)}`);
        }
        rawEqual += res.every(r => r.rawEqual) ? 1 : 0;
    }
    console.log(`${samples.length} samples: ${equal} identical SVG in Chrome (${rawEqual} also without normalizing vf-auto ids), `
        + `${differing} differing, ${errors} errors`);
}
await chrome.close();
server.close();
process.exit(0);
