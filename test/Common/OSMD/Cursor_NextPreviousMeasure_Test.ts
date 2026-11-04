import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";

/**
 * Cursor.nextMeasure() goes to the first position of the next measure in playback order (repetitions unrolled, like
 * next()), previousMeasure() to the first position of the previous measure in score order (like previous(), which
 * doesn't unroll repetitions backwards). The front (before the first note) and the end (after the last note) are not in
 * a measure, and a measure's first position is its first one with visible notes.
 * Samples:
 * - test_slur_unattached_end_to_barline.musicxml: 5 measures of 4/4 quarter notes with a repeat back to the start at the
 *   end of measure 2, played m1 m2 m1 m2 m3 m4 m5.
 * - OSMD_function_Test_Repeat.musicxml: 4 measures, each a whole note long, measure 1 repeated by itself, played
 *   m1 m1 m2 m3 m4 m3 m4 m2 m3 m4 m3 m4.
 * - test_cursor_hidden_rest_at_measure_start.musicxml: 4 measures of 4/4, measures 1 and 3 start with a hidden rest.
 */
describe("Cursor.nextMeasure() and previousMeasure()", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    let cursor: Cursor;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function load(sample: string): Promise<void> {
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
        cursor = osmd.cursor;
        cursor.show();
        cursor.reset();
    }

    /** The cursor's measure and beat, "front" before the first note (after previous() there), "end" after the last. */
    function position(): string {
        if (cursor.Iterator.FrontReached) {
            return "front";
        }
        if (cursor.Iterator.EndReached) {
            return "end";
        }
        return `m${cursor.Iterator.CurrentMeasureIndex + 1} beat ${cursor.Iterator.CurrentRelativeInMeasureTimestamp.RealValue * 4 + 1}`;
    }

    /** The positions from the current one on, calling step() until the cursor is at the end or the front. */
    function walk(step: () => void, describePosition: () => string = position): string[] {
        const visited: string[] = [describePosition()];
        do {
            step();
            visited.push(describePosition());
        } while (!cursor.Iterator.EndReached && !cursor.Iterator.FrontReached && visited.length < 30);
        return visited;
    }

    it("nextMeasure() goes to the first beat of the next measure in playback order, also from inside a measure and from the front", async () => {
        await load("test_slur_unattached_end_to_barline.musicxml");
        expect(walk(() => cursor.nextMeasure())).to.deep.equal(
            ["m1 beat 1", "m2 beat 1", "m1 beat 1", "m2 beat 1", "m3 beat 1", "m4 beat 1", "m5 beat 1", "end"]);

        cursor.reset();
        cursor.next();
        cursor.next();
        expect(position()).to.equal("m1 beat 3");
        cursor.nextMeasure();
        expect(position(), "nextMeasure() from m1 beat 3").to.equal("m2 beat 1");

        cursor.reset();
        cursor.previous();
        expect(position()).to.equal("front");
        cursor.nextMeasure();
        expect(position(), "nextMeasure() from the front").to.equal("m1 beat 1");
    });

    it("nextMeasure() goes to the next pass of a measure that is repeated by itself", async () => {
        await load("OSMD_function_Test_Repeat.musicxml");
        const positionAndPass: () => string = () => `${position()} at ${cursor.Iterator.CurrentEnrolledTimestamp.RealValue}`;
        // every measure is a whole note long: the passes start at enrolled timestamps 0, 1, 2, ..., the end is at 12
        expect(walk(() => cursor.nextMeasure(), positionAndPass)).to.deep.equal([
            "m1 beat 1 at 0", "m1 beat 1 at 1", "m2 beat 1 at 2", "m3 beat 1 at 3", "m4 beat 1 at 4", "m3 beat 1 at 5", "m4 beat 1 at 6",
            "m2 beat 1 at 7", "m3 beat 1 at 8", "m4 beat 1 at 9", "m3 beat 1 at 10", "m4 beat 1 at 11", "end at 12"]);
    });

    it("previousMeasure() goes to the first beat of the previous measure in score order, " +
        "from the end to the last measure, from the first measure to the front", async () => {
        await load("test_slur_unattached_end_to_barline.musicxml");
        for (let i: number = 0; i < 40 && !cursor.Iterator.EndReached; i++) {
            cursor.next();
        }
        expect(walk(() => cursor.previousMeasure())).to.deep.equal(
            ["end", "m5 beat 1", "m4 beat 1", "m3 beat 1", "m2 beat 1", "m1 beat 1", "front"]);

        cursor.reset();
        for (let i: number = 0; i < 22; i++) {
            cursor.next(); // 5 measures of 4 beats played (m1 m2 m1 m2 m3), then 2 beats of m4
        }
        expect(position()).to.equal("m4 beat 3");
        cursor.previousMeasure();
        expect(position(), "previousMeasure() from m4 beat 3").to.equal("m3 beat 1");
    });

    it("go to the first visible beat of a measure that starts with a hidden rest, " +
        "and the cursor is drawn at the start of a piece that starts with one", async () => {
        await load("test_cursor_hidden_rest_at_measure_start.musicxml");
        // after reset(), the iterator is at the hidden rest, which has no note to draw the cursor at: update() draws it at
        //   the beginning of the first measure, as before the first note (it used to draw it at the measure's end).
        //   update() is called here because osmd-extended's reset() draws the cursor by timestamp instead
        //   (at the hidden rest's own position).
        cursor.update();
        /** The x position (in units) the cursor marks: the standard cursor is 3 units wide, centered on it. */
        const cursorX: () => number = (): number => parseFloat(cursor.cursorElement.style.left) / (10 * osmd.Zoom) + 1.5;
        const firstMeasureStart: number = osmd.GraphicSheet.MeasureList[0][0].PositionAndShape.AbsolutePosition.x;
        expect(cursorX(), "cursor x at the hidden rest").to.be.closeTo(firstMeasureStart, 0.01);

        expect(walk(() => cursor.nextMeasure())).to.deep.equal(["m1 beat 1", "m2 beat 1", "m3 beat 2", "m4 beat 1", "end"]);
        expect(walk(() => cursor.previousMeasure())).to.deep.equal(["end", "m4 beat 1", "m3 beat 2", "m2 beat 1", "m1 beat 2", "front"]);
    });
});
