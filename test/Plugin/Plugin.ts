import chai = require("chai");
import spies = require("chai-spies");
chai.use(spies);

import {MusicSheetReader} from "../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../src/MusicalScore/MusicSheet";
import {MusicSheetAPI} from "../../src/MusicSheetAPI";
import {IXmlElement} from "../../src/Common/FileIO/Xml";
import { MockPlugin } from "./";


describe("OSMD Plugin infrastructure", () => {
    // Initialize variables
    let path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let reader: MusicSheetReader = new MusicSheetReader();
    let score: IXmlElement;
    let sheet: MusicSheet;
    let osmd: MusicSheetAPI;

    function getSheet(filename: string): Document {
      return ((window as any).__xml__)[filename];
    }

    before((): void => {
        // Load the xml file
        let doc: Document = getSheet(path);
        chai.expect(doc).to.not.be.undefined;
        score = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        // chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
    });

    beforeEach((): void => {
        this.osmd = new MusicSheetAPI();
    });

    afterEach((): void => {
        this.osmd = undefined;
    });

    it("registers a plugin", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        this.osmd.registerPlugin(plugin);
        done();
    });

    it("unregisters a plugin", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        this.osmd.registerPlugin(plugin);
        this.osmd.unregisterPlugin(plugin);
        done();
    });

    it("triggers on sheet loaded", (done: MochaDone) => {
        let plugin: MockPlugin = new MockPlugin();
        this.osmd.registerPlugin(plugin);
        this.osmd.load(this.score);
        chai.expect(plugin.onSheetLoadedSpy).to.have.been.called.once();
        done();
    });
});
