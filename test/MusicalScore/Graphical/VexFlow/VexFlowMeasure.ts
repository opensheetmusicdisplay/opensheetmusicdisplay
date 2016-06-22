import {MusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {SourceMeasure} from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import {StaffMeasure} from "../../../../src/MusicalScore/Graphical/StaffMeasure";


describe("VexFlow Measure Test", () => {
    //it("Read title and composer", (done: MochaDone) => {
    //    chai.expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
    //    chai.expect(sheet.ComposerString).to.equal("Muzio Clementi");
    //    done();
    //});
    //
    //it("Measures", (done: MochaDone) => {
    //    chai.expect(sheet.SourceMeasures.length).to.equal(38);
    //    console.log("First Measure: ", sheet.SourceMeasures[0]);
    //    done();
    //});
    //
    //it("Instruments", (done: MochaDone) => {
    //    chai.expect(reader.CompleteNumberOfStaves).to.equal(2);
    //    chai.expect(sheet.Instruments.length).to.equal(2);
    //    chai.expect(sheet.InstrumentalGroups.length).to.equal(2);
    //    chai.expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
    //    chai.expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
    //    done();
    //});
    //
    //it("Notes", (done: MochaDone) => {
    //    // Staff Entries on first measure
    //
    //    // chai.expect(sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries.length).to.equal(4);
    //    done();
    //});

    it("Full Music Sheet Reading", (done: MochaDone) => {
        //let factory: IGraphicalSymbolFactory = new VexFlowGraphicalSymbolFactory();
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let path: string = "test/data/MuzioClementi_SonatinaOpus36No1_Part1.xml";
        let doc: Document = ((window as any).__xml__)[path];
        chai.expect(doc).to.not.be.undefined;
        let score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        let reader: MusicSheetReader = new MusicSheetReader();
        let sheet: MusicSheet = reader.createMusicSheet(score, path);
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        console.log(gms);
        done();
    });

    it("Simple Measure", (done: MochaDone) => {
        let sheet: MusicSheet = new MusicSheet();
        let measure: SourceMeasure = new SourceMeasure(1);
        sheet.addMeasure(measure);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        chai.expect(gms.MeasureList.length).to.equal(1);
        chai.expect(gms.MeasureList[0].length).to.equal(1);
        let gm: StaffMeasure = gms.MeasureList[0][0];
        console.log(gm);
        done();
    });

    it("Empty Measure", (done: MochaDone) => {
        let sheet: MusicSheet = new MusicSheet();
        let measure: SourceMeasure = new SourceMeasure(1);
        sheet.addMeasure(measure);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        chai.expect(gms.MeasureList.length).to.equal(1);
        chai.expect(gms.MeasureList[0].length).to.equal(0);
        done();
    });
});
