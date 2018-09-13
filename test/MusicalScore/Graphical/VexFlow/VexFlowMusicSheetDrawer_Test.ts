import {VexFlowMusicSheetDrawer} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {OutlineAndFillStyleEnum} from "../../../../src/MusicalScore/Graphical/DrawingEnums";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {Fraction} from "../../../../src/Common/DataObjects/Fraction";
import {VexFlowBackend} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowBackend";
import {CanvasVexFlowBackend} from "../../../../src/MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import {DrawingParameters} from "../../../../src/MusicalScore/Graphical/DrawingParameters";

/* tslint:disable:no-unused-expression */
describe("VexFlow Music Sheet Drawer", () => {

    it("draws sheet \"Clementi pt. 1\"", (done: MochaDone) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        chai.expect(score).to.not.be.undefined;
        const partwise: Element = TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
        const reader: MusicSheetReader = new MusicSheetReader();
        const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
        const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);

        // Create the canvas in the document:
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const backend: VexFlowBackend = new CanvasVexFlowBackend();
        backend.initialize(canvas);
        const drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(canvas, backend);
        drawer.drawSheet(gms);
        done();
    });

    it.skip("draws cursor (as rectangle)", (done: MochaDone) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        chai.expect(score).to.not.be.undefined;
        const partwise: Element = TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
        const reader: MusicSheetReader = new MusicSheetReader();
        const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
        const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        gms.Cursors.push(gms.calculateCursorLineAtTimestamp(new Fraction(0, 4), OutlineAndFillStyleEnum.PlaybackCursor));

        // Create the canvas in the document:
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const backend: VexFlowBackend = new CanvasVexFlowBackend();
        backend.initialize(canvas);
        const drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(canvas, backend, new DrawingParameters());
        drawer.drawSheet(gms);
        done();
    });
});
