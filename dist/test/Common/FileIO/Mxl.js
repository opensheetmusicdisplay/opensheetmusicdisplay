"use strict";
var Mxl_ts_1 = require("../../../src/Common/FileIO/Mxl.ts");
describe("MXL Tests", function () {
    // Load the mxl file
    function getSheet(filename) {
        return (window.__raw__)[filename];
    }
    // Generates a test for a mxl file name
    function testFile(scoreName) {
        it(scoreName, function (done) {
            // Load the xml file content
            var mxl = getSheet("test/data/" + scoreName + ".mxl");
            chai.expect(mxl).to.not.be.undefined;
            // Extract XML from MXL
            // Warning: the sheet is loaded asynchronously,
            // (with Promises), thus we need a little fix
            // in the end with 'then(null, done)' to
            // make Mocha work asynchronously
            Mxl_ts_1.extractSheetFromMxl(mxl).then(function (score) {
                chai.expect(score).to.not.be.undefined;
                chai.expect(score.name).to.equal("score-partwise");
                done();
            }, function (exc) { throw exc; }).then(undefined, done);
        });
    }
    // Test all the following mxl files:
    var scores = ["MozartTrio"];
    for (var _i = 0, scores_1 = scores; _i < scores_1.length; _i++) {
        var score = scores_1[_i];
        testFile(score);
    }
    // Test failure
    it("Corrupted file", function (done) {
        Mxl_ts_1.extractSheetFromMxl("").then(function (score) {
            chai.expect(score).to.not.be.undefined;
            chai.expect(score.name).to.equal("score-partwise");
            done(new Error("Empty zip file was loaded correctly. How is that even possible?"));
        }, function (exc) { done(); });
    });
});
