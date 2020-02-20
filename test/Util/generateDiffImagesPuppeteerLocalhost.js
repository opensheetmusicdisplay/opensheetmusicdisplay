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
    const [sampleDir, imageDir, filterRegex] = process.argv.slice(2, 5)
    console.log('sampleDir: ' + sampleDir)
    console.log('imageDir: ' + imageDir)
    if (!sampleDir || !imageDir) {
        console.log('usage: node test/Util/generateDiffImagesPuppeteerLocalhost sampleDirectory imageDirectory [filterRegex]')
        console.log('Error: need sampleDir and imageDir. Exiting.')
        process.exit(-1)
    }

    // Create the image directory if it doesn't exist.
    fs.mkdirSync(imageDir, { recursive: true })

    // TODO fetch samples from sampleDir (iterate over all files in folder)
    const samples = {
        'Beethoven, L.v. - An die ferne Geliebte': 'Beethoven_AnDieFerneGeliebte.xml',
        // ' Beethoven Evil filename test': 'Beethoven&Evil/Filename.xml', // TODO may need decodeURIComponent in OSMD openURL parsing
        'Clementi, M. - Sonatina Op.36 No.1 Pt.1': 'MuzioClementi_SonatinaOpus36No1_Part1.xml',
        'Clementi, M. - Sonatina Op.36 No.1 Pt.2': 'MuzioClementi_SonatinaOpus36No1_Part2.xml',
        'Clementi, M. - Sonatina Op.36 No.3 Pt.1': 'MuzioClementi_SonatinaOpus36No3_Part1.xml',
        'Clementi, M. - Sonatina Op.36 No.3 Pt.2': 'MuzioClementi_SonatinaOpus36No3_Part2.xml',
        'Bach, J.S. - Praeludium in C-Dur BWV846 1': 'JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml',
        'Bach, J.S. - Air': 'JohannSebastianBach_Air.xml',
        // 'Gounod, C. - Méditation': 'CharlesGounod_Meditation.xml', // TODO this Gounod sample fails to generate a proper PNG image for some reason
        'Haydn, J. - Concertante Cello': 'JosephHaydn_ConcertanteCello.xml',
        'Joplin, S. - Elite Syncopations': 'ScottJoplin_EliteSyncopations.xml',
        'Joplin, S. - The Entertainer': 'ScottJoplin_The_Entertainer.xml',
        'Mozart, W.A. - An Chloe': 'Mozart_AnChloe.xml',
        'Mozart, W.A. - Das Veilchen': 'Mozart_DasVeilchen.xml',
        'Mozart, W.A. - Clarinet Quintet (Excerpt)': 'Mozart_Clarinet_Quintet_Excerpt.mxl',
        'Mozart, W.A. - String Quartet in G, K. 387, 1st Mvmt Excerpt': 'Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml',
        'Mozart/Holzer - Land der Berge (national anthem of Austria)': 'Land_der_Berge.musicxml',
        'OSMD Function Test - All': 'OSMD_function_test_all.xml',
        'OSMD Function Test - Accidentals': 'OSMD_function_test_accidentals.musicxml',
        'OSMD Function Test - Autobeam': 'OSMD_function_test_autobeam.musicxml',
        'OSMD Function Test - Auto-/Custom-Coloring': 'OSMD_function_test_auto-custom-coloring-entchen.musicxml',
        'OSMD Function Test - Bar lines': 'OSMD_function_test_bar_lines.musicxml',
        'OSMD Function Test - Color (from XML)': 'OSMD_function_test_color.musicxml',
        'OSMD Function Test - Drumset': 'OSMD_function_test_drumset.musicxml',
        'OSMD Function Test - Expressions': 'OSMD_function_test_expressions.musicxml',
        'OSMD Function Test - Expressions Overlap': 'OSMD_function_test_expressions_overlap.musicxml',
        'OSMD Function Test - Grace Notes': 'OSMD_function_test_GraceNotes.xml',
        'OSMD Function Test - Invisible Notes': 'OSMD_function_test_invisible_notes.musicxml',
        'OSMD Function Test - Selecting Measures To Draw': 'OSMD_function_test_measuresToDraw_Beethoven_AnDieFerneGeliebte.xml',
        'OSMD Function Test - Notehead Shapes': 'OSMD_function_test_noteheadShapes.musicxml',
        'OSMD Function Test - Ornaments': 'OSMD_function_test_Ornaments.xml',
        'OSMD Function Test - Tremolo': 'OSMD_Function_Test_Tremolo_2bars.musicxml',
        'Schubert, F. - An Die Musik': 'Schubert_An_die_Musik.xml',
        'Anonymous - Saltarello': 'Saltarello.mxl',
        'Debussy, C. - Mandoline': 'Debussy_Mandoline.xml',
        'Levasseur, F. - Parlez Mois': 'Parlez-moi.mxl',
        'Schumann, R. - Dichterliebe': 'Dichterliebe01.xml',
        'Telemann, G.P. - Sonate-Nr.1.1-Dolce': 'TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml',
        'Telemann, G.P. - Sonate-Nr.1.2-Allegro': 'TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml'
        // 'Hello World': 'HelloWorld.xml',
        // 'Clementi, M. - Sonatina Op.36 No.1 Pt.2': 'MuzioClementi_SonatinaOpus36No1_Part2.xml',
    }
    // const sampleKeys = Object.keys(samples)
    let sampleValues = Object.values(samples)

    // filter regex if given
    if (filterRegex && filterRegex !== '') {
        console.log('filtering samples for regex: ' + filterRegex)
        sampleValues = sampleValues.filter((filename) => filename.match(filterRegex))
        console.log(`found ${sampleValues.length} matches: `)
        for (let i = 0; i < sampleValues.length; i++) {
            console.log(sampleValues[i])
        }
    }

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
    for (let i = 0; i < sampleValues.length; i++) {
        const sampleFileName = encodeURIComponent(sampleValues[i]) // escape slashes, '&' and so on
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
