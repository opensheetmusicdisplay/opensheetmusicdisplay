import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {NoteHeadShape} from "../../../src/MusicalScore/VoiceData/Notehead";
import {Note, TremoloInfo} from "../../../src/MusicalScore/VoiceData/Note";
import {VoiceEntry} from "../../../src/MusicalScore/VoiceData/VoiceEntry";

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

    describe("Tremolo between two notes", () => {
        const tremoloBetweenNotesPath: string = "test/data/test_tremolo_between_notes_short.musicxml";
        let tremoloSheet: MusicSheet;

        before((): void => {
            const doc: Document = getSheet(tremoloBetweenNotesPath);
            expect(doc).to.not.be.undefined;
            const tremoloScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            tremoloSheet = reader.createMusicSheet(tremoloScore, tremoloBetweenNotesPath);
        });

        it("links start and stop notes of tremolos between two notes", (done: Mocha.Done) => {
            expect(tremoloSheet).to.not.be.undefined;
            let tremoloCount: number = 0;
            for (const instrument of tremoloSheet.Instruments) {
                for (const voice of instrument.Voices) {
                    let openTremoloStartNote: Note = undefined;
                    for (const voiceEntry of voice.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            const tremoloInfo: TremoloInfo = note.TremoloInfo;
                            expect(tremoloInfo, "every note in the test sample has tremolo info").to.not.be.undefined;
                            expect(tremoloInfo.tremoloBetweenNotes, "start and stop notes are linked").to.not.be.undefined;
                            expect(tremoloInfo.tremoloBetweenNotes.strokes).to.equal(3);
                            if (tremoloInfo.tremoloBetweenNotesStart) {
                                expect(tremoloInfo.tremoloBetweenNotes.startNote).to.equal(note);
                                openTremoloStartNote = note;
                            } else {
                                expect(tremoloInfo.tremoloBetweenNotesStop, "note is start or stop note").to.be.true;
                                expect(tremoloInfo.tremoloBetweenNotes.stopNote).to.equal(note);
                                expect(tremoloInfo.tremoloBetweenNotes.startNote,
                                       "stop note is linked to the previous start note in the same voice").to.equal(openTremoloStartNote);
                                // start and stop note share the same TremoloBetweenNotes object:
                                expect(openTremoloStartNote.TremoloInfo.tremoloBetweenNotes).to.equal(tremoloInfo.tremoloBetweenNotes);
                                tremoloCount++;
                            }
                        }
                    }
                }
            }
            expect(tremoloCount, "the test sample has 4 tremolos between two notes").to.equal(4);
            done();
        });

        it("does not add single note tremolo strokes for tremolos between two notes", (done: Mocha.Done) => {
            for (const instrument of tremoloSheet.Instruments) {
                for (const voice of instrument.Voices) {
                    for (const voiceEntry of voice.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            // tremoloStrokes is set (for drawing the strokes between the notes),
                            //   but the notes shouldn't be treated as single note tremolos:
                            expect(note.TremoloInfo.tremoloStrokes).to.equal(3);
                            expect(note.TremoloInfo.tremoloUnmeasured).to.be.undefined;
                        }
                    }
                }
            }
            done();
        });
    });

    describe("Tremolo without type attribute", () => {
        it("reads a tremolo without type attribute as single note tremolo (MusicXML default)", (done: Mocha.Done) => {
            const noTypePath: string = "test/data/test_tremolo_no_type_attribute.musicxml";
            const doc: Document = getSheet(noTypePath);
            expect(doc).to.not.be.undefined;
            const noTypeScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            const noTypeSheet: MusicSheet = reader.createMusicSheet(noTypeScore, noTypePath);

            const voiceEntries: VoiceEntry[] = noTypeSheet.Instruments[0].Voices[0].VoiceEntries;
            const noTypeNote: Note = voiceEntries[0].Notes[0]; // <tremolo>3</tremolo> (no type attribute)
            const singleTypeNote: Note = voiceEntries[1].Notes[0]; // <tremolo type="single">3</tremolo>
            expect(noTypeNote.TremoloInfo.tremoloStrokes, "tremolo without type attribute defaults to single").to.equal(3);
            expect(noTypeNote.TremoloInfo.tremoloUnmeasured).to.be.undefined;
            expect(noTypeNote.TremoloInfo.tremoloBetweenNotesStart).to.be.undefined;
            expect(noTypeNote.TremoloInfo.tremoloBetweenNotesStop).to.be.undefined;
            expect(noTypeNote.TremoloInfo.tremoloStrokes).to.equal(singleTypeNote.TremoloInfo.tremoloStrokes);
            done();
        });
    });

    describe("Enharmonic ties", () => {
        const enharmonicTiePath: string = "test/data/test_tie_enharmonic_spelling_1694.musicxml";
        let enharmonicTieSheet: MusicSheet;
        let tiedNotes: Note[];

        before((): void => {
            const doc: Document = getSheet(enharmonicTiePath);
            expect(doc).to.not.be.undefined;
            const enharmonicTieScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            enharmonicTieSheet = reader.createMusicSheet(enharmonicTieScore, enharmonicTiePath);
            tiedNotes = enharmonicTieSheet.Instruments[0].Voices[0].VoiceEntries
                .flatMap((voiceEntry: VoiceEntry): Note[] => voiceEntry.Notes)
                .filter((note: Note): boolean => !note.isRest());
        });

        it("links tie notes with enharmonic spellings", (done: Mocha.Done) => {
            expect(tiedNotes.length).to.equal(2);
            expect(tiedNotes[0].Pitch.getHalfTone()).to.equal(tiedNotes[1].Pitch.getHalfTone());
            expect(tiedNotes[0].Pitch.FundamentalNote).to.not.equal(tiedNotes[1].Pitch.FundamentalNote);
            expect(tiedNotes[0].NoteTie).to.not.be.undefined;
            expect(tiedNotes[1].NoteTie).to.equal(tiedNotes[0].NoteTie);
            expect(tiedNotes[0].NoteTie.Notes).to.deep.equal(tiedNotes);
            expect(Object.keys(enharmonicTieSheet.Staves[0].openTieDict)).to.be.empty;
            done();
        });
    });
});
