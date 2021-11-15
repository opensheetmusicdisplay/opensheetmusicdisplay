import * as chai from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import { VoiceEntry, Instrument, Note, Staff, Voice, GraphicalStaffEntry, GraphicalNote,
            Fraction, Pitch, AccidentalEnum, DrawingParametersEnum, IOSMDOptions } from "../../../src";

describe("OpenSheetMusicDisplay Main Export", () => {
    let container1: HTMLElement;

    it("no container", (done: Mocha.Done) => {
        chai.expect(() => {
            return new OpenSheetMusicDisplay(undefined);
        }).to.throw(/container/);
        done();
    });

    it("container", (done: Mocha.Done) => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        chai.expect(() => {
            return new OpenSheetMusicDisplay(div);
        }).to.not.throw(Error);
        done();
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
        const musicSheetXML: string = new XMLSerializer().serializeToString(musicSheet);

        return musicSheetFragment.load(musicSheetXML)
                            .then(() => {
                                musicSheetFragment.render();

                                return fullMusicSheet.load(musicSheetXML);
                            })
                            .then(() => {
                                fullMusicSheet.render();

                                // Verify that the music sheet fragment has its options set correctly.
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderComposer).to.equal(musicSheetFragmentOptions.drawComposer);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderFingerings).to.equal(musicSheetFragmentOptions.drawFingerings);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderLyricist).to.equal(musicSheetFragmentOptions.drawLyricist);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderPartAbbreviations).to.equal(musicSheetFragmentOptions.drawPartAbbreviations);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderPartNames).to.equal(musicSheetFragmentOptions.drawPartNames);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderSubtitle).to.equal(musicSheetFragmentOptions.drawSubtitle);
                                chai.expect(musicSheetFragment.Sheet.Rules.RenderTitle).to.equal(musicSheetFragmentOptions.drawTitle);
                                chai.expect(musicSheetFragment.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(musicSheetFragmentOptions.drawUpToMeasureNumber - 1);

                                // Verify that the full music sheet has its options set correctly.
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderComposer).to.not.equal(musicSheetFragmentOptions.drawComposer);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderFingerings).to.not.equal(musicSheetFragmentOptions.drawFingerings);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderLyricist).to.not.equal(musicSheetFragmentOptions.drawLyricist);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderPartAbbreviations).to.not.equal(musicSheetFragmentOptions.drawPartAbbreviations);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderPartNames).to.not.equal(musicSheetFragmentOptions.drawPartNames);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderSubtitle).to.not.equal(musicSheetFragmentOptions.drawSubtitle);
                                chai.expect(fullMusicSheet.Sheet.Rules.RenderTitle).to.not.equal(musicSheetFragmentOptions.drawTitle);
                                chai.expect(fullMusicSheet.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(fullMusicSheetOptions.drawUpToMeasureNumber - 1);
                            });
    });

    it("load MXL from string", (done: Mocha.Done) => {
        const mxl: string = TestUtils.getMXL("Mozart_Clarinet_Quintet_Excerpt.mxl");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(mxl).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load invalid MXL from string", (done: Mocha.Done) => {
        const mxl: string = "\x50\x4b\x03\x04";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(mxl).then(
            (_: {}) => {
                done(new Error("Corrupted MXL appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/invalid/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    });

    it("load XML string", (done: Mocha.Done) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const xml: string = new XMLSerializer().serializeToString(score);
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(xml).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load XML Document", (done: Mocha.Done) => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it.skip("Timeout from server", (done: Mocha.Done) => {
        // TODO this test times out from time to time, even with osmd.loadUrlTimeout set to 5000.
        //   the test is unreliable, which makes it hard to test.
        //   also, it's better not to use OSMD to fetch one's score anyways.
        //   also, the timeout adds unnecessary time to the testing suite.
        const score: string = "https://httpstat.us/408";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                done(new Error("Unexpected response from server"));
            },
            (exc: Error) => {
                done();
            }
        );
    });

    it("load MXL Document by URL", (done: Mocha.Done) => {
        const url: string = "base/test/data/Mozart_Clarinet_Quintet_Excerpt.mxl";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(url).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                done();
            },
            done
        );
    });

    it("load something invalid by URL", (done: Mocha.Done) => {
        const url: string = "https://www.google.com";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(url).then(
            (_: {}) => {
                done(new Error("Invalid URL appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/opensheetmusicdisplay.*invalid/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    }).timeout(5000);

    it("load invalid URL", (done: Mocha.Done) => {
        const url: string = "https://www.afjkhfjkauu2ui3z2uiu.com";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(url).then(
            (_: {}) => {
                done(new Error("Invalid URL appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/url/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    }).timeout(5000);

    it("load invalid XML string", (done: Mocha.Done) => {
        const xml: string = "<?xml";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        opensheetmusicdisplay.load(xml).then(
            (_: {}) => {
                done(new Error("Corrupted XML appears to be loaded correctly"));
            },
            (exc: Error) => {
                if (exc.message.toLowerCase().match(/partwise/)) {
                    done();
                } else {
                    done(new Error("Unexpected error: " + exc.message));
                }
            }
        );
    });

    it("render without loading", (done: Mocha.Done) => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        chai.expect(() => {
            return opensheetmusicdisplay.render();
        }).to.throw(/load/);
        done();
    });

    before((): void => {
        // Create the container for the "test width" test
        container1 = TestUtils.getDivElement(document);
    });
    after((): void => {
        // Destroy the container for the "test width" test
        document.body.removeChild(container1);
    });

    it("test width 500", (done: Mocha.Done) => {
        const div: HTMLElement = container1;
        div.style.width = "500px";
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                chai.expect(div.offsetWidth).to.equal(500);
                done();
            },
            done
        ).catch(done);
    });

    it("test width 200", (done: Mocha.Done) => {
        const div: HTMLElement = container1;
        div.style.width = "200px";
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        opensheetmusicdisplay.load(score).then(
            (_: {}) => {
                opensheetmusicdisplay.render();
                chai.expect(div.offsetWidth).to.equal(200);
                done();
            },
            done
        ).catch(done);
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
            chai.expect(osmd.cursors[0].NotesUnderCursor()[0].halfTone).to.equal(60);
        });
    });
    describe("cursor", () => {
        let opensheetmusicdisplay: OpenSheetMusicDisplay;
        beforeEach((done: Mocha.Done) => {
            const div: HTMLElement = container1;
            opensheetmusicdisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            opensheetmusicdisplay.load(score).then(
                (_: {}) => {
                    opensheetmusicdisplay.render();
                    opensheetmusicdisplay.cursors[0].show();
                    done();
                },
                done
            ).catch(done);
        });

        describe("get AllVoicesUnderCursor", () => {
            it("retrieves all voices under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                chai.expect(voiceEntries.length).to.equal(2);
            });
        });

        describe("VoicesUnderCursor", () => {
            it("retrieves voices for a specific instrument under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                chai.expect(voiceEntries.length).to.equal(2);
            });
            it("retrieves all voices under cursor when instrument not specified", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[1];
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor(instrument);
                chai.expect(voiceEntries.length).to.equal(1);
            });
        });

        describe("NotesUnderCursor", () => {
            it("gets notes for a specific instrument under cursor", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[0];
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor(instrument);
                chai.expect(notes.length).to.equal(1);
            });

            it("gets all notes under cursor when instrument unspecified", () => {
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor();
                chai.expect(notes.length).to.equal(2);
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

                    chai.expect(graphicalNotes.length).to.equal(numNotesBefore);
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

                    chai.expect(graphicalNotes.length).to.equal(numNotesBefore + 1);
                }
            });
        });
    });

});
