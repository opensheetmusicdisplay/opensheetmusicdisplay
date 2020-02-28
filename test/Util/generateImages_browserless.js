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
*/

function sleep (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function init () {
    console.log('[OSMD.generate] init')

    let [osmdBuildDir, sampleDir, imageDir, pageWidth, pageHeight, filterRegex, debugFlag, debugSleepTimeString] = process.argv.slice(2, 10)
    if (!osmdBuildDir || !sampleDir || !imageDir) {
        console.log('usage: node test/Util/generateImages_browserless.js osmdBuildDir sampleDirectory imageDirectory [width|0] [height|0] [filterRegex|all] [--debug] [debugSleepTime]')
        console.log('  (use "all" to skip filterRegex parameter)')
        console.log('example: node test/Util/generateImages_browserless.js ../../build ./test/data/ ./export 210 297 all --debug 5000')
        console.log('Error: need sampleDir and imageDir. Exiting.')
        process.exit(1)
    }
    console.log('sampleDir: ' + sampleDir)
    console.log('imageDir: ' + imageDir)

    let pageFormat = 'Endless'
    pageWidth = Number.parseInt(pageWidth)
    pageHeight = Number.parseInt(pageHeight)
    const endlessPage = !(pageHeight > 0 && pageWidth > 0)
    if (!endlessPage) {
        pageFormat = `${pageWidth}x${pageHeight}`
    }

    const DEBUG = debugFlag === '--debug'
    // const debugSleepTime = Number.parseInt(process.env.GENERATE_DEBUG_SLEEP_TIME) || 0; // 5000 works for me [sschmidTU]
    if (DEBUG) {
        console.log('debug sleep time: ' + debugSleepTimeString)
        const debugSleepTimeMs = Number.parseInt(debugSleepTimeString)
        if (debugSleepTimeMs > 0) {
            await sleep(Number.parseInt(debugSleepTimeMs))
            // [VSCode] apparently this is necessary for the debugger to attach itself in time before the program closes.
            // sometimes this is not enough, so you may have to try multiple times or increase the sleep timer. Unfortunately debugging nodejs isn't easy.
        }
    }

    // ---- hacks to fake Browser elements OSMD and Vexflow need, like window, document, and a canvas HTMLElement ----
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!DOCTYPE html></html>')
    // eslint-disable-next-line no-global-assign
    window = dom.window
    // eslint-disable-next-line no-global-assign
    document = dom.window.document

    // eslint-disable-next-line no-global-assign
    global.window = dom.window
    // eslint-disable-next-line no-global-assign
    global.document = window.document
    global.HTMLElement = window.HTMLElement
    global.HTMLAnchorElement = window.HTMLAnchorElement
    global.XMLHttpRequest = window.XMLHttpRequest
    global.DOMParser = window.DOMParser
    global.Node = window.Node
    global.Canvas = window.Canvas

    // fix Blob not found
    const Blob = require('cross-blob')

    // eslint-disable-next-line no-new
    new Blob([])
    // => Blob {size: 0, type: ''}

    // Global patch (to support external modules like is-blob).
    global.Blob = Blob

    const div = document.createElement('div')
    div.id = 'browserlessDiv'
    document.body.appendChild(div)
    // const canvas = document.createElement('canvas')
    // div.canvas = document.createElement('canvas')

    const zoom = 1.0
    // somehow, witdh * 5 will preserve the aspect ratio (0.7070 repeating, *1 will be way too short, *10 too long)
    // there's width * zoom * 10 in the OSMD code because Vexflow's pixels are OSMD's size units * 10, so i thought it should be * 10.
    // not sure where the / 2 factor comes from.
    let width = pageWidth * zoom * 5
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
    debug('div.offsetWidth: ' + div.offsetWidth, DEBUG)
    debug('div.height: ' + div.height, DEBUG)

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

    const OSMD = require(`${osmdBuildDir}/opensheetmusicdisplay.min.js`)

    const fs = require('fs')
    // Create the image directory if it doesn't exist.
    fs.mkdirSync(imageDir, { recursive: true })

    const sampleDirFilenames = fs.readdirSync(sampleDir)
    let samplesToProcess = [] // samples we want to process/generate pngs of, excluding the filtered out files/filenames
    for (const sampleFilename of sampleDirFilenames) {
        if (DEBUG) {
            if (sampleFilename.match('^(Actor)|(Gounod)')) {
                console.log('DEBUG: filtering big file: ' + sampleFilename)
                continue
            }
        }
        // eslint-disable-next-line no-useless-escape
        if (sampleFilename.match('^.*(\.xml)|(\.musicxml)|(\.mxl)$')) {
            // console.log('found musicxml/mxl: ' + sampleFilename)
            samplesToProcess.push(sampleFilename)
        } else {
            console.log('discarded file/directory: ' + sampleFilename)
        }
    }

    // filter samples to process by regex if given
    if (filterRegex && filterRegex !== '' && filterRegex !== 'all') {
        console.log('filtering samples for regex: ' + filterRegex)
        samplesToProcess = samplesToProcess.filter((filename) => filename.match(filterRegex))
        console.log(`found ${samplesToProcess.length} matches: `)
        for (let i = 0; i < samplesToProcess.length; i++) {
            console.log(samplesToProcess[i])
        }
    }

    const osmdInstance = new OSMD.OpenSheetMusicDisplay(div, {
        autoResize: false,
        backend: 'canvas',
        pageBackgroundColor: '#FFFFFF',
        pageFormat: pageFormat
    })
    // await sleep(5000)
    if (DEBUG) {
        osmdInstance.setLogLevel('debug')
        // console.log(`osmd PageFormat: ${osmdInstance.EngravingRules.PageFormat.width}x${osmdInstance.EngravingRules.PageFormat.height}`)
        console.log(`osmd PageFormat idString: ${osmdInstance.EngravingRules.PageFormat.idString}`)
        console.log('PageHeight: ' + osmdInstance.EngravingRules.PageHeight)
    }

    debug('generateImages', DEBUG)
    for (let i = 0; i < samplesToProcess.length; i++) {
        var sampleFilename = samplesToProcess[i]
        debug('sampleFilename: ' + sampleFilename, DEBUG)

        let loadParameter = fs.readFileSync(sampleDir + '/' + sampleFilename)
        if (sampleFilename.endsWith('.mxl')) {
            loadParameter = await OSMD.MXLHelper.MXLtoXMLstring(loadParameter)
        } else {
            loadParameter = loadParameter.toString()
        }
        // console.log('loadParameter: ' + loadParameter)
        // console.log('typeof loadParameter: ' + typeof loadParameter)

        await osmdInstance.load(loadParameter).then(function () {
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
                const pageNumberingString = `_${urlIndex + 1}`
                // pageNumberingString = dataUrls.length > 0 ? pageNumberingString : '' // don't put '_1' at the end if only one page. though that may cause more work
                var pageFilename = `${imageDir}/${sampleFilename}${pageNumberingString}.png`

                const dataUrl = dataUrls[urlIndex]
                if (!dataUrl || !dataUrl.split) {
                    console.log(`error: could not get dataUrl (imageData) for page ${urlIndex + 1} of sample: ${sampleFilename}`)
                    continue
                }
                const imageData = dataUrl.split(';base64,').pop()
                const imageBuffer = Buffer.from(imageData, 'base64')

                console.log('got image data, saving to: ' + pageFilename)
                fs.writeFileSync(pageFilename, imageBuffer, { encoding: 'base64' })
            }
        }) // end render then
        //     },
        //     function (e) {
        //         console.log('error while rendering: ' + e)
        //     }) // end load then
        // }) // end read file
    }

    console.log('[OSMD.generate_browserless] exit')
}

function debug (msg, debugEnabled) {
    if (debugEnabled) {
        console.log(msg)
    }
}

init()
