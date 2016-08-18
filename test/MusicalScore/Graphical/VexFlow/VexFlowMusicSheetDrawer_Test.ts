import {VexFlowMusicSheetDrawer} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";

describe("VexFlow Music Sheet Drawer", () => {

    it(".drawSheet (Clementi pt. 1)", (done: MochaDone) => {
        let score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        chai.expect(score).to.not.be.undefined;
        let partwise: Element = TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        let calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        let sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);

        // Create the canvas in the document:
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        let drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(canvas);
        drawer.drawSheet(gms);
        done();
    });

    /*it("With cursor (as rectangle)", (done: MochaDone) => {
        let score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        chai.expect(score).to.not.be.undefined;
        let partwise: Element = TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        let calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        let sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "** missing path **");
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        gms.Cursors.push(gms.calculateCursorLineAtTimestamp(new Fraction(0, 4), OutlineAndFillStyleEnum.PlaybackCursor));

        // Create the canvas in the document:
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        let drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(canvas);
        drawer.drawSheet(gms);
        done();
    });*/
});
