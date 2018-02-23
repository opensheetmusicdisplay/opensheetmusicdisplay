import chai = require("chai");
import {OSMD} from "../../../src/OSMD/OSMD";
import {TestUtils} from "../../Util/TestUtils";


describe("OSMD Main Export", () => {
    let container1: HTMLElement;

    it("no container", (done: MochaDone) => {
        chai.expect(() => {
            return new OSMD(undefined);
        }).to.throw(/container/);
        done();
    });

    it("container", (done: MochaDone) => {
        const div: HTMLElement = document.createElement("div");
        chai.expect(() => {
            return new OSMD(div);
        }).to.not.throw(Error);
        done();
    });

    it("load MXL from string", (done: MochaDone) => {
        const mxl: string = TestUtils.getMXL("MozartTrio.mxl");
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        osmd.load(mxl).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load invalid MXL from string", (done: MochaDone) => {
        const mxl: string = "\x50\x4b\x03\x04";
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
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
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const xml: string = new XMLSerializer().serializeToString(score);
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        osmd.load(xml).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load XML Document", (done: MochaDone) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        osmd.load(score).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load MXL Document by URL", (done: MochaDone) => {
        const url: string = "base/test/data/MozartTrio.mxl";
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        osmd.load(url).then(
            (_: {}) => {
                osmd.render();
                done();
            },
            done
        );
    });

    it("load MXL Document by invalid URL", (done: MochaDone) => {
        const url: string = "https://www.google.com";
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        osmd.load(url).then(
            (_: {}) => {
                done(new Error("Invalid URL appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/url/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    }).timeout(5000);

    it("load invalid XML string", (done: MochaDone) => {
        const xml: string = "<?xml";
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
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
        const div: HTMLElement = document.createElement("div");
        const osmd: OSMD = new OSMD(div);
        chai.expect(() => {
            return osmd.render();
        }).to.throw(/load/);
        done();
    });

    before((): void => {
        // Create the container for the "test width" test
        container1 = document.createElement("div");
        document.body.appendChild(container1);
    });
    after((): void => {
        // Destroy the container for the "test width" test
        document.body.removeChild(container1);
    });

    it("test width 500", (done: MochaDone) => {
        const div: HTMLElement = container1;
        div.style.width = "500px";
        const osmd: OSMD = new OSMD(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        osmd.load(score).then(
            (_: {}) => {
                osmd.render();
                chai.expect(div.offsetWidth).to.equal(500);
                done();
            },
            done
        ).catch(done);
    });

    it("test width 200", (done: MochaDone) => {
        const div: HTMLElement = container1;
        div.style.width = "200px";
        const osmd: OSMD = new OSMD(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        osmd.load(score).then(
            (_: {}) => {
                osmd.render();
                chai.expect(div.offsetWidth).to.equal(200);
                done();
            },
            done
        ).catch(done);
    });
});
