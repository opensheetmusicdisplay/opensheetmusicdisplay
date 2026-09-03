import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {NoteHeadShape} from "../../../src/MusicalScore/VoiceData/Notehead";
import {Note, TremoloInfo} from "../../../src/MusicalScore/VoiceData/Note";
import {VoiceEntry} from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import {SourceMeasure} from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import {NoteEnum} from "../../../src/Common/DataObjects/Pitch";

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

    describe("Tuplet note duration with un-reduced <duration> (musx2mxl export bug)", () => {
        // Some exporters (musx2mxl 0.2.9) write the *un-reduced* type duration for tuplet notes:
        //   a triplet eighth carries <duration> equal to a full eighth (e.g. 8 at divisions=16)
        //   instead of a third of a quarter. OSMD used to take <duration> verbatim, so the triplet
        //   played/spaced as three normal eighths and the measure overflowed. The reader now detects
        //   this and applies the time-modification ratio, so the triplet eighths sound as 1/12 each.
        // The two samples encode the *same* music (a 3-eighth triplet + two eighths after a half rest):
        //   the musx2mxl one un-reduced, the MuseScore re-export correctly reduced. Both must now read
        //   identically. In the MuseScore extract the triplet is measure 1; in the musx2mxl file it is
        //   measure 7.
        const oneTwelfth: number = 1 / 12;
        const oneEighth: number = 1 / 8;

        function measureNonRestNotes(measure: SourceMeasure): Note[] {
            const notes: Note[] = [];
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    for (const voiceEntry of staffEntry.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            if (!note.isRest()) {
                                notes.push(note);
                            }
                        }
                    }
                }
            }
            return notes;
        }

        function readSheet(filename: string): MusicSheet {
            const doc: Document = getSheet("test/data/" + filename);
            expect(doc, filename + " should be preprocessed by karma").to.not.be.undefined;
            const fileScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            return reader.createMusicSheet(fileScore, "test/data/" + filename);
        }

        function expectTripletThenTwoEighths(notes: Note[], label: string): void {
            expect(notes.length, label + ": 3 triplet eighths + 2 eighths").to.equal(5);
            // the three triplet eighths must each be a third of a quarter (1/12), not a full eighth
            for (let i: number = 0; i < 3; i++) {
                expect(notes[i].Length.RealValue, `${label}: triplet note ${i} is 1/12`).to.be.closeTo(oneTwelfth, 1e-8);
                expect(notes[i].NoteTuplet, `${label}: triplet note ${i} belongs to a tuplet`).to.not.be.undefined;
            }
            // the two following eighths are unaffected and clearly longer than a triplet eighth
            expect(notes[3].Length.RealValue, `${label}: first plain eighth is 1/8`).to.be.closeTo(oneEighth, 1e-8);
            expect(notes[4].Length.RealValue, `${label}: second plain eighth is 1/8`).to.be.closeTo(oneEighth, 1e-8);
        }

        it("reads the un-reduced musx2mxl triplet (measure 7) as three 1/12 notes, not three eighths", (done: Mocha.Done) => {
            const sheet7: MusicSheet = readSheet("test_triplet_playback_musx2mxl_encoded.musicxml");
            const measure7: SourceMeasure = sheet7.SourceMeasures[6];
            const notes: Note[] = measureNonRestNotes(measure7);
            expectTripletThenTwoEighths(notes, "musx2mxl measure 7");
            // the whole 4/4 measure adds up to 1 again (previously it overflowed to 9/8)
            const measureSum: number =
                measureNonRestNotes(measure7).reduce((sum: number, n: Note) => sum + n.Length.RealValue, 0.5); // + half rest
            expect(measureSum, "measure 7 sums to a full 4/4 bar").to.be.closeTo(1, 1e-8);
            done();
        });

        it("reads the correctly-reduced MuseScore re-export (measure 1) identically (regression guard)", (done: Mocha.Done) => {
            const sheet1: MusicSheet = readSheet("test_triplet_playback_musescore_encoded_from_musx2mxl_encoded.musicxml");
            const notes: Note[] = measureNonRestNotes(sheet1.SourceMeasures[0]);
            expectTripletThenTwoEighths(notes, "MuseScore measure 1");
            done();
        });
    });

    describe("Non-contiguous ties into chords", () => {
        const tiePath: string = "test/data/test_tie_noncontiguous_chord.musicxml";
        let tieSheet: MusicSheet;

        before((): void => {
            const doc: Document = getSheet(tiePath);
            expect(doc).to.not.be.undefined;
            const tieScore: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            tieSheet = reader.createMusicSheet(tieScore, tiePath);
        });

        it("links explicit stops after intervening notes and does not infer a missing stop", (): void => {
            const notesByMeasure: Note[][] = tieSheet.Instruments[0].Voices[0].VoiceEntries.reduce(
                (measures: Note[][], voiceEntry: VoiceEntry): Note[][] => {
                    const measureIndex: number = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure
                        .MeasureNumber - 1;
                    measures[measureIndex] ??= [];
                    measures[measureIndex].push(...voiceEntry.Notes.filter((note: Note): boolean => !note.isRest()));
                    return measures;
                },
                [],
            );
            const firstMeasureDNotes: Note[] = notesByMeasure[0].filter(
                (note: Note): boolean => note.Pitch.FundamentalNote === NoteEnum.D,
            );
            const secondMeasureDNotes: Note[] = notesByMeasure[1].filter(
                (note: Note): boolean => note.Pitch.FundamentalNote === NoteEnum.D,
            );

            expect(firstMeasureDNotes).to.have.length(2);
            expect(firstMeasureDNotes[0].NoteTie).to.not.be.undefined;
            expect(firstMeasureDNotes[1].NoteTie).to.equal(firstMeasureDNotes[0].NoteTie);
            expect(firstMeasureDNotes[0].NoteTie.Notes).to.deep.equal(firstMeasureDNotes);

            expect(secondMeasureDNotes).to.have.length(2);
            expect(secondMeasureDNotes[0].NoteTie).to.not.be.undefined;
            expect(secondMeasureDNotes[0].NoteTie.Notes).to.deep.equal([secondMeasureDNotes[0]]);
            expect(secondMeasureDNotes[1].NoteTie).to.be.undefined;
        });
    });
});
