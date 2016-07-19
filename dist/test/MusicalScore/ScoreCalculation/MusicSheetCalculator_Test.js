"use strict";
/**
 * Created by Matthias on 21.06.2016.
 */
var MusicSheetReader_1 = require("../../../src/MusicalScore/ScoreIO/MusicSheetReader");
var Xml_1 = require("../../../src/Common/FileIO/Xml");
var MusicSheetCalculator_1 = require("../../../src/MusicalScore/Graphical/MusicSheetCalculator");
var VexFlowMusicSheetCalculator_1 = require("../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator");
var GraphicalMusicSheet_1 = require("../../../src/MusicalScore/Graphical/GraphicalMusicSheet");
var VexFlowTextMeasurer_1 = require("../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer");
var TestUtils_1 = require("../../Util/TestUtils");
describe("Music Sheet Calculator Tests", function () {
    // Initialize variables
    var filename = "MuzioClementi_SonatinaOpus36No1_Part1";
    var reader = new MusicSheetReader_1.MusicSheetReader();
    var calculator = new VexFlowMusicSheetCalculator_1.VexFlowMusicSheetCalculator();
    var score;
    var sheet;
    before(function () {
        // ???
    });
    beforeEach(function () {
        // ???
    });
    afterEach(function () {
        // cleanup?
    });
    it("Do Calculation", function (done) {
        MusicSheetCalculator_1.MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer_1.VexFlowTextMeasurer();
        // Load the XML file
        var xml = TestUtils_1.TestUtils.getScore(filename);
        chai.expect(xml).to.not.be.undefined;
        score = new Xml_1.IXmlElement(TestUtils_1.TestUtils.getPartWiseElement(xml));
        chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, "path-of-" + filename);
        var graphicalSheet = new GraphicalMusicSheet_1.GraphicalMusicSheet(sheet, calculator);
        graphicalSheet.reCalculate();
        done();
    });
});
