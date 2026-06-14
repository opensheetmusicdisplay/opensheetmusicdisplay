"use strict";
const FS = require("fs");
const path = require("path");

/*
  SVG layout validator — parses OSMD-generated SVGs with JSDOM and runs
  symbolic rules against rendered positions to catch layout regressions.

  Usage:
    node test/Util/validateSvgLayout.cjs <svgDir> [--threshold-overlap <px>] [--threshold-centering <pct>]

  Only validates *_font-inline.svg files (self-contained with base64 fonts).
  Exit 0 = no errors, exit 1 = errors found. Warnings don't affect exit code.
*/

// ── SMuFL lookup tables ──────────────────────────────────────────────

const SMUFL_REST = {
    0xE4E3: "whole",
    0xE4E4: "half",
    0xE4E5: "quarter",
    0xE4E6: "8th",
    0xE4E7: "16th",
    0xE4E8: "32nd",
    0xE4E9: "64th",
    0xE4EA: "128th",
};

const SMUFL_NOTEHEAD_BLACK = 0xE0A3;
const SMUFL_NOTEHEAD_HALF  = 0xE0A4;
const SMUFL_MULTIREST_HBAR       = 0xE4EF;
const SMUFL_MULTIREST_HBAR_MID   = 0xE4F0;
const SMUFL_MULTIREST_HBAR_RIGHT = 0xE4F1;

function isSmufCodepoint(cp) {
    return cp >= 0xE000 && cp <= 0xEFFF;
}

function isRestCodepoint(cp) {
    return cp in SMUFL_REST;
}

function isNoteheadCodepoint(cp) {
    return cp === SMUFL_NOTEHEAD_BLACK || cp === SMUFL_NOTEHEAD_HALF;
}

function isMultiRestCodepoint(cp) {
    return cp === SMUFL_MULTIREST_HBAR || cp === SMUFL_MULTIREST_HBAR_MID || cp === SMUFL_MULTIREST_HBAR_RIGHT;
}

// ── Time signature digit decoding ─────────────────────────────────────

function decodeTimeSigDigit(cp) {
    if (cp >= 0xE080 && cp <= 0xE089) { return cp - 0xE080; }
    if (cp === 0xE08A) { return "common"; }
    if (cp === 0xE08B) { return "cutCommon"; }
    return null;
}

// ── SVG parsing ───────────────────────────────────────────────────────

async function parseSvgFile(filePath) {
    const svgString = FS.readFileSync(filePath, "utf8");
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(svgString, { contentType: "image/svg+xml" });
    return dom.window.document;
}

function extractMeasureBounds(measureEl) {
    const stave = measureEl.querySelector(".vf-stave");
    if (!stave) { return null; }
    const firstPath = stave.querySelector("path");
    if (!firstPath) { return null; }
    const d = firstPath.getAttribute("d");
    if (!d) { return null; }
    const m = d.match(/M([\d.]+)\s+[\d.]+\s*L([\d.]+)/);
    if (!m) { return null; }
    const xStart = parseFloat(m[1]);
    const xEnd = parseFloat(m[2]);
    return { xStart, xEnd, width: xEnd - xStart };
}

function extractTimeSignature(measureEl) {
    const ts = measureEl.querySelector(".vf-timesignature");
    if (!ts) { return { top: null, bottom: null }; }
    const texts = ts.querySelectorAll("text");
    const digits = [];
    for (const t of texts) {
        const cp = t.textContent.codePointAt(0);
        const val = decodeTimeSigDigit(cp);
        if (val !== null) { digits.push(val); }
    }
    return {
        top: digits[0] ?? null,
        bottom: digits[1] ?? null,
    };
}

function extractNoteheads(measureEl) {
    const result = [];
    const stavenotes = measureEl.querySelectorAll(".vf-stavenote");
    for (const sn of stavenotes) {
        const nh = sn.querySelector(".vf-notehead");
        if (!nh) { continue; }
        const text = nh.querySelector("text");
        if (!text) { continue; }
        const cp = text.textContent.codePointAt(0);
        if (!isSmufCodepoint(cp)) { continue; }

        const xAttr = text.getAttribute("x");
        const yAttr = text.getAttribute("y");
        if (!xAttr || !yAttr) { continue; }

        result.push({
            codepoint: cp,
            x: parseFloat(xAttr),
            y: parseFloat(yAttr),
            isRest: isRestCodepoint(cp),
            isNote: isNoteheadCodepoint(cp),
            restType: SMUFL_REST[cp] ?? null,
            isMultiRest: isMultiRestCodepoint(cp),
        });
    }
    // Also check for multi-rest bars at measure level
    const multiRest = measureEl.querySelector(".vf-multirest");
    if (multiRest) {
        const texts = multiRest.querySelectorAll("text");
        for (const t of texts) {
            const cp = t.textContent.codePointAt(0);
            if (isMultiRestCodepoint(cp)) {
                result.push({ codepoint: cp, x: null, y: null, isRest: false, isNote: false, restType: null, isMultiRest: true });
            }
        }
    }
    return result;
}

function getStafflineLabel(measureEl) {
    const staffline = measureEl.closest(".staffline");
    if (!staffline) { return "?"; }
    return staffline.getAttribute("id") ?? "?";
}

// ── Rules ─────────────────────────────────────────────────────────────

