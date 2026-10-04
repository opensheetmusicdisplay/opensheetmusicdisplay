import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * The cursor at the end of a piece that ends at a Fine before its last measure, e.g. with a D.C. al Fine.
 * The iterator ends past the Fine measure there, as past the last measure at the end of a piece without a Fine,
 * and the cursor is drawn at the end of the Fine measure. update() finds that measure by moving the iterator back
 * and forth once, which must leave it at the end: when the iterator ended in the Fine measure instead (osmd-extended did),
 * moving back went before the Fine, moving forth didn't pass the Fine again, and cursor.next() never reached the end.
 */
describe("Cursor at the end of a piece that ends at a Fine before its last measure", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1000px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** Sample: a Fine at the end of measure 2, a D.C. at the end of measure 4: played 1 2 3 4 1 2. */
    it("reaches the end at the Fine, is drawn at the end of the Fine measure, and goes back and forth from there", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(TestUtils.getScore("test_repeat_da_capo_with_fine.musicxml"));
        osmd.render();
        const cursor: Cursor = osmd.cursor;
        cursor.show();
        /** The x position (in units) the cursor marks: the standard cursor is 3 units wide, centered on it. */
        const cursorX: () => number = (): number => parseFloat(cursor.cursorElement.style.left) / (10 * osmd.Zoom) + 1.5;
        const fineMeasure: BoundingBox = osmd.GraphicSheet.MeasureList[1][0].PositionAndShape;
        const fineMeasureEnd: number = fineMeasure.AbsolutePosition.x + fineMeasure.Size.width;

        const measures: number[] = [];
        while (!cursor.Iterator.EndReached && measures.length < 20) {
            measures.push(cursor.Iterator.CurrentMeasureIndex);
            cursor.next();
        }
        expect(cursor.Iterator.EndReached, "EndReached").to.equal(true);
        expect(measures).to.deep.equal([0, 1, 2, 3, 0, 1]);
        expect(cursorX(), "at the end: the end of the Fine measure").to.be.closeTo(fineMeasureEnd, 0.01);

        cursor.previous();
        expect(cursor.Iterator.EndReached, "EndReached after previous()").to.equal(false);
        expect(cursor.Iterator.CurrentMeasureIndex, "measure after previous()").to.equal(1);
        const fineMeasureNoteX: number = osmd.GraphicSheet.MeasureList[1][0].staffEntries[0].PositionAndShape.AbsolutePosition.x;
        expect(cursorX(), "after previous(): the note of the Fine measure").to.be.closeTo(fineMeasureNoteX, 0.01);

        cursor.next();
        expect(cursor.Iterator.EndReached, "EndReached after previous() and next()").to.equal(true);
        expect(cursorX(), "at the end again").to.be.closeTo(fineMeasureEnd, 0.01);
    });
});
