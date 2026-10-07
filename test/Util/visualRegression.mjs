// visual regression test for OSMD sample PNGs, cross-platform (Windows / macOS / Linux)
//
// see https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Testing
//
// This is a drop-in replacement for test/Util/visual_regression.sh, which requires
// bash + ImageMagick and therefore only runs on Linux/macOS (or a Linux VM on Windows).
// This version needs only Node.js and node-canvas (already an OSMD dependency, also used
// by generateImages_browserless.mjs and test/performance/compareImages.mjs).
//
// It produces the SAME diff/ output folder as the bash script, plus diffs.txt:
//   diff/results.txt              - every compared image with its diff value, biggest change on top
//   diff/diffs.txt                - what to look at: the compared states of blessed/ and current/ (see below),
//                                   the changed samples (with their diff region), then the warnings, like the console summary
//   diff/warnings.txt             - images present in only one of blessed/ or current/, or that could not be compared
//   diff/<name>.png               - red-highlight diff image (only for changed samples)
//   diff/<name>_Blessed.png       - copy of the blessed (old / reference) image
//   diff/<name>_Current.png       - copy of the current (new) image
// so you can flip between _Blessed and _Current in an image viewer to see what moved.
//
// Difference metric
// -----------------
// The bash script sorts by ImageMagick's PHASH (perceptual hash) value. That exact metric
// is impractical to reproduce in JS, and only serves to (a) decide "did this sample change?"
// and (b) sort by magnitude. Here we use a direct pixel comparison instead: results.txt lists
// the NUMBER OF DIFFERING PIXELS per sample (0 = identical), biggest first. A pixel comparison
// is strictly more sensitive than PHASH - it cannot miss anything PHASH caught - which suits
// OSMD's deterministic rendering, where an unchanged sample is byte-identical and scores exactly 0.
//
// The red-highlight diff image reproduces ImageMagick's `compare -highlight-color '#ff000050'`
// look exactly (verified pixel-for-pixel against example output): unchanged content is dimmed
// 80% toward white, changed pixels are red (#ff0000) composited at alpha 0x50 over the current
// pixel - so a moved black notehead shows as dark maroon and a thin line as pink.
//
// Compared states
// ---------------
// generateImages_browserless.mjs writes source_commit.txt into the image folder, with the git branch and commit the
// images were generated from. The console summary ends with the states of blessed/ and current/, and diffs.txt starts
// with them, e.g. "blessed: develop 52b16c29, generated 2026-10-07 14:03:12" with the commit's subject below, so you can
// see what was compared, even after generating images on several branches or switching the folders around. A folder
// generated with a build older than the files in src/ gets a warning there, as its images may not show that commit.
//
// Usage
// -----
//   node test/Util/visualRegression.mjs [imageBaseFolder] [sampleNamePrefix]
//     imageBaseFolder  folder containing blessed/ and current/ subfolders (default ./visual_regression)
//     sampleNamePrefix optional: only compare images whose filename starts with this prefix
//
//   Environment variables (optional):
//     CHANNEL_THRESHOLD  per-channel delta above which a pixel counts as changed (default 0 = any difference)
//     NPROC              number of images decoded concurrently (default 8)
//     MAX_DIFF_IMAGES    cap on how many diff/_Blessed/_Current image sets to write (default: no cap)
//
// Typical workflow (identical to the bash version):
//   npm run generate:blessed    # render the reference state (e.g. develop) into visual_regression/blessed
//   npm run generate:current    # render your changes            into visual_regression/current
//   node test/Util/visualRegression.mjs ./visual_regression
//   # then inspect visual_regression/diff/

import FS from "fs";
import Path from "path";
import canvasPkg from "canvas";

const { loadImage, createCanvas } = canvasPkg;

// ---------------------------------------------------------------------------
// Configuration / arguments
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const BUILDFOLDER = rawArgs[0] || "./visual_regression";
const PREFIX = rawArgs[1] || "";

