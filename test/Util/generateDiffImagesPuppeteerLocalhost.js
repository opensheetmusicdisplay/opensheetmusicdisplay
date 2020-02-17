/*
  Render each OSMD sample, grab the generated images, and
  dump them into a local directory as PNG files.

  inspired by Vexflow's generate_png_images and vexflow-tests.js

  This is meant to be used with the visual regression test system in
  `tools/visual_regression.sh`. (TODO)
*/

// function sleep(ms) {
//     return new Promise((resolve) => {
//       setTimeout(resolve, ms);
//     });
// }

const osmdPort = 8000 // OSMD webpack server port. OSMD has to be running (npm start) when this script runs.

// main function
async function init () {
    console.log('init')

    const fs = require('fs')
    const [sampleDir, imageDir] = process.argv.slice(2, 4)
    console.log('sampleDir: ' + sampleDir)
    console.log('imageDir: ' + imageDir)

    // Create the image directory if it doesn't exist.
    fs.mkdirSync(imageDir, { recursive: true })

    const samples = {
        'Beethoven, L.v. - An die ferne Geliebte': 'Beethoven_AnDieFerneGeliebte.xml',
        'Clementi, M. - Sonatina Op.36 No.1 Pt.1': 'MuzioClementi_SonatinaOpus36No1_Part1.xml'
        // "Hello World": "HelloWorld.xml",
        // "Clementi, M. - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
    }
    const sampleKeys = Object.keys(samples)
    const sampleValues = Object.values(samples)

    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage() // TODO set width/height

    // fix navigation error
    var responseEventOccurred = false
    var responseHandler = function (event) { responseEventOccurred = true }

    var responseWatcher = new Promise(function (resolve, reject) {
        setTimeout(function () {
            if (!responseEventOccurred) {
                resolve(true)
            } else {
                setTimeout(function () { resolve(true) }, 30000)
            }
            page.removeListener('response', responseHandler)
        }, 500)
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
    for (let i = 0; i < sampleKeys.length; i++) {
        const sampleTitle = sampleKeys[i]
        const sampleFileName = sampleValues[i] // TODO maybe take filenames from script arguments
        const sampleParameter = `&openUrl=${sampleFileName}&endUrl`
        const pageUrl = `http://localhost:${osmdPort}/?showHeader=0&debugControls=0&backendType=canvas&pageBackgroundColor=FFFFFF${sampleParameter}` +
            sampleParameter
        console.log('puppeteer: page.goto url: ' + pageUrl)
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2' })
        } catch (error) {
            console.log(error)
            console.log('[OSMD.generateImages] Error generating images: could not reach local OSMD server.' +
                'Make sure to start OSMD (npm start) local webpack server before running this script.')
            process.exit(-1) // exit script with error. otherwise process will continue running
        }
        console.log('puppeteer.page.goto done')

        var navigationWatcher = page.waitForNavigation()
        await Promise.race([responseWatcher, navigationWatcher])
        console.log('navigation race done')
        const dataUrl = await getDataUrl(page)
        // console.log("dataUrl: " + dataUrl);
        const imageData = dataUrl.split(';base64,').pop()
        const imageBuffer = Buffer.from(imageData, 'base64')

        var fileName = `${imageDir}/${sampleTitle}.png`
        console.log('got image data, saving to: ' + fileName)
        fs.writeFileSync(fileName, imageBuffer, { encoding: 'base64' })
    }

    // const html = await page.content();
    // console.log("page content: " + html);
    browser.close()
    console.log('puppeteer browser closed. exiting.')
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
