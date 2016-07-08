"use strict";
/**
 * Created by Matthias on 21.06.2016.
 */
var MusicSheetReader_1 = require("../../../src/MusicalScore/ScoreIO/MusicSheetReader");
var MusicSheetCalculator_1 = require("../../../src/MusicalScore/Graphical/MusicSheetCalculator");
var VexFlowMusicSheetCalculator_1 = require("../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator");
var GraphicalMusicSheet_1 = require("../../../src/MusicalScore/Graphical/GraphicalMusicSheet");
var VexFlowTextMeasurer_1 = require("../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer");
var TestUtils_1 = require("../../Util/TestUtils");
describe("Music Sheet Calculator Tests", function () {
    // Initialize variables
    var path = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
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
        // Load the xml file
        score = TestUtils_1.TestUtils.getScore(path);
        chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
        var graphicalSheet = new GraphicalMusicSheet_1.GraphicalMusicSheet(sheet, calculator);
        graphicalSheet.reCalculate();
        done();
    });
});