const BLESSED = Path.join(BUILDFOLDER, "blessed");
const CURRENT = Path.join(BUILDFOLDER, "current");
const DIFF = Path.join(BUILDFOLDER, "diff");
const RESULTS = Path.join(DIFF, "results.txt");
const DIFFS = Path.join(DIFF, "diffs.txt");
const WARNINGS = Path.join(DIFF, "warnings.txt");
// written into blessed/ and current/ by generateImages_browserless.mjs
const SOURCE_COMMIT_FILE = "source_commit.txt";

// A pixel counts as "changed" when any channel differs by more than this.
// 0 matches ImageMagick's default fuzz (any difference at all), catching even minimal changes.
const CHANNEL_THRESHOLD = parseInt(process.env.CHANNEL_THRESHOLD ?? "0", 10);
// Number of images decoded in parallel. Byte-identical images skip decoding entirely.
const CONCURRENCY = Math.max(1, parseInt(process.env.NPROC ?? "8", 10));
// Optional cap on the number of changed samples for which we write image files (results.txt is always complete).
const MAX_DIFF_IMAGES = process.env.MAX_DIFF_IMAGES ? parseInt(process.env.MAX_DIFF_IMAGES, 10) : Infinity;

// ImageMagick diff-style constants, reverse-engineered from `compare -highlight-color '#ff000050'`.
const HL_R = 255, HL_G = 0, HL_B = 0;      // highlight color #ff0000
const HL_A = 80;                            // highlight alpha 0x50 == 80
const HL_KEEP = 255 - HL_A;                 // 175: amount of the base pixel kept under the highlight
const LOW_KEEP = 51;                        // unchanged pixels keep 51/255 (20%) of the base ...
const LOW_ADD = 204;                        // ... plus 204/255 (80%) of white -> dimmed toward white

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/**
 * Lists the .png files in a directory, optionally filtered by a filename prefix.
 * @param {string} dir directory to list
 * @param {string} prefix only return files whose name starts with this (empty = all)
 * @returns {string[]} sorted list of matching file names (not full paths)
 */
function listPngs(dir, prefix) {
    if (!FS.existsSync(dir)) {
        return [];
    }
    return FS.readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".png") && f.startsWith(prefix))
        .sort();
}

/**
 * Decodes a PNG into raw RGBA pixel data via node-canvas.
 * Takes the file's content rather than its path: node-canvas opens a path itself, which fails on Windows for paths
 * longer than 260 characters (e.g. a long sample name in a deep folder), where Node's fs reads the file fine.
 * @param {Buffer} png the content of a PNG file
 * @returns {Promise<{ w: number, h: number, data: Uint8ClampedArray }>} pixel buffer
 */
async function decode(png) {
    const img = await loadImage(png);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

/**
 * Runs an async worker over a list of items with bounded concurrency, preserving input order.
 * @param {T[]} items work items
 * @param {number} concurrency maximum number of workers running at once
 * @param {(item: T, index: number) => Promise<R>} worker async function applied to each item
 * @returns {Promise<R[]>} results in the same order as items
 * @template T, R
 */
async function runPool(items, concurrency, worker) {
    const results = new Array(items.length);
    let next = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) {
                break;
            }
            results[i] = await worker(items[i], i);
        }
    });
    await Promise.all(runners);
    return results;
}

/**
 * Renders a progress bar to stdout in place (like the bash script), but only on an interactive
 * terminal - when output is piped or redirected, the carriage returns would spam the log.
 * @param {number} done number of completed items
 * @param {number} total total number of items
 */
function progressBar(done, total) {
    if (!process.stdout.isTTY) {
        return;
    }
    const pct = total > 0 ? Math.floor((done * 100) / total) : 100;
    const filled = Math.floor(pct / 2.5); // 40-char bar
    const bar = "#".repeat(filled) + "-".repeat(40 - filled);
    process.stdout.write(`\rProgress : [${bar}] ${pct}%`);
}

/**
 * Writes lines to a text file, one per line (an empty file for no lines).
 * @param {string} file path of the file to write
 * @param {string[]} lines lines to write
 */
