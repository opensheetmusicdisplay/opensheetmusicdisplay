import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { MusicPartManager, TimestampTransform } from "../../../src/MusicalScore/MusicParts/MusicPartManager";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { PartListEntry } from "../../../src/MusicalScore/MusicSource/PartListEntry";

/**
 * The mapping between enrolled timestamps (the time line with the repetitions played out) and sheet timestamps (the position
 * in the sheet), right after loading, before a render: MusicSheetReader calls MusicPartManager.init(). Before, nothing did, so
 * absoluteEnrolledToSheetTimestamp() and getCurrentRepetitionTimestampTransform() threw, and Parts was undefined.
 *
 * Sample: test_repeat_first_ending_without_second_ending.musicxml, 4 measures of 4/4 with a whole note each. Measures 2-3 are
 * repeated, measure 3 is under a first ending without a second ending after it, so the measures are played in the order
 * m1 m2 m3 m2 m4: enrolled 0-3 is the first pass (sheet 0-3), enrolled 3-4 the second pass of m2 (sheet 1-2), and from
 * enrolled 4 on comes m4 (sheet 3-4).
 */
describe("MusicPartManager after loading", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    let manager: MusicPartManager;
    beforeEach(async () => {
        container = document.createElement("div");
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_repeat_first_ending_without_second_ending.musicxml"));
        manager = osmd.Sheet.MusicPartManager;
    });
    afterEach(() => {
        container.remove();
    });

    /** The sheet timestamp of an enrolled timestamp, both in whole notes. */
    function sheetTimestampOf(enrolled: Fraction): number {
        return manager.absoluteEnrolledToSheetTimestamp(enrolled).RealValue;
    }

    /**
     * In the first pass, the sheet timestamp is the enrolled one. In the second pass of m2 it's 2 earlier (m2 and m3 were played
     * before), from the jump over the first ending to m4 on 1 earlier (m2 was played twice). Also at each position of an
     * iterator, as a cursor during playback maps the enrolled time to the sheet.
     */
    it("absoluteEnrolledToSheetTimestamp() returns the position in the sheet, also in a repeat's second pass and after an ending", () => {
        expect(sheetTimestampOf(new Fraction(5, 2)), "m3, first pass").to.equal(2.5);
        expect(sheetTimestampOf(new Fraction(3, 1)), "m2, start of the second pass").to.equal(1);
        expect(sheetTimestampOf(new Fraction(7, 2)), "m2, second pass").to.equal(1.5);
        expect(sheetTimestampOf(new Fraction(4, 1)), "m4, start").to.equal(3);
        expect(sheetTimestampOf(new Fraction(17, 4)), "m4").to.equal(3.25);

        const positions: number[][] = [];
        const iterator: MusicPartManagerIterator = manager.getIterator();
        while (!iterator.EndReached) {
            positions.push([iterator.CurrentEnrolledTimestamp.RealValue, iterator.CurrentSourceTimestamp.RealValue,
                sheetTimestampOf(iterator.CurrentEnrolledTimestamp)]);
            iterator.moveToNext();
        }
        expect(positions, "enrolled, sheet and mapped timestamp of each position").to.deep.equal(
            [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 1, 1], [4, 3, 3]]);
    });

    /**
     * The transform at an enrolled timestamp is the one of the last jump at or before it: in the second pass of m2 the one of
     * the jump back to m2 (enrolled 3, sheet 1), in m4 the one of the jump over the first ending (enrolled 4, sheet 3). Before
     * the jump back, the sheet timestamp is the enrolled one.
     */
    it("getCurrentRepetitionTimestampTransform() returns the transform of the last jump at or before a timestamp", () => {
        const secondPass: TimestampTransform = manager.getCurrentRepetitionTimestampTransform(new Fraction(3, 1));
        expect([secondPass.$from.RealValue, secondPass.to.RealValue], "m2, start of the second pass").to.deep.equal([3, 1]);
        // === instead of to.equal(): if it failed, to.equal() would print both transforms, with the whole sheet (curRepetition)
        expect(manager.getCurrentRepetitionTimestampTransform(new Fraction(15, 4)) === secondPass,
               "m2, end of the second pass: the same transform").to.equal(true);

        const afterEnding: TimestampTransform = manager.getCurrentRepetitionTimestampTransform(new Fraction(4, 1));
        expect([afterEnding.$from.RealValue, afterEnding.to.RealValue], "m4, start").to.deep.equal([4, 3]);
        expect(manager.getCurrentRepetitionTimestampTransform(new Fraction(9, 2)) === afterEnding, "m4: the same transform").to.equal(true);

        const firstPass: TimestampTransform = manager.getCurrentRepetitionTimestampTransform(new Fraction(11, 4));
        expect(firstPass.to.RealValue - firstPass.$from.RealValue, "m3, first pass: sheet timestamp - enrolled timestamp").to.equal(0);
    });

    /** The repeat of m2-m3, and the repetition of the whole piece that OSMD adds when no repetition spans it (played once). */
    it("Parts lists the sheet's repetitions", () => {
        expect(osmd.Sheet.Repetitions.length).to.equal(2);
        // their indexes: a failing to.have.ordered.members() would print both lists, with the whole sheet
        const repetitions: PartListEntry[] = osmd.Sheet.Repetitions;
        expect(manager.Parts.map((part: PartListEntry): number => repetitions.indexOf(part)), "the sheet's repetitions, in order")
            .to.deep.equal([0, 1]);
    });
});
