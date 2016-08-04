import {VexFlowMusicSheetDrawer} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {Fraction} from "../../../../src/Common/DataObjects/Fraction";
import {OutlineAndFillStyleEnum} from "../../../../src/MusicalScore/Graphical/DrawingEnums";

describe("VexFlow Music Sheet Drawer", () => {

    it(".drawSheet (Clementi pt. 1)", (done: MochaDone) => {
        let score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        chai.expect(score).to.not.be.undefined;
        let partwise: Element = TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        let calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        let sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), "path");
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        gms.Cursors.push(gms.calculateCursorLineAtTimestamp(new Fraction(), OutlineAndFillStyleEnum.PlaybackCursor));

        // Create heading in the test page
        let h1: Element = document.createElement("h1");
        h1.textContent = "VexFlowMusicSheetDrawer Test Output";
        document.body.appendChild(h1);
        // Create the canvas in the document:
        let titles: HTMLElement = document.createElement("div");
        document.body.appendChild(titles);
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        document.body.appendChild(canvas);
        (new VexFlowMusicSheetDrawer(titles, canvas)).drawSheet(gms);
        // Clean up document.body
        document.body.removeChild(h1);
        document.body.removeChild(titles);
        document.body.removeChild(canvas);
        done();
    });

});
