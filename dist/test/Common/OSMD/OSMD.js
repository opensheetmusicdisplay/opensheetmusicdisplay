"use strict";
var chai = require("chai");
var OSMD_1 = require("../../../src/OSMD/OSMD");
var TestUtils_1 = require("../../Util/TestUtils");
describe("OSMD Main Export", function () {
    it("no container", function (done) {
        chai.expect(function () {
            return new OSMD_1.OSMD(undefined);
        }).to.throw(/container/);
        done();
    });
    it("container", function (done) {
        var div = document.createElement("div");
        chai.expect(function () {
            return new OSMD_1.OSMD(div);
        }).to.not.throw(Error);
        done();
    });
    it("load MXL from string", function (done) {
        var mxl = TestUtils_1.TestUtils.getMXL("MozartTrio");
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(mxl).then(function (_) {
            osmd.render();
            done();
        }, done);
    });
    it("load invalid MXL from string", function (done) {
        var mxl = "\x50\x4b\x03\x04";
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(mxl).then(function (_) {
            done(new Error("Corrupted MXL appears to be loaded correctly"));
        }, function (exc) {
            if (exc.message.toLowerCase().match(/invalid/)) {
                done();
            }
            else {
                done(new Error("Unexpected error: " + exc.message));
            }
        });
    });
    it("load XML string", function (done) {
        var score = TestUtils_1.TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        var xml = new XMLSerializer().serializeToString(score);
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(xml).then(function (_) {
            osmd.render();
            done();
        }, done);
    });
    it("load XML Document", function (done) {
        var score = TestUtils_1.TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(score).then(function (_) {
            osmd.render();
            done();
        }, done);
    });
    it("load invalid XML string", function (done) {
        var xml = "<?xml";
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(xml).then(function (_) {
            done(new Error("Corrupted XML appears to be loaded correctly"));
        }, function (exc) {
            if (exc.message.toLowerCase().match(/partwise/)) {
                done();
            }
            else {
                done(new Error("Unexpected error: " + exc.message));
            }
        });
    });
    it("render without loading", function (done) {
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        chai.expect(function () {
            return osmd.render();
        }).to.throw(/load/);
        done();
    });
});
