/* Scan all test samples for positions where the playback cursor would visually jump/move
 * BACKWARDS (outside of legitimate repetition jumps).
 *
 * Background: during playback, Cursor.cursorPositionChanged() positions the cursor via
 *   updateWithTimestamp(data.PredictedPosition)
 * where PredictedPosition is the (monotonic) playback clock in enrolled time. That timestamp is
 * mapped via MusicPartManager.absoluteEnrolledToSheetTimestamp() to a sheet timestamp and then via
 * GraphicalMusicSheet.calculateXPositionFromTimestamp() to an x position (interpolated between the
 * closest-left and closest-right graphical staff entries by default,
 * EngravingRules.InterpolateCursorPositionBetweenNotesDuringPlayback = true).
 * So the cursor can only move backwards if that timestamp->x mapping is non-monotonic.
 *
 * This script renders each sample headlessly (jsdom + build, like generateImages_browserless.mjs)
 * and checks three invariants:
 *  A) source model: within each measure, vertical containers sorted by timestamp, and no container
 *     STARTS at/after the measure's Duration (which would overlap the next measure's timeline);
 *  B) playback iterator: CurrentEnrolledTimestamp must never decrease when stepping moveToNext()
 *     (enrolled time is repetition-unrolled, so even repeat jumps must not decrease it);
 *  C) graphical cursor simulation: sweep a monotonic enrolled clock over all iterator checkpoints
 *     (+ interior samples), map to x/system like the cursor does, and flag x decreasing within the
 *     same system (or landing in an earlier system) when no repetition-transform boundary was
 *     crossed. Checked for both cursor modes (interpolated and stay-at-left).
 *  D) full cursor pipeline: drive the real Cursor via cursorPositionChanged() like the
 *     PlaybackManager does and flag its element moving backwards. Skipped (printed as "-") in
 *     builds without playback-cursor support (public OSMD), where the stay-at-left sweep of C)
 *     also equals the interpolated one (calculateXPositionFromTimestamp has no such mode there).
 *
 * Run: node test/Util/check_cursor_backwards.mjs [filterRegex] [--details] [--all]
 *   filterRegex: only process matching sample filenames (default: all except huge Actor/Gounod)
 *   --details: print every violation, not just the summary/worst ones
 *   --all: include the huge samples
 */
import FS from "fs";
import jsdom from "jsdom";
// OSMD_BUNDLE=build/opensheetmusicdisplay.js (e.g. from npm run build:webpack-dev) to test an unminified build
const { default: OSMD } = await import("../../" + (process.env.OSMD_BUNDLE ?? "build/opensheetmusicdisplay.min.js"));

const argv = process.argv.slice(2);
const flags = argv.filter(a => a.startsWith("--"));
const filterRegex = argv.find(a => !a.startsWith("--"));
const PRINT_DETAILS = flags.includes("--details");
const INCLUDE_HUGE = flags.includes("--all");

const sampleDir = "./test/data";
const X_EPSILON = 0.05; // units (1 unit = 10 px at zoom 1) - ignore sub-half-pixel jitter
const INTERIOR_SAMPLES = 3; // extra samples between consecutive checkpoints (catches interpolation regressions)

// ---- browser fakes (copied from generateImages_browserless.mjs) ----
const dom = new jsdom.JSDOM("<!DOCTYPE html></html>");
global.window = dom.window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.HTMLAnchorElement = window.HTMLAnchorElement;
global.XMLHttpRequest = window.XMLHttpRequest;
global.DOMParser = window.DOMParser;
global.Node = window.Node;

const div = document.createElement("div");
div.id = "browserlessDiv";
document.body.appendChild(div);
const width = 1440;
const height = 32767;
div.width = width;
div.height = height;
div.setAttribute("width", width);
div.setAttribute("height", height);
div.setAttribute("offsetWidth", width);
Object.defineProperties(window.HTMLElement.prototype, {
    offsetLeft: { get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0; } },
    offsetTop: { get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0; } },
    offsetHeight: { get: function () { return height; } },
    offsetWidth: { get: function () { return width; } }
});

function decodeXmlBuffer (buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) { return buffer.toString("utf16le", 2); }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        const swapped = buffer.length % 2 === 0 ? Buffer.from(buffer).swap16() : Buffer.from(buffer);
        return swapped.toString("utf16le", 2);
    }
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) { return buffer.toString("utf8", 3); }
    return buffer.toString();
}

