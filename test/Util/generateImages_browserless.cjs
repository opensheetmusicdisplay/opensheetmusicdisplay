// Node 24 bug: ESM→CJS interop (loadCJSModuleWithModuleLoad) throws internal assertion.
//   Running as .cjs avoids broken ESM→CJS bridge entirely.
"use strict";
const FS = require("fs");
const path = require("path");
const { registerFont } = require("canvas");
const OSMD = require("../../build/opensheetmusicdisplay.min.js");

// Pre-load music font data URIs for inline SVG font embedding.
// VF.Font.getFontData() only returns data for fonts loaded via data: URLs.
// In headless mode, fonts load from CDN, so loadedFontData stays empty.
// We read the woff2 files directly and build the @font-face CSS ourselves.
const VEXFLOW_FONTS_DIR = path.resolve(__dirname, "../../external/vexflow/node_modules/@vexflow-fonts");
const FONT_DATA_URIS = {};
(function preloadFontDataUris() {
    const musicFonts = {
        "Bravura": "bravura/bravura.woff2",
        "Gonville": "gonville/gonville.woff2",
        "Petaluma": "petaluma/petaluma.woff2",
        "Petaluma Script": "petalumascript/petalumascript.woff2",
        "Academico": "academico/academico.woff2",
    };
    for (const [name, relPath] of Object.entries(musicFonts)) {
        const fullPath = path.join(VEXFLOW_FONTS_DIR, relPath);
        if (FS.existsSync(fullPath)) {
            const buf = FS.readFileSync(fullPath);
            FONT_DATA_URIS[name] = "data:font/woff2;base64," + buf.toString("base64");
        }
    }
})();

/*
  Render each OSMD sample, grab the generated images, and
  dump them into a local directory as PNG or SVG files.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This can be used to generate PNGs or SVGs from OSMD without a browser.
  It's also used with the visual regression test system (using PNGs) in
  `tools/visual_regression.sh`
  (see package.json, used with npm run generate:blessed and generate:current, then test:visual).
*/

