"use strict";
var MusicSheetReader_1 = require("../../../src/MusicalScore/ScoreIO/MusicSheetReader");
var Xml_1 = require("../../../src/Common/FileIO/Xml");
describe("Music Sheet Reader Tests", function () {
    // Initialize variables
    var path = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    var reader = new MusicSheetReader_1.MusicSheetReader();
    var score;
    var sheet;
    function getSheet(filename) {
        return (window.__xml__)[filename];
    }
    before(function () {
        // Load the xml file
        var doc = getSheet(path);
        chai.expect(doc).to.not.be.undefined;
        score = new Xml_1.IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        // chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
    });
    beforeEach(function () {
        // ???
    });
    afterEach(function () {
        // cleanup?
    });
    it("Check XML", function (done) {
        done();
    });
    it("Read title and composer", function (done) {
        chai.expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
        chai.expect(sheet.ComposerString).to.equal("Muzio Clementi");
        done();
    });
    it("Measures", function (done) {
        chai.expect(sheet.SourceMeasures.length).to.equal(38);
        console.log("First Measure: ", sheet.SourceMeasures[0]);
        done();
    });
    it("Instruments", function (done) {
        chai.expect(reader.CompleteNumberOfStaves).to.equal(2);
        chai.expect(sheet.Instruments.length).to.equal(2);
        chai.expect(sheet.InstrumentalGroups.length).to.equal(2);
        chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        done();
    });
    it("Notes", function (done) {
        // Staff Entries on first measure
        // chai.expect(sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries.length).to.equal(4);
        done();
    });
});
