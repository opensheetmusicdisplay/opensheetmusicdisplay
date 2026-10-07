import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A lyric with a line break is drawn in several lines. Its label is placed by its bottom, so each further line moved the
 * first line up by a line, from the line of its verse onto the verse above or towards the staff.
 * A line break at the end of a lyric, which isn't followed by a line, did the same.
 * test_lyrics_line_breaks.musicxml, see the comment in the file.
 */
describe("Lyrics with line breaks", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("starts a lyric with line breaks on the line of its verse, where its dash or extend line is, and goes on below", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_lyrics_line_breaks.musicxml"));
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "the sample fits one system").to.equal(1);
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        function lyric(measureIndex: number, staffEntryIndex: number, verseIndex: number): GraphicalLyricEntry {
            return staffLine.Measures[measureIndex].staffEntries[staffEntryIndex].LyricsEntries[verseIndex];
        }
        /** The top of a lyric's first line. */
        function top(lyricEntry: GraphicalLyricEntry): number {
            const label: GraphicalLabel = lyricEntry.GraphicalLabel;
            return label.PositionAndShape.AbsolutePosition.y + label.PositionAndShape.BorderTop;
        }
        const glo: GraphicalLyricEntry = lyric(0, 0, 0);
        const sing: GraphicalLyricEntry = lyric(0, 0, 1);
        const itWithBreakAtEnd: GraphicalLyricEntry = lyric(0, 1, 1);
        const aOne: GraphicalLyricEntry = lyric(0, 2, 1);
        const nowThen: GraphicalLyricEntry = lyric(1, 0, 0); // the measure's only verse
        expect(itWithBreakAtEnd.LyricsEntry.Text, "the lyric without the line break at its end").to.equal("it");
        for (const twoLines of [aOne, nowThen]) {
            const firstLine: string = twoLines.GraphicalLabel.TextLines[0].text;
            expect(twoLines.GraphicalLabel.TextLines.length, "lines of the lyric " + firstLine).to.equal(2);
            expect(top(twoLines), "the first line on the line of verse 2, like Sing: " + firstLine).to.be.closeTo(top(sing), 0.001);
        }
        // the dashes of Glo-ry (verse 1) and a-gain (verse 2), from left to right
        expect(staffLine.LyricsDashes.length, "dashes").to.equal(2);
        expect(staffLine.LyricsDashes[1].PositionAndShape.AbsolutePosition.y - staffLine.LyricsDashes[0].PositionAndShape.AbsolutePosition.y,
            "the dash of a-gain one verse below the dash of Glo-ry").to.be.closeTo(top(sing) - top(glo), 0.001);
        // the extend line of now, a quarter of a line above the bottom of its first line, like for a lyric of one line (Sing)
        expect(staffLine.LyricLines.length, "extend lines").to.equal(1);
        const singLabel: GraphicalLabel = sing.GraphicalLabel;
        expect(staffLine.PositionAndShape.AbsolutePosition.y + staffLine.LyricLines[0].Start.y, "the extend line of now on the line of verse 2")
            .to.be.closeTo(singLabel.PositionAndShape.AbsolutePosition.y - singLabel.PositionAndShape.Size.height / 4, 0.001);
        // what is below the staff line is kept clear of the second lines
        expect(staffLine.SkyBottomLineCalculator.getBottomLineMax(), "the bottom line reaches the bottom of now's second line")
            .to.be.at.least(nowThen.GraphicalLabel.PositionAndShape.RelativePosition.y - 0.001);
    });
});
