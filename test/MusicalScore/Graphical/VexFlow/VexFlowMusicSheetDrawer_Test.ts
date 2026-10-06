import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {VexFlowMusicSheetDrawer} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {VexFlowBackend} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowBackend";
import {CanvasVexFlowBackend} from "../../../../src/MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import {OpenSheetMusicDisplay} from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {StaffLine} from "../../../../src/MusicalScore/Graphical/StaffLine";

describe("VexFlow Music Sheet Drawer", () => {

    /**
     * Drawing the laid-out sheet again, without a new layout (e.g. an incremental render, or an image export into another
     * backend), has to draw everything the same way. Drawing used to change the positions of some elements:
     * the texts of repetition instructions at the end of a measure (e.g. D.C.) alternated between two positions,
     * and lyric extenders moved by their staff line's position on every draw. And after a rectangle, every element got
     * the attribute fill-opacity="1", so in the next draw also the elements drawn before the rectangle in the first one.
     */
    describe("drawing the laid-out sheet again", () => {
        let container: HTMLElement;
        let osmd: OpenSheetMusicDisplay;

        beforeEach((): void => {
            container = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(container); // SVG backend
        });

        afterEach((): void => {
            container.remove();
        });

        /** Renders the sample, then clears the SVG and draws the laid-out sheet again. Returns the SVG content of both draws. */
        async function renderAndDrawAgain(sampleFilename: string): Promise<{ firstDraw: string, secondDraw: string }> {
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.render();
            const svg: SVGSVGElement = container.querySelector("svg");
            const firstDraw: string = svg.innerHTML;
            osmd.Drawer.clear();
            osmd.Drawer.drawSheet(osmd.GraphicSheet);
            return { firstDraw, secondDraw: svg.innerHTML };
        }

        /** The SVG elements (the markup split at "><") that the second draw drew differently, as "first -> second". */
        function differingElements(firstDraw: string, secondDraw: string): string[] {
            const firstElements: string[] = firstDraw.split("><");
            const secondElements: string[] = secondDraw.split("><");
            const differing: string[] = [];
            for (let i: number = 0; i < Math.max(firstElements.length, secondElements.length); i++) {
                if (firstElements[i] !== secondElements[i]) {
                    differing.push(`${firstElements[i]} -> ${secondElements[i]}`);
                }
            }
            return differing;
        }

        it("draws the text of a repetition instruction at the end of a measure (e.g. D.C. al Coda) at the same position", async () => {
            const { firstDraw, secondDraw } = await renderAndDrawAgain("test_repeat_da_capo_al_coda_after_repeat.musicxml");
            expect(firstDraw, "D.C. al drawn").to.contain(">D.C. al<");
            expect(differingElements(firstDraw, secondDraw)).to.deep.equal([]);
        });

        it("draws lyric extenders at the same position", async () => {
            const { firstDraw, secondDraw } = await renderAndDrawAgain("test_lyrics_extend_verses.musicxml");
            const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.flatMap(system => system.StaffLines);
            expect(staffLines.some(staffLine => staffLine.LyricLines.length > 0), "lyric extenders laid out").to.equal(true);
            expect(differingElements(firstDraw, secondDraw)).to.deep.equal([]);
        });

        it("draws the same SVG again after drawing rectangles (here the bounding boxes of the debug drawing)", async () => {
            osmd.setDrawBoundingBox("VexFlowMeasure", false);
            const { firstDraw, secondDraw } = await renderAndDrawAgain("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            expect(firstDraw, "bounding boxes drawn").to.contain("fill-opacity=\"0.5\"");
            expect(differingElements(firstDraw, secondDraw)).to.deep.equal([]);
        });
    });

    it("draws sheet \"Clementi pt. 1\"", (done: Mocha.Done) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        expect(score).to.not.be.undefined;
        const partwise: Element = TestUtils.getPartWiseElement(score);
        expect(partwise).to.not.be.undefined;
        const reader: MusicSheetReader = new MusicSheetReader();
        const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
        const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
        const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);

        // Create the canvas in the document:
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const backend: VexFlowBackend = new CanvasVexFlowBackend(sheet.Rules);
        backend.initialize(canvas, 1.0);
        const drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer();
        drawer.Backends.push(backend);
        drawer.drawSheet(gms);
        done();
    });

    // Test ignored for now, gms.calculateCursorLineAtTimestamp returns null instead of a GraphicalLine,
    // and in any case, this test doesn't test that the cursor is actually drawn, there are no expects for that etc.
    // it.only("draws cursor (as rectangle)", (done: Mocha.Done) => {
    //     const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
    //     expect(score).to.not.be.undefined;
    //     const partwise: Element = TestUtils.getPartWiseElement(score);
    //     expect(partwise).to.not.be.undefined;
    //     const reader: MusicSheetReader = new MusicSheetReader();
    //     const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    //     const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
    //     const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    //     gms.Cursors.push(gms.calculateCursorLineAtTimestamp(new Fraction(0, 4), OutlineAndFillStyleEnum.PlaybackCursor));

    //     // Create the canvas in the document:
    //     const canvas: HTMLCanvasElement = document.createElement("canvas");
    //     const backend: VexFlowBackend = new CanvasVexFlowBackend(sheet.Rules);
    //     backend.initialize(canvas);
    //     const drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(new DrawingParameters());
    //     drawer.Backends.push(backend);
    //     drawer.drawSheet(gms);
    //     done();
    // });
});
