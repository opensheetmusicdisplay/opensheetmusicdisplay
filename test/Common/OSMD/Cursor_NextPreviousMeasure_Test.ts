import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";

/**
 * Cursor.nextMeasure() goes to the first position of the next measure in playback order (repetitions unrolled, like
 * next()), previousMeasure() to the first position of the previous measure in score order (like previous(), which
 * doesn't unroll repetitions backwards).
 * Sample: test_slur_unattached_end_to_barline.musicxml, 5 measures of 4/4 quarter notes with a repeat back to the start
 * at the end of measure 2: played m1 m2 m1 m2 m3 m4 m5.
 */
describe("Cursor.nextMeasure() and previousMeasure()", () => {
    let container: HTMLElement;
    let cursor: Cursor;
    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_unattached_end_to_barline.musicxml"));
        osmd.render();
        cursor = osmd.cursor;
        cursor.show();
        cursor.reset();
    });
    afterEach(() => {
        container.remove();
    });

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

    it("nextMeasure() goes to the first beat of the next measure in playback order, also from inside a measure", () => {
        const visited: string[] = [position()];
        while (!cursor.Iterator.EndReached && visited.length < 20) {
            cursor.nextMeasure();
            visited.push(position());
        }
        expect(visited).to.deep.equal(["m1 beat 1", "m2 beat 1", "m1 beat 1", "m2 beat 1", "m3 beat 1", "m4 beat 1", "m5 beat 1", "end"]);

        cursor.reset();
        cursor.next();
        cursor.next();
        expect(position()).to.equal("m1 beat 3");
        cursor.nextMeasure();
        expect(position(), "nextMeasure() from m1 beat 3").to.equal("m2 beat 1");
    });

    it("previousMeasure() goes to the first beat of the previous measure in score order, from the first measure to the front", () => {
        for (let i: number = 0; i < 22; i++) {
            cursor.next(); // 5 measures of 4 beats played (m1 m2 m1 m2 m3), then 2 beats of m4
        }
        const visited: string[] = [position()];
        while (!cursor.Iterator.FrontReached && visited.length < 20) {
            cursor.previousMeasure();
            visited.push(position());
        }
        expect(visited).to.deep.equal(["m4 beat 3", "m3 beat 1", "m2 beat 1", "m1 beat 1", "front"]);
    });
});
