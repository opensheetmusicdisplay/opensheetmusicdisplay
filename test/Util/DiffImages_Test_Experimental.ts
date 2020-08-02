import { OpenSheetMusicDisplay, CanvasVexFlowBackend } from "../../src";
import { TestUtils } from "./TestUtils";
//import fs from "fs";

// experimental code, shouldn't be included in Karma test suite

describe("GeneratePNGImages", () => {
    // Test all the following xml files:
    const sampleFilenames: string[] = [
        "Beethoven_AnDieFerneGeliebte.xml",
        // "CharlesGounod_Meditation.xml",
        // "Debussy_Mandoline.xml",
        // "Dichterliebe01.xml",
        // "JohannSebastianBach_Air.xml",
        // "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
        // "JosephHaydn_ConcertanteCello.xml",
        // "Mozart_AnChloe.xml",
        // "Mozart_DasVeilchen.xml",
        "MuzioClementi_SonatinaOpus36No1_Part1.xml",
        // "MuzioClementi_SonatinaOpus36No1_Part2.xml",
        // "MuzioClementi_SonatinaOpus36No3_Part1.xml",
        // "MuzioClementi_SonatinaOpus36No3_Part2.xml",
        // "Saltarello.xml",
        // "ScottJoplin_EliteSyncopations.xml",
        // "ScottJoplin_The_Entertainer.xml",
        // "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
        // "TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml",
    ];
    for (const score of sampleFilenames) {
        generatePNG(score);
    }

    // TODO This is just example code for now.
    // generate PNG. TODO fs doesn't work with Karma. This is the big problem that needs to be worked around with ts/Karma.
    function generatePNG(sampleFilename: string): void {
        it(sampleFilename, (done: MochaDone) => {
            // Load the xml file content
            const score: Document = TestUtils.getScore(sampleFilename);
            const div: HTMLElement = document.createElement("div");
            const openSheetMusicDisplay: OpenSheetMusicDisplay =
                new OpenSheetMusicDisplay(div, { autoResize: false, backend: "canvas"});
            openSheetMusicDisplay.load(score);

            const testDir: string = "../data/images";
            //fs.mkdirSync(testDir, { recursive: true });

            const fileName: string = `${testDir}/${sampleFilename}.png`;
            console.log("fileName: " + fileName);

            console.log("before buffer");
            const canvasBackend: CanvasVexFlowBackend = openSheetMusicDisplay.Drawer.Backends[0] as CanvasVexFlowBackend;
            const imageData: string = (canvasBackend.getCanvas() as HTMLCanvasElement).toDataURL().split(";base64,").pop();
            const imageBuffer: Buffer = Buffer.from(imageData, "base64");
            console.log("imageBuffer.length: " + imageBuffer.length);
            //console.log("after buffer");
            //let arraybuffer = Uint8Array.from(imageBuffer, 'base64').buffer;

            //fs.writeFileSync(fileName, imageBuffer, { encoding: "base64" });

            done();
            }).timeout(10000);
    }
});