function writeLines(file, lines) {
    FS.writeFileSync(file, lines.join("\n") + (lines.length ? "\n" : ""));
}

/**
 * Describes a changed sample, as listed in the console summary and in diffs.txt.
 * @param {{ name: string, diffPixels: number, total: number, region: string, note?: string }} r result of diffImage()
 * @returns {string} e.g. "test_chord_whole_rest_overlap.musicxml_1: 1930 px (0.3385%) region x111-1246 y188-281"
 */
function formatChange(r) {
    if (r.note) {
        return `${r.name}: ${r.diffPixels} px [${r.note}: ${r.region}]`;
    }
    const pct = r.total > 0 ? (100 * r.diffPixels / r.total).toFixed(4) : "?";
    return `${r.name}: ${r.diffPixels} px (${pct}%) region ${r.region}`;
}

/**
 * Word-wraps a text into lines of at most width characters, each starting with indent.
 * A word longer than that gets a line of its own.
 * @param {string} text the text to wrap
 * @param {string} indent the start of each line, e.g. spaces
 * @param {number} width maximum line length, including the indent (Infinity: one line)
 * @returns {string[]} the lines
 */
function wrapWords(text, indent, width) {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
        if (line !== "" && indent.length + line.length + 1 + word.length > width) {
            lines.push(indent + line);
            line = word;
        } else {
            line = line === "" ? word : `${line} ${word}`;
        }
    }
    lines.push(indent + line);
    return lines;
}

/**
 * Reads the state the images of a folder were generated from, from the source_commit.txt that
 * generateImages_browserless.mjs writes into it.
 * @param {string} dir image folder (blessed or current)
 * @returns {{ description: string, subject?: string, warning?: string }} the description, e.g. "develop 52b16c29 +
 *   uncommitted changes in 2 file(s), generated 2026-10-07 14:03:12", the subject (first line) of the commit's message,
 *   and the warning if the images were generated with a build older than the files in src/
 */
function readSource(dir) {
    const file = Path.join(dir, SOURCE_COMMIT_FILE);
    if (!FS.existsSync(file)) {
        return { description: `unknown (no ${SOURCE_COMMIT_FILE}: generated before it was added, or not by generateImages_browserless.mjs)` };
    }
    const info = {}; // "key: value" lines, e.g. info.commit (indented lines, listing the changed files, are skipped)
    for (const line of FS.readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = /^([a-z][a-z ]*): (.*)$/.exec(line);
        if (match) {
            info[match[1]] = match[2];
        }
    }
    let description = info.branch ?? "unknown branch";
    if (info.commit) {
        description += ` ${info.commit.substring(0, 8)}`;
    }
    const changes = info["uncommitted changes"];
    if (changes && changes !== "none") {
        description += ` + uncommitted changes in ${changes}`;
    }
    if (info.generated) {
        description += `, generated ${info.generated}`;
    }
    return { description, subject: info.subject, warning: info.warning };
}

/**
 * Lists the compared states of blessed/ and current/, as shown at the end of the console summary and at the top of
 * diffs.txt: for each folder its branch, commit, uncommitted changes and generation time, and below that the commit's
 * subject, which can be long (e.g. a merge's), so a blank line separates the folders, and a warning about the build.
 * @param {{ blessed: object, current: object }} sources the states of blessed/ and current/, from readSource()
 * @param {number} width line length to word-wrap the subjects to (Infinity: one line each)
 * @returns {string[]} the lines
 */
function formatCompared(sources, width) {
    const lines = ["Compared:"];
    for (const [label, source] of Object.entries(sources)) {
        if (lines.length > 1) {
            lines.push("");
        }
        lines.push(`  ${label}: ${source.description}`);
        if (source.subject) {
            lines.push(...wrapWords(source.subject, "    ", width));
        }
        if (source.warning) {
            lines.push(...wrapWords(`Warning: ${source.warning}`, "    ", width));
        }
    }
    return lines;
}

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compares one blessed/current image pair and, if they differ, writes the diff, blessed and
 * current PNGs into the diff folder (ImageMagick-style red highlight over a dimmed background).
 * @param {string} name file name (e.g. "Beethoven_....png")
 * @param {boolean} writeImages whether to write image files for a change (results.txt is recorded regardless)
 * @returns {Promise<{ name: string, diffPixels: number, total: number, region: string, note?: string }>}
 */
