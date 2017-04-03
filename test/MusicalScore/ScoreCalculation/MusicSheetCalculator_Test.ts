import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {MusicSheetCalculator} from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetCalculator} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {GraphicalMusicSheet} from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {VexFlowTextMeasurer} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";
import {TestUtils} from "../../Util/TestUtils";

/* tslint:disable:no-unused-expression */
describe("Music Sheet Calculator", () => {
    let filename: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let reader: MusicSheetReader = new MusicSheetReader();
    let calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
    let score: IXmlElement;
    let sheet: MusicSheet;

    it("calculates music sheet", (done: MochaDone) => {
        this.timeout = 10000;
        MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer();
        // Load the XML file
        let xml: Document = TestUtils.getScore(filename);
        chai.expect(xml).to.not.be.undefined;
        score = new IXmlElement(TestUtils.getPartWiseElement(xml));
        chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, "path-of-" + filename);

        let graphicalSheet: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calculator);
        graphicalSheet.reCalculate();
        done();
    });
});
