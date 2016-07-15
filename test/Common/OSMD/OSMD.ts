import chai = require("chai");
import {OSMD} from "../../../src/OSMD/OSMD";


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

});
