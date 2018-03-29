import chai = require("chai");
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {TestUtils} from "../../Util/TestUtils";


describe("OpenSheetMusicDisplay Main Export", () => {
    let container1: HTMLElement;

    it("no container", (done: MochaDone) => {
        chai.expect(() => {
            return new OpenSheetMusicDisplay(undefined);
        }).to.throw(/container/);
        done();
    });

    it("container", (done: MochaDone) => {
        const div: HTMLElement = document.createElement("div");
        chai.expect(() => {
            return new OpenSheetMusicDisplay(div);
        }).to.not.throw(Error);
        done();
    });

    it("load MXL from string", (done: MochaDone) => {
        const mxl: string = TestUtils.getMXL("MozartTrio.mxl");
        const div: HTMLElement = document.createElement("div");
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(mxl).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load invalid MXL from string", (done: MochaDone) => {
        const mxl: string = "\x50\x4b\x03\x04";
        const div: HTMLElement = document.createElement("div");
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(mxl).then(
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
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(xml).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load XML Document", (done: MochaDone) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const div: HTMLElement = document.createElement("div");
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load MXL Document by URL", (done: MochaDone) => {
        const url: string = "base/test/data/MozartTrio.mxl";
        const div: HTMLElement = document.createElement("div");
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(url).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load MXL Document by invalid URL", (done: MochaDone) => {
        const url: string = "https://www.google.com";
        const div: HTMLElement = document.createElement("div");
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(url).then(
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
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(xml).then(
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
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        chai.expect(() => {
            return opensheetmusicdisplay.render();
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
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                chai.expect(div.offsetWidth).to.equal(500);
                done();
            },
            done
        ).catch(done);
    });

    it("test width 200", (done: MochaDone) => {
        const div: HTMLElement = container1;
        div.style.width = "200px";
        const opensheetmusicdisplay: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                chai.expect(div.offsetWidth).to.equal(200);
                done();
            },
            done
        ).catch(done);
    });
});
