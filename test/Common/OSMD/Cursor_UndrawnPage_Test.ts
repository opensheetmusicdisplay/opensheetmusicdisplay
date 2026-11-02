import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * The cursor on a page that isn't drawn, e.g. after drawUpToPageNumber: there's no element to show it on, so it's hidden there.
 * It still moves through the whole sheet, e.g. a cursor that is only used to find the notes. Moving onto such a page threw
 * a TypeError (the page's element was null).
 * With no page drawn at all, e.g. with no instrument visible, there's no cursor until render() draws a page.
 */
describe("Cursor on a page that isn't drawn", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1200px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("is hidden on the pages after drawUpToPageNumber, and still moves through them", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, pageFormat: "A5_L", drawUpToPageNumber: 1 });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages.length, "pages").to.be.greaterThan(1);
        expect(osmd.Drawer.Backends.length, "drawn pages").to.equal(1);
        const firstPage: HTMLElement = osmd.Drawer.Backends[0].getInnerElement();
        const cursor: Cursor = osmd.cursor;
        cursor.show();
        /** Checks that the cursor is shown on the drawn first page and hidden on the other pages, with the notes of its position. */
        const expectShownOnDrawnPage: () => number = (): number => {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[cursor.Iterator.CurrentMeasureIndex][0];
            const pageNumber: number = measure.ParentMusicSystem.Parent.PageNumber;
            const position: string = `the cursor in measure ${measure.MeasureNumber} on page ${pageNumber}`;
            expect(cursor.cursorElement.style.display, position).to.equal(pageNumber === 1 ? "" : "none");
            expect(cursor.cursorElement.parentElement === firstPage, `${position}: attached to the first page`).to.equal(true);
            expect(cursor.NotesUnderCursor().length, `${position}: notes`).to.be.greaterThan(0);
            return pageNumber;
        };
        const pagesVisited: Set<number> = new Set<number>();
        while (!cursor.Iterator.EndReached) {
            pagesVisited.add(expectShownOnDrawnPage());
            cursor.next();
        }
        expect(pagesVisited.size, "pages the cursor moved through").to.equal(osmd.GraphicSheet.MusicPages.length);
        expect(cursor.Hidden, "Hidden: the cursor is still shown where it can be").to.equal(false);
        cursor.reset(); // back to the first page
        expect(expectShownOnDrawnPage()).to.equal(1);
    });

    it("render() with no instrument visible draws no page and doesn't throw; the cursor is created on the first page drawn (#1892)", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(TestUtils.getScore("test_rest_positioning_piano_two_voices.musicxml"));
        // hiding the instrument's first voice (Voice.Visible) does the same: Instrument.Visible is the Visible of its first voice
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.render(); // threw a TypeError when restoring the state of the cursor, which wasn't created without a page
        expect(osmd.Drawer.Backends.length, "drawn pages, no instrument visible").to.equal(0);
        osmd.Sheet.Instruments[0].Visible = true;
        osmd.render();
        expect(osmd.Drawer.Backends.length, "drawn pages, the instrument visible again").to.equal(1);
        osmd.cursor.show();
        expect(osmd.cursor.NotesUnderCursor().length, "notes under the cursor").to.be.greaterThan(0);
    });
});