function sleep (ms) {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

let [osmdBuildDir, sampleDir, imageDir, imageFormat, pageWidth, pageHeight, filterRegex, mode, debugSleepTimeString, skyBottomLinePreference] = process.argv.slice(2, 12);
const dumpPositions = process.argv.includes("--dump-positions");
const showSkyline = process.argv.includes("--show-skyline");
imageFormat = imageFormat?.toLowerCase();
if (!osmdBuildDir || !sampleDir || !imageDir || (imageFormat !== "png" && imageFormat !== "svg")) {
    console.log("usage: " +
        "node test/Util/generateImages_browserless.mjs osmdBuildDir sampleDirectory imageDirectory svg|png [width|0] [height|0] [filterRegex|all|allSmall] [--debug|--osmdtesting] [debugSleepTime] [--batch|--webgl] [--dump-positions] [--svg]");
    console.log("  (use pageWidth and pageHeight 0 to not divide the rendering into pages (endless page))");
    console.log('  (use "all" to skip filterRegex parameter. "allSmall" with --osmdtesting skips two huge OSMD samples that take forever to render)');
    console.log("example: node test/Util/generateImages_browserless.mjs ../../build ./test/data/ ./export png");
    console.log("  --svg            also generate SVG alongside PNG");
    console.log("  --dump-positions dump positions JSON alongside images");
    console.log("  --show-skyline   draw skyline/bottomline overlay (red/blue line)");
    console.log("Error: need osmdBuildDir, sampleDir, imageDir and svg|png arguments. Exiting.");
    process.exit(1);
}
const alsoSvg = process.argv.includes("--svg");
const formatsToRender = alsoSvg && imageFormat !== "svg" ? [imageFormat, "svg"] : [imageFormat];
const useWhiteTabNumberBackground = true;
let pageFormat;
if (!mode) { mode = ""; }

async function init () {
    debug("init");

    // globalThis.Blob available since Node 18, no polyfill needed

    const vexflowFontsDir = path.resolve(__dirname, "../../external/vexflow/node_modules/@vexflow-fonts");
    registerFont(path.join(vexflowFontsDir, "bravura/bravura.otf"), { family: "Bravura" });
    registerFont(path.join(vexflowFontsDir, "gonville/gonville.otf"), { family: "Gonville" });
    registerFont(path.join(vexflowFontsDir, "petaluma/petaluma.otf"), { family: "Petaluma" });
    registerFont(path.join(vexflowFontsDir, "petalumascript/petalumascript.otf"), { family: "Petaluma Script" });
    registerFont(path.join(vexflowFontsDir, "academico/academico.otf"), { family: "Academico" });
    registerFont(path.join(vexflowFontsDir, "academico/academico-bold.otf"), { family: "Academico", weight: "bold" });

    const osmdTestMode = mode.includes("osmdtesting");
    const osmdTestSingleMode = mode.includes("osmdtestingsingle");
    const DEBUG = mode.startsWith("--debug");
    if (DEBUG) {
        const debugSleepTimeMs = Number.parseInt(debugSleepTimeString, 10);
        if (debugSleepTimeMs > 0) {
            debug("debug sleep time: " + debugSleepTimeString);
            await sleep(Number.parseInt(debugSleepTimeMs, 10));
        }
    }
    debug("sampleDir: " + sampleDir, DEBUG);
    debug("imageDir: " + imageDir, DEBUG);
    debug("imageFormat: " + imageFormat, DEBUG);

    pageFormat = "Endless";
    pageWidth = Number.parseInt(pageWidth, 10);
    pageHeight = Number.parseInt(pageHeight, 10);
    const endlessPage = !(pageHeight > 0 && pageWidth > 0);
    if (!endlessPage) { pageFormat = `${pageWidth}x${pageHeight}`; }

    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM("<!DOCTYPE html></html>");
    global.window = dom.window;
    global.document = window.document;
    global.HTMLElement = window.HTMLElement;
    global.HTMLAnchorElement = window.HTMLAnchorElement;
    global.XMLHttpRequest = window.XMLHttpRequest;
    global.DOMParser = window.DOMParser;
    global.Node = window.Node;
    global.XMLSerializer = window.XMLSerializer;
    if (formatsToRender.includes("png")) { global.Canvas = window.Canvas; }

    try {
        const { default: headless_gl } = await import("gl");
        const oldCreateElement = document.createElement.bind(document);
        document.createElement = function (tagName, options) {
            if (tagName.toLowerCase() === "canvas") {
                const canvas = oldCreateElement(tagName, options);
                const oldGetContext = canvas.getContext.bind(canvas);
                canvas.getContext = function (contextType, contextAttributes) {
                    if (contextType.toLowerCase() === "webgl" || contextType.toLowerCase() === "experimental-webgl") {
                        const gl = headless_gl(canvas.width, canvas.height, contextAttributes);
                        gl.canvas = canvas;
                        return gl;
                    } else { return oldGetContext(contextType, contextAttributes); }
                };
                return canvas;
            } else { return oldCreateElement(tagName, options); }
        };
    } catch {
        if (skyBottomLinePreference === "--webgl") {
            debug("WebGL image generation was requested but gl is not installed; using non-WebGL generation.");
        }
    }

    const div = document.createElement("div");
    div.id = "browserlessDiv";
    document.body.appendChild(div);

    const zoom = 1.0;
    let width = pageWidth * zoom;
    if (endlessPage) { width = 1440; }
    let height = pageHeight;
    if (endlessPage) { height = 32767; }
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
    debug("div.offsetWidth: " + div.offsetWidth, DEBUG);
    debug("div.height: " + div.height, DEBUG);

    FS.mkdirSync(imageDir, { recursive: true });

    const sampleDirFilenames = FS.readdirSync(sampleDir);
    let samplesToProcess = [];
    const fileEndingRegex = "^.*(([.]xml)|([.]musicxml)|([.]mxl))$";
    for (const sampleFilename of sampleDirFilenames) {
        if (osmdTestMode && filterRegex === "allSmall") {
            if (sampleFilename.match("^(Actor)|(Gounod)")) {
                debug("filtering big file: " + sampleFilename, DEBUG);
                continue;
            }
        }
        if (sampleFilename.match(fileEndingRegex)) {
            samplesToProcess.push(sampleFilename);
        } else {
            debug("discarded file/directory: " + sampleFilename, DEBUG);
        }
    }

    if (filterRegex && filterRegex !== "" && filterRegex !== "all" && !(osmdTestMode && filterRegex === "allSmall")) {
        debug("filtering samples for regex: " + filterRegex, DEBUG);
        samplesToProcess = samplesToProcess.filter((filename) => filename.match(filterRegex) && filename.match(fileEndingRegex));
        debug(`found ${samplesToProcess.length} matches: `, DEBUG);
        for (let i = 0; i < samplesToProcess.length; i++) { debug(samplesToProcess[i], DEBUG); }
    }

    for (const fmt of formatsToRender) {
        imageFormat = fmt;
        const backend = fmt === "png" ? "canvas" : "svg";
        const osmdInstance = new OSMD.OpenSheetMusicDisplay(div, {
            autoResize: false,
            backend: backend,
            pageBackgroundColor: "#FFFFFF",
            pageFormat: pageFormat
        });
        osmdInstance.TransposeCalculator = new OSMD.TransposeCalculator();

        if (useWhiteTabNumberBackground && backend === "png") {
            osmdInstance.EngravingRules.pageBackgroundColor = "#FFFFFF";
        }
        if (backend === "svg") {
            osmdInstance.EngravingRules.SVGFontEmbedding = "inline";
        }
        if (DEBUG) {
            osmdInstance.setLogLevel("debug");
            debug("osmd PageFormat idString: " + osmdInstance.EngravingRules.PageFormat.idString);
            debug("PageHeight: " + osmdInstance.EngravingRules.PageHeight);
        } else {
            osmdInstance.setLogLevel("info");
        }

        debug("[OSMD.generateImages] starting loop over samples for " + fmt + ", saving to " + imageDir, DEBUG);
        if (typeof document !== "undefined" && document.fonts) {
            await document.fonts.ready;
        }

        for (let i = 0; i < samplesToProcess.length; i++) {
            const sampleFilename = samplesToProcess[i];
            debug("sampleFilename: " + sampleFilename, DEBUG);

            await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {}, DEBUG);

            if (osmdTestMode) {
                if (!osmdTestSingleMode && sampleFilename.startsWith("Beethoven") && sampleFilename.includes("Geliebte")) {
                    await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {
                        skyBottomLine: true, fileNameAddition: "skyBottomLine"}, DEBUG);
                    await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {
                        drawBoundingBoxString: "VexFlowGraphicalNote", fileNameAddition: "bboxVexFlowGraphicalNote_"}, DEBUG);
                } else if (sampleFilename.startsWith("test_tab_x-alignment_triplet_plus_bracket_below_above")) {
                    await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {
                        darkMode: true, fileNameAddition: "darkmode_"}, DEBUG);
                } else if (sampleFilename.startsWith("JohannSebastianBach_PraeludiumInCDur")) {
                    await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {
                        staffVisibility: { 0: true, 1: false}, fileNameAddition: "right_hand_only_"}, DEBUG);
                    await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestMode, {
                        staffVisibility: { 0: false, 1: true}, fileNameAddition: "left_hand_only_"}, DEBUG);
                }
            }
        }
    }

    debug("done, exiting.");
}