/** Global render order index of a MusicSystem (page-major), for "earlier system" checks. */
function buildSystemOrder (graphic) {
    const order = new Map();
    let i = 0;
    for (const page of graphic.MusicPages) {
        for (const system of page.MusicSystems) {
            order.set(system, i++);
        }
    }
    return order;
}

/** Index of the repetition TimestampTransform segment an enrolled timestamp falls into.
 *  Crossing a segment boundary is where legitimate (repeat) sheet-timestamp jumps happen. */
function transformIndexFor (manager, enrolledRealValue) {
    const transforms = manager.timestamps; // private, but accessible in JS
    if (!transforms || transforms.length === 0) { return 0; }
    for (let i = transforms.length - 1; i >= 0; i--) {
        const from = transforms[i].from ?? transforms[i].$from; // public OSMD names the field $from
        if (enrolledRealValue >= from.RealValue - 1e-9) { return i; }
    }
    return 0;
}

function checkSample (osmd, sampleFilename) {
    const sheet = osmd.Sheet;
    const graphic = osmd.GraphicSheet;
    const manager = sheet.MusicPartManager;
    if (!manager.timestamps) {
        // public OSMD doesn't initialize the enrolled->sheet timestamp mapping on load
        // (nothing there uses it); absoluteEnrolledToSheetTimestamp needs it
        manager.init();
    }
    const result = {
        sample: sampleFilename,
        measures: sheet.SourceMeasures.length,
        // A) model
        unsortedContainers: [],       // {measure, index, ts, prevTs}
        overfullStarts: [],           // {measure, ts, duration} container starts at/after measure duration
        crossMeasureGraphicalContainers: [], // graphical containers merging entries of different measures
        // B) iterator
        enrolledDecreases: [],        // {step, from, to, measureFrom, measureTo, backJump}
        // C) graphical sweep (timestamp->x mapping, i.e. GraphicalMusicSheet.calculateXPositionFromTimestamp)
        xRegressionsInterpolated: [], // {enrolled, sheetTs, x, prevX, measure, system}
        xRegressionsLeft: [],
        systemRegressions: [],
        // D) full cursor pipeline (real Cursor.cursorPositionChanged incl. the backwards-movement guard)
        xRegressionsCursor: [],
        checkpoints: 0,
        error: undefined,
    };

    // ---------- A) source model checks ----------
    for (let mIdx = 0; mIdx < sheet.SourceMeasures.length; mIdx++) {
        const measure = sheet.SourceMeasures[mIdx];
        const containers = measure.VerticalSourceStaffEntryContainers;
        let prevTs = -1;
        for (let c = 0; c < containers.length; c++) {
            const ts = containers[c].Timestamp.RealValue;
            if (ts < prevTs - 1e-9) {
                result.unsortedContainers.push({ measure: measure.MeasureNumber, index: c, ts, prevTs });
            }
            prevTs = Math.max(prevTs, ts);
            if (ts >= measure.Duration.RealValue - 1e-9 && measure.Duration.RealValue > 0) {
                result.overfullStarts.push({
                    measure: measure.MeasureNumber,
                    ts: containers[c].Timestamp.toString(),
                    duration: measure.Duration.toString(),
                });
            }
        }
    }
    // graphical containers that merge staff entries from different source measures
    for (const container of graphic.VerticalGraphicalStaffEntryContainers) {
        const measureIndices = new Set();
        for (const entry of container.StaffEntries) {
            if (entry?.parentMeasure?.parentSourceMeasure) {
                measureIndices.add(entry.parentMeasure.parentSourceMeasure.measureListIndex);
            }
        }
        if (measureIndices.size > 1) {
            result.crossMeasureGraphicalContainers.push({
                ts: container.AbsoluteTimestamp.toString(),
                measures: [...measureIndices],
            });
        }
    }

    // ---------- B) playback iterator sweep ----------
    const iterator = manager.getIterator();
    const checkpoints = []; // enrolled RealValues, in playback order
    let prevEnrolled = -Infinity;
    let prevMeasureNumber = undefined;
    let steps = 0;
    const MAX_STEPS = 500000;
    while (!iterator.EndReached && steps < MAX_STEPS) {
        const enrolled = iterator.CurrentEnrolledTimestamp.RealValue;
        const measureNumber = iterator.CurrentMeasure?.MeasureNumber;
        if (enrolled < prevEnrolled - 1e-9) {
            result.enrolledDecreases.push({
                step: steps,
                from: prevEnrolled,
                to: enrolled,
                measureFrom: prevMeasureNumber,
                measureTo: measureNumber,
                backJump: iterator.backJumpOccurred === true,
            });
        }
        checkpoints.push(enrolled);
        prevEnrolled = enrolled;
        prevMeasureNumber = measureNumber;
        iterator.moveToNext();
        steps++;
    }
    result.checkpoints = checkpoints.length;

    // ---------- C) graphical playback-cursor simulation ----------
    // The playback clock is monotonic: sample the sorted unique checkpoint set + interior points.
    const sorted = [...new Set(checkpoints)].sort((a, b) => a - b);
    const samples = [];
    for (let i = 0; i < sorted.length; i++) {
        samples.push(sorted[i]);
        if (i + 1 < sorted.length) {
            const a = sorted[i], b = sorted[i + 1];
            for (let k = 1; k <= INTERIOR_SAMPLES; k++) {
                samples.push(a + (b - a) * (k / (INTERIOR_SAMPLES + 1)));
            }
        }
    }
    const systemOrder = buildSystemOrder(graphic);
    const FractionClass = sheet.SelectionStart.constructor;

    for (const stayAtLeft of [false, true]) {
        const regressions = stayAtLeft ? result.xRegressionsLeft : result.xRegressionsInterpolated;
        let prevX; let prevSystemIdx; let prevTransformIdx; let prevSheetTs;
        for (const enrolled of samples) {
            const transformIdx = transformIndexFor(manager, enrolled);
            const enrolledFraction = new FractionClass(Math.round(enrolled * 40320), 40320); // 8! denominator: exact for typical durations
            const sheetTsFraction = manager.absoluteEnrolledToSheetTimestamp(enrolledFraction);
            const sheetTs = sheetTsFraction.RealValue;
            let x; let system;
            try {
                const values = graphic.calculateXPositionFromTimestamp(sheetTsFraction, stayAtLeft);
                x = values[0];
                system = values[1];
            } catch {
                continue;
            }
            if (system === undefined) { continue; }
            const systemIdx = systemOrder.get(system);
            // Legitimate backwards jumps (repetitions) = crossing a repetition-transform segment.
            // Fallback: a decreasing SHEET timestamp also implies a segment crossing (within one
            // segment the mapping only adds a constant), so this never masks x-inversions, which
            // happen with non-decreasing sheet timestamps.
            const crossedTransform = (prevTransformIdx !== undefined && transformIdx !== prevTransformIdx) ||
                (prevSheetTs !== undefined && sheetTs < prevSheetTs - 1e-9);
            if (!crossedTransform && prevX !== undefined) {
                if (systemIdx === prevSystemIdx && x < prevX - X_EPSILON) {
                    regressions.push({
                        enrolled: round4(enrolled), sheetTs: round4(sheetTs),
                        x: round2(x), prevX: round2(prevX), delta: round2(x - prevX),
                        system: systemIdx,
                    });
                } else if (systemIdx < prevSystemIdx && !stayAtLeft) {
                    // only record once (identical for both modes)
                    result.systemRegressions.push({
                        enrolled: round4(enrolled), sheetTs: round4(sheetTs),
                        fromSystem: prevSystemIdx, toSystem: systemIdx,
                    });
                }
            }
            prevX = x; prevSystemIdx = systemIdx; prevTransformIdx = transformIdx; prevSheetTs = sheetTs;
        }
    }

    // ---------- D) full cursor pipeline (Cursor.cursorPositionChanged, incl. backwards guard) ----------
    const cursor = osmd.cursor;
    if (!cursor || typeof cursor.cursorPositionChanged !== "function") {
        result.xRegressionsCursor = undefined; // no playback-cursor support in this build (public OSMD)
    }
    if (result.xRegressionsCursor) {
        cursor.reset();
        cursor.show();
        let prevLeftPx; let prevSystemIdx; let prevTransformIdx; let prevSheetTs;
        for (const enrolled of samples) {
            const transformIdx = transformIndexFor(manager, enrolled);
            const enrolledFraction = new FractionClass(Math.round(enrolled * 40320), 40320);
            const sheetTsFraction = manager.absoluteEnrolledToSheetTimestamp(enrolledFraction);
            const sheetTs = sheetTsFraction.RealValue;
            let systemIdx;
            try {
                const system = graphic.calculateXPositionFromTimestamp(sheetTsFraction, true)[1];
                systemIdx = systemOrder.get(system);
                cursor.cursorPositionChanged(sheetTsFraction, { PredictedPosition: enrolledFraction, ResetOccurred: false });
            } catch {
                continue;
            }
            const leftPx = Number.parseFloat(cursor.cursorElement.style.left);
            if (!Number.isFinite(leftPx) || systemIdx === undefined) { continue; }
            const crossedTransform = (prevTransformIdx !== undefined && transformIdx !== prevTransformIdx) ||
                (prevSheetTs !== undefined && sheetTs < prevSheetTs - 1e-9);
            if (!crossedTransform && prevLeftPx !== undefined &&
                systemIdx === prevSystemIdx && leftPx < prevLeftPx - X_EPSILON * 10) {
                result.xRegressionsCursor.push({
                    enrolled: round4(enrolled), sheetTs: round4(sheetTs),
                    xPx: round2(leftPx), prevXPx: round2(prevLeftPx), delta: round2(leftPx - prevLeftPx),
                    system: systemIdx,
                });
            }
            prevLeftPx = leftPx; prevSystemIdx = systemIdx; prevTransformIdx = transformIdx; prevSheetTs = sheetTs;
        }
        cursor.hide();
    }
    return result;
}

