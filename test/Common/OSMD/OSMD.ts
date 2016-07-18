import chai = require("chai");
import {OSMD} from "../../../src/OSMD/OSMD";
import {TestUtils} from "../../Util/TestUtils";


describe("OSMD Main Export", () => {

    it("no container", (done: MochaDone) => {
        chai.expect(() => {
            return new OSMD(undefined);
        }).to.throw(/container/);
        done();
    });

    it("container", (done: MochaDone) => {
        let div: HTMLElement = document.createElement("div");
        chai.expect(() => {
            return new OSMD(div);
        }).to.not.throw(Error);
        done();
    });

    it("load MXL from string", (done: MochaDone) => {
        let mxl: string = TestUtils.getMXL("MozartTrio");
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        osmd.load(mxl).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load invalid MXL from string", (done: MochaDone) => {
        let mxl: string = "\x50\x4b\x03\x04";
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        osmd.load(mxl).then(
            (_: {}) => {
                done(new Error("Corrupted MXL appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/invalid/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    });

    it("load XML string", (done: MochaDone) => {
        let score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        let xml: string = new XMLSerializer().serializeToString(score);
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        osmd.load(xml).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load XML Document", (done: MochaDone) => {
        let score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1");
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        osmd.load(score).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load invalid XML string", (done: MochaDone) => {
        let xml: string = "<?xml";
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        osmd.load(xml).then(
            (_: {}) => {
                done(new Error("Corrupted XML appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/partwise/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    });

    it("render without loading", (done: MochaDone) => {
        let div: HTMLElement = document.createElement("div");
        let osmd: OSMD = new OSMD(div);
        chai.expect(() => {
            return osmd.render();
        }).to.throw(/load/);
        done();
    });

});
