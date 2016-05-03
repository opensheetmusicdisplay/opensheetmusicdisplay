import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";

declare var fixture: any;

describe("Music Sheet Reader Tests", () => {
    // Initialization
    let path: string = "/test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let reader: MusicSheetReader = new MusicSheetReader();

    before((): void => {
        fixture.setBase("base");
    });

    beforeEach((): void => {
      this.result = fixture.load(path);
    });

    afterEach((): void => {
      fixture.cleanup();
    });

    it("Test Sonatina Op.36 No. 1 - Pt. 1", (done: MochaDone) => {
        let container: Element = document.getElementById("fixture_container");
        let documentElement: IXmlElement = new IXmlElement(container);
        chai.expect(documentElement.elements("score-partwise").length).to.equal(1);
        let root: IXmlElement = documentElement.element("score-partwise");
        chai.expect(root).to.not.be.undefined;
        chai.expect(root.elements("part").length).to.equal(2);
        chai.expect(root.element("part").elements("measure").length).to.equal(38);
        let sheet: MusicSheet = reader.createMusicSheet(root, path);
        chai.expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
        chai.expect(sheet.ComposerString).to.equal("Muzio Clementi");
        //console.log("Sheet Object:", sheet);
        console.log(reader.CompleteNumberOfStaves);
        console.log(sheet.SheetErrors);
        //console.log(container);
        chai.expect(sheet.Instruments.length).to.equal(2);
        chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        chai.expect(sheet.InstrumentalGroups.length).to.equal(2);
        chai.expect(sheet.SourceMeasures.length).to.equal(38);
        done();
    });

});
