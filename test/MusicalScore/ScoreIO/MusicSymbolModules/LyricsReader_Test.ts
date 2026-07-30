import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { TextAlignmentEnum } from "../../../../src/Common/Enums/TextAlignment";
import {
    GraphicalLyricEntry,
    LyricFootprint,
} from "../../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalLine } from "../../../../src/MusicalScore/Graphical/GraphicalLine";
import { MusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {
    LyricAlignmentMode,
    LyricExtendType,
    LyricsEntry,
    LyricSyllabic,
} from "../../../../src/MusicalScore/VoiceData/Lyrics/LyricsEntry";
import { VoiceEntry } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import { ITextMeasurer } from "../../../../src/MusicalScore/Interfaces/ITextMeasurer";

describe("LyricsReader semantics", () => {
    const path: string = "test/data/test_lyrics_semantics.musicxml";
    let sheet: MusicSheet;
    let voiceEntries: VoiceEntry[];

    before((): void => {
        const doc: Document = ((window as any).__xml__)[path];
        expect(doc).to.not.be.undefined;
        const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        sheet = new MusicSheetReader().createMusicSheet(score, path);
        voiceEntries = sheet.Instruments[0].Voices[0].VoiceEntries;
    });

    function lyricAt(voiceEntryIndex: number, verseNumber: string): LyricsEntry {
        return voiceEntries[voiceEntryIndex].LyricsEntries.getValue(verseNumber);
    }

    it("preserves syllabic and typed extender metadata, including continuation-only nodes", (): void => {
        const inferredBegin: LyricsEntry = lyricAt(0, "1");
        const inferredMiddle: LyricsEntry = lyricAt(2, "1");
        const legacyStart: LyricsEntry = lyricAt(0, "3");
        const typedStart: LyricsEntry = lyricAt(0, "4");
        const typedContinue: LyricsEntry = lyricAt(1, "4");
        const typedStop: LyricsEntry = lyricAt(2, "4");

        expect(inferredBegin.Syllabic).to.equal(LyricSyllabic.Begin);
        expect(inferredMiddle.Syllabic).to.equal(LyricSyllabic.Middle);
        expect(legacyStart.ExtendType).to.equal(LyricExtendType.Start);
        expect(typedStart.ExtendType).to.equal(LyricExtendType.Start);
        expect(typedContinue.Text).to.equal("");
        expect(typedContinue.ExtendType).to.equal(LyricExtendType.Continue);
        expect(typedStop.Text).to.equal("");
        expect(typedStop.ExtendType).to.equal(LyricExtendType.Stop);
        expect(legacyStart.extend).to.be.true;
        expect(typedContinue.extend).to.be.true;
        expect(typedStop.extend).to.be.false;
    });

    it("infers a melisma only across intervening pitched entries in the same word", (): void => {
        const inferredBegin: LyricsEntry = lyricAt(0, "1");
        const inferredMiddle: LyricsEntry = lyricAt(2, "1");
        const immediateOrdinaryBegin: LyricsEntry = lyricAt(0, "2");
        const explicitBegin: LyricsEntry = lyricAt(0, "5");

        expect(inferredBegin.IsMelismatic).to.be.true;
        expect(inferredBegin.AlignmentMode).to.equal(LyricAlignmentMode.MelismaLeft);
        expect(inferredMiddle.IsMelismatic).to.be.true;
        expect(immediateOrdinaryBegin.IsMelismatic).to.be.false;
        expect(immediateOrdinaryBegin.AlignmentMode).to.equal(LyricAlignmentMode.Center);
        expect(explicitBegin.IsMelismatic).to.be.true;
    });

    it("separates literal stanza prefixes from the lyric body", (): void => {
        const ordinaryPrefix: LyricsEntry = lyricAt(0, "2");
        const melismaticPrefix: LyricsEntry = lyricAt(0, "3");

        expect(ordinaryPrefix.Text).to.equal("2. Or");
        expect(ordinaryPrefix.StanzaNumberPrefix).to.equal("2. ");
        expect(ordinaryPrefix.LyricText).to.equal("Or");
        expect(melismaticPrefix.StanzaNumberPrefix).to.equal("3. ");
        expect(melismaticPrefix.LyricText).to.equal("Held");
    });

    describe("graphical lyric anchoring", () => {
        let previousTextMeasurer: ITextMeasurer;

        before((): void => {
            previousTextMeasurer = MusicSheetCalculator.TextMeasurer;
            MusicSheetCalculator.TextMeasurer = {
                fontSize: 1,
                fontSizeStandard: 1,
                computeTextWidthToHeightRatio: (text: string): number => text.length,
                setFontSize: (fontSize: number): number => fontSize,
            };
        });

        after((): void => {
            MusicSheetCalculator.TextMeasurer = previousTextMeasurer;
        });

        function graphicalEntry(lyricsEntry: LyricsEntry): GraphicalLyricEntry {
            const rules: EngravingRules = new EngravingRules();
            const parentBox: BoundingBox = new BoundingBox();
            const staffEntry: GraphicalStaffEntry = {
                parentMeasure: {
                    parentSourceMeasure: { Rules: rules },
                },
                PositionAndShape: parentBox,
            } as GraphicalStaffEntry;
            return new GraphicalLyricEntry(lyricsEntry, staffEntry, 1, rules.StaffHeight);
        }

        it("left-aligns a melismatic body and keeps an ordinary body centered", (): void => {
            const melismatic: GraphicalLyricEntry = graphicalEntry(lyricAt(0, "1"));
            const ordinary: GraphicalLyricEntry = graphicalEntry(lyricAt(0, "2"));

            expect(melismatic.GraphicalLabel.Label.textAlignment).to.equal(TextAlignmentEnum.LeftBottom);
            expect(melismatic.getBodyFootprint(10).leftEdgeX).to.equal(10);
            expect(ordinary.GraphicalLabel.Label.textAlignment).to.equal(TextAlignmentEnum.CenterBottom);
            expect(ordinary.getBodyFootprint(10).leftExtent).to.equal(ordinary.getBodyFootprint(10).rightExtent);
        });

        it("hangs a stanza prefix left without moving the lyric body's note anchor", (): void => {
            const ordinary: GraphicalLyricEntry = graphicalEntry(lyricAt(0, "2"));
            const melismatic: GraphicalLyricEntry = graphicalEntry(lyricAt(0, "3"));
            const ordinaryBody: LyricFootprint = ordinary.getBodyFootprint(10);
            const ordinaryFull: LyricFootprint = ordinary.getFootprint(10);
            const melismaticBody: LyricFootprint = melismatic.getBodyFootprint(10);
            const melismaticFull: LyricFootprint = melismatic.getFootprint(10);

            expect(ordinaryBody.anchorX).to.equal(10);
            expect(ordinaryBody.leftExtent).to.equal(ordinaryBody.rightExtent);
            expect(ordinary.GraphicalLabel.SvgTextAnchor).to.equal("middle");
            expect(ordinaryFull.leftEdgeX).to.be.lessThan(ordinaryBody.leftEdgeX);
            expect(ordinaryFull.rightEdgeX).to.equal(ordinaryBody.rightEdgeX);
            expect(melismaticBody.anchorX).to.equal(10);
            expect(melismaticBody.leftEdgeX).to.equal(10);
            expect(melismatic.GraphicalLabel.SvgTextAnchor).to.equal("start");
            expect(melismaticFull.leftEdgeX).to.be.lessThan(10);
            expect(melismaticFull.rightEdgeX).to.equal(melismaticBody.rightEdgeX);
        });

        it("lays out a typed start/continue/stop chain as one extender", (): void => {
            const rules: EngravingRules = new EngravingRules();
            const staffLine: any = {
                LyricLines: [],
                LyricsDashes: [],
                PositionAndShape: new BoundingBox(),
            };
            const measure: any = {
                parentSourceMeasure: { Rules: rules },
                ParentStaff: { idInMusicSheet: 0 },
                ParentStaffLine: staffLine,
                PositionAndShape: new BoundingBox(),
            };
            const makeStaffEntry: (index: number, x: number, lyricsEntry: LyricsEntry) => GraphicalStaffEntry =
                (index: number, x: number, lyricsEntry: LyricsEntry): GraphicalStaffEntry => {
                    const positionAndShape: BoundingBox = new BoundingBox();
                    positionAndShape.RelativePosition = new PointF2D(x, 0);
                    positionAndShape.BorderMarginRight = 0.5;
                    const staffEntry: any = {
                        parentMeasure: measure,
                        parentVerticalContainer: { Index: index },
                        PositionAndShape: positionAndShape,
                        LyricsEntries: [],
                        hasOnlyRests: (): boolean => false,
                    };
                    staffEntry.LyricsEntries.push(new GraphicalLyricEntry(
                        lyricsEntry,
                        staffEntry,
                        1,
                        rules.StaffHeight,
                    ));
                    return staffEntry as GraphicalStaffEntry;
                };
            const startEntry: GraphicalStaffEntry = makeStaffEntry(0, 1, lyricAt(0, "4"));
            const continueEntry: GraphicalStaffEntry = makeStaffEntry(1, 5, lyricAt(1, "4"));
            const stopEntry: GraphicalStaffEntry = makeStaffEntry(2, 9, lyricAt(2, "4"));
            const calculator: any = Object.create(MusicSheetCalculator.prototype);
            calculator.rules = rules;
            calculator.staffLinesWithLyricWords = [];
            calculator.graphicalMusicSheet = {
                VerticalGraphicalStaffEntryContainers: [
                    { StaffEntries: [startEntry] },
                    { StaffEntries: [continueEntry] },
                    { StaffEntries: [stopEntry] },
                ],
            };

            calculator.calculateLyricsExtendsAndDashes([startEntry, continueEntry, stopEntry]);

            expect(staffLine.LyricLines).to.have.length(1);
            const extender: GraphicalLine = staffLine.LyricLines[0];
            expect(extender.End.x).to.equal(9.5);
            expect(extender.Start.x).to.be.lessThan(extender.End.x);
        });
    });
});
