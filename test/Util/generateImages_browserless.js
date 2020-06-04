/*
  Render each OSMD sample, grab the generated images, and
  dump them into a local directory as PNG files.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This can be used to generate PNGs from OSMD without a browser.
  It's also used with the visual regression test system in
  `tools/visual_regression.sh`.

  Note: this script needs to "fake" quite a few browser elements, like window, document, and a Canvas HTMLElement.
  For that it needs the canvas package installed.
  There are also some hacks needed to set the container size (offsetWidth) correctly.

  Otherwise you'd need to run a headless browser, which is way slower,
  see the semi-obsolete generateDiffImagesPuppeteerLocalhost.js
*/

function sleep (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

// global variables
//   (without these being global, we'd have to pass many of these values to the generateSampleImage function)
let [osmdBuildDir, sampleDir, imageDir, pageWidth, pageHeight, filterRegex, mode, debugSleepTimeString] = process.argv.slice(2, 10)
if (!osmdBuildDir || !sampleDir || !imageDir) {
    console.log('usage: ' +
        'node test/Util/generateImages_browserless.js osmdBuildDir sampleDirectory imageDirectory [width|0] [height|0] [filterRegex|all|allSmall] [--debug|--osmdtesting] [debugSleepTime]')
    console.log('  (use "all" to skip filterRegex parameter. "allSmall" with --osmdtesting skips two huge OSMD samples that take forever to render)')
    console.log('example: node test/Util/generateImages_browserless.js ../../build ./test/data/ ./export 210 297 allSmall --debug 5000')
    console.log('Error: need osmdBuildDir, sampleDir and imageDir. Exiting.')
    process.exit(1)
}

if (!mode) {
    mode = ''
}

let OSMD // can only be required once window was simulated
const FS = require('fs')

async function init () {
    console.log('[OSMD.generateImages] init')

    const osmdTestingMode = mode.includes('osmdtesting') // can also be --debugosmdtesting
    const DEBUG = mode.startsWith('--debug')
    // const debugSleepTime = Number.parseInt(process.env.GENERATE_DEBUG_SLEEP_TIME) || 0; // 5000 works for me [sschmidTU]
    if (DEBUG) {
        // console.log(' (note that --debug slows down the script by about 0.3s per file, through logging)')
        const debugSleepTimeMs = Number.parseInt(debugSleepTimeString)
        if (debugSleepTimeMs > 0) {
            console.log('debug sleep time: ' + debugSleepTimeString)
            await sleep(Number.parseInt(debugSleepTimeMs))
            // [VSCode] apparently this is necessary for the debugger to attach itself in time before the program closes.
            // sometimes this is not enough, so you may have to try multiple times or increase the sleep timer. Unfortunately debugging nodejs isn't easy.
        }
    }
    debug('sampleDir: ' + sampleDir, DEBUG)
    debug('imageDir: ' + imageDir, DEBUG)

    let pageFormat = 'Endless'
    pageWidth = Number.parseInt(pageWidth)
    pageHeight = Number.parseInt(pageHeight)
    const endlessPage = !(pageHeight > 0 && pageWidth > 0)
    if (!endlessPage) {
        pageFormat = `${pageWidth}x${pageHeight}`
    }

    // ---- hacks to fake Browser elements OSMD and Vexflow need, like window, document, and a canvas HTMLElement ----
    var jsdom = require('jsdom')
    const dom = new jsdom.JSDOM('<!DOCTYPE html></html>')
    // eslint-disable-next-line no-global-assign
    window = dom.window
    // eslint-disable-next-line no-global-assign
    document = dom.window.document

    // eslint-disable-next-line no-global-assign
    global.window = dom.window
    // eslint-disable-next-line no-global-assign
    global.document = window.document
    window.console = console // probably does nothing
    global.HTMLElement = window.HTMLElement
    global.HTMLAnchorElement = window.HTMLAnchorElement
    global.XMLHttpRequest = window.XMLHttpRequest
    global.DOMParser = window.DOMParser
    global.Node = window.Node
    global.Canvas = window.Canvas

    // fix Blob not found (to support external modules like is-blob)
    global.Blob = require('cross-blob')

    const div = document.createElement('div')
    div.id = 'browserlessDiv'
    document.body.appendChild(div)
    // const canvas = document.createElement('canvas')
    // div.canvas = document.createElement('canvas')

    const zoom = 1.0
    // width of the div / PNG generated
    let width = pageWidth * zoom
    // TODO sometimes the width is way too small for the score, may need to adjust zoom.
    if (endlessPage) {
        width = 1440
    }
    let height = pageHeight
    if (endlessPage) {
        height = 32767
    }
    div.width = width
    div.height = height
    div.offsetWidth = width // doesn't work, offsetWidth is always 0 from this. see below
    div.clientWidth = width
    div.clientHeight = height
    div.scrollHeight = height
    div.scrollWidth = width
    div.setAttribute('width', width)
    div.setAttribute('height', height)
    div.setAttribute('offsetWidth', width)
    // debug('div.offsetWidth: ' + div.offsetWidth, DEBUG) // 0 here, set correctly later
    // debug('div.height: ' + div.height, DEBUG)

    // hack: set offsetWidth reliably
    Object.defineProperties(window.HTMLElement.prototype, {
        offsetLeft: {
            get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0 }
        },
        offsetTop: {
            get: function () { return parseFloat(window.getComputedStyle(this).marginTop) || 0 }
        },
        offsetHeight: {
            get: function () { return height }
        },
        offsetWidth: {
            get: function () { return width }
        }
    })
    debug('div.offsetWidth: ' + div.offsetWidth, DEBUG)
    debug('div.height: ' + div.height, DEBUG)
    // ---- end browser hacks (hopefully) ----

    // load globally
    OSMD = require(`${osmdBuildDir}/opensheetmusicdisplay.min.js`) // window needs to be available before we can require OSMD

    // Create the image directory if it doesn't exist.
    FS.mkdirSync(imageDir, { recursive: true })

    const sampleDirFilenames = FS.readdirSync(sampleDir)
    let samplesToProcess = [] // samples we want to process/generate pngs of, excluding the filtered out files/filenames
    for (const sampleFilename of sampleDirFilenames) {
        if (osmdTestingMode && filterRegex === 'allSmall') {
            if (sampleFilename.match('^(Actor)|(Gounod)')) { // TODO maybe filter by file size instead
                debug('filtering big file: ' + sampleFilename, DEBUG)
                continue
            }
        }
        // eslint-disable-next-line no-useless-escape
        if (sampleFilename.match('^.*(\.xml)|(\.musicxml)|(\.mxl)$')) {
            // console.log('found musicxml/mxl: ' + sampleFilename)
            samplesToProcess.push(sampleFilename)
        } else {
            debug('discarded file/directory: ' + sampleFilename, DEBUG)
        }
    }

    // filter samples to process by regex if given
    if (filterRegex && filterRegex !== '' && filterRegex !== 'all' && !(osmdTestingMode && filterRegex === 'allSmall')) {
        debug('filtering samples for regex: ' + filterRegex, DEBUG)
        samplesToProcess = samplesToProcess.filter((filename) => filename.match(filterRegex))
        debug(`found ${samplesToProcess.length} matches: `, DEBUG)
        for (let i = 0; i < samplesToProcess.length; i++) {
            debug(samplesToProcess[i], DEBUG)
        }
    }

    const osmdInstance = new OSMD.OpenSheetMusicDisplay(div, {
        autoResize: false,
        backend: 'canvas',
        pageBackgroundColor: '#FFFFFF',
        pageFormat: pageFormat
        // defaultFontFamily: 'Arial',
        // drawTitle: false
    })
    // for more options check OSMDOptions.ts

    // you can set finer-grained rendering/engraving settings in EngravingRules:
    osmdInstance.EngravingRules.TitleTopDistance = 5.0 // 9.0 is default
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
        osmdInstance.setLogLevel('debug')
        // console.log(`osmd PageFormat: ${osmdInstance.EngravingRules.PageFormat.width}x${osmdInstance.EngravingRules.PageFormat.height}`)
        console.log(`osmd PageFormat idString: ${osmdInstance.EngravingRules.PageFormat.idString}`)
        console.log('PageHeight: ' + osmdInstance.EngravingRules.PageHeight)
    } else {
        osmdInstance.setLogLevel('info') // doesn't seem to work, log.debug still logs
    }

    debug('[OSMD.generateImages] starting loop over samples, saving images to ' + imageDir, DEBUG)
    for (let i = 0; i < samplesToProcess.length; i++) {
        var sampleFilename = samplesToProcess[i]
        debug('sampleFilename: ' + sampleFilename, DEBUG)

        await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestingMode, false)

        if (osmdTestingMode && sampleFilename.startsWith('Beethoven') && sampleFilename.includes('Geliebte')) {
            // generate one more testing image with skyline and bottomline. (startsWith 'Beethoven' don't catch the function test)
            await generateSampleImage(sampleFilename, sampleDir, osmdInstance, osmdTestingMode, true, DEBUG)
        }
    }

    console.log('[OSMD.generateImages] done, exiting.')
}

