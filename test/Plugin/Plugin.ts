import * as chai from "chai";
import * as spies from "chai-spies";
chai.use(spies);
import { OSMD } from "../../src/OSMD/OSMD";
import { MockPlugin } from "./";

/* tslint:disable:no-unused-expression */
describe("OSMD plugin infrastructure", () => {
    let path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let doc: Document;
    let osmd: OSMD;

    function getSheet(filename: string): Document {
      return ((window as any).__xml__)[filename];
    }

    before((done): void => {
        doc = getSheet(path);
        chai.expect(doc).to.not.be.undefined;
        done();
    });

    beforeEach((done): void => {
        osmd = new OSMD(document.documentElement);
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
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.once;
        done();
    });

    it("triggers on sheet reload", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        osmd.registerPlugin(plugin);
        osmd.load(doc);
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.once;
        osmd.load(doc);
        chai.expect(plugin.OnSheetLoadedSpy).to.have.been.called.twice;
        done();
    });
});