function checkRestOverlap(measureEl, opts) {
    const issues = [];
    const measureId = measureEl.getAttribute("id") ?? "?";
    // Skip multi-measure rests
    if (measureEl.classList.contains("multi")) { return issues; }
    const all = extractNoteheads(measureEl);
    const rests = all.filter((n) => n.isRest);
    if (rests.length < 2) { return issues; }
    rests.sort((a, b) => a.x - b.x);
    for (let i = 0; i < rests.length - 1; i++) {
        for (let j = i + 1; j < rests.length; j++) {
            const delta = rests[j].x - rests[i].x;
            if (delta < opts.thresholdOverlap) {
                issues.push({
                    rule: "rest_overlap",
                    severity: "error",
                    measure: measureId,
                    message: `Rest overlap: ${rests[i].restType} at x=${rests[i].x.toFixed(1)} and ${rests[j].restType} at x=${rests[j].x.toFixed(1)} (delta=${delta.toFixed(1)}px)`,
                });
            } else {
                break; // rests are sorted, no need to check further
            }
        }
    }
    return issues;
}

function checkWholeRestCentering(measureEl, opts) {
    const issues = [];
    const measureId = measureEl.getAttribute("id") ?? "?";
    if (measureEl.classList.contains("multi")) { return issues; }

    const ts = extractTimeSignature(measureEl);
    const is44 = (ts.top === 4 && ts.bottom === 4) || ts.top === "common";
    if (!is44) { return issues; }

    const bounds = extractMeasureBounds(measureEl);
    if (!bounds) { return issues; }

    const all = extractNoteheads(measureEl);
    const wholeRests = all.filter((n) => n.restType === "whole");
    const notes = all.filter((n) => n.isNote);

    // Only flag if exactly one whole rest and no other notes
    if (wholeRests.length !== 1 || notes.length > 0) { return issues; }

    const restX = wholeRests[0].x;
    const expectedCenter = (bounds.xStart + bounds.xEnd) / 2;
    const deviation = Math.abs(restX - expectedCenter) / bounds.width;

    if (deviation > opts.thresholdCentering) {
        issues.push({
            rule: "whole_rest_centering",
            severity: "warning",
            measure: measureId,
            message: `Whole rest centering off: expected center at ${expectedCenter.toFixed(1)}, actual x=${restX.toFixed(1)}, deviation=${(deviation * 100).toFixed(1)}% of measure width (${bounds.width.toFixed(1)}px)`,
        });
    }
    return issues;
}

const RULES = [
    { name: "rest_overlap", fn: checkRestOverlap, severity: "error" },
    { name: "whole_rest_centering", fn: checkWholeRestCentering, severity: "warning" },
];

// ── Validation orchestrator ────────────────────────────────────────────

async function validateSvg(filePath, opts) {
    const sampleName = path.basename(filePath);
    let doc;
    try {
        doc = await parseSvgFile(filePath);
    } catch (ex) {
        return {
            sample: sampleName,
            errors: [{ rule: "parse", severity: "error", measure: "-", message: `Failed to parse SVG: ${ex.message}` }],
            warnings: [],
        };
    }

    const allIssues = [];
    const stafflines = doc.querySelectorAll(".staffline");
    for (const sl of stafflines) {
        const measures = sl.querySelectorAll(".vf-measure");
        for (const m of measures) {
            for (const rule of RULES) {
                try {
                    const issues = rule.fn(m, opts);
                    for (const iss of issues) {
                        iss.file = sampleName;
                        iss.staffline = sl.getAttribute("id") ?? "?";
                    }
                    allIssues.push(...issues);
                } catch (ex) {
                    allIssues.push({
                        rule: rule.name,
                        severity: "error",
                        measure: m.getAttribute("id") ?? "?",
                        file: sampleName,
                        message: `Rule "${rule.name}" threw: ${ex.message}`,
                    });
                }
            }
        }
    }

    const errors = allIssues.filter((i) => i.severity === "error");
    const warnings = allIssues.filter((i) => i.severity === "warning");

    return { sample: sampleName, errors, warnings };
}

// ── CLI ────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const svgDir = args[0];
    if (!svgDir) {
        console.error("Usage: node validateSvgLayout.cjs <svgDir> [--threshold-overlap <px>] [--threshold-centering <pct>]");
        process.exit(2);
    }

    const opts = {
        thresholdOverlap: 5,
        thresholdCentering: 0.15,
    };

    for (let i = 1; i < args.length; i++) {
        if (args[i] === "--threshold-overlap" && args[i + 1]) {
            opts.thresholdOverlap = parseFloat(args[++i]);
        } else if (args[i] === "--threshold-centering" && args[i + 1]) {
            opts.thresholdCentering = parseFloat(args[++i]);
        }
    }

    const files = FS.readdirSync(svgDir).filter((f) => f.endsWith("_font-inline.svg"));

    if (files.length === 0) {
        console.error("No *_font-inline.svg files found in " + svgDir);
        process.exit(1);
    }

    const results = [];
    for (const file of files.sort()) {
        const result = await validateSvg(path.join(svgDir, file), opts);
        results.push(result);
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const r of results) {
        totalErrors += r.errors.length;
        totalWarnings += r.warnings.length;

        if (r.errors.length > 0 || r.warnings.length > 0) {
            console.error(`\n${r.sample}:`);
            for (const e of r.errors) {
                console.error(`  ERROR [${e.rule}] m.${e.measure}: ${e.message}`);
            }
            for (const w of r.warnings) {
                console.error(`  WARN  [${w.rule}] m.${w.measure}: ${w.message}`);
            }
        }
    }

    console.error(`\n─── Validated ${results.length} file(s) ───`);
    console.error(`  Errors:   ${totalErrors}`);
    console.error(`  Warnings: ${totalWarnings}`);

    // JSON to stdout for machine consumption
    console.log(JSON.stringify(results, null, 1));

    process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((ex) => {
    console.error("Validator fatal error:", ex);
    process.exit(1);
});