async function diffImage(name, writeImages) {
    const base = name.replace(/\.png$/i, "");
    const blessedPath = Path.join(BLESSED, name);
    const currentPath = Path.join(CURRENT, name);

    // Fast path: byte-identical files cannot differ, skip decoding entirely.
    const bufBlessed = FS.readFileSync(blessedPath);
    const bufCurrent = FS.readFileSync(currentPath);
    if (bufBlessed.equals(bufCurrent)) {
        return { name: base, diffPixels: 0, total: 0, region: "-" };
    }

    const blessed = await decode(bufBlessed);
    const current = await decode(bufCurrent);

    // Dimensions differ => layout changed size; cannot overlay pixel-for-pixel.
    if (blessed.w !== current.w || blessed.h !== current.h) {
        const total = Math.max(blessed.w * blessed.h, current.w * current.h);
        if (writeImages) {
            FS.copyFileSync(blessedPath, Path.join(DIFF, `${base}_Blessed.png`));
            FS.copyFileSync(currentPath, Path.join(DIFF, `${base}_Current.png`));
            // Diff image: the current image fully washed in red, so it is obvious the size changed.
            const c = createCanvas(current.w, current.h);
            const ctx = c.getContext("2d");
            const out = ctx.createImageData(current.w, current.h);
            const src = current.data;
            for (let i = 0; i < src.length; i += 4) {
                out.data[i] = Math.floor(HL_R * HL_A / 255 + src[i] * HL_KEEP / 255);
                out.data[i + 1] = Math.floor(HL_G * HL_A / 255 + src[i + 1] * HL_KEEP / 255);
                out.data[i + 2] = Math.floor(HL_B * HL_A / 255 + src[i + 2] * HL_KEEP / 255);
                out.data[i + 3] = 255;
            }
            ctx.putImageData(out, 0, 0);
            FS.writeFileSync(Path.join(DIFF, `${base}.png`), c.toBuffer("image/png"));
        }
        return {
            name: base, diffPixels: total, total,
            region: `${blessed.w}x${blessed.h} -> ${current.w}x${current.h}`,
            note: "dimensions differ",
        };
    }

    // Same dimensions: per-pixel compare, and build the red-highlight diff in one pass.
    const w = current.w, h = current.h;
    const a = blessed.data, b = current.data; // a = blessed, b = current (b is the composite base, matching IM)
    const out = new Uint8ClampedArray(a.length);
    let diffPixels = 0;
    let minX = w, maxX = -1, minY = h, maxY = -1;

    for (let i = 0; i < a.length; i += 4) {
        const changed =
            Math.abs(a[i] - b[i]) > CHANNEL_THRESHOLD ||
            Math.abs(a[i + 1] - b[i + 1]) > CHANNEL_THRESHOLD ||
            Math.abs(a[i + 2] - b[i + 2]) > CHANNEL_THRESHOLD ||
            Math.abs(a[i + 3] - b[i + 3]) > CHANNEL_THRESHOLD;
        if (changed) {
            // Highlight: #ff0000 at alpha 80/255 composited over the current pixel.
            out[i] = Math.floor(HL_R * HL_A / 255 + b[i] * HL_KEEP / 255);
            out[i + 1] = Math.floor(HL_G * HL_A / 255 + b[i + 1] * HL_KEEP / 255);
            out[i + 2] = Math.floor(HL_B * HL_A / 255 + b[i + 2] * HL_KEEP / 255);
            out[i + 3] = 255;
            diffPixels++;
            const p = i >> 2, x = p % w, y = (p / w) | 0;
            if (x < minX) { minX = x; }
            if (x > maxX) { maxX = x; }
            if (y < minY) { minY = y; }
            if (y > maxY) { maxY = y; }
        } else {
            // Lowlight: dim the pixel 80% toward white.
            out[i] = Math.floor(b[i] * LOW_KEEP / 255 + LOW_ADD);
            out[i + 1] = Math.floor(b[i + 1] * LOW_KEEP / 255 + LOW_ADD);
            out[i + 2] = Math.floor(b[i + 2] * LOW_KEEP / 255 + LOW_ADD);
            out[i + 3] = 255;
        }
    }

    const region = maxX >= 0 ? `x${minX}-${maxX} y${minY}-${maxY}` : "-";
    if (diffPixels > 0 && writeImages) {
        const c = createCanvas(w, h);
        const ctx = c.getContext("2d");
        const imgData = ctx.createImageData(w, h);
        imgData.data.set(out);
        ctx.putImageData(imgData, 0, 0);
        FS.writeFileSync(Path.join(DIFF, `${base}.png`), c.toBuffer("image/png"));
        FS.copyFileSync(blessedPath, Path.join(DIFF, `${base}_Blessed.png`));
        FS.copyFileSync(currentPath, Path.join(DIFF, `${base}_Current.png`));
    }
    return { name: base, diffPixels, total: w * h, region };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const currentFiles = listPngs(CURRENT, PREFIX);
    const blessedFiles = listPngs(BLESSED, PREFIX);

    if (PREFIX) {
        console.log(`image filter (name prefix): ${PREFIX}*.png`);
    }

    // ---- sanity checks (mirror the bash script) ----
    if (currentFiles.length < 1) {
        console.error(`Missing images in ${CURRENT}.`);
        console.error('Please run "npm run generate:current"');
        process.exit(1);
    }
    if (blessedFiles.length < 1) {
        console.error(`Missing images in ${BLESSED}.`);
        console.error('Please run "npm run generate:blessed"');
        process.exit(1);
    }
    if (currentFiles.length !== blessedFiles.length) {
        console.log(`Warning: Number of current images (${currentFiles.length}) is not the same as blessed images (${blessedFiles.length}). Continuing anyways.`);
    } else {
        console.log(`Found ${currentFiles.length} current and ${blessedFiles.length} blessed png files (not tested if valid). Continuing.`);
    }

    // ---- prepare the diff (output + temp) folder ----
    FS.mkdirSync(DIFF, { recursive: true });
    // Clear previous run's files (only regular files directly inside diff/, never recurse).
    for (const f of FS.readdirSync(DIFF)) {
        const p = Path.join(DIFF, f);
        if (FS.statSync(p).isFile()) {
            FS.rmSync(p);
        }
    }

    // ---- figure out which files to compare and which are missing on one side ----
    const currentSet = new Set(currentFiles);
    const blessedSet = new Set(blessedFiles);
    const warnings = [];
    for (const f of blessedFiles) {
        if (!currentSet.has(f)) {
            warnings.push(` Warning: ${f} missing in ${CURRENT}. Will be skipped.`);
        }
    }
    for (const f of currentFiles) {
        if (!blessedSet.has(f)) {
            warnings.push(` Warning: ${f} doesn't exist in ${BLESSED}. Skipped.`);
        }
    }
    const toCompare = currentFiles.filter((f) => blessedSet.has(f));

    const threshInfo = CHANNEL_THRESHOLD === 0 ? "any difference" : `channel delta > ${CHANNEL_THRESHOLD}`;
    console.log(`Running ${toCompare.length} tests (metric: differing pixels, ${threshInfo}, concurrency=${CONCURRENCY})...`);

    // ---- compare all pairs (bounded concurrency) ----
    let done = 0;
    let allowedImageWrites = MAX_DIFF_IMAGES;
    const results = await runPool(toCompare, CONCURRENCY, async (name) => {
        // Reserve an image-write slot up front so the cap is honored under concurrency.
        const mayWrite = allowedImageWrites > 0;
        if (mayWrite) {
            allowedImageWrites--;
        }
        let res;
        try {
            res = await diffImage(name, mayWrite);
            if (mayWrite && res.diffPixels === 0) {
                allowedImageWrites++; // no change => give the slot back
            }
        } catch (err) {
            if (mayWrite) {
                allowedImageWrites++;
            }
            res = { name: name.replace(/\.png$/i, ""), error: err.message };
        }
        done++;
        progressBar(done, toCompare.length);
        return res;
    });
    if (process.stdout.isTTY) {
        process.stdout.write("\n");
    }

    // Files that could not be decoded/compared are reported as warnings, not results.
    const errored = results.filter((r) => r.error);
    const compared = results.filter((r) => !r.error);
    for (const r of errored) {
        warnings.push(` Warning: ${r.name}.png could not be compared (${r.error}).`);
    }

    // ---- sort: biggest change first, then alphabetical (deterministic) ----
    compared.sort((x, y) => (y.diffPixels - x.diffPixels) || x.name.localeCompare(y.name));

    // ---- write results.txt (every compared image, mirroring the bash "<name> <value>" format) and warnings.txt ----
    writeLines(RESULTS, compared.map((r) => `${r.name} ${r.diffPixels}`));
    writeLines(WARNINGS, warnings);

    // ---- the compared states of blessed/ and current/, at the top of diffs.txt and the end of the console summary ----
    const sources = { blessed: readSource(BLESSED), current: readSource(CURRENT) };

    // ---- write diffs.txt: what to look at, the compared states, the changed samples, then the warnings ----
    const fails = compared.filter((r) => r.diffPixels > 0);
    const changedLines = fails.map(formatChange);
    const diffsLines = [...formatCompared(sources, Infinity), ""]; // blank line between the lists
    if (fails.length > 0) {
        diffsLines.push(`${fails.length} changed sample(s):`, ...changedLines.map((line) => `  ${line}`));
    } else {
        diffsLines.push("All samples identical (0 differing pixels).");
    }
    if (warnings.length > 0) {
        diffsLines.push("", `${warnings.length} warning(s):`, ...warnings.map((w) => `  ${w.trim()}`));
    }
    writeLines(DIFFS, diffsLines);

    // ---- console summary ----
    console.log(`\nResults stored in ${RESULTS} (all samples, biggest change first),`);
    console.log(`changed samples and warnings in ${DIFFS}.`);
    console.log(`All samples with a pixel difference are copied into ${DIFF}`);
    console.log(`(as <name>.png diff, <name>_Blessed.png and <name>_Current.png).\n`);

    if (warnings.length > 0) {
        const MAX_SHOWN = 15;
        console.log(`You have ${warnings.length} warning(s) (full list in ${WARNINGS}):`);
        console.log(warnings.slice(0, MAX_SHOWN).join("\n"));
        if (warnings.length > MAX_SHOWN) {
            console.log(`  ... and ${warnings.length - MAX_SHOWN} more.`);
        }
    }
    if (fails.length > 0) {
        console.log(`You have ${fails.length} changed sample(s):`);
        for (const line of changedLines) {
            console.log(`  ${line}`);
        }
        if (Number.isFinite(MAX_DIFF_IMAGES) && fails.length > MAX_DIFF_IMAGES) {
            console.log(`(image files written for the first ${MAX_DIFF_IMAGES} changes only; raise MAX_DIFF_IMAGES to write more.)`);
        }
    } else {
        console.log("Success - all samples identical (0 differing pixels)!");
    }
    // the subjects are word-wrapped to the terminal's width, keeping their indent (a column spare, against an extra line
    //   break in terminals that wrap a line filling the width). Piped or redirected output keeps them on one line.
    const consoleWidth = process.stdout.isTTY && process.stdout.columns > 0 ? process.stdout.columns - 1 : Infinity;
    console.log(`\n${formatCompared(sources, consoleWidth).join("\n")}`);

    // Exit 0 even when samples changed: like the bash script, a regression is reported through
    // results.txt and the diff images, not the exit code (so `npm run` does not print an error).
    // Only an inability to run at all (missing folders, above) or an unexpected crash is non-zero.
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