async function generateSampleImage (sampleFilename, directory, osmdInstance, osmdTestMode,
    options = {}, DEBUG = false) {

    const samplePath = directory + "/" + sampleFilename;
    let loadParameter = FS.readFileSync(samplePath);

    if (sampleFilename.endsWith(".mxl")) {
        loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter);
    } else {
        loadParameter = loadParameter.toString();
    }

    if (osmdTestMode) {
        options = setOsmdTestOptionsBeforeLoad(sampleFilename, options, osmdInstance);
    }

    try {
        debug("loading sample " + sampleFilename, DEBUG);
        await osmdInstance.load(loadParameter, sampleFilename);
        if (osmdTestMode) {
            options = setOsmdTestOptionsAfterLoad(sampleFilename, options, osmdInstance);
        }
    } catch (ex) {
        debug("couldn't load sample " + sampleFilename + ", skipping. Error: \n" + ex);
        return;
    }
    debug("xml loaded", DEBUG);
    if (showSkyline) {
        osmdInstance.DrawSkyLine = true;
        osmdInstance.drawBottomLine = true;
    }
    try {
        osmdInstance.render();
        const isTestTransposingAccidentals = sampleFilename.includes("test_transposing_accidentals_1383");
        const isTestTransposingCsharpMajorToCAndBack = sampleFilename.includes("test_transposing_csharp_major_to_c_and_back_to_csharp");

        if (isTestTransposingAccidentals) {
            osmdInstance.Sheet.Transpose = 1;
            osmdInstance.updateGraphic();
            osmdInstance.render();
            osmdInstance.Sheet.Transpose = 0;
            osmdInstance.updateGraphic();
            osmdInstance.render();
        }
        if (isTestTransposingCsharpMajorToCAndBack) {
            osmdInstance.Sheet.Transpose = -1;
            osmdInstance.updateGraphic();
            osmdInstance.render();
            osmdInstance.Sheet.Transpose = 0;
            osmdInstance.updateGraphic();
            osmdInstance.render();
        }
    } catch (ex) {
        debug("renderError: " + ex);
    }
    debug("rendered", DEBUG);

    const markupStrings = [];
    const dataUrls = [];
    let canvasImage;

    for (let pageNumber = 1; pageNumber < Number.POSITIVE_INFINITY; pageNumber++) {
        if (imageFormat === "png") {
            canvasImage = document.getElementById("osmdCanvasVexFlowBackendCanvas" + pageNumber);
            if (!canvasImage) { break; }
            if (!canvasImage.toDataURL) {
                debug(`error: could not get canvas image for page ${pageNumber} for file: ${sampleFilename}`);
                break;
            }
            dataUrls.push(canvasImage.toDataURL());
        } else if (imageFormat === "svg") {
            const svgPageId = "osmdSvgPage" + pageNumber;
            if (!document.getElementById(svgPageId)) { break; }
            const backend = osmdInstance.drawer.Backends[pageNumber - 1];
            // Import variant (CDN font URLs)
            osmdInstance.EngravingRules.SVGFontEmbedding = "import";
            markupStrings.push({ markup: backend.getExportedSVGString(), suffix: "", pageNumber: pageNumber });
            // Inline variant (base64 font data URIs) — suppress built-in injectFontCSS
            osmdInstance.EngravingRules.SVGFontEmbedding = "none";
            let inlineSvg = backend.getExportedSVGString();
            inlineSvg = injectFontDataUris(inlineSvg);
            markupStrings.push({ markup: inlineSvg, suffix: "_font-inline", pageNumber: pageNumber });
        }
    }

    for (let pageIndex = 0; pageIndex < Math.max(dataUrls.length, markupStrings.length); pageIndex++) {
        const pageNumberingString = `${pageIndex + 1}`;
        const fileNameAddition = options.fileNameAddition ?? "";
        const pageFilename = `${imageDir}/${sampleFilename}_${fileNameAddition}${pageNumberingString}.${imageFormat}`;

        if (imageFormat === "png") {
            const dataUrl = dataUrls[pageIndex];
            if (!dataUrl || !dataUrl.split) {
                debug(`error: could not get dataUrl for page ${pageIndex + 1} of sample: ${sampleFilename}`);
                continue;
            }
            const imageData = dataUrl.split(";base64,").pop();
            const imageBuffer = Buffer.from(imageData, "base64");
            debug("got image data, saving to: " + pageFilename, DEBUG);
            FS.writeFileSync(pageFilename, imageBuffer, { encoding: "base64" });
        } else if (imageFormat === "svg") {
            const entry = markupStrings[pageIndex];
            if (!entry || !entry.markup) {
                debug(`error: could not get markup for page ${pageIndex + 1} of sample: ${sampleFilename}`);
                continue;
            }
            const svgPageNum = entry.pageNumber ?? (pageIndex + 1);
            const svgFilename = `${imageDir}/${sampleFilename}_${fileNameAddition}${svgPageNum}${entry.suffix}.${imageFormat}`;
            debug("got svg markup data, saving to: " + svgFilename, DEBUG);
            FS.writeFileSync(svgFilename, entry.markup, { encoding: "utf-8" });
        }

        if (dumpPositions && imageFormat === "png") {
            const jsonFilename = pageFilename.replace(new RegExp(`\\.${imageFormat}$`), ".positions.json");
            try {
                const dump = dumpGraphicalPositions(osmdInstance, sampleFilename, pageIndex);
                FS.writeFileSync(jsonFilename, JSON.stringify(dump, null, 1), { encoding: "utf-8" });
                debug("wrote positions dump: " + jsonFilename, DEBUG);
            } catch (ex) {
                debug("error dumping positions for " + sampleFilename + " page " + pageIndex + ": " + ex, true);
            }
            // Copy source musicxml alongside positions.json for debugging
            const xmlDestFilename = pageFilename.replace(new RegExp(`\\.${imageFormat}$`), ".musicxml");
            try {
                FS.copyFileSync(samplePath, xmlDestFilename);
                debug("copied musicxml: " + xmlDestFilename, DEBUG);
            } catch (ex) {
                debug("error copying musicxml for " + sampleFilename + ": " + ex, true);
            }
        }
    }
}

