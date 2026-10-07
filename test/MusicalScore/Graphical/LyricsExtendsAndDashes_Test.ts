import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";

/**
 * calculateLyricsPosition() positions the lyrics of all staff lines, then calculates their extend lines and dashes.
 * It kept each staff line's lyrics in a typescript-collections Dictionary, which keys objects by toString(), the same
 * for all staff lines: the second pass calculated the last staff line's extends and dashes once per staff line,
 * drawn on top of each other. The other staff lines only had a first pass, which ran before the lyrics of the
 * following systems were positioned.
 * Also, the drawer drew every dash twice: in drawStaffLine() and again in drawMusicSystem().
 */
describe("Lyrics extend lines and dashes", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    function staffLinesOf(osmd: OpenSheetMusicDisplay): StaffLine[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).flatMap(system => system.StaffLines);
    }

    it("are calculated and drawn once per staff line", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_notations_nodes_dorico_say_something.musicxml"));
        osmd.render();
        const staffLines: StaffLine[] = staffLinesOf(osmd);
        expect(staffLines.length, "one system with four staves").to.equal(4);
        expect(staffLines[3].LyricLines.length, "extend lines in the last staff (\"hmm\")").to.equal(1);
        staffLines.forEach((staffLine, index) => {
            const lines: string[] = staffLine.LyricLines.map(line => `${line.Start.x},${line.Start.y},${line.End.x},${line.End.y}`);
            expect(new Set(lines).size, `different extend lines in staff ${index + 1}`).to.equal(lines.length);
            const dashes: string[] = staffLine.LyricsDashes.map(dash => dash.PositionAndShape.RelativePosition)
                .map(position => `${position.x},${position.y}`);
            expect(new Set(dashes).size, `different dashes in staff ${index + 1}`).to.equal(dashes.length);
        });
        const dashCount: number = staffLines.reduce((count, staffLine) => count + staffLine.LyricsDashes.length, 0);
        expect(dashCount, "dashes in the sample").to.be.greaterThan(0);
        expect(container.querySelectorAll(".dash").length, "dashes drawn").to.equal(dashCount);
    });

    it("puts the dashes of a word continued in the next system on that system's lyrics line", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        // "sum-" on a half note tied into the second system, "mer" on that system's second note
        await osmd.load(TestUtils.getScore("test_lyrics_dash_continued_in_next_system.musicxml"));
        osmd.render();
        const secondSystemStaffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[1].StaffLines[0];
        const mer: GraphicalLyricEntry = secondSystemStaffLine.Measures[0].staffEntries
            .flatMap(staffEntry => staffEntry.LyricsEntries)
            .find(lyricEntry => lyricEntry.LyricsEntry.Text === "mer");
        expect(secondSystemStaffLine.LyricsDashes.length, "dashes before \"mer\"").to.be.greaterThan(0);
        for (const dash of secondSystemStaffLine.LyricsDashes) {
            expect(dash.PositionAndShape.AbsolutePosition.y, "dash y")
                .to.be.closeTo(mer.GraphicalLabel.PositionAndShape.AbsolutePosition.y, 0.001);
        }
    });
});
