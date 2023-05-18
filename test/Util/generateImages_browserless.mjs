import Blob from "cross-blob";
import FS from "fs";
import jsdom from "jsdom";
//import headless_gl from "gl"; // this is now imported dynamically in a try catch, in case gl install fails, see #1160
import OSMD from "../../build/opensheetmusicdisplay.min.js"; // window needs to be available before we can require OSMD
/*
  Render each OSMD sample, grab the generated images, and
  dump them into a local directory as PNG or SVG files.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This can be used to generate PNGs or SVGs from OSMD without a browser.
  It's also used with the visual regression test system (using PNGs) in
  `tools/visual_regression.sh`
  (see package.json, used with npm run generate:blessed and generate:current, then test:visual).

  Note: this script needs to "fake" quite a few browser elements, like window, document,
  and a Canvas HTMLElement (for PNG) or the DOM (for SVG)   ,
  which otherwise are missing in pure nodejs, causing errors in OSMD.
  For PNG it needs the canvas package installed.
  There are also some hacks needed to set the container size (offsetWidth) correctly.

  Otherwise you'd need to run a headless browser, which is way slower,
  see the semi-obsolete generateDiffImagesPuppeteerLocalhost.js
*/

function sleep (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// global variables
//   (without these being global, we'd have to pass many of these values to the generateSampleImage function)
// eslint-disable-next-line prefer-const
let [osmdBuildDir, sampleDir, imageDir, imageFormat, pageWidth, pageHeight, filterRegex, mode, debugSleepTimeString, skyBottomLinePreference] = process.argv.slice(2, 12);
imageFormat = imageFormat?.toLowerCase();
if (!osmdBuildDir || !sampleDir || !imageDir || (imageFormat !== "png" && imageFormat !== "svg")) {
    console.log("usage: " +
        // eslint-disable-next-line max-len
        "node test/Util/generateImages_browserless.mjs osmdBuildDir sampleDirectory imageDirectory svg|png [width|0] [height|0] [filterRegex|all|allSmall] [--debug|--osmdtesting] [debugSleepTime]");
    console.log("  (use pageWidth and pageHeight 0 to not divide the rendering into pages (endless page))");
    console.log('  (use "all" to skip filterRegex parameter. "allSmall" with --osmdtesting skips two huge OSMD samples that take forever to render)');
    console.log("example: node test/Util/generateImages_browserless.mjs ../../build ./test/data/ ./export png");
    console.log("Error: need osmdBuildDir, sampleDir, imageDir and svg|png arguments. Exiting.");
    process.exit(1);
}
let pageFormat;

if (!mode) {
    mode = "";
}

// let OSMD; // can only be required once window was simulated
// eslint-disable-next-line @typescript-eslint/no-var-requires

async function init () {
    debug("init");

    const osmdTestingMode = mode.includes("osmdtesting"); // can also be --debugosmdtesting
    const osmdTestingSingleMode = mode.includes("osmdtestingsingle");
    const DEBUG = mode.startsWith("--debug");
    // const debugSleepTime = Number.parseInt(process.env.GENERATE_DEBUG_SLEEP_TIME) || 0; // 5000 works for me [sschmidTU]
    if (DEBUG) {
        // debug(' (note that --debug slows down the script by about 0.3s per file, through logging)')
        const debugSleepTimeMs = Number.parseInt(debugSleepTimeString, 10);
        if (debugSleepTimeMs > 0) {
            debug("debug sleep time: " + debugSleepTimeString);
            await sleep(Number.parseInt(debugSleepTimeMs, 10));
            // [VSCode] apparently this is necessary for the debugger to attach itself in time before the program closes.
            // sometimes this is not enough, so you may have to try multiple times or increase the sleep timer. Unfortunately debugging nodejs isn't easy.
        }
    }
    debug("sampleDir: " + sampleDir, DEBUG);
    debug("imageDir: " + imageDir, DEBUG);
    debug("imageFormat: " + imageFormat, DEBUG);

    pageFormat = "Endless";
    pageWidth = Number.parseInt(pageWidth, 10);
    pageHeight = Number.parseInt(pageHeight, 10);
    const endlessPage = !(pageHeight > 0 && pageWidth > 0);
    if (!endlessPage) {
        pageFormat = `${pageWidth}x${pageHeight}`;
    }

    // ---- hacks to fake Browser elements OSMD and Vexflow need, like window, document, and a canvas HTMLElement ----
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dom = new jsdom.JSDOM("<!DOCTYPE html></html>");
    // eslint-disable-next-line no-global-assign
    // window = dom.window;
    // eslint-disable-next-line no-global-assign
    // document = dom.window.document;

    // eslint-disable-next-line no-global-assign
    global.window = dom.window;
    // eslint-disable-next-line no-global-assign
    global.document = window.document;
    //window.console = console; // probably does nothing
    global.HTMLElement = window.HTMLElement;
    global.HTMLAnchorElement = window.HTMLAnchorElement;
    global.XMLHttpRequest = window.XMLHttpRequest;
    global.DOMParser = window.DOMParser;
    global.Node = window.Node;
    if (imageFormat === "png") {
        global.Canvas = window.Canvas;
    }

    // For WebGLSkyBottomLineCalculatorBackend: Try to import gl dynamically
    //   this is so that the script doesn't fail if gl could not be installed,
    //   which can happen in some linux setups where gcc-11 is installed, see #1160
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
                    } else {
                        return oldGetContext(contextType, contextAttributes);
                    }
                };
                return canvas;
            } else {
                return oldCreateElement(tagName, options);
            }
        };
    } catch {
        if (skyBottomLinePreference === "--webgl") {
            debug("WebGL image generation was requested but gl is not installed; using non-WebGL generation.");
        }
    }

    // fix Blob not found (to support external modules like is-blob)
    global.Blob = Blob;

    const div = document.createElement("div");
    div.id = "browserlessDiv";
    document.body.appendChild(div);
    // const canvas = document.createElement('canvas')
    // div.canvas = document.createElement('canvas')

    const zoom = 1.0;
    // width of the div / PNG generated
    let width = pageWidth * zoom;
    // TODO sometimes the width is way too small for the score, may need to adjust zoom.
    if (endlessPage) {
        width = 1440;
    }
    let height = pageHeight;
    if (endlessPage) {
        height = 32767;
    }
    div.width = width;
    div.height = height;
    // div.offsetWidth = width; // doesn't work, offsetWidth is always 0 from this. see below
    // div.clientWidth = width;
    // div.clientHeight = height;
    // div.scrollHeight = height;
    // div.scrollWidth = width;
    div.setAttribute("width", width);
    div.setAttribute("height", height);
    div.setAttribute("offsetWidth", width);
    // debug('div.offsetWidth: ' + div.offsetWidth, DEBUG) // 0 here, set correctly later
    // debug('div.height: ' + div.height, DEBUG)

    // hack: set offsetWidth reliably
    Object.defineProperties(window.HTMLElement.prototype, {
        offsetLeft: {
            get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0; }
        },
        offsetTop: {
            get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0; }
        },
        offsetHeight: {
            get: function () { return height; }
        },
        offsetWidth: {
            get: function () { return width; }
        }
    });
    debug("div.offsetWidth: " + div.offsetWidth, DEBUG);
    debug("div.height: " + div.height, DEBUG);
    // ---- end browser hacks (hopefully) ----

    // load globally

    // Create the image directory if it doesn't exist.
    FS.mkdirSync(imageDir, { recursive: true });

    const sampleDirFilenames = FS.readdirSync(sampleDir);
    let samplesToProcess = []; // samples we want to process/generate pngs of, excluding the filtered out files/filenames
    for (const sampleFilename of sampleDirFilenames) {
        if (osmdTestingMode && filterRegex === "allSmall") {
            if (sampleFilename.match("^(Actor)|(Gounod)")) { // TODO maybe filter by file size instead
                debug("filtering big file: " + sampleFilename, DEBUG);
                continue;
            }
        }
        // eslint-disable-next-line no-useless-escape
        if (sampleFilename.match("^.*(\.xml)|(\.musicxml)|(\.mxl)$")) {
            // debug('found musicxml/mxl: ' + sampleFilename)
            samplesToProcess.push(sampleFilename);
        } else {
            debug("discarded file/directory: " + sampleFilename, DEBUG);
        }
    }

    // filter samples to process by regex if given
    if (filterRegex && filterRegex !== "" && filterRegex !== "all" && !(osmdTestingMode && filterRegex === "allSmall")) {
        debug("filtering samples for regex: " + filterRegex, DEBUG);
        samplesToProcess = samplesToProcess.filter((filename) => filename.match(filterRegex));
        debug(`found ${samplesToProcess.length} matches: `, DEBUG);
        for (let i = 0; i < samplesToProcess.length; i++) {
            debug(samplesToProcess[i], DEBUG);
        }
    }

    const backend = imageFormat === "png" ? "canvas" : "svg";
    const osmdInstance = new OSMD.OpenSheetMusicDisplay(div, {
        autoResize: false,
        backend: backend,
        pageBackgroundColor: "#FFFFFF",
        pageFormat: pageFormat
        // defaultFontFamily: 'Arial',
        // drawTitle: false
    });
    // for more options check OSMDOptions.ts

    // you can set finer-grained rendering/engraving settings in EngravingRules:
    // osmdInstance.EngravingRules.TitleTopDistance = 5.0 // 5.0 is default
    //   (unless in osmdTestingMode, these will be reset with drawingParameters default)
    // osmdInstance.EngravingRules.PageTopMargin = 5.0 // 5 is default
    // osmdInstance.EngravingRules.PageBottomMargin = 5.0 // 5 is default. <5 can cut off scores that extend in the last staffline
    // note that for now the png and canvas will still have the height given in the script argument,
    //   so even with a margin of 0 the image will be filled to the full height.
    // osmdInstance.EngravingRules.PageLeftMargin = 5.0 // 5 is default
    // osmdInstance.EngravingRules.PageRightMargin = 5.0 // 5 is default
    // osmdInstance.EngravingRules.MetronomeMarkXShift = -8; // -6 is default
    // osmdInstance.EngravingRules.DistanceBetweenVerticalSystemLines = 0.15; // 0.35 is default
    // for more options check EngravingRules.ts (though not all of these are meant and fully supported to be changed at will)

    if (DEBUG) {
        osmdInstance.setLogLevel("debug");
        // debug(`osmd PageFormat: ${osmdInstance.EngravingRules.PageFormat.width}x${osmdInstance.EngravingRules.PageFormat.height}`)
        debug(`osmd PageFormat idString: ${osmdInstance.EngravingRules.PageFormat.idString}`);
        debug("PageHeight: " + osmdInstance.EngravingRules.PageHeight);
    } else {
        osmdInstance.setLogLevel("info"); // doesn't seem to work, log.debug still logs
    }

    debug("[OSMD.generateImages] starting loop over samples, saving images to " + imageDir, DEBUG);
    for (let i = 0; i < samplesToProcess.length; i++) {
        const sampleFilename = samplesToProcess[i];
        debug("sampleFilename: " + sampleFilename, DEBUG);

        await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestingMode, {}, DEBUG);

        if (osmdTestingMode && !osmdTestingSingleMode && sampleFilename.startsWith("Beethoven") && sampleFilename.includes("Geliebte")) {
            // generate one more testing image with skyline and bottomline. (startsWith 'Beethoven' don't catch the function test)
            await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestingMode, {skyBottomLine: true}, DEBUG);
            // generate one more testing image with GraphicalNote positions
            await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestingMode, {boundingBoxes: "VexFlowGraphicalNote"}, DEBUG);
        }
    }

    debug("done, exiting.");
}

