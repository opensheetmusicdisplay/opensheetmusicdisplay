"use strict";
var chai = require("chai");
var OSMD_1 = require("../../../src/OSMD/OSMD");
var TestUtils_1 = require("../../Util/TestUtils");
describe("OSMD Main Export", function () {
    var container1;
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
    it("load MXL Document by URL", function (done) {
        var url = "base/test/data/MozartTrio.mxl";
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(url).then(function (_) {
            osmd.render();
            done();
        }, done);
    });
    it("load MXL Document by invalid URL", function (done) {
        var url = "http://www.google.com";
        var div = document.createElement("div");
        var osmd = new OSMD_1.OSMD(div);
        osmd.load(url).then(function (_) {
            done(new Error("Invalid URL appears to be loaded correctly"));
        }, function (exc) {
            if (exc.message.toLowerCase().match(/url/)) {
                done();
            }
            else {
                done(new Error("Unexpected error: " + exc.message));
            }
        });
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
    before(function () {
        container1 = document.createElement("div");
        document.body.appendChild(container1);
    });
    after(function () {
        document.body.removeChild(container1);
    });
    it("test width 500", function (done) {
        var div = container1;
        div.style.width = "500px";
        var osmd = new OSMD_1.OSMD(div);
        var score = TestUtils_1.TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        osmd.load(score).then(function (_) {
            osmd.render();
            chai.expect(div.offsetWidth).to.equal(500);
            done();
        }, done).catch(done);
    });
    it("test width 200", function (done) {
        var div = container1;
        div.style.width = "200px";
        var osmd = new OSMD_1.OSMD(div);
        var score = TestUtils_1.TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        osmd.load(score).then(function (_) {
            osmd.render();
            chai.expect(div.offsetWidth).to.equal(200);
            done();
        }, done).catch(done);
    });
});
