/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {MusicSheetCalculator} from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetCalculator} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {GraphicalMusicSheet} from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {VexFlowTextMeasurer} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";
import {TestUtils} from "../../Util/TestUtils";
import {EngravingRules} from "../../../src";

describe("Music Sheet Calculator", () => {
    const filename: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
    const reader: MusicSheetReader = new MusicSheetReader();
    const calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    let score: IXmlElement;
    let sheet: MusicSheet;

    it("calculates music sheet", (done: Mocha.Done) => {
        // this.timeout = 10000;
        MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(new EngravingRules());
        // Load the XML file
        const xml: Document = TestUtils.getScore(filename);
        chai.expect(xml).to.not.be.undefined;
        score = new IXmlElement(TestUtils.getPartWiseElement(xml));
        chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, "path-of-" + filename);

        const graphicalSheet: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calculator);
        graphicalSheet.reCalculate();
        done();
    });
});
