import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * GraphicalMusicSheet's click helpers find the object whose bounding box contains a position, e.g. of a click.
 * - getClickedObjectOfType() and getClickedObject() take the class of the object: they returned the first object whose box contains
 *   the position, always the page (the type parameter doesn't exist at runtime). Without a class, the innermost object there.
 * - tryGetTimestampFromPosition() returns the timestamp of the staff entry there: it threw, the page has no getAbsoluteTimestamp().
 * - GetClickableLabel() and tryGetClickableLabel() return the label there, e.g. a lyric or the title: they returned an object (of any
 *   class) only when it was the only one lying inside an 8 x 8 area around the position.
 * - The search can be limited to a page: with a page format, each page has its own coordinates, so a position is on every page.
 */
describe("GetClickedObject", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1200px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** The center of the box. */
    function center(box: BoundingBox): PointF2D {
        return new PointF2D(box.AbsolutePosition.x + (box.BorderLeft + box.BorderRight) / 2,
                            box.AbsolutePosition.y + (box.BorderTop + box.BorderBottom) / 2);
    }

    it("finds the staff entry, its timestamp and the label at a position", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml"));
        osmd.render();
        const sheet: GraphicalMusicSheet = osmd.GraphicSheet;
        // measure 2's second note, a half note, with the lyric "ning"
        const staffEntry: GraphicalStaffEntry = sheet.MeasureList[1][0].staffEntries[1];
        const notePosition: PointF2D = staffEntry.graphicalVoiceEntries[0].notes[0].PositionAndShape.AbsolutePosition;
        expect(sheet.getClickedObjectOfType(notePosition, GraphicalStaffEntry) === staffEntry, "getClickedObjectOfType()").to.equal(true);
        expect(sheet.getClickedObject(notePosition, GraphicalStaffEntry) === staffEntry, "getClickedObject()").to.equal(true);
        expect(sheet.tryGetTimestampFromPosition(notePosition).RealValue).to.equal(1.5);
        const lyric: GraphicalLabel = staffEntry.LyricsEntries[0].GraphicalLabel;
        expect(lyric.Label.text).to.equal("ning");
        const lyricCenter: PointF2D = center(lyric.PositionAndShape);
        expect(sheet.GetClickableLabel(lyricCenter) === lyric, "the lyric").to.equal(true);
        expect(sheet.getClickedObject(lyricCenter) === lyric, "without a class: the lyric, not its staff entry").to.equal(true);
        expect(sheet.tryGetClickableLabel(center(sheet.Title.PositionAndShape)) === sheet.Title, "the title").to.equal(true);

        // above the title: nothing, not even the page, whose box is that of its objects
        const inTheMargin: PointF2D = new PointF2D(1, 1);
        expect(sheet.getClickedObject(inTheMargin) === undefined, "getClickedObject()").to.equal(true);
        expect(sheet.getClickedObjectOfType(inTheMargin, GraphicalStaffEntry) === undefined, "getClickedObjectOfType()").to.equal(true);
        expect(sheet.tryGetTimestampFromPosition(inTheMargin) === undefined, "tryGetTimestampFromPosition()").to.equal(true);
        expect(sheet.GetClickableLabel(inTheMargin) === undefined, "GetClickableLabel()").to.equal(true);
    });

    it("searches only the given page (a page format: each page has its own coordinates)", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, pageFormat: "A5_L" });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        const sheet: GraphicalMusicSheet = osmd.GraphicSheet;
        const pages: GraphicalMusicPage[] = sheet.MusicPages;
        expect(pages.length, "pages").to.be.greaterThan(1);
        for (const page of pages) {
            // the page's first note (the position is on every page)
            const staffEntry: GraphicalStaffEntry = page.MusicSystems[0].StaffLines[0].Measures[0].staffEntries[0];
            const position: PointF2D = staffEntry.graphicalVoiceEntries[0].notes[0].PositionAndShape.AbsolutePosition;
            expect(sheet.getClickedObjectOfType(position, GraphicalStaffEntry, page) === staffEntry, `page ${page.PageNumber}`).to.equal(true);
            expect(sheet.tryGetTimestampFromPosition(position, page).Equals(staffEntry.getAbsoluteTimestamp()), `page ${page.PageNumber}`)
                .to.equal(true);
        }
    });
});
