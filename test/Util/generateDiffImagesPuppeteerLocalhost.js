/*
  Render each OSMD sample in a headless browser
  (using puppeteer, requires ~100MB chromium download),
  grab the generated images, and
  dump them into a local directory as PNG files.

  You may have to install puppeteer as dev dependency to run this:
  npm i puppeteer --save-dev
  (will download ~100MB for Chromium)

  This script is made obsolete by the ~2x faster generateImages_browserless.mjs,
  but may be useful for comparison.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This is meant to be used with the visual regression test system in
  `tools/visual_regression.sh`.
*/

function sleep (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const osmdPort = 8000 // OSMD webpack server port. OSMD has to be running (npm start) when this script runs.

// try this to debug: node --inspect=9229 test/Util/generateDiffImagesPuppeteerLocalhost.js test/data/ export/  5000

// main function
async function init () {
    console.log('[OSMD.generate] init')

    let [sampleDir, imageDir, pageWidth, pageHeight, filterRegex, debugFlag, debugSleepTimeString] = process.argv.slice(2, 9)
    if (!sampleDir || !imageDir) {
        console.log('usage: node test/Util/generateDiffImagesPuppeteerLocalhost.js sampleDirectory imageDirectory [width|0] [height|0] [filterRegex|all] [--debug] [debugSleepTime]')
        console.log('  (use "all" to skip filterRegex parameter)')
        console.log('example: node ./test/Util/generateDiffImagesPuppeteerLocalhost.js ./test/data/ ./export 210 297 all --debug 5000')
        console.log('Error: need sampleDir and imageDir. Exiting.')
        process.exit(1)
    }
    console.log('sampleDir: ' + sampleDir)
    console.log('imageDir: ' + imageDir)

    let pageFormatParameter = ''
    pageHeight = Number.parseInt(pageHeight)
    pageWidth = Number.parseInt(pageWidth)
    const endlessPage = !(pageHeight > 0 && pageWidth > 0)
    if (!endlessPage) {
        pageFormatParameter = `&pageWidth=${pageWidth}&pageHeight=${pageHeight}`
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

    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage() // TODO set width/height

    const defaultTimeoutInMs = 30000
    page.setDefaultNavigationTimeout(defaultTimeoutInMs) // default setting for page navigationtimeout is 30000ms.

    // fix navigation error
    var responseEventOccurred = false
    var responseHandler = function (event) { responseEventOccurred = true }

    var responseWatcher = new Promise(function (resolve, reject) {
        setTimeout(function () {
            if (!responseEventOccurred) {
                resolve(true)
            } else {
                setTimeout(function () { resolve(true) }, defaultTimeoutInMs)
            }
            page.removeListener('response', responseHandler)
        }, 1000)
    })

    page.on('response', responseHandler)
    if (DEBUG) {
        // pipe console output on the page to the console node is running from, otherwise these logs from the headless browser aren't visible
        page.on('console', msg => console.log(msg.text()))
    }
    page.on('error', err => console.log(err))
    page.on('pageerror', err => console.log(err)) // this one triggers for js errors in index.js, for example

    // get image data
    const getDataUrl = async (page, sampleFilename) => {
        return page.evaluate(async () => {
            return new Promise(resolve => {
                const imageDataArray = []
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
                    imageDataArray.push(canvasImage.toDataURL())
                }
                // while (canvasImage = document.getElementById('osmdCanvasVexFlowBackendCanvas' + pageNumber)) {
                //     imageData = canvasImage.toDataURL()
                //     console.log("got em. " + pageNumber)
                // }
                // TODO fetch multiple pages from multiple OSMD backends
                resolve(imageDataArray)
            })
        })
    }

    // generate png for all given samples
    for (let i = 0; i < samplesToProcess.length; i++) {
        const sampleFilename = encodeURIComponent(samplesToProcess[i]) // escape slashes, '&' and so on
        const sampleParameter = `&openUrl=${sampleFilename}&endUrl`
        const pageUrl = `http://localhost:${osmdPort}?showHeader=0&debugControls=0&backendType=canvas&pageBackgroundColor=FFFFFF` +
            sampleParameter +
            pageFormatParameter

        console.log('puppeteer: page.goto url: ' + pageUrl)
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2' })
        } catch (error) {
            console.log(error)
            console.log('[OSMD.generateImages] Error generating images: could not reach local OSMD server. ' +
                'Make sure to start OSMD local webpack server (npm start) before running this script.')
            process.exit(-1) // exit script with error. otherwise process will continue running
        }
        console.log('puppeteer.page.goto done. (now fetching image data)')

        var navigationWatcher = page.waitForNavigation()
        await Promise.race([responseWatcher, navigationWatcher])
        console.log('navigation race done')
        const dataUrls = await getDataUrl(page, sampleFilename)
        if (dataUrls.length === 0) {
            console.log(`error: could not get imageData for sample: ${sampleFilename}`)
            console.log('   (dataUrls was empty list)')
            continue
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
        /* bneumann's SVG method */
        // const clone = this.ctx.svg.cloneNode(true) // SVGElement
        // // create a doctype that is SVG
        // const svgDocType = document.implementation.createDocumentType(
        //     'svg',
        //     '-//W3C//DTD SVG 1.1//EN',
        //     'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'
        // )
        // // Create a new svg document
        // const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', svgDocType)
        // // replace the documentElement with our clone
        // svgDoc.replaceChild(clone, svgDoc.documentElement)
        // // get the data
        // const svgData = (new XMLSerializer()).serializeToString(svgDoc)
        // var blob = new Blob([svgData.replace(/></g, '>\n\r<')])
        // fs.writeFileSync(filename, blob)
        // //fs.writeFileSync(filename, svgData)
        // return
        /* end bneumann's svg method */
    }

    // const html = await page.content();
    // console.log('page content: ' + html);
    browser.close()
    console.log('\n[OSMD.generate] Done. Puppeteer browser closed. Exiting.')
}

init()

// function start() {
//     // await (async () => {
//     //     init();
//     // });

//     (async function(){
//         await init();
//         // more code here or the await is useless
//     })();
// }

// function resizeCanvas (elementId, width, height) {
//     $('#' + elementId).width(width)
//     $('#' + elementId).attr('width', width)
//     $('#' + elementId).attr('height', height)
// }