function dumpGraphicalPositions(osmdInstance, sampleFilename, pageIndex) {
    const gs = osmdInstance.graphic;
    if (!gs || !gs.MusicPages) { return { error: "No graphic sheet or MusicPages" }; }

    const page = gs.MusicPages[pageIndex];
    if (!page) { return { error: `Page ${pageIndex} not found` }; }

    const pageWidth = page.PositionAndShape?.Size?.width;
    const pageHeight = page.PositionAndShape?.Size?.height;
    let totalCount = 0;

    function extractBBox(ps) {
        if (!ps) { return null; }
        return {
            absX: ps.AbsolutePosition ? ps.AbsolutePosition.x : undefined,
            absY: ps.AbsolutePosition ? ps.AbsolutePosition.y : undefined,
            relX: ps.RelativePosition ? ps.RelativePosition.x : undefined,
            relY: ps.RelativePosition ? ps.RelativePosition.y : undefined,
            w: ps.Size ? ps.Size.width : undefined,
            h: ps.Size ? ps.Size.height : undefined,
            bl: ps.BorderLeft,
            br: ps.BorderRight,
            bt: ps.BorderTop,
            bb: ps.BorderBottom,
            bml: ps.BorderMarginLeft,
            bmr: ps.BorderMarginRight,
        };
    }

    var DYNAMIC_ENUM_NAMES = ["pppppp","ppppp","pppp","ppp","pp","p","mp","mf","f","ff","fff","ffff","fffff","ffffff","sf","sff","sfp","sfpp","fp","rf","rfz","sfz","sffz","fz","other"];

    function detectExpressionType(expr) {
        if (expr.Lines !== undefined && expr.ContinuousDynamic !== undefined) {
            if (expr.IsVerbal) { return "verbalDynamic"; }
            var dt = expr.ContinuousDynamic.DynamicType;
            if (dt === 0) { return "crescendo"; }
            if (dt === 1) { return "diminuendo"; }
            return "continuousDynamic";
        }
        if (expr.getOctaveShift !== undefined || expr.octaveSymbol !== undefined) { return "octaveShift"; }
        if (expr.getPedal !== undefined || expr.pedalSymbol !== undefined) { return "pedal"; }
        if (expr.SourceExpression !== undefined) {
            var se = expr.SourceExpression;
            if (se && se.DynEnum !== undefined) { return "instantaneousDynamic"; }
            if (se && se.TempoInBpm !== undefined) { return "instantaneousTempo"; }
            return "expression";
        }
        return "unknown";
    }

    function extractExpressionFields(expr, measureAbsX) {
        const fields = {};
        if (expr.Placement !== undefined) { fields.placement = expr.Placement; }
        if (expr.Lines && Array.isArray(expr.Lines)) {
            fields.lines = expr.Lines.map(function(l) {
                const sx = l.Start ? l.Start.x : undefined;
                const ex = l.End ? l.End.x : undefined;
                return {
                    sx: sx,
                    sy: l.Start ? l.Start.y : undefined,
                    ex: ex,
                    ey: l.End ? l.End.y : undefined,
                    absSx: measureAbsX !== undefined && sx !== undefined ? measureAbsX + sx : undefined,
                    absEx: measureAbsX !== undefined && ex !== undefined ? measureAbsX + ex : undefined,
                };
            });
        }
        if (expr.ContinuousDynamic) {
            fields.startTimestamp = expr.ContinuousDynamic.StartMultiExpression?.AbsoluteTimestamp?.RealValue;
            fields.endTimestamp = expr.ContinuousDynamic.EndMultiExpression?.AbsoluteTimestamp?.RealValue;
        }
        if (expr.StartMeasure) { fields.startMeasureNum = expr.StartMeasure.MeasureNumber; }
        if (expr.EndMeasure) { fields.endMeasureNum = expr.EndMeasure.MeasureNumber; }
        if (expr.getOctaveShift) { fields.octaveType = expr.getOctaveShift.Type; }
        if (expr.getPedal) {
            fields.pedalType = expr.getPedal.Type;
            fields.pedalLine = expr.getPedal.IsLine;
            fields.pedalSign = expr.getPedal.IsSign;
        }
        if (expr.SourceExpression && expr.SourceExpression.DynEnum !== undefined) {
            var de = expr.SourceExpression.DynEnum;
            fields.dynamic = de < DYNAMIC_ENUM_NAMES.length ? DYNAMIC_ENUM_NAMES[de] : "unknown";
            fields.midiVolume = expr.SourceExpression.MidiVolume;
        }
        if (expr.SourceExpression && expr.SourceExpression.TempoInBpm !== undefined) {
            fields.tempoBpm = expr.SourceExpression.TempoInBpm;
            fields.tempoType = expr.SourceExpression.TempoType;
        }
        return fields;
    }

    function extractNoteFields(note) {
        const fields = {};
        fields.staffLine = note.staffLine;
        if (note.sourceNote) {
            fields.isRest = note.sourceNote.isRest ? note.sourceNote.isRest() : false;
            if (note.sourceNote.Pitch) {
                fields.pitch = note.sourceNote.Pitch.ToString ? note.sourceNote.Pitch.ToString() : undefined;
            }
            if (note.sourceNote.Length) {
                fields.noteLength = note.sourceNote.Length.RealValue;
            }
            fields.drawnAccidental = note.sourceNote.DrawnAccidental;
        }
        if (note.vfnote) {
            fields.vfAbsX = note.vfnote[0].getAbsoluteX ? note.vfnote[0].getAbsoluteX() : undefined;
            fields.xShift = note.vfnote[0].xShift;
        }
        return fields;
    }

    if (!page.MusicSystems) { return { sample: sampleFilename, page: pageIndex + 1, pageWidth, pageHeight, elementCount: 0 }; }

    const systems = [];

    for (let si = 0; si < page.MusicSystems.length; si++) {
        const sys = page.MusicSystems[si];
        if (!sys || !sys.PositionAndShape) { continue; }
        totalCount++;

        // --- system-level children ---
        const systemLines = [];
        if (sys.SystemLines && Array.isArray(sys.SystemLines)) {
            for (let li = 0; li < sys.SystemLines.length; li++) {
                const sl = sys.SystemLines[li];
                totalCount++;
                systemLines.push({ type: "systemLine", path: `s${si}.sline${li}`, bbox: extractBBox(sl.PositionAndShape) });
            }
        }

        const groupBrackets = [];
        const instrumentBrackets = [];
        const bracketArrays = [
            { arr: sys.InstrumentBrackets, label: "instrumentBracket", target: instrumentBrackets },
            { arr: sys.GroupBrackets, label: "groupBracket", target: groupBrackets },
        ];
        for (const ba of bracketArrays) {
            if (!ba.arr || !Array.isArray(ba.arr)) { continue; }
            for (let bi = 0; bi < ba.arr.length; bi++) {
                const bracket = ba.arr[bi];
                totalCount++;
                ba.target.push({ type: ba.label, path: `s${si}.${ba.label[0]}${bi}`, bbox: extractBBox(bracket.PositionAndShape) });
            }
        }

        // --- staffLines ---
        const staffLines = [];
        if (sys.StaffLines && Array.isArray(sys.StaffLines)) {
            for (let sli = 0; sli < sys.StaffLines.length; sli++) {
                const staffLine = sys.StaffLines[sli];
                if (!staffLine) { continue; }
                const slPrefix = `s${si}.sl${sli}`;
                const slChildren = []; // horizontal 5-line staff lines

                if (staffLine.StaffLines && Array.isArray(staffLine.StaffLines)) {
                    for (let hli = 0; hli < staffLine.StaffLines.length; hli++) {
                        const hl = staffLine.StaffLines[hli];
                        if (!hl || !hl.Start || !hl.End) { continue; }
                        totalCount++;
                        slChildren.push({
                            type: "staffLine",
                            path: `${slPrefix}.hline${hli}`,
                            startX: hl.Start.x, startY: hl.Start.y,
                            endX: hl.End.x, endY: hl.End.y,
                            lineWidth: hl.Width,
                        });
                    }
                }

                const lyricLines = [];
                if (staffLine.LyricLines && Array.isArray(staffLine.LyricLines)) {
                    for (let lli = 0; lli < staffLine.LyricLines.length; lli++) {
                        const ll = staffLine.LyricLines[lli];
                        if (!ll) { continue; }
                        totalCount++;
                        lyricLines.push({ type: "lyricLine", path: `${slPrefix}.lline${lli}`, bbox: extractBBox(ll.PositionAndShape) });
                    }
                }

                const slurs = [];
                if (staffLine.GraphicalSlurs && Array.isArray(staffLine.GraphicalSlurs)) {
                    for (let gsi = 0; gsi < staffLine.GraphicalSlurs.length; gsi++) {
                        const slur = staffLine.GraphicalSlurs[gsi];
                        if (!slur) { continue; }
                        totalCount++;
                        const slurEntry = {
                            type: "slur",
                            path: `${slPrefix}.slur${gsi}`,
                            placement: slur.placement,
                            staffEntryCount: slur.staffEntries ? slur.staffEntries.length : 0,
                        };
                        // Compute bounding box from Bezier curve
                        if (slur.bezierStartPt && slur.bezierEndPt) {
                            const samples = 20;
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            for (let si = 0; si <= samples; si++) {
                                const t = si / samples;
                                const pt = slur.calculateCurvePointAtIndex(t);
                                if (pt) {
                                    if (pt.x < minX) { minX = pt.x; }
                                    if (pt.y < minY) { minY = pt.y; }
                                    if (pt.x > maxX) { maxX = pt.x; }
                                    if (pt.y > maxY) { maxY = pt.y; }
                                }
                            }
                            const sysAbsX = sys.PositionAndShape.AbsolutePosition.x;
                            const sysAbsY = sys.PositionAndShape.AbsolutePosition.y;
                            slurEntry.bbox = {
                                absX: sysAbsX + minX,
                                absY: sysAbsY + minY,
                                relX: minX,
                                relY: minY,
                                w: maxX - minX,
                                h: maxY - minY,
                            };
                        }
                        slurs.push(slurEntry);
                    }
                }

                // --- measures ---
                const measures = [];
                if (staffLine.Measures && Array.isArray(staffLine.Measures)) {
                    for (let mi = 0; mi < staffLine.Measures.length; mi++) {
                        const measure = staffLine.Measures[mi];
                        if (!measure) { continue; }
                        totalCount++;
                        const mPrefix = `${slPrefix}.m${mi}`;

                        // --- staffEntries ---
                        const staffEntries = [];
                        if (measure.staffEntries && Array.isArray(measure.staffEntries)) {
                            for (let sei = 0; sei < measure.staffEntries.length; sei++) {
                                const se = measure.staffEntries[sei];
                                if (!se) { continue; }
                                totalCount++;
                                const sePrefix = `${mPrefix}.se${sei}`;
                                const seTags = [];
                                if (se.relInMeasureTimestamp) {
                                    seTags.push("ts=" + se.relInMeasureTimestamp.RealValue);
                                }

                                // --- voiceEntries ---
                                const voiceEntries = [];
                                if (se.graphicalVoiceEntries && Array.isArray(se.graphicalVoiceEntries)) {
                                    for (let vei = 0; vei < se.graphicalVoiceEntries.length; vei++) {
                                        const ve = se.graphicalVoiceEntries[vei];
                                        if (!ve) { continue; }
                                        totalCount++;
                                        const vePrefix = `${sePrefix}.ve${vei}`;
                                        const veInfo = { type: "voiceEntry", path: vePrefix, bbox: extractBBox(ve.PositionAndShape) };
                                        if (ve.vfStaveNote) {
                                            veInfo.xShift = ve.vfStaveNote.xShift;
                                            veInfo.vfAbsX = ve.vfStaveNote.getAbsoluteX ? ve.vfStaveNote.getAbsoluteX() : undefined;
                                        }

                                        // --- notes ---
                                        const notes = [];
                                        if (ve.notes && Array.isArray(ve.notes)) {
                                            for (let ni = 0; ni < ve.notes.length; ni++) {
                                                const note = ve.notes[ni];
                                                if (!note) { continue; }
                                                totalCount++;
                                                notes.push({ type: "note", path: `${vePrefix}.n${ni}`, bbox: extractBBox(note.PositionAndShape), ...extractNoteFields(note) });
                                            }
                                        }
                                        veInfo.notes = notes;
                                        voiceEntries.push(veInfo);
                                    }
                                }

                                // --- graphicalInstructions ---
                                const graphicalInstructions = [];
                                if (se.GraphicalInstructions && Array.isArray(se.GraphicalInstructions)) {
                                    for (let gii = 0; gii < se.GraphicalInstructions.length; gii++) {
                                        const gi = se.GraphicalInstructions[gii];
                                        if (!gi) { continue; }
                                        totalCount++;
                                        let giType = "instruction";
                                        if (gi.clef !== undefined || gi.Clef !== undefined) { giType = "clef"; }
                                        else if (gi.Key !== undefined || gi.keySig !== undefined) { giType = "keySignature"; }
                                        else if (gi.timeSig !== undefined || gi.Time !== undefined) { giType = "timeSignature"; }
                                        graphicalInstructions.push({ type: giType, path: `${sePrefix}.instr${gii}`, bbox: extractBBox(gi.PositionAndShape) });
                                    }
                                }

                                // --- ties ---
                                const ties = [];
                                if (se.GraphicalTies && Array.isArray(se.GraphicalTies)) {
                                    for (let ti = 0; ti < se.GraphicalTies.length; ti++) {
                                        const tie = se.GraphicalTies[ti];
                                        if (!tie) { continue; }
                                        totalCount++;
                                        const tieInfo = { type: "tie", path: `${sePrefix}.tie${ti}` };
                                        if (tie.StartNote && tie.StartNote.sourceNote && tie.StartNote.sourceNote.Pitch) {
                                            tieInfo.startPitch = tie.StartNote.sourceNote.Pitch.ToString ? tie.StartNote.sourceNote.Pitch.ToString() : undefined;
                                        }
                                        if (tie.EndNote && tie.EndNote.sourceNote && tie.EndNote.sourceNote.Pitch) {
                                            tieInfo.endPitch = tie.EndNote.sourceNote.Pitch.ToString ? tie.EndNote.sourceNote.Pitch.ToString() : undefined;
                                        }
                                        ties.push(tieInfo);
                                    }
                                }

                                // --- lyrics ---
                                const lyrics = [];
                                if (se.LyricsEntries && Array.isArray(se.LyricsEntries)) {
                                    for (let lyi = 0; lyi < se.LyricsEntries.length; lyi++) {
                                        const ly = se.LyricsEntries[lyi];
                                        if (!ly) { continue; }
                                        totalCount++;
                                        const lyInfo = { type: "lyric", path: `${sePrefix}.ly${lyi}` };
                                        if (ly.GraphicalLabel && ly.GraphicalLabel.PositionAndShape) {
                                            lyInfo.bbox = extractBBox(ly.GraphicalLabel.PositionAndShape);
                                        }
                                        if (ly.GraphicalLabel && ly.GraphicalLabel.TextLines) {
                                            lyInfo.text = ly.GraphicalLabel.TextLines.join("");
                                        }
                                        lyrics.push(lyInfo);
                                    }
                                }

                                // --- chordSymbols ---
                                const chordSymbols = [];
                                if (se.graphicalChordContainers && Array.isArray(se.graphicalChordContainers)) {
                                    for (let cci = 0; cci < se.graphicalChordContainers.length; cci++) {
                                        const cc = se.graphicalChordContainers[cci];
                                        if (!cc) { continue; }
                                        totalCount++;
                                        const ccInfo = { type: "chordSymbol", path: `${sePrefix}.chord${cci}` };
                                        if (cc.GraphicalLabel && cc.GraphicalLabel.PositionAndShape) {
                                            ccInfo.bbox = extractBBox(cc.GraphicalLabel.PositionAndShape);
                                        }
                                        if (cc.GraphicalLabel && cc.GraphicalLabel.TextLines) {
                                            ccInfo.text = cc.GraphicalLabel.TextLines.join("");
                                        }
                                        chordSymbols.push(ccInfo);
                                    }
                                }

                                staffEntries.push({
                                    type: "staffEntry",
                                    path: sePrefix,
                                    bbox: extractBBox(se.PositionAndShape),
                                    tags: seTags.join(" "),
                                    voiceEntries: voiceEntries,
                                    graphicalInstructions: graphicalInstructions,
                                    ties: ties,
                                    lyrics: lyrics,
                                    chordSymbols: chordSymbols,
                                });
                            }
                        }

                        measures.push({
                            type: "measure",
                            path: mPrefix,
                            bbox: extractBBox(measure.PositionAndShape),
                            measureNumber: measure.MeasureNumber,
                            beginInstructionsWidth: measure.beginInstructionsWidth,
                            endInstructionsWidth: measure.endInstructionsWidth,
                            isExtraGraphicalMeasure: measure.IsExtraGraphicalMeasure,
                            isMultiRestMeasure: measure.isMultiRestMeasure ? measure.isMultiRestMeasure() : false,
                            staffEntries: staffEntries,
                        });
                    }
                }

                // --- expressions (attached to staffLine) ---
                const firstMeasureAbsX = measures.length > 0 && measures[0].bbox ? measures[0].bbox.absX : undefined;
                const expressions = [];
                // OctaveShifts
                if (staffLine.OctaveShifts && Array.isArray(staffLine.OctaveShifts)) {
                    for (let oi = 0; oi < staffLine.OctaveShifts.length; oi++) {
                        const expr = staffLine.OctaveShifts[oi];
                        if (!expr) { continue; }
                        totalCount++;
                        expressions.push({
                            type: "octaveShift",
                            path: `${slPrefix}.oct${oi}`,
                            bbox: extractBBox(expr.PositionAndShape),
                            octaveType: expr.getOctaveShift ? expr.getOctaveShift.Type : undefined,
                        });
                    }
                }
                // Pedals
                if (staffLine.Pedals && Array.isArray(staffLine.Pedals)) {
                    for (let pi = 0; pi < staffLine.Pedals.length; pi++) {
                        const expr = staffLine.Pedals[pi];
                        if (!expr) { continue; }
                        totalCount++;
                        expressions.push({
                            type: "pedal",
                            path: `${slPrefix}.ped${pi}`,
                            bbox: extractBBox(expr.PositionAndShape),
                            pedalType: expr.getPedal ? expr.getPedal.Type : undefined,
                        });
                    }
                }
                // WavyLines
                if (staffLine.WavyLines && Array.isArray(staffLine.WavyLines)) {
                    for (let wi = 0; wi < staffLine.WavyLines.length; wi++) {
                        const expr = staffLine.WavyLines[wi];
                        if (!expr) { continue; }
                        totalCount++;
                        expressions.push({
                            type: "wavyLine",
                            path: `${slPrefix}.wavy${wi}`,
                            bbox: extractBBox(expr.PositionAndShape),
                        });
                    }
                }
                // AbstractExpressions (wedges, dynamics, tempo)
                if (staffLine.AbstractExpressions && Array.isArray(staffLine.AbstractExpressions)) {
                    for (let ei = 0; ei < staffLine.AbstractExpressions.length; ei++) {
                        const expr = staffLine.AbstractExpressions[ei];
                        if (!expr) { continue; }
                        totalCount++;
                        const subtype = detectExpressionType(expr);
                        const exprInfo = {
                            type: "expression",
                            subtype: subtype,
                            path: `${slPrefix}.expr${ei}`,
                            bbox: extractBBox(expr.PositionAndShape),
                        };
                        Object.assign(exprInfo, extractExpressionFields(expr, firstMeasureAbsX));
                        expressions.push(exprInfo);
                    }
                }

                staffLines.push({
                    type: "staffLineGroup",
                    path: slPrefix,
                    staffLines: slChildren,
                    lyricLines: lyricLines,
                    slurs: slurs,
                    measures: measures,
                    expressions: expressions,
                });
            }
        }

        systems.push({
            type: "system",
            path: `s${si}`,
            bbox: extractBBox(sys.PositionAndShape),
            systemLines: systemLines,
            groupBrackets: groupBrackets,
            instrumentBrackets: instrumentBrackets,
            staffLineGroups: staffLines,
        });
    }

    return {
        sample: sampleFilename,
        page: pageIndex + 1,
        pageWidth: pageWidth,
        pageHeight: pageHeight,
        elementCount: totalCount,
        systems: systems,
    };
}

