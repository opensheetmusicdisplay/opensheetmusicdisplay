import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";

/**
 * The extend line (underscore) of a syllable ends before the next syllable of its own verse,
 * not before a syllable of another verse, e.g. a verse 1 melisma where verse 2 has a syllable on each note.
 * A verse that isn't sung again ends its extend before the next syllable of any verse, instead of at the end of the piece.
 * The extend also ends before a rest of its voice when another voice goes on singing another verse,
 * and before a measure in which its voice sings only other verses, e.g. a first ending sung only in verse 1.
 * test_lyrics_extend_verses.musicxml has one case per measure, see the comment in the file.
 */
describe("Lyrics extend lines with several verses", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_lyrics_extend_verses.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    function graphicalMeasure(measureNumber: number, staffIndex: number = 0): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[measureNumber - 1][staffIndex];
    }

    /** The x of a measure relative to its staff line, like the coordinates of the lyric lines. */
    function measureX(measureNumber: number, staffIndex: number = 0): number {
        return graphicalMeasure(measureNumber, staffIndex).PositionAndShape.RelativePosition.x;
    }

    /** The right end of a staff entry, where an extend line ending on it ends. */
    function staffEntryEndX(measureNumber: number, staffEntryIndex: number, staffIndex: number = 0): number {
        const staffEntry: GraphicalStaffEntry = graphicalMeasure(measureNumber, staffIndex).staffEntries[staffEntryIndex];
        return measureX(measureNumber, staffIndex) + staffEntry.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.BorderMarginRight;
    }

    function extendLinesStartingIn(measureNumber: number, staffIndex: number = 0): GraphicalLine[] {
        const measure: GraphicalMeasure = graphicalMeasure(measureNumber, staffIndex);
        const measureStartX: number = measureX(measureNumber, staffIndex);
        const measureEndX: number = measureStartX + measure.PositionAndShape.Size.width;
        return measure.ParentStaffLine.LyricLines.filter((line: GraphicalLine) =>
            line.Start.x >= measureStartX && line.Start.x < measureEndX);
    }

    it("draws the extend of verse 1 to the last note before its next syllable, over the syllables of verse 2", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "the sample fits one system").to.equal(1);
        const lines: GraphicalLine[] = extendLinesStartingIn(1);
        expect(lines.length, "extend lines of measure 1").to.be.greaterThan(0);
        for (const line of lines) {
            expect(line.End.x).to.be.closeTo(staffEntryEndX(1, 2), 0.001);
        }
    });

    it("ends the extend of a verse that isn't sung again before the next syllable of any verse", () => {
        const lines: GraphicalLine[] = extendLinesStartingIn(2);
        expect(lines.length, "extend lines of measure 2").to.be.greaterThan(0);
        for (const line of lines) {
            // not at the last note of the piece
            expect(line.End.x).to.be.closeTo(staffEntryEndX(2, 1), 0.001);
        }
    });

    it("ends the extend before a rest of its voice while another voice sings another verse", () => {
        const lines: GraphicalLine[] = extendLinesStartingIn(1, 1);
        expect(lines.length, "extend lines of measure 1, staff 2").to.be.greaterThan(0);
        for (const line of lines) {
            expect(line.End.x).to.be.closeTo(staffEntryEndX(1, 1, 1), 0.001);
        }
    });

    it("ends the extend before a measure in which its voice sings only other verses, e.g. a first ending", () => {
        const lines: GraphicalLine[] = extendLinesStartingIn(3);
        expect(lines.length, "extend lines of measure 3").to.be.greaterThan(0);
        for (const line of lines) {
            // not through measure 4, up to where verse 3 goes on in measure 5
            expect(line.End.x).to.be.closeTo(staffEntryEndX(3, 3), 0.001);
        }
    });
});