async function generateSampleImage (sampleFilename, directory, osmdInstance, osmdTestingMode,
    includeSkyBottomLine = false, DEBUG = false) {
    var samplePath = directory + '/' + sampleFilename
    let loadParameter = FS.readFileSync(samplePath)

    if (sampleFilename.endsWith('.mxl')) {
        loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter)
    } else {
        loadParameter = loadParameter.toString()
    }
    // console.log('loadParameter: ' + loadParameter)
    // console.log('typeof loadParameter: ' + typeof loadParameter)

    // set sample-specific options for OSMD visual regression testing
    if (osmdTestingMode) {
        const isFunctionTestAutobeam = sampleFilename.startsWith('OSMD_function_test_autobeam')
        const isFunctionTestAutoColoring = sampleFilename.startsWith('OSMD_function_test_auto-custom-coloring')
        const isFunctionTestSystemAndPageBreaks = sampleFilename.startsWith('OSMD_Function_Test_System_and_Page_Breaks')
        const isFunctionTestDrawingRange = sampleFilename.startsWith('OSMD_function_test_measuresToDraw_')
        osmdInstance.setOptions({
            autoBeam: isFunctionTestAutobeam, // only set to true for function test autobeam
            coloringMode: isFunctionTestAutoColoring ? 2 : 0,
            coloringSetCustom: isFunctionTestAutoColoring ? ['#d82c6b', '#F89D15', '#FFE21A', '#4dbd5c', '#009D96', '#43469d', '#76429c', '#ff0000'] : undefined,
            colorStemsLikeNoteheads: isFunctionTestAutoColoring,
            drawFromMeasureNumber: isFunctionTestDrawingRange ? 9 : 1,
            drawUpToMeasureNumber: isFunctionTestDrawingRange ? 12 : Number.MAX_SAFE_INTEGER,
            newSystemFromXML: isFunctionTestSystemAndPageBreaks,
            newPageFromXML: isFunctionTestSystemAndPageBreaks
        })
        osmdInstance.drawSkyLine = includeSkyBottomLine // if includeSkyBottomLine, draw skyline and bottomline, else not
        osmdInstance.drawBottomLine = includeSkyBottomLine
    }

    osmdInstance.load(loadParameter).then(function () {
        debug('xml loaded', DEBUG)
        try {
            osmdInstance.render()
        } catch (ex) {
            console.log('renderError: ' + ex)
        }
        debug('rendered', DEBUG)

        const dataUrls = []
        let canvasImage

        for (let pageNumber = 1; pageNumber < 999; pageNumber++) {
            canvasImage = document.getElementById('osmdCanvasVexFlowBackendCanvas' + pageNumber)
            if (!canvasImage) {
                break
            }
            if (!canvasImage.toDataURL) {
                console.log(`error: could not get canvas image for page ${pageNumber} for file: ${sampleFilename}`)
                break
            }
            dataUrls.push(canvasImage.toDataURL())
        }
        for (let urlIndex = 0; urlIndex < dataUrls.length; urlIndex++) {
            const pageNumberingString = `${urlIndex + 1}`
            const skybottomlineString = includeSkyBottomLine ? 'skybottomline_' : ''
            // pageNumberingString = dataUrls.length > 0 ? pageNumberingString : '' // don't put '_1' at the end if only one page. though that may cause more work
            var pageFilename = `${imageDir}/${sampleFilename}_${skybottomlineString}${pageNumberingString}.png`

            const dataUrl = dataUrls[urlIndex]
            if (!dataUrl || !dataUrl.split) {
                console.log(`error: could not get dataUrl (imageData) for page ${urlIndex + 1} of sample: ${sampleFilename}`)
                continue
            }
            const imageData = dataUrl.split(';base64,').pop()
            const imageBuffer = Buffer.from(imageData, 'base64')

            debug('got image data, saving to: ' + pageFilename, DEBUG)
            FS.writeFileSync(pageFilename, imageBuffer, { encoding: 'base64' })
        }
    }) // end render then
    //     },
    //     function (e) {
    //         console.log('error while rendering: ' + e)
    //     }) // end load then
    // }) // end read file
}

function debug (msg, debugEnabled) {
    if (debugEnabled) {
        console.log(msg)
    }
}

init()