function injectFontDataUris(svgMarkup) {
    const usedFonts = [];
    for (const fontName of Object.keys(FONT_DATA_URIS)) {
        if (svgMarkup.includes(fontName)) {
            usedFonts.push(fontName);
        }
    }
    if (usedFonts.length === 0) { return svgMarkup; }

    let css = "";
    for (const fontName of usedFonts) {
        css += `@font-face { font-family: "${fontName}"; src: url(${FONT_DATA_URIS[fontName]}); font-display: block; }\n`;
    }

    // Insert <style> as first child of <svg> element.
    const svgTagMatch = svgMarkup.match(/<svg[^>]*>/);
    if (!svgTagMatch) { return svgMarkup; }
    const svgTagEnd = svgMarkup.indexOf(svgTagMatch[0]) + svgTagMatch[0].length;
    const styleTag = `<style type="text/css">${css}</style>`;
    return svgMarkup.slice(0, svgTagEnd) + styleTag + svgMarkup.slice(svgTagEnd);
}

function debug (msg, debugEnabled = true) {
    if (debugEnabled) { console.log("[generateImages] " + msg); }
}

function makeSkyBottomLineOptions() {
    const preference = skyBottomLinePreference ?? "";
    if (preference === "--batch") {
        return { preferredSkyBottomLineBatchCalculatorBackend: 0, skyBottomLineBatchCriteria: 0 };
    } else if (preference === "--webgl") {
        return { preferredSkyBottomLineBatchCalculatorBackend: 1, skyBottomLineBatchCriteria: 0 };
    } else {
        return { preferredSkyBottomLineBatchCalculatorBackend: 0, skyBottomLineBatchCriteria: Infinity };
    }
}

