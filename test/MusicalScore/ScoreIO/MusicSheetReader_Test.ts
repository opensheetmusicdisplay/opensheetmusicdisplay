import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {NoteHeadShape} from "../../../src/MusicalScore/VoiceData/Notehead";

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
        expect(doc).to.not.be.undefined;
        score = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        // expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, path);
    });

    it("checks XML", (done: Mocha.Done) => {
      done(); // TODO implement test
    });

    it("reads title and composer", (done: Mocha.Done) => {
        expect(sheet.TitleString).to.equal("Sonatina Op.36 No 1 Teil 1 Allegro");
        expect(sheet.ComposerString).to.equal("Muzio Clementi");
        done();
    });

    it("reads measures", (done: Mocha.Done) => {
        expect(sheet.SourceMeasures.length).to.equal(38);
        done();
    });

    it("reads instruments", (done: Mocha.Done) => {
        expect(reader.CompleteNumberOfStaves).to.equal(2);
        expect(sheet.Instruments.length).to.equal(2);
        expect(sheet.InstrumentalGroups.length).to.equal(2);
        expect(sheet.Instruments[0].Name).to.equal("Piano (right)");
        expect(sheet.Instruments[1].Name).to.equal("Piano (left)");
        done();
    });

    it("reads notes", (done: Mocha.Done) => {
        // TODO implement test
        // Staff Entries on first measure
        // expect(sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries.length).to.equal(4);
        done();
    });

    describe("Notehead None (Hidden Notes)", () => {
        const noneNoteheadPath: string = "test/data/test_notehead_none_hidden.musicxml";
        let noneNoteheadSheet: MusicSheet;

        before((): void => {
            const doc: Document = getSheet(noneNoteheadPath);
            expect(doc).to.not.be.undefined;
            const noneScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            noneNoteheadSheet = reader.createMusicSheet(noneScore, noneNoteheadPath);
        });

        it("loads file with notehead='none' without errors", (done: Mocha.Done) => {
            expect(noneNoteheadSheet).to.not.be.undefined;
            expect(noneNoteheadSheet.SourceMeasures.length).to.be.greaterThan(0);
            done();
        });

        it("correctly parses notehead='none' as NoteHeadShape.NONE", (done: Mocha.Done) => {
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstMeasure = noneNoteheadSheet.SourceMeasures[0];
            expect(firstMeasure).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const firstContainer = firstMeasure.VerticalSourceStaffEntryContainers[0];
            expect(firstContainer).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const firstStaffEntry = firstContainer.StaffEntries[0];
            expect(firstStaffEntry).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const firstVoiceEntry = firstStaffEntry.VoiceEntries[0];
            expect(firstVoiceEntry).to.not.be.undefined;
            expect(firstVoiceEntry.Notes.length).to.be.greaterThan(0);

            // eslint-disable-next-line @typescript-eslint/typedef
            const firstNote = firstVoiceEntry.Notes[0];
            expect(firstNote.Notehead).to.not.be.undefined;
            expect(firstNote.Notehead.Shape).to.equal(NoteHeadShape.NONE);
            done();
        });

        it("hidden notes (notehead='none') should not have PrintObject set to false by default", (done: Mocha.Done) => {
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstMeasure = noneNoteheadSheet.SourceMeasures[0];
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstContainer = firstMeasure.VerticalSourceStaffEntryContainers[0];
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstStaffEntry = firstContainer.StaffEntries[0];
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstVoiceEntry = firstStaffEntry.VoiceEntries[0];
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstNote = firstVoiceEntry.Notes[0];

            // PrintObject should be true (default), but the note is hidden via notehead='none'
            expect(firstNote.PrintObject).to.be.true;
            done();
        });

        it("visible notes (normal notehead) in same measure should remain visible", (done: Mocha.Done) => {
            // eslint-disable-next-line @typescript-eslint/typedef
            const firstMeasure = noneNoteheadSheet.SourceMeasures[0];
            // eslint-disable-next-line @typescript-eslint/typedef
            const secondContainer = firstMeasure.VerticalSourceStaffEntryContainers[1];
            expect(secondContainer).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const staffEntry = secondContainer.StaffEntries[0];
            expect(staffEntry).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const voiceEntry = staffEntry.VoiceEntries[0];
            expect(voiceEntry).to.not.be.undefined;

            // eslint-disable-next-line @typescript-eslint/typedef
            const note = voiceEntry.Notes[0];
            // This note should have no notehead property or a normal notehead
            if (note.Notehead) {
                expect(note.Notehead.Shape).to.not.equal(NoteHeadShape.NONE);
            }
            done();
        });
    });
});
