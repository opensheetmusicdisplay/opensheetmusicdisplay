"use strict";
var VexFlowMusicSheetDrawer_1 = require("../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer");
var GraphicalMusicSheet_1 = require("../../../../src/MusicalScore/Graphical/GraphicalMusicSheet");
var MusicSheetReader_1 = require("../../../../src/MusicalScore/ScoreIO/MusicSheetReader");
var VexFlowMusicSheetCalculator_1 = require("../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator");
var TestUtils_1 = require("../../../Util/TestUtils");
var Xml_1 = require("../../../../src/Common/FileIO/Xml");
var fraction_1 = require("../../../../src/Common/DataObjects/fraction");
var DrawingEnums_1 = require("../../../../src/MusicalScore/Graphical/DrawingEnums");
describe("VexFlow Music Sheet Drawer", function () {
    it(".drawSheet (Clementi pt. 1)", function (done) {
        var score = TestUtils_1.TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        chai.expect(score).to.not.be.undefined;
        var partwise = TestUtils_1.TestUtils.getPartWiseElement(score);
        chai.expect(partwise).to.not.be.undefined;
        var calc = new VexFlowMusicSheetCalculator_1.VexFlowMusicSheetCalculator();
        var reader = new MusicSheetReader_1.MusicSheetReader();
        var sheet = reader.createMusicSheet(new Xml_1.IXmlElement(partwise), "path");
        var gms = new GraphicalMusicSheet_1.GraphicalMusicSheet(sheet, calc);
        gms.Cursors.push(gms.calculateCursorLineAtTimestamp(new fraction_1.Fraction(), DrawingEnums_1.OutlineAndFillStyleEnum.PlaybackCursor));
        // Create heading in the test page
        var h1 = document.createElement("h1");
        h1.textContent = "VexFlowMusicSheetDrawer Test Output";
        document.body.appendChild(h1);
        // Create the canvas in the document:
        var canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        (new VexFlowMusicSheetDrawer_1.VexFlowMusicSheetDrawer(document.body, canvas)).drawSheet(gms);
        done();
    });
});
