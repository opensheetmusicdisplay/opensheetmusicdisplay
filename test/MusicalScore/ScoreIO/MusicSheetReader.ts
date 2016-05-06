import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";

// Fixture has no typings yet, thus declare it as 'any'
declare var fixture: any;

describe("Music Sheet Reader Tests", () => {

    // Initialize variables
    let path: string = "/test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let reader: MusicSheetReader = new MusicSheetReader();
    let root: IXmlElement;
    let sheet: MusicSheet;

    before((): void => {
        fixture.setBase("base");
    });

    // Load the xml files
    beforeEach((): void => {
      fixture.load(path);
      // console.log(this.result[0].length, typeof this.result, typeof this.result[0], this.result[0].substr, this.result[0].getElementById);
      let container: Element = document.getElementById("fixture_container");
      let documentElement: IXmlElement = new IXmlElement(container);
      chai.expect(documentElement.elements("score-partwise").length).to.equal(1);
      root = documentElement.element("score-partwise");
      chai.expect(root).to.not.be.undefined;
      sheet = reader.createMusicSheet(root, path);
    });

    afterEach((): void => {
      fixture.cleanup();
    });

    it("Read title and composer", (done: MochaDone) => {
        chai.expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
        chai.expect(sheet.ComposerString).to.equal("Muzio Clementi");
        done();
    });

    it("Measures", (done: MochaDone) => {
        // chai.expect(root.element("part").elements("measure").length).to.equal(38);
        chai.expect(sheet.SourceMeasures.length).to.equal(38);
        console.log("First Measure: ", sheet.SourceMeasures[0]);
        // console.log("Notes on first Measure: ", sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0]);
        // chai.expect(sheet.)
        done();
    });

    it("Instruments", (done: MochaDone) => {
        // chai.expect(root.elements("part").length).to.equal(2);
        chai.expect(reader.CompleteNumberOfStaves).to.equal(2);
        chai.expect(sheet.Instruments.length).to.equal(2);
        chai.expect(sheet.InstrumentalGroups.length).to.equal(2);
        console.log("SheetErrors: ", sheet.SheetErrors);
        chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        done();
    });

});