function setOsmdTestOptionsBeforeLoad(sampleFilename, options, osmdInstance) {
    let includeSkyBottomLine = false;
    const isFunctionTestAutobeam = sampleFilename.startsWith("OSMD_function_test_autobeam");
    const isFunctionTestAutoColoring = sampleFilename.startsWith("OSMD_function_test_auto-custom-coloring");
    const isFunctionTestSystemAndPageBreaks = sampleFilename.startsWith("OSMD_Function_Test_System_and_Page_Breaks");
    const isFunctionTestDrawingRange = sampleFilename.startsWith("OSMD_function_test_measuresToDraw_");
    const defaultOrCompactTightMode = sampleFilename.startsWith("OSMD_Function_Test_Container_height") ? "compacttight" : "default";
    const isTestFlatBeams = sampleFilename.startsWith("test_drum_tuplet_beams");
    const isTestEndClefStaffEntryBboxes = sampleFilename.startsWith("test_end_measure_clefs_staffentry_bbox");
    const isTestPageBreakImpliesSystemBreak = sampleFilename.startsWith("test_pagebreak_implies_systembreak");
    const isTestPageBottomMargin0 = sampleFilename.includes("PageBottomMargin0");
    const isTestTupletBracketTupletNumber = sampleFilename.includes("test_tuplet_bracket_tuplet_number");
    const isTestCajon2NoteSystem = sampleFilename.includes("test_cajon_2-note-system");
    const isTestOctaveShiftInvisibleInstrument = sampleFilename.includes("test_octaveshift_first_instrument_invisible");
    const isTextOctaveShiftExtraGraphicalMeasure = sampleFilename.includes("test_octaveshift_extragraphicalmeasure");
    const isTestWedgeMultilineCrescendo = sampleFilename.includes("test_wedge_multiline_crescendo");
    const isTestWedgeMultilineDecrescendo = sampleFilename.includes("test_wedge_multiline_decrescendo");
    const isTestTabs4Strings = sampleFilename.includes("test_tabs_4_strings");
    const isTestFingeringLeft = sampleFilename.includes("test_fingering_left");
    const isTestArticulationAboveNote = sampleFilename.includes("test_accent_above_except_piano_left_hand");
    const isTestAlignRests = sampleFilename.includes("alignrests");
    const isTestHeavyBarline = sampleFilename.includes("test_barline_heavy-heavy_mid_score");
    const isTestTupletRatioed = sampleFilename.includes("test_tuplet_ratioed");
    const isTestDrawFromMeasureNumber9ClefChange = sampleFilename.includes("test_drawFromMeasureNumber_9_respect_earlier_clef_changes");
    const isTestOctaveShiftMultiline = sampleFilename.includes("test_octaveshift_multiline");
    osmdInstance.EngravingRules.loadDefaultValues();
    if (isTestEndClefStaffEntryBboxes) {
        options.drawBoundingBoxString = "VexFlowStaffEntry";
        options.fileNameAddition = "bbox" + options.drawBoundingBoxString + "_";
    }
    let drawFromMeasureNumber = 1;
    let drawUpToMeasureNumber = Number.MAX_SAFE_INTEGER;
    if (isFunctionTestDrawingRange) {
        drawFromMeasureNumber = 9;
        drawUpToMeasureNumber = 12;
    } else if (isTestDrawFromMeasureNumber9ClefChange) {
        drawFromMeasureNumber = 9;
    }
    osmdInstance.setOptions({
        autoBeam: isFunctionTestAutobeam,
        coloringMode: isFunctionTestAutoColoring ? 2 : 0,
        coloringSetCustom: isFunctionTestAutoColoring ? ["#d82c6b", "#F89D15", "#FFE21A", "#4dbd5c", "#009D96", "#43469d", "#76429c", "#ff0000"] : undefined,
        colorStemsLikeNoteheads: isFunctionTestAutoColoring,
        drawingParameters: defaultOrCompactTightMode,
        drawFromMeasureNumber: drawFromMeasureNumber,
        drawUpToMeasureNumber: drawUpToMeasureNumber,
        newSystemFromXML: isFunctionTestSystemAndPageBreaks,
        newSystemFromNewPageInXML: isTestPageBreakImpliesSystemBreak,
        newPageFromXML: isFunctionTestSystemAndPageBreaks,
        pageBackgroundColor: "#FFFFFF",
        pageFormat: pageFormat,
        ...makeSkyBottomLineOptions()
    });
    if (options.darkMode) { osmdInstance.setOptions({darkMode: true}); }
    osmdInstance.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
    includeSkyBottomLine = options.skyBottomLine ?? false;
    osmdInstance.drawSkyLine = includeSkyBottomLine;
    osmdInstance.drawBottomLine = includeSkyBottomLine;
    if (includeSkyBottomLine) { options.fileNameAddition = "skybottomline_"; }
    osmdInstance.setDrawBoundingBox(options.drawBoundingBoxString, false);
    if (isTestFlatBeams) {
        osmdInstance.EngravingRules.FlatBeams = true;
        osmdInstance.EngravingRules.FlatBeamOffset = 10;
        osmdInstance.EngravingRules.FlatBeamOffsetPerBeam = 10;
    } else { osmdInstance.EngravingRules.FlatBeams = false; }
    if (isTestPageBottomMargin0) { osmdInstance.EngravingRules.PageBottomMargin = 0; }
    if (isTestTupletBracketTupletNumber) {
        osmdInstance.EngravingRules.TupletNumberLimitConsecutiveRepetitions = true;
        osmdInstance.EngravingRules.TupletNumberMaxConsecutiveRepetitions = 2;
        osmdInstance.EngravingRules.TupletNumberAlwaysDisableAfterFirstMax = true;
    }
    if (isTestCajon2NoteSystem) { osmdInstance.EngravingRules.PercussionUseCajon2NoteSystem = true; }
    if (isTextOctaveShiftExtraGraphicalMeasure ||
        isTestOctaveShiftInvisibleInstrument ||
        isTestWedgeMultilineCrescendo ||
        isTestWedgeMultilineDecrescendo) {
        osmdInstance.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
    }
    if (isTestTabs4Strings) {
        osmdInstance.EngravingRules.TabKeySignatureSpacingAdded = false;
        osmdInstance.EngravingRules.TabTimeSignatureSpacingAdded = false;
    }
    if (isTestFingeringLeft) {
        osmdInstance.EngravingRules.FingeringPosition = 2;
        osmdInstance.EngravingRules.FingeringPositionFromXML = false;
    }
    if (isTestArticulationAboveNote) { osmdInstance.EngravingRules.ArticulationAboveNoteForStemUp = true; }
    if (isTestAlignRests) { osmdInstance.EngravingRules.AlignRests = 1; }
    if (isTestHeavyBarline) { osmdInstance.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures = false; }
    if (isTestTupletRatioed) { osmdInstance.EngravingRules.TupletsRatioed = true; }
    if (isTestOctaveShiftMultiline) { osmdInstance.EngravingRules.RenderXMeasuresPerLineAkaSystem = 1; }
    return options;
}

