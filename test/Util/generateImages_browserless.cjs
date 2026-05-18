// Node 24 bug: ESM→CJS interop (loadCJSModuleWithModuleLoad) throws internal assertion.
//   Running as .cjs avoids broken ESM→CJS bridge entirely.
"use strict";
const FS = require("fs");
const path = require("path");
const jsdom = require("jsdom");
const { registerFont } = require("canvas");
const OSMD = require("../../build/opensheetmusicdisplay.min.js");

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
imageFormat = imageFormat?.toLowerCase();
if (!osmdBuildDir || !sampleDir || !imageDir || (imageFormat !== "png" && imageFormat !== "svg")) {
    console.log("usage: " +
        "node test/Util/generateImages_browserless.mjs osmdBuildDir sampleDirectory imageDirectory svg|png [width|0] [height|0] [filterRegex|all|allSmall] [--debug|--osmdtesting] [debugSleepTime]");
    console.log("  (use pageWidth and pageHeight 0 to not divide the rendering into pages (endless page))");
    console.log('  (use "all" to skip filterRegex parameter. "allSmall" with --osmdtesting skips two huge OSMD samples that take forever to render)');
    console.log("example: node test/Util/generateImages_browserless.mjs ../../build ./test/data/ ./export png");
    console.log("Error: need osmdBuildDir, sampleDir, imageDir and svg|png arguments. Exiting.");
    process.exit(1);
}
const useWhiteTabNumberBackground = true;
let pageFormat;
if (!mode) { mode = ""; }

async function init () {
    debug("init");

    // cross-blob is ESM-only; dynamically import it from CJS
    const { default: Blob } = await import("cross-blob");
    globalThis.Blob = Blob;

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

    const dom = new jsdom.JSDOM("<!DOCTYPE html></html>");
    global.window = dom.window;
    global.document = window.document;
    global.HTMLElement = window.HTMLElement;
    global.HTMLAnchorElement = window.HTMLAnchorElement;
    global.XMLHttpRequest = window.XMLHttpRequest;
    global.DOMParser = window.DOMParser;
    global.Node = window.Node;
    if (imageFormat === "png") { global.Canvas = window.Canvas; }

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

    const backend = imageFormat === "png" ? "canvas" : "svg";
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
    if (DEBUG) {
        osmdInstance.setLogLevel("debug");
        debug(`osmd PageFormat idString: ${osmdInstance.EngravingRules.PageFormat.idString}`);
        debug("PageHeight: " + osmdInstance.EngravingRules.PageHeight);
    } else {
        osmdInstance.setLogLevel("info");
    }

    debug("[OSMD.generateImages] starting loop over samples, saving images to " + imageDir, DEBUG);
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
            const svgElement = document.getElementById("osmdSvgPage" + pageNumber);
            if (!svgElement) { break; }
            svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            markupStrings.push(svgElement.outerHTML);
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
            const markup = markupStrings[pageIndex];
            if (!markup) {
                debug(`error: could not get markup for page ${pageIndex + 1} of sample: ${sampleFilename}`);
                continue;
            }
            debug("got svg markup data, saving to: " + pageFilename, DEBUG);
            FS.writeFileSync(pageFilename, markup, { encoding: "utf-8" });
        }
    }
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
