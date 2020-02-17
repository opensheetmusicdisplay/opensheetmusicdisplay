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
        'Beethoven, L.v. - An die ferne Geliebte': 'Beethoven_AnDieFerneGeliebte.xml'
        // 'Clementi, M. - Sonatina Op.36 No.1 Pt.1': 'MuzioClementi_SonatinaOpus36No1_Part1.xml'
        // "Hello World": "HelloWorld.xml",
        // "Clementi, M. - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
    }
    const sampleKeys = Object.keys(samples)
    // const sampleValues = Object.values(samples)

    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage() // TODO set width/height
    const sampleFileName = sampleKeys[0] // TODO for loop over samples / take filenames from script arguments
    const sampleParameter = `&url=${sampleFileName}&endUrl`
    console.log('puppeteer: going to url')
    await page.goto('http://localhost:8000/?showHeader=0&debugControls=0&backendType=canvas&pageBackgroundColor=FFFFFF' + sampleParameter, { waitUntil: 'networkidle2' })
    console.log('goto done')

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

    var navigationWatcher = page.waitForNavigation()

    await Promise.race([responseWatcher, navigationWatcher])
    console.log('navigation race done')

    // get image data
    const getDataUrl = async () => {
        return page.evaluate(async () => {
            return new Promise(resolve => {
                const canvasImage = document.getElementById('osmdCanvasVexFlowBackendCanvas')
                var imageData = canvasImage.toDataURL()
                // TODO fetch multiple pages from multiple OSMD backends
                resolve(imageData)
            })
        })
    }
    const dataUrl = await getDataUrl()
    // console.log("dataUrl: " + dataUrl);
    const imageData = dataUrl.split(';base64,').pop()
    const imageBuffer = Buffer.from(imageData, 'base64')

    var fileName = `${imageDir}/${sampleFileName}.png`
    console.log('got image data, saving to: ' + fileName)
    fs.writeFileSync(fileName, imageBuffer, { encoding: 'base64' })

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