function setOsmdTestOptionsAfterLoad(sampleFilename, options, osmdInstance) {
    if (options.staffVisibility) {
        for (const key of Object.keys(options.staffVisibility)) {
            osmdInstance.Sheet.Instruments[0].Staves[key].Visible = options.staffVisibility[key];
        }
    }
    const isTestOctaveShiftInvisibleInstrument = sampleFilename.includes("test_octaveshift_first_instrument_invisible");
    const isTestInvisibleMeasureNotAffectingLayout = sampleFilename.includes("test_invisible_measure_not_affecting_layout");
    const isTestWordsDirectionLostWhenFirstInstrumentInvisible = sampleFilename.includes("test_words_direction_lost_when_first_instrument_invisible");
    const isTestTransposeEnharmonic9 = sampleFilename.includes("test_transpose_enharmonic_9");
    const isTestTransposingCsharpMajorToC = sampleFilename.includes("test_transposing_csharp_major_to_c");
    if (isTestOctaveShiftInvisibleInstrument || isTestWordsDirectionLostWhenFirstInstrumentInvisible) {
        osmdInstance.Sheet.Instruments[0].Visible = false;
    }
    if (isTestInvisibleMeasureNotAffectingLayout) {
        if (osmdInstance.Sheet.Instruments[1]) {
            osmdInstance.Sheet.Instruments[1].Visible = false;
        }
    }
    if (isTestTransposeEnharmonic9) {
        osmdInstance.Sheet.Transpose = 9;
        osmdInstance.updateGraphic();
    }
    if (isTestTransposingCsharpMajorToC) {
        osmdInstance.Sheet.Transpose = -1;
        osmdInstance.updateGraphic();
    }
    return options;
}

init();
