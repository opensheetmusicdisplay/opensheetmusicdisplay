import chai = require("chai");
import spies = require("chai-spies");
chai.use(spies);

import { MusicSheetAPI } from "../../src/MusicSheetAPI";
import { MockPlugin } from "./";


describe("OSMD plugin infrastructure", () => {
    let path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let doc: Document;
    let osmd: MusicSheetAPI;

    function getSheet(filename: string): Document {
      return ((window as any).__xml__)[filename];
    }

    before((done): void => {
        doc = getSheet(path);
        chai.expect(doc).to.not.be.undefined;
        done();
    });

    beforeEach((done): void => {
        osmd = new MusicSheetAPI();
        done();
    });

    afterEach((done): void => {
        osmd = undefined;
        done();
    });

    /*
     * Tests for PluginHost infrastructure and MusicSheetAPI implementation.
     */

    it("registers a plugin", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        done();
    });

    it("unregisters a plugin", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        osmd.unregisterPlugin(plugin);
        osmd.registerPlugin(plugin);
        done();
    });

    it("denies registering the same plugin twice", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        chai.expect(() => osmd.registerPlugin(plugin)).to.throw(/already registered/);
        done();
    });

    /*
     * Tests for IEventSource events.
     */

    /*
     * IEventSource.OnSheetLoaded
     */
    it("triggers on sheet loaded", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        osmd.load(doc);
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.once();
        done();
    });

    it("triggers on sheet reload", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        osmd.load(doc);
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.once();
        osmd.load(doc);
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.twice();
        done();
    });
});
