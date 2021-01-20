/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";

describe("Music Sheet Reader", () => {
    const path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
    const reader: MusicSheetReader = new MusicSheetReader();
    let score: IXmlElement;
    let sheet: MusicSheet;

    function getSheet(filename: string): Document {
      return ((window as any).__xml__)[filename];
    }

    before((): void => {
        // Load the xml file
        const doc: Document = getSheet(path);
        chai.expect(doc).to.not.be.undefined;
        score = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        // chai.expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
    });

    it("checks XML", (done: Mocha.Done) => {
      done(); // TODO implement test
    });

    it("reads title and composer", (done: Mocha.Done) => {
        chai.expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
        chai.expect(sheet.ComposerString).to.equal("Muzio Clementi");
        done();
    });

    it("reads measures", (done: Mocha.Done) => {
        chai.expect(sheet.SourceMeasures.length).to.equal(38);
        done();
    });

    it("reads instruments", (done: Mocha.Done) => {
        chai.expect(reader.CompleteNumberOfStaves).to.equal(2);
        chai.expect(sheet.Instruments.length).to.equal(2);
        chai.expect(sheet.InstrumentalGroups.length).to.equal(2);
        chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        done();
    });

    it("reads notes", (done: Mocha.Done) => {
        // TODO implement test
        // Staff Entries on first measure
        // chai.expect(sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries.length).to.equal(4);
        done();
    });
});
