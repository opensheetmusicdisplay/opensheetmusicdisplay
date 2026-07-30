import { expect } from "chai";
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
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";

describe("OpenSheetMusicDisplay Main Export", () => {
    let container1: HTMLElement;

    it("no container", (done: Mocha.Done) => {
        expect(() => {
            return new OpenSheetMusicDisplay(undefined);
        }).to.throw(/container/);
        done();
    });

    it("container", (done: Mocha.Done) => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        expect(() => {
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

    it("keeps rest display hints fixed when the score transposes", (done: Mocha.Done) => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <rest>
          <display-step>B</display-step>
          <display-octave>4</display-octave>
        </rest>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

        function firstRenderedRestPitch(currentOsmd: OpenSheetMusicDisplay): string {
            const restNote: any = currentOsmd.GraphicSheet.MeasureList
                .flatMap((measureList: any[]) => measureList)
                .flatMap((measure: any) => measure.staffEntries)
                .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
                .flatMap((gve: any) => gve.notes)
                .find((graphicalNote: any) => graphicalNote.sourceNote?.isRest?.());
            expect(restNote, "expected a rendered rest note").to.not.equal(undefined);
            return restNote.vfpitch[0];
        }

        osmd.load(xml).then(
            () => {
                osmd.render();
                const restPitchBeforeTranspose: string = firstRenderedRestPitch(osmd);

                osmd.TransposeCalculator = new TransposeCalculator();
                osmd.Sheet.Transpose = 2;
                osmd.updateGraphic();
                osmd.render();

                expect(firstRenderedRestPitch(osmd)).to.equal(restPitchBeforeTranspose);
                done();
            },
            done
        );
    });

    it("keeps visible quarter-rest optical clearance as hard layout padding", () => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Voice</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><rest/><duration>2</duration><type>quarter</type></note>
      <note><rest/><duration>1</duration><type>eighth</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>
    </measure>
  </part>
</score-partwise>`;
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

        return osmd.load(xml).then(() => {
            osmd.render();
            const restVoiceEntries: any[] = osmd.GraphicSheet.MeasureList
                .flatMap((measureList: any[]) => measureList)
                .flatMap((measure: any) => measure.staffEntries)
                .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
                .filter((gve: any) => gve.notes?.[0]?.sourceNote?.isRest?.());
            const quarterRest: any = restVoiceEntries.find(
                (gve: any) => gve.notes[0].sourceNote.Length.RealValue === 0.25
            );
            const eighthRest: any = restVoiceEntries.find(
                (gve: any) => gve.notes[0].sourceNote.Length.RealValue === 0.125
            );

            expect(osmd.Sheet.Rules.LyricsXPaddingFactorForLongLyrics).to.equal(1.0);
            expect(osmd.Sheet.Rules.QuarterRestRightClearance).to.equal(0.45);
            expect(quarterRest.vfStaveNote.getLayoutPadding().rightPx).to.equal(4.5);
            expect(eighthRest.vfStaveNote.getLayoutPadding().rightPx).to.equal(0);
        });
    });

    it("maps bass rest display hints onto centered rest lines", (done: Mocha.Done) => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano LH</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note>
        <rest>
          <display-step>D</display-step>
          <display-octave>3</display-octave>
        </rest>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <rest>
          <display-step>F</display-step>
          <display-octave>3</display-octave>
        </rest>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <rest>
          <display-step>D</display-step>
          <display-octave>3</display-octave>
        </rest>
        <duration>4</duration>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

        function renderedRestPitches(currentOsmd: OpenSheetMusicDisplay): string[] {
            return currentOsmd.GraphicSheet.MeasureList
                .flatMap((measureList: any[]) => measureList)
                .flatMap((measure: any) => measure.staffEntries)
                .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
                .flatMap((gve: any) => gve.notes)
                .filter((graphicalNote: any) => graphicalNote.sourceNote?.isRest?.())
                .map((graphicalNote: any) => graphicalNote.vfpitch[0]);
        }

        osmd.load(xml).then(
            () => {
                osmd.render();
                expect(renderedRestPitches(osmd)).to.deep.equal(["bn/4", "dn/5", "bn/4"]);
                done();
            },
            done
        );
    });

    it("uses the centered bar-rest duration for whole-measure rests", () => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Single staff</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <rest measure="yes"/>
        <duration>8</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

        function wholeMeasureRestMetrics(currentOsmd: OpenSheetMusicDisplay): { duration: string, centerOffset: number } {
            const wholeMeasureRest: any = currentOsmd.GraphicSheet.MeasureList
                .flatMap((measureList: any[]) => measureList)
                .flatMap((measure: any) => measure.staffEntries)
                .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
                .find((gve: any) => {
                    const sourceNote: any = gve.notes?.[0]?.sourceNote;
                    return sourceNote?.isRest?.() && (
                        sourceNote.IsWholeMeasureRest ||
                        sourceNote.Length.RealValue === sourceNote.SourceMeasure.ActiveTimeSignature.RealValue
                    );
                });
            expect(wholeMeasureRest, "expected a whole-measure rest").to.not.equal(undefined);
            const vfStaveNote: any = wholeMeasureRest.vfStaveNote;
            const boundingBox: any = vfStaveNote.getBoundingBox();
            const stave: any = vfStaveNote.getStave();
            const restCenterX: number = boundingBox.getX() + boundingBox.getW() / 2;
            const measureCenterX: number = (stave.getNoteStartX() + stave.getNoteEndX()) / 2;
            return {
                centerOffset: Math.abs(restCenterX - measureCenterX),
                duration: vfStaveNote.getDuration(),
            };
        }

        return osmd.load(xml).then(() => {
            osmd.render();
            const firstRenderMetrics: { duration: string, centerOffset: number } = wholeMeasureRestMetrics(osmd);
            osmd.render();
            const rerenderMetrics: { duration: string, centerOffset: number } = wholeMeasureRestMetrics(osmd);
            expect(firstRenderMetrics.duration).to.equal("1");
            expect(firstRenderMetrics.centerOffset).to.be.lessThan(0.01);
            expect(rerenderMetrics.centerOffset).to.be.lessThan(0.01);
        });
    });

    it("centers whole-measure rests even when other staves contain active notes", () => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Solo</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Piano</part-name>
      <part-abbreviation>Pno.</part-abbreviation>
      <score-instrument id="P2-I1"><instrument-name>Piano</instrument-name></score-instrument>
      <midi-instrument id="P2-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <rest measure="yes"/>
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
        <staff>1</staff>
      </note>
      <backup><duration>4</duration></backup>
      <forward><duration>4</duration></forward>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>C</step><octave>3</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <forward><duration>1</duration></forward>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>D</step><octave>3</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <forward><duration>1</duration></forward>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>E</step><octave>3</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <forward><duration>1</duration></forward>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>F</step><octave>3</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
        <staff>2</staff>
      </note>
    </measure>
  </part>
</score-partwise>`;
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

        function wholeMeasureRestMetrics(currentOsmd: OpenSheetMusicDisplay): { duration: string, centerOffset: number } {
            const wholeMeasureRest: any = currentOsmd.GraphicSheet.MeasureList
                .flatMap((measureList: any[]) => measureList)
                .flatMap((measure: any) => measure.staffEntries)
                .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
                .find((gve: any) => {
                    const sourceNote: any = gve.notes?.[0]?.sourceNote;
                    return sourceNote?.isRest?.() && (
                        sourceNote.IsWholeMeasureRest ||
                        sourceNote.Length.RealValue === sourceNote.SourceMeasure.ActiveTimeSignature.RealValue
                    );
                });
            expect(wholeMeasureRest, "expected a whole-measure rest").to.not.equal(undefined);
            const vfStaveNote: any = wholeMeasureRest.vfStaveNote;
            const boundingBox: any = vfStaveNote.getBoundingBox();
            const stave: any = vfStaveNote.getStave();
            const restCenterX: number = boundingBox.getX() + boundingBox.getW() / 2;
            const measureCenterX: number = (stave.getNoteStartX() + stave.getNoteEndX()) / 2;
            return {
                centerOffset: Math.abs(restCenterX - measureCenterX),
                duration: vfStaveNote.getDuration(),
            };
        }

        return osmd.load(xml).then(() => {
            osmd.render();
            const firstRenderMetrics: { duration: string, centerOffset: number } = wholeMeasureRestMetrics(osmd);
            osmd.render();
            const rerenderMetrics: { duration: string, centerOffset: number } = wholeMeasureRestMetrics(osmd);
            expect(firstRenderMetrics.duration).to.equal("1");
            expect(firstRenderMetrics.centerOffset).to.be.lessThan(0.01);
            expect(rerenderMetrics.centerOffset).to.be.lessThan(0.01);
        });
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

    // skip: this test is unnecessary and creates traffic (to google)
    it.skip("load something invalid by URL", (done: Mocha.Done) => {
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
    });

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
    });

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
        expect(() => {
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
                expect(div.offsetWidth).to.equal(500);
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
                expect(div.offsetWidth).to.equal(200);
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
            expect(osmd.cursors[0].NotesUnderCursor()[0].halfTone).to.equal(60);
        });
    });
    describe("auto multi-rest rerender with hidden instruments", () => {
        const scoreXml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="2">
      <note><rest measure="yes"/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="3">
      <note><rest measure="yes"/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="4">
      <note><rest measure="yes"/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="5">
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>3</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>E</step><octave>3</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="3">
      <note>
        <pitch><step>F</step><octave>3</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="4">
      <note>
        <pitch><step>G</step><octave>3</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="5">
      <note>
        <pitch><step>A</step><octave>3</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

        it("recalculates auto multi-rests from scratch when hiding and re-showing an instrument", () => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

            return osmd.load(scoreXml).then(() => {
                osmd.render();

                const restMeasures: SourceMeasure[] = osmd.Sheet.SourceMeasures.slice(1, 4);
                for (const measure of restMeasures) {
                    expect(measure.isReducedToMultiRest).to.equal(false);
                    expect(measure.multipleRestMeasureNumber).to.equal(0);
                    expect(measure.multipleRestMeasures || 0).to.equal(0);
                }

                osmd.Sheet.Instruments[1].Visible = false;
                osmd.updateGraphic();
                osmd.render();

                expect(restMeasures[0].multipleRestMeasures).to.equal(3);
                expect(restMeasures[0].multipleRestMeasureNumber).to.equal(1);
                expect(restMeasures[1].multipleRestMeasureNumber).to.equal(2);
                expect(restMeasures[2].multipleRestMeasureNumber).to.equal(3);
                for (const measure of restMeasures) {
                    expect(measure.isReducedToMultiRest).to.equal(true);
                }

                osmd.Sheet.Instruments[1].Visible = true;
                osmd.updateGraphic();
                osmd.render();

                for (const measure of restMeasures) {
                    expect(measure.isReducedToMultiRest).to.equal(false);
                    expect(measure.multipleRestMeasureNumber).to.equal(0);
                    expect(measure.multipleRestMeasures || 0).to.equal(0);
                }
            });
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

        beforeEach((done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_cursor_skip_notehead_none.musicxml");
            osmd.load(score).then(
                (_: {}) => {
                    osmd.render();
                    done();
                },
                done
            ).catch(done);
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
