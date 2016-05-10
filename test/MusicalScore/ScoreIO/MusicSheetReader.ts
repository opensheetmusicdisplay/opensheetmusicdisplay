import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";

describe("Music Sheet Reader Tests", () => {
    // Initialize variables
    let path: string = "/test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    let reader: MusicSheetReader = new MusicSheetReader();
    let score: IXmlElement;
    let sheet: MusicSheet;

    function getSheet(filename: string): Document {
      return ((window as any).__xml__)[filename];
    }

    before((): void => {
        let parser: DOMParser = new DOMParser();
        let dict: { [filename: string]: any; } = (window as any).__xml__;
        for (let filename in dict) {
          if (dict.hasOwnProperty(filename)) {
            dict[filename] = parser.parseFromString(dict[filename], "text/xml");
          }
        }
        // Load the xml file
        let doc: Document = getSheet("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        chai.expect(doc).to.not.be.undefined;
        score = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        // chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
    });

    beforeEach((): void => {
      // ???
    });

    afterEach((): void => {
      // cleanup?
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
        console.log("Sheet", sheet);
        chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        done();
    });

});
