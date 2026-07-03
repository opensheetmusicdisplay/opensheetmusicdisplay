import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import { IOSMDOptions } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { DrawingParametersEnum } from "../../../src/Common/Enums/DrawingParametersEnum";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { Instrument } from "../../../src/MusicalScore/Instrument";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { Staff } from "../../../src/MusicalScore/VoiceData/Staff";
import { Voice } from "../../../src/MusicalScore/VoiceData/Voice";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { AccidentalEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("OpenSheetMusicDisplay Main Export", () => {
    let container1: HTMLElement;

    it("no container", () => {
        expect(() => {
            return new OpenSheetMusicDisplay(undefined);
        }).to.throw(/container/);
    });

    it("container", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        expect(() => {
            return new OpenSheetMusicDisplay(div);
        }).to.not.throw(Error);
    });

    it("multiple instances", () => {
        const musicSheetFragmentContainer: HTMLElement = TestUtils.getDivElement(document);
        const fullMusicSheetContainer: HTMLElement = TestUtils.getDivElement(document);

        const musicSheetFragmentOptions: IOSMDOptions = {
            drawComposer: false,
            drawCredits: false,
            drawFingerings: false,
            drawHiddenNotes: false,
            drawLyricist: false,
            drawPartAbbreviations: false,
            drawPartNames: false,
            drawSubtitle: false,
            drawTitle: false,
            drawUpToMeasureNumber: 1,
            drawingParameters: DrawingParametersEnum.compact
        };
        const fullMusicSheetOptions: IOSMDOptions = {
            drawUpToMeasureNumber: 10
        };

        const musicSheetFragment: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
            musicSheetFragmentContainer,
            musicSheetFragmentOptions
        );
        const fullMusicSheet: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(fullMusicSheetContainer, fullMusicSheetOptions);

        const musicSheet: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");

        return musicSheetFragment.load(musicSheet)
                            .then(() => {
                                musicSheetFragment.render();

                                return fullMusicSheet.load(musicSheet.cloneNode(true));
                            })
                            .then(() => {
                                fullMusicSheet.render();

                                // Verify that the music sheet fragment has its options set correctly.
                                expect(musicSheetFragment.Sheet.Rules.RenderComposer).to.equal(musicSheetFragmentOptions.drawComposer);
                                expect(musicSheetFragment.Sheet.Rules.RenderFingerings).to.equal(musicSheetFragmentOptions.drawFingerings);
                                expect(musicSheetFragment.Sheet.Rules.RenderLyricist).to.equal(musicSheetFragmentOptions.drawLyricist);
                                expect(musicSheetFragment.Sheet.Rules.RenderPartAbbreviations).to.equal(musicSheetFragmentOptions.drawPartAbbreviations);
                                expect(musicSheetFragment.Sheet.Rules.RenderPartNames).to.equal(musicSheetFragmentOptions.drawPartNames);
                                expect(musicSheetFragment.Sheet.Rules.RenderSubtitle).to.equal(musicSheetFragmentOptions.drawSubtitle);
                                expect(musicSheetFragment.Sheet.Rules.RenderTitle).to.equal(musicSheetFragmentOptions.drawTitle);
                                expect(musicSheetFragment.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(musicSheetFragmentOptions.drawUpToMeasureNumber - 1);

                                // Verify that the full music sheet has its options set correctly.
                                expect(fullMusicSheet.Sheet.Rules.RenderComposer).to.not.equal(musicSheetFragmentOptions.drawComposer);
                                expect(fullMusicSheet.Sheet.Rules.RenderFingerings).to.not.equal(musicSheetFragmentOptions.drawFingerings);
                                expect(fullMusicSheet.Sheet.Rules.RenderLyricist).to.not.equal(musicSheetFragmentOptions.drawLyricist);
                                expect(fullMusicSheet.Sheet.Rules.RenderPartAbbreviations).to.not.equal(musicSheetFragmentOptions.drawPartAbbreviations);
                                expect(fullMusicSheet.Sheet.Rules.RenderPartNames).to.not.equal(musicSheetFragmentOptions.drawPartNames);
                                expect(fullMusicSheet.Sheet.Rules.RenderSubtitle).to.not.equal(musicSheetFragmentOptions.drawSubtitle);
                                expect(fullMusicSheet.Sheet.Rules.RenderTitle).to.not.equal(musicSheetFragmentOptions.drawTitle);
                                expect(fullMusicSheet.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(fullMusicSheetOptions.drawUpToMeasureNumber - 1);
                            });
    });

    it("load MXL from string", async () => {
        const mxl: string = TestUtils.getMXL("Mozart_Clarinet_Quintet_Excerpt.mxl");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(mxl);
        opensheetmusicdisplay.render();
    });

    it("load invalid MXL from string", async () => {
        const mxl: string = "\x50\x4b\x03\x04";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        try {
            await opensheetmusicdisplay.load(mxl);
            expect.fail("Corrupted MXL appears to be loaded correctly");
        } catch (exc: unknown) {
            if (!(exc instanceof Error) || !exc.message.toLowerCase().match(/invalid/)) {
                expect.fail("Unexpected error: " + (exc instanceof Error ? exc.message : String(exc)));
            }
        }
    });

    it("load XML string", async () => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const xml: string = '<?xml version="1.0" encoding="UTF-8"?>' + new XMLSerializer().serializeToString(score);
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(xml);
        opensheetmusicdisplay.render();
    });

    it("load XML Document", async () => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
    });

    it.skip("Timeout from server", () => {
        // TODO this test times out from time to time, even with osmd.loadUrlTimeout set to 5000.
        //   the test is unreliable, which makes it hard to test.
        //   also, it's better not to use OSMD to fetch one's score anyways.
        //   also, the timeout adds unnecessary time to the testing suite.
    });

    // MXL URL load via XHR — karma used "base/test/data/..." prefix, but vitest
    // has no web server.  Patch AJAX.ajax to serve local files.
    it("load MXL Document by URL", async () => {
        const mod: any = await import("../../../src/OpenSheetMusicDisplay/AJAX");
        const origAjax: (url: string, timeout?: number) => Promise<string> = mod.AJAX.ajax;
        mod.AJAX.ajax = (url: string): Promise<string> => {
            const urlStr: string = url.toString();
            if (urlStr.startsWith("base/")) {
                const fileName: string = urlStr.replace("base/test/data/", "");
                const mxl: string = TestUtils.getMXL(fileName);
                if (mxl) {
                    return Promise.resolve(mxl);
                }
            }
            return origAjax(url);
        };
        try {
            const url: string = "base/test/data/Mozart_Clarinet_Quintet_Excerpt.mxl";
            const div: HTMLElement = TestUtils.getDivElement(document);
            const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            await opensheetmusicdisplay.load(url);
            opensheetmusicdisplay.render();
        } finally {
            mod.AJAX.ajax = origAjax;
        }
    });

    // skip: this test is unnecessary and creates traffic (to google)
    it.skip("load something invalid by URL", () => { /* no-op */ });

    it("load invalid URL", async () => {
        const url: string = "https://www.afjkhfjkauu2ui3z2uiu.com";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        try {
            await opensheetmusicdisplay.load(url);
            expect.fail("Invalid URL appears to be loaded correctly");
        } catch (exc: unknown) {
            if (!(exc instanceof Error) || !exc.message.toLowerCase().match(/url/)) {
                expect.fail("Unexpected error: " + (exc instanceof Error ? exc.message : String(exc)));
            }
        }
    });

    it("load invalid XML string", async () => {
        const xml: string = "<?xml";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        try {
            await opensheetmusicdisplay.load(xml);
            expect.fail("Corrupted XML appears to be loaded correctly");
        } catch (exc: unknown) {
            if (!(exc instanceof Error) || !exc.message.toLowerCase().match(/partwise/)) {
                expect.fail("Unexpected error: " + (exc instanceof Error ? exc.message : String(exc)));
            }
        }
    });

    it("render without loading", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        expect(() => {
            return opensheetmusicdisplay.render();
        }).to.throw(/load/);
    });

    beforeAll((): void => {
        // Create the container for the "test width" test
        container1 = TestUtils.getDivElement(document);
    });
    afterAll((): void => {
        // Destroy the container for the "test width" test
        document.body.removeChild(container1);
    });

    it("test width 500", async () => {
        const div: HTMLElement = container1;
        div.style.width = "500px";
        // jsdom has no CSS layout engine — offsetWidth always 0.
        // Mock it so render() and assertions work.
        Object.defineProperty(div, "offsetWidth", { get: (): number => parseInt(div.style.width, 10) || 0, configurable: true });
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
        expect(div.offsetWidth).to.equal(500);
    });

    it("test width 200", async () => {
        const div: HTMLElement = container1;
        div.style.width = "200px";
        // jsdom has no CSS layout engine — offsetWidth always 0.
        Object.defineProperty(div, "offsetWidth", { get: (): number => parseInt(div.style.width, 10) || 0, configurable: true });
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
        expect(div.offsetWidth).to.equal(200);
    });

    describe("cursor with hidden instrument", () => {
        let osmd: OpenSheetMusicDisplay;
        beforeEach(() => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document =
                TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            return osmd.load(score)
                .then(() => {
                    osmd.render();
                });
        });

        it("should move cursor after instrument is hidden", () => {
            osmd.Sheet.Instruments[1].Visible = false;
            osmd.render();
            osmd.cursors[0].show();
            for (let i: number = 0; i < 100; i++) {
                osmd.cursors[0].next();
            }
            // After 100 steps in the visible score, cursor reached 3rd note from 17, a C
            expect(osmd.cursors[0].NotesUnderCursor()[0].halfTone).to.equal(60);
        });
    });
    describe("cursor", () => {
        let opensheetmusicdisplay: OpenSheetMusicDisplay;
        beforeEach(async () => {
            const div: HTMLElement = container1;
            opensheetmusicdisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            await opensheetmusicdisplay.load(score);
            opensheetmusicdisplay.render();
            opensheetmusicdisplay.cursors[0].show();
        });

        describe("next() and previous()", () => {
            it("is able to advance past end and beginning of sheet", () => {
                const cursor: Cursor = opensheetmusicdisplay.cursors[0];
                expect(cursor.NotesUnderCursor().length).to.greaterThanOrEqual(1);
                cursor.previous(); // do previous from first timestamp in sheet ("beyond beginning")
                expect(cursor.NotesUnderCursor().length).to.equal(0);
                cursor.next();
                expect(cursor.NotesUnderCursor().length).to.greaterThanOrEqual(1);
                expect(cursor.Iterator.currentTimeStamp.RealValue).to.equal(0);
                // go past end of sheet if repetitions are ignored, which we don't do here (anymore). So, we should not reach the end here.
                for (let i: number = 1; i <= 260; i++) {
                    cursor.next();
                }
                expect(cursor.Iterator.EndReached).to.equal(false);
                // go past end of sheet
                for (let i: number = 1; i <= 260; i++) {
                    cursor.next();
                    // go past end of sheet:
                    //   after ~520 times (260 * 2) in Clementi 36/1/1, the last timestamp is reached
                }
                expect(cursor.Iterator.EndReached).to.equal(true);
                // try to go back again after going beyond end of sheet
                cursor.previous();
                cursor.previous();
                expect(cursor.Iterator.EndReached).to.equal(false);
            });
        });

        describe("iterator.clone()", () => {
            it("clone() advancing does not corrupt the original iterator (#1674)", () => {
                const cursor: Cursor = opensheetmusicdisplay.cursors[0];
                cursor.reset(); // reset to first timestamp / notes in the sheet

                const notesBefore: number = cursor.GNotesUnderCursor().length;
                expect(notesBefore).to.be.greaterThan(0);

                // Clone and advance — the common "peek at next position" pattern.
                // Before the fix, the clone shared currentVoiceEntries with the original,
                // so moveToNext() inside the clone wiped the original's entries.
                const clone: MusicPartManagerIterator = cursor.iterator.clone();
                clone.moveToNextVisibleVoiceEntry(false);

                const notesAfter: number = cursor.GNotesUnderCursor().length;
                expect(notesAfter).to.equal(notesBefore);
                // note that cursor.Iterator.CurrentSourceTimestamp was unaffected by this bug, so we have to check e.g. GNotesUnderCursor or NotesUnderCursor.
            });
        });

        describe("get AllVoicesUnderCursor", () => {
            it("retrieves all voices under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                expect(voiceEntries.length).to.equal(2);
            });
        });

        describe("VoicesUnderCursor", () => {
            it("retrieves voices for a specific instrument under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                expect(voiceEntries.length).to.equal(2);
            });
            it("retrieves all voices under cursor when instrument not specified", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[1];
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor(instrument);
                expect(voiceEntries.length).to.equal(1);
            });
        });

        describe("NotesUnderCursor", () => {
            it("gets notes for a specific instrument under cursor", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[0];
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor(instrument);
                expect(notes.length).to.equal(1);
            });

            it("gets all notes under cursor when instrument unspecified", () => {
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor();
                expect(notes.length).to.equal(2);
            });
        });

        describe("updateGraphic", () => {
            it("updates the graphical sheet with mutations on the music sheet", () => {
                const staff: Staff = opensheetmusicdisplay.Sheet.Staves[0];
                const voice: Voice = staff.Voices[0];
                const voiceEntry: VoiceEntry = voice.VoiceEntries[0];
                const numNotesBefore: number = voiceEntry.Notes.length;

                // Validate current state
                {
                    const graphicalStaffEntry: GraphicalStaffEntry = opensheetmusicdisplay.GraphicSheet.getStaffEntry(0);
                    const graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findVoiceEntryGraphicalNotes(voiceEntry);

                    expect(graphicalNotes.length).to.equal(numNotesBefore);
                }

                const newNote: Note = new Note(
                    voiceEntry,
                    voiceEntry.ParentSourceStaffEntry,
                    new Fraction(1),
                    new Pitch(11, 2, AccidentalEnum.NATURAL),
                    voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure);
                    // note: if the pitch is such that the voice entry frequencies aren't ordered correctly,
                    // Vexflow will complain about unsorted pitches. see below
                voiceEntry.Notes.push(newNote);
                // we could do something like voiceEntry.sort() here to prevent the Vexflow warning about unsorted pitches,
                // but for now sort() only exists on GraphicalVoiceEntry.

                opensheetmusicdisplay.updateGraphic();

                {
                    const graphicalStaffEntry: GraphicalStaffEntry = opensheetmusicdisplay.GraphicSheet.getStaffEntry(0);
                    const graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findVoiceEntryGraphicalNotes(voiceEntry);

                    expect(graphicalNotes.length).to.equal(numNotesBefore + 1);
                }
            });
        });
    });

    describe("cursor with notehead none (invisible notes)", () => {
        let osmd: OpenSheetMusicDisplay;

        beforeEach(async () => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_cursor_skip_notehead_none.musicxml");
            await osmd.load(score);
            osmd.render();
        });

        it("should skip entries where all notes have notehead none when SkipInvisibleNotes is true", () => {
            osmd.cursors[0].SkipInvisibleNotes = true;
            osmd.cursors[0].show();

            // Start at first visible note (C4 in treble clef reads as C4 = 60)
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.equal(0);
            const firstNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(firstNotes.length).to.be.greaterThan(0);
            const firstHalfTone: number = firstNotes[0].halfTone;

            // Move to next - should skip the D4 (notehead none) and go to next visible note
            osmd.cursors[0].next();
            const secondNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(secondNotes.length).to.be.greaterThan(0);
            const secondHalfTone: number = secondNotes[0].halfTone;
            // Second note should be different from first (skipped the invisible note)
            expect(secondHalfTone).to.not.equal(firstHalfTone);

            // Move to next - should skip another notehead none entry and reach the final measure
            osmd.cursors[0].next();
            const thirdNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(thirdNotes.length).to.be.greaterThan(0);
            const thirdHalfTone: number = thirdNotes[0].halfTone;
            // Third note should be different from second
            expect(thirdHalfTone).to.not.equal(secondHalfTone);
        });

        it("should not skip entries with notehead none when SkipInvisibleNotes is false", () => {
            osmd.cursors[0].SkipInvisibleNotes = false;
            osmd.cursors[0].show();

            // Start at first note
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.equal(0);
            const firstNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(firstNotes.length).to.be.greaterThan(0);

            // Move through all 4 notes in measure 1 (including the invisible ones)
            osmd.cursors[0].next();
            const secondNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(secondNotes.length).to.be.greaterThan(0);

            osmd.cursors[0].next();
            const thirdNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(thirdNotes.length).to.be.greaterThan(0);

            osmd.cursors[0].next();
            const fourthNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(fourthNotes.length).to.be.greaterThan(0);

            // One more next should move to measure 2
            osmd.cursors[0].next();
            const fifthNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(fifthNotes.length).to.be.greaterThan(0);

            // Verify we've advanced 5 times total (4 notes in measure 1 + 1 in measure 2)
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.be.greaterThan(0);
        });
    });

});
