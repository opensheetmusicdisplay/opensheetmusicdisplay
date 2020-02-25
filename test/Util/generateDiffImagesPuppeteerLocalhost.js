/*
  Render each OSMD sample, grab the generated images, and
  dump them into a local directory as PNG files.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This is meant to be used with the visual regression test system in
  `tools/visual_regression.sh`. (TODO)
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

    const [sampleDir, imageDir, filterRegex, debugFlag, debugSleepTimeString] = process.argv.slice(2, 7)
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
    console.log('sampleDir: ' + sampleDir)
    console.log('imageDir: ' + imageDir)
    if (!sampleDir || !imageDir) {
        console.log('usage: node test/Util/generateDiffImagesPuppeteerLocalhost sampleDirectory imageDirectory [filterRegex|all] [--debug] [debugSleepTime]')
        console.log('  (use "all" to skip filterRegex parameter)')
        console.log('Error: need sampleDir and imageDir. Exiting.')
        process.exit(1)
    }

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
            console.log('found musicxml/mxl: ' + sampleFilename)
            samplesToProcess.push(sampleFilename)
        } else {
            console.log('discarded file/directory: ' + sampleFilename)
        }
    }

    // Create the image directory if it doesn't exist.
    fs.mkdirSync(imageDir, { recursive: true })

    // filter regex if given
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

    // get image data
    const getDataUrl = async (page) => {
        return page.evaluate(async () => {
            return new Promise(resolve => {
                const canvasImage = document.getElementById('osmdCanvasVexFlowBackendCanvas')
                var imageData = canvasImage.toDataURL()
                // TODO fetch multiple pages from multiple OSMD backends
                resolve(imageData)
            })
        })
    }

    // generate png for all given samples
    for (let i = 0; i < samplesToProcess.length; i++) {
        const sampleFileName = encodeURIComponent(samplesToProcess[i]) // escape slashes, '&' and so on
        const sampleParameter = `&openUrl=${sampleFileName}&endUrl`
        const pageUrl = `http://localhost:${osmdPort}?showHeader=0&debugControls=0&backendType=canvas&pageBackgroundColor=FFFFFF${sampleParameter}`
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
        const dataUrl = await getDataUrl(page)
        // console.log('dataUrl: ' + dataUrl);
        const imageData = dataUrl.split(';base64,').pop()
        const imageBuffer = Buffer.from(imageData, 'base64')

        var fileName = `${imageDir}/${sampleFileName}.png`
        console.log('got image data, saving to: ' + fileName)
        fs.writeFileSync(fileName, imageBuffer, { encoding: 'base64' })
    }

    // const html = await page.content();
    // console.log('page content: ' + html);
    browser.close()
    console.log('\n[OSMD.generate] Done. Puppeteer browser closed. Exiting.')
}

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

init()
