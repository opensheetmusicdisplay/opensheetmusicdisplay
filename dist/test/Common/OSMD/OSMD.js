"use strict";
var chai = require("chai");
var OSMD_1 = require("../../../src/OSMD/OSMD");
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
});