// eslint-disable-next-line
// let maxRss = 0, maxRssFilename = '' // to log memory usage (debug)
async function generateSampleImage (sampleFilename, directory, osmdInstance, osmdTestingMode,
    options = {}, DEBUG = false) {

    function makeSkyBottomLineOptions() {
        const preference = skyBottomLinePreference ?? "";
        if (preference === "--batch") {
            return {
                preferredSkyBottomLineBatchCalculatorBackend: 0, // plain
                skyBottomLineBatchCriteria: 0, // use batch algorithm only
            };
        } else if (preference === "--webgl") {
            return {
                preferredSkyBottomLineBatchCalculatorBackend: 1, // webgl
                skyBottomLineBatchCriteria: 0, // use batch algorithm only
            };
        } else {
            return {
                preferredSkyBottomLineBatchCalculatorBackend: 0, // plain
                skyBottomLineBatchCriteria: Infinity, // use non-batch algorithm only
            };
        }
    }

    const samplePath = directory + "/" + sampleFilename;
    let loadParameter = FS.readFileSync(samplePath);

    if (sampleFilename.endsWith(".mxl")) {
        loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter);
    } else {
        loadParameter = loadParameter.toString();
    }
    // debug('loadParameter: ' + loadParameter)
    // debug('typeof loadParameter: ' + typeof loadParameter)

    // set sample-specific options for OSMD visual regression testing
    let includeSkyBottomLine = false;
    let drawBoundingBoxString;
    if (osmdTestingMode) {
        const isFunctionTestAutobeam = sampleFilename.startsWith("OSMD_function_test_autobeam");
        const isFunctionTestAutoColoring = sampleFilename.startsWith("OSMD_function_test_auto-custom-coloring");
        const isFunctionTestSystemAndPageBreaks = sampleFilename.startsWith("OSMD_Function_Test_System_and_Page_Breaks");
        const isFunctionTestDrawingRange = sampleFilename.startsWith("OSMD_function_test_measuresToDraw_");
        const defaultOrCompactTightMode = sampleFilename.startsWith("OSMD_Function_Test_Container_height") ? "compacttight" : "default";
        const isTestFlatBeams = sampleFilename.startsWith("test_drum_tuplet_beams");
        const isTestEndClefStaffEntryBboxes = sampleFilename.startsWith("test_end_measure_clefs_staffentry_bbox");
        const isTestPageBreakImpliesSystemBreak = sampleFilename.startsWith("test_pagebreak_implies_systembreak");
        const isTestPageBottomMargin0 = sampleFilename.includes("PageBottomMargin0");
        const enableNewSystemAtSystemBreak = sampleFilename.includes("test_octaveshift_extragraphicalmeasure");
        osmdInstance.EngravingRules.loadDefaultValues(); // note this may also be executed in setOptions below via drawingParameters default
        if (isTestEndClefStaffEntryBboxes) {
            drawBoundingBoxString = "VexFlowStaffEntry";
        } else {
            drawBoundingBoxString = options.boundingBoxes; // undefined is also a valid value: no bboxes
        }
        osmdInstance.setOptions({
            autoBeam: isFunctionTestAutobeam, // only set to true for function test autobeam
            coloringMode: isFunctionTestAutoColoring ? 2 : 0,
            // eslint-disable-next-line max-len
            coloringSetCustom: isFunctionTestAutoColoring ? ["#d82c6b", "#F89D15", "#FFE21A", "#4dbd5c", "#009D96", "#43469d", "#76429c", "#ff0000"] : undefined,
            colorStemsLikeNoteheads: isFunctionTestAutoColoring,
            drawingParameters: defaultOrCompactTightMode, // note: default resets all EngravingRules. could be solved differently
            drawFromMeasureNumber: isFunctionTestDrawingRange ? 9 : 1,
            drawUpToMeasureNumber: isFunctionTestDrawingRange ? 12 : Number.MAX_SAFE_INTEGER,
            newSystemFromXML: isFunctionTestSystemAndPageBreaks,
            newSystemFromNewPageInXML: isTestPageBreakImpliesSystemBreak,
            newPageFromXML: isFunctionTestSystemAndPageBreaks,
            pageBackgroundColor: "#FFFFFF", // reset by drawingparameters default
            pageFormat: pageFormat, // reset by drawingparameters default,
            ...makeSkyBottomLineOptions()
        });
        // note that loadDefaultValues() may be executed in setOptions with drawingParameters default
        //osmdInstance.EngravingRules.RenderSingleHorizontalStaffline = true; // to use this option here, place it after setOptions(), see above
        osmdInstance.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false; // this would override the command line options (--plain etc)
        includeSkyBottomLine = options.skyBottomLine ? options.skyBottomLine : false; // apparently es6 doesn't have ?? operator
        osmdInstance.drawSkyLine = includeSkyBottomLine; // if includeSkyBottomLine, draw skyline and bottomline, else not
        osmdInstance.drawBottomLine = includeSkyBottomLine;
        osmdInstance.setDrawBoundingBox(drawBoundingBoxString, false); // false: don't render (now). also (re-)set if undefined!
        if (isTestFlatBeams) {
            osmdInstance.EngravingRules.FlatBeams = true;
            // osmdInstance.EngravingRules.FlatBeamOffset = 30;
            osmdInstance.EngravingRules.FlatBeamOffset = 10;
            osmdInstance.EngravingRules.FlatBeamOffsetPerBeam = 10;
        } else {
            osmdInstance.EngravingRules.FlatBeams = false;
        }
        if (isTestPageBottomMargin0) {
            osmdInstance.EngravingRules.PageBottomMargin = 0;
        }
        if (enableNewSystemAtSystemBreak) {
            osmdInstance.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        }
    }

    try {
        debug("loading sample " + sampleFilename, DEBUG);
        await osmdInstance.load(loadParameter, sampleFilename); // if using load.then() without await, memory will not be freed up between renders
    } catch (ex) {
        debug("couldn't load sample " + sampleFilename + ", skipping. Error: \n" + ex);
        return;
    }
    debug("xml loaded", DEBUG);
    try {
        osmdInstance.render();
        // there were reports that await could help here, but render isn't a synchronous function, and it seems to work. see #932
    } catch (ex) {
        debug("renderError: " + ex);
    }
    debug("rendered", DEBUG);

    const markupStrings = []; // svg
    const dataUrls = []; // png
    let canvasImage;

    for (let pageNumber = 1; pageNumber < Number.POSITIVE_INFINITY; pageNumber++) {
        if (imageFormat === "png") {
            canvasImage = document.getElementById("osmdCanvasVexFlowBackendCanvas" + pageNumber);
            if (!canvasImage) {
                break;
            }
            if (!canvasImage.toDataURL) {
                debug(`error: could not get canvas image for page ${pageNumber} for file: ${sampleFilename}`);
                break;
            }
            dataUrls.push(canvasImage.toDataURL());
        } else if (imageFormat === "svg") {
            const svgElement = document.getElementById("osmdSvgPage" + pageNumber);
            if (!svgElement) {
                break;
            }
            // The important xmlns attribute is not serialized unless we set it here
            svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            markupStrings.push(svgElement.outerHTML);
        }
    }

    for (let pageIndex = 0; pageIndex < Math.max(dataUrls.length, markupStrings.length); pageIndex++) {
        const pageNumberingString = `${pageIndex + 1}`;
        const skybottomlineString = includeSkyBottomLine ? "skybottomline_" : "";
        const graphicalNoteBboxesString = drawBoundingBoxString ? "bbox" + drawBoundingBoxString + "_" : "";
        // pageNumberingString = dataUrls.length > 0 ? pageNumberingString : '' // don't put '_1' at the end if only one page. though that may cause more work
        const pageFilename = `${imageDir}/${sampleFilename}_${skybottomlineString}${graphicalNoteBboxesString}${pageNumberingString}.${imageFormat}`;

        if (imageFormat === "png") {
            const dataUrl = dataUrls[pageIndex];
            if (!dataUrl || !dataUrl.split) {
                debug(`error: could not get dataUrl (imageData) for page ${pageIndex + 1} of sample: ${sampleFilename}`);
                continue;
            }
            const imageData = dataUrl.split(";base64,").pop();
            const imageBuffer = Buffer.from(imageData, "base64");

            debug("got image data, saving to: " + pageFilename, DEBUG);
            FS.writeFileSync(pageFilename, imageBuffer, { encoding: "base64" });
        } else if (imageFormat === "svg") {
            const markup = markupStrings[pageIndex];
            if (!markup) {
                debug(`error: could not get markup (SVG data) for page ${pageIndex + 1} of sample: ${sampleFilename}`);
                continue;
            }

            debug("got svg markup data, saving to: " + pageFilename, DEBUG);
            FS.writeFileSync(pageFilename, markup, { encoding: "utf-8" });
        }

        // debug: log memory usage
        // const usage = process.memoryUsage()
        // for (const entry of Object.entries(usage)) {
        //     if (entry[0] === 'rss') {
        //         if (entry[1] > maxRss) {
        //             maxRss = entry[1]
        //             maxRssFilename = pageFilename
        //         }
        //     }
        //     debug(entry[0] + ': ' + entry[1] / (1024 * 1024) + 'mb')
        // }
        // debug('maxRss: ' + (maxRss / 1024 / 1024) + 'mb' + ' for ' + maxRssFilename)
    }
    // debug('maxRss total: ' + (maxRss / 1024 / 1024) + 'mb' + ' for ' + maxRssFilename)

    // await sleep(5000)
    // }) // end read file
}

function debug (msg, debugEnabled = true) {
    if (debugEnabled) {
        console.log("[generateImages] " + msg);
    }
}

init();
