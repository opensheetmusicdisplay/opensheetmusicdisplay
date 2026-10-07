import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TextAlignmentEnum } from "../../../src/Common/Enums/TextAlignment";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * The first lyric of a verse, whose text starts with the verse number, e.g. "1. lah", was aligned by the number: the number
 * was at the note and the lyric right of it, by the width of the number. The lyric starts where a lyric without a number
 * starts, the number is left of it (EngravingRules.LyricsVerseNumberLeftOfLyric).
 * test_lyrics_verse_numbers.musicxml, see the comment in the file.
 */
describe("Lyrics with verse numbers", () => {
    let container: HTMLElement;
    let staffLines: StaffLine[];
    /** The staff entries of measure 1 in the upper staff. */
    let staffEntries: GraphicalStaffEntry[];
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** The first lyrics of the three verses: their text, where the lyric starts in it after the number, and the index of their note. */
    const numberedLyrics: { text: string, lyricStart: number, note: number }[] = [
        { text: "1. lah", lyricStart: 3, note: 0 },
        { text: "２．ら", lyricStart: 2, note: 0 },
        { text: "3. I", lyricStart: 3, note: 1 }, // a short lyric, after lyrics of the other verses
    ];

    async function render(setRules?: (rules: EngravingRules) => void): Promise<void> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        setRules?.(osmd.EngravingRules);
        await osmd.load(TestUtils.getScore("test_lyrics_verse_numbers.musicxml"));
        osmd.render();
        staffLines = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        staffEntries = staffLines[0].Measures[0].staffEntries;
        for (let verseIndex: number = 0; verseIndex < numberedLyrics.length; verseIndex++) {
            expect(staffEntries[numberedLyrics[verseIndex].note].LyricsEntries[verseIndex].LyricsEntry.Text, "the lyric with a verse number")
                .to.equal(numberedLyrics[verseIndex].text);
        }
    }

    /** The x of a drawn lyric from the given character on, relative to the lyric's staff entry: its start, or its center. */
    function lyricX(lyric: GraphicalLyricEntry, firstCharacter: number, center: boolean = false): number {
        const text: SVGTextElement = (lyric.GraphicalLabel.SVGNode as SVGGElement).querySelector("text");
        const start: number = text.getStartPositionOfChar(firstCharacter).x;
        const end: number = text.getEndPositionOfChar(text.getNumberOfChars() - 1).x;
        return (center ? (start + end) / 2 : start) / unitInPixels - lyric.StaffEntryParent.PositionAndShape.AbsolutePosition.x;
    }

    it("starts the first lyric of a verse where a lyric without a verse number starts, the number is left of it", async () => {
        await render();
        for (let verseIndex: number = 0; verseIndex < numberedLyrics.length; verseIndex++) {
            const numbered: GraphicalLyricEntry = staffEntries[numberedLyrics[verseIndex].note].LyricsEntries[verseIndex];
            const plain: GraphicalLyricEntry = staffEntries[2].LyricsEntries[verseIndex];
            const verse: string = "verse " + (verseIndex + 1);
            expect(lyricX(numbered, numberedLyrics[verseIndex].lyricStart), "the lyric of " + verse).to.be.closeTo(lyricX(plain, 0), 0.1);
            // the box's margins: the left one reaches to the number, which keeps it clear of what is above it. The right one is as usual
            const box: BoundingBox = numbered.GraphicalLabel.PositionAndShape;
            const plainBox: BoundingBox = plain.GraphicalLabel.PositionAndShape;
            expect(box.RelativePosition.x + box.BorderMarginLeft, "the left margin of " + verse + " reaches to the number")
                .to.be.closeTo(lyricX(numbered, 0) + plainBox.BorderMarginLeft, 0.1);
            expect(box.BorderMarginRight - box.BorderRight, "the right margin of " + verse)
                .to.be.closeTo(plainBox.BorderMarginRight - plainBox.BorderRight, 0.001);
        }
        // the numbers are left of their notes, they need no space after the notes: the four notes are evenly spaced
        function noteDistance(firstNote: number): number {
            return staffEntries[firstNote + 1].PositionAndShape.RelativePosition.x - staffEntries[firstNote].PositionAndShape.RelativePosition.x;
        }
        expect(noteDistance(0), "from the first note to the second, like from the third to the fourth").to.be.closeTo(noteDistance(2), 0.05);
        expect(noteDistance(1), "from the second note to the third, like from the third to the fourth").to.be.closeTo(noteDistance(2), 0.05);
        const lyricStart: number = lyricX(staffEntries[2].LyricsEntries[0], 0);
        // measure 2: a later lyric of the verse starts with its number, and so does the first lyric of a verse at the same note.
        //   The first lyric of the verse in the lower staff starts after its numbers
        expect(lyricX(staffLines[0].Measures[1].staffEntries[0].LyricsEntries[0], 0), "the number of 2. lah").to.be.closeTo(lyricStart, 0.1);
        expect(lyricX(staffLines[0].Measures[1].staffEntries[0].LyricsEntries[1], 0), "the number of 4. lah, at the note of 2. lah")
            .to.be.closeTo(lyricStart, 0.1);
        expect(lyricX(staffLines[1].Measures[1].staffEntries[0].LyricsEntries[0], 5), "the lyric of 1.2. lah in the lower staff")
            .to.be.closeTo(lyricStart, 0.1);
    });

    it("aligns the text as a whole, starting with the number, if LyricsVerseNumberLeftOfLyric is false", async () => {
        await render((rules: EngravingRules): void => {
            rules.LyricsVerseNumberLeftOfLyric = false;
        });
        expect(lyricX(staffEntries[0].LyricsEntries[0], 0), "the number of 1. lah").to.be.closeTo(lyricX(staffEntries[2].LyricsEntries[0], 0), 0.1);
    });

    it("centers the text as a whole, with the number, if lyrics are centered", async () => {
        await render((rules: EngravingRules): void => {
            rules.LyricsAlignmentStandard = TextAlignmentEnum.CenterBottom;
        });
        expect(lyricX(staffEntries[0].LyricsEntries[0], 0, true), "the center of 1. lah")
            .to.be.closeTo(lyricX(staffEntries[2].LyricsEntries[0], 0, true), 0.1);
    });
});