function round2 (v) { return Math.round(v * 100) / 100; }
function round4 (v) { return Math.round(v * 10000) / 10000; }

async function main () {
    const fileEndingRegex = /^.*(([.]xml)|([.]musicxml)|([.]mxl))$/;
    let files = FS.readdirSync(sampleDir).filter(f => f.match(fileEndingRegex));
    if (!INCLUDE_HUGE) {
        files = files.filter(f => !f.match(/^(Actor)|(Gounod)/));
    }
    if (filterRegex) {
        files = files.filter(f => f.match(new RegExp(filterRegex)));
    }
    console.log(`Checking ${files.length} samples for backwards playback-cursor movement...`);

    const osmd = new OSMD.OpenSheetMusicDisplay(div, {
        autoResize: false,
        backend: "svg",
        pageFormat: "Endless",
    });
    osmd.setLogLevel("warn");

    const allResults = [];
    let processed = 0;
    for (const sampleFilename of files) {
        processed++;
        let loadParameter = FS.readFileSync(sampleDir + "/" + sampleFilename);
        if (sampleFilename.endsWith(".mxl")) {
            loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter);
        } else {
            loadParameter = decodeXmlBuffer(loadParameter);
        }
        try {
            await osmd.load(loadParameter, sampleFilename);
            osmd.render();
        } catch (ex) {
            allResults.push({ sample: sampleFilename, error: String(ex?.message ?? ex) });
            console.log(`[${processed}/${files.length}] ${sampleFilename}: LOAD/RENDER ERROR: ${ex?.message ?? ex}`);
            continue;
        }
        let result;
        try {
            result = checkSample(osmd, sampleFilename);
        } catch (ex) {
            result = { sample: sampleFilename, error: "check failed: " + String(ex?.message ?? ex) };
        }
        allResults.push(result);
        const bad = (result.xRegressionsInterpolated?.length || 0) + (result.xRegressionsLeft?.length || 0) +
            (result.systemRegressions?.length || 0) + (result.enrolledDecreases?.length || 0) +
            (result.unsortedContainers?.length || 0) + (result.xRegressionsCursor?.length || 0);
        const cursorBad = (result.xRegressionsCursor?.length || 0) > 0;
        const marker = cursorBad ? "  <-- CURSOR MOVES BACKWARDS" : (bad > 0 ? "  <-- mapping violations (cursor guarded)" : "");
        console.log(`[${processed}/${files.length}] ${sampleFilename}: ` +
            `xBackCursor=${result.xRegressionsCursor?.length ?? "-"} ` +
            `xBackInterp=${result.xRegressionsInterpolated?.length ?? "-"} ` +
            `xBackLeft=${result.xRegressionsLeft?.length ?? "-"} ` +
            `sysBack=${result.systemRegressions?.length ?? "-"} ` +
            `enrolledDec=${result.enrolledDecreases?.length ?? "-"} ` +
            `overfullStarts=${result.overfullStarts?.length ?? "-"} ` +
            `crossMeasureContainers=${result.crossMeasureGraphicalContainers?.length ?? "-"}${marker}`);
    }

    // ---------- summary ----------
    console.log("\n================ SUMMARY (samples with violations) ================");
    let anyBad = false;
    for (const r of allResults) {
        if (r.error) { continue; }
        const nInterp = r.xRegressionsInterpolated.length;
        const nLeft = r.xRegressionsLeft.length;
        const nSys = r.systemRegressions.length;
        const nEnr = r.enrolledDecreases.length;
        const nUnsorted = r.unsortedContainers.length;
        const nCursor = r.xRegressionsCursor?.length ?? 0;
        if (nInterp + nLeft + nSys + nEnr + nUnsorted + nCursor === 0) { continue; }
        anyBad = true;
        console.log(`\n--- ${r.sample} (${r.measures} measures, ${r.checkpoints} iterator steps)`);
        if (nCursor) {
            console.log(`  REAL CURSOR moves BACKWARDS during playback: ${nCursor}`);
            for (const v of r.xRegressionsCursor.slice(0, PRINT_DETAILS ? 1000 : 5)) {
                console.log(`    enrolled=${v.enrolled} sheetTs=${v.sheetTs} leftPx ${v.prevXPx} -> ${v.xPx} (delta ${v.delta}, system ${v.system})`);
            }
        }
        if (nUnsorted) { console.log(`  unsorted in-measure containers: ${nUnsorted}`); }
        if (r.overfullStarts.length) {
            console.log(`  containers starting at/after measure duration: ${r.overfullStarts.length}` +
                ` (e.g. ${JSON.stringify(r.overfullStarts.slice(0, 3))})`);
        }
        if (r.crossMeasureGraphicalContainers.length) {
            console.log(`  graphical containers merging entries of different measures: ${r.crossMeasureGraphicalContainers.length}` +
                ` (e.g. ${JSON.stringify(r.crossMeasureGraphicalContainers.slice(0, 3))})`);
        }
        if (nEnr) {
            console.log(`  iterator enrolled-timestamp DECREASES: ${nEnr}`);
            for (const d of r.enrolledDecreases.slice(0, PRINT_DETAILS ? 1000 : 5)) {
                console.log(`    step ${d.step}: ${round4(d.from)} -> ${round4(d.to)} ` +
                    `(measure ${d.measureFrom} -> ${d.measureTo}, backJump=${d.backJump})`);
            }
        }
        if (nInterp) {
            console.log(`  cursor x moves BACKWARDS (interpolated mode, default): ${nInterp}`);
            for (const v of r.xRegressionsInterpolated.slice(0, PRINT_DETAILS ? 1000 : 5)) {
                console.log(`    enrolled=${v.enrolled} sheetTs=${v.sheetTs} x ${v.prevX} -> ${v.x} (delta ${v.delta}, system ${v.system})`);
            }
        }
        if (nLeft) {
            console.log(`  cursor x moves BACKWARDS (stay-at-left mode): ${nLeft}`);
            for (const v of r.xRegressionsLeft.slice(0, PRINT_DETAILS ? 1000 : 5)) {
                console.log(`    enrolled=${v.enrolled} sheetTs=${v.sheetTs} x ${v.prevX} -> ${v.x} (delta ${v.delta}, system ${v.system})`);
            }
        }
        if (nSys) {
            console.log(`  cursor jumps to EARLIER system: ${nSys}`);
            for (const v of r.systemRegressions.slice(0, PRINT_DETAILS ? 1000 : 5)) {
                console.log(`    enrolled=${v.enrolled} sheetTs=${v.sheetTs} system ${v.fromSystem} -> ${v.toSystem}`);
            }
        }
    }
    if (!anyBad) {
        console.log("none - no backwards cursor movement detected in any sample.");
    }
    const reportPath = "./check_cursor_backwards_report.json";
    FS.writeFileSync(reportPath, JSON.stringify(allResults, undefined, 2));
    console.log(`\nFull report written to ${reportPath}`);
}

main();
