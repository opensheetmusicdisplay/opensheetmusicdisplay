import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Tests that MusicPartManagerIterator keeps its enrolled (repetition-unrolled) timestamp consistent with its source
 * position when it is moved backwards: moveToPrevious(), used by cursor.previous() and by cursor.update() at the end
 * of the sheet. The enrolled timestamp used to only ever grow - leaving a measure forward added the measure's
 * duration, moving back into it subtracted nothing - so after moving back across a measure boundary
 * CurrentEnrolledTimestamp overstated the position by the measures moved back over, and moving forward again across
 * the same boundary added their durations once more.
 *
 * Sample: OSMD_function_Test_Repeat.musicxml, 4 measures of 4/4 with nested repeats, played in the enrolled order
 * m1 m1 m2 m3 m4 m3 m4 m2 m3 m4 m3 m4 (12 measures = 12 whole notes in total). Every measure has a note on beat 1
 * and rests on beats 2 and 3 (a quarter and a half rest), so the positions of a measure are at +0, +1/4 and +1/2
 * of its start.
 * Repetitions are not unrolled backwards: moveToPrevious() steps to the source-previous measure, so after moving
 * back over a backward jump the enrolled timestamp refers to that measure's most recent pass.
 */
describe("MusicPartManagerIterator enrolled timestamp when moving backwards", () => {
    const sample: string = "OSMD_function_Test_Repeat.musicxml";
    /** measure indices in enrolled (playback) order */
    const enrolledMeasureOrder: number[] = [0, 0, 1, 2, 3, 2, 3, 1, 2, 3, 2, 3];
    /** positions within each measure, in whole notes */
    const positionsInMeasure: number[] = [0, 1 / 4, 1 / 2];
    /** enrolled timestamp of the end of the sheet, in whole notes */
    const enrolledEnd: number = enrolledMeasureOrder.length;

    interface Position {
        enrolled: number;
        source: number;
        measureIndex: number;
    }

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        // attach a wide container so all 4 measures fit into one system
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    function positionOf(iterator: MusicPartManagerIterator): Position {
        return {
            enrolled: iterator.CurrentEnrolledTimestamp.RealValue,
            source: iterator.CurrentSourceTimestamp.RealValue,
            measureIndex: iterator.CurrentMeasureIndex,
        };
    }

    /** All positions of the sheet in enrolled order (every measure is one whole note long). */
    function expectedPositions(): Position[] {
        const positions: Position[] = [];
        enrolledMeasureOrder.forEach((measureIndex, i) => {
            for (const positionInMeasure of positionsInMeasure) {
                positions.push({ enrolled: i + positionInMeasure, source: measureIndex + positionInMeasure, measureIndex: measureIndex });
            }
        });
        return positions;
    }

    /** A fresh iterator moved forward to the first position at or after the enrolled timestamp, or to the end. */
    function iteratorAt(enrolled: number): MusicPartManagerIterator {
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached && iterator.CurrentEnrolledTimestamp.RealValue < enrolled) {
            iterator.moveToNextVisibleVoiceEntry(false);
        }
        return iterator;
    }

    function cursorX(): number {
        return parseFloat(osmd.cursor.cursorElement.style.left);
    }

    /** The cursor's x (style.left) for a sheet x coordinate, as Cursor.updateWidthAndStyle() computes it for the default cursor type. */
    function cursorXFor(sheetX: number): number {
        return (sheetX - 1.5) * 10 * osmd.Zoom;
    }

    it("moveToPrevious() into the previous measure subtracts that measure's duration from the enrolled timestamp", () => {
        const iterator: MusicPartManagerIterator = iteratorAt(2); // the start of m2, after both passes of m1
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 2, source: 1, measureIndex: 1 });

        iterator.moveToPrevious(); // the half rest of m1 - its second pass directly precedes m2 in the enrolled order
        expect(positionOf(iterator), "after moveToPrevious()").to.deep.equal({ enrolled: 1.5, source: 0.5, measureIndex: 0 });
        iterator.moveToPrevious();
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 1.25, source: 0.25, measureIndex: 0 });
        iterator.moveToPrevious();
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 1, source: 0, measureIndex: 0 });

        // forward again: the measure's duration is added again exactly once
        iterator.moveToNext();
        iterator.moveToNext();
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 1.5, source: 0.5, measureIndex: 0 });
        iterator.moveToNext();
        expect(positionOf(iterator), "back at the start of m2").to.deep.equal({ enrolled: 2, source: 1, measureIndex: 1 });
    });

    it("moveToPrevious() over a backward jump steps to the source-previous measure, and moveToNext() returns", () => {
        const iterator: MusicPartManagerIterator = iteratorAt(5); // the second pass of m3, which follows m4 in the enrolled order
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 5, source: 2, measureIndex: 2 });

        // repetitions are not unrolled backwards: the half rest of m2 (the source-previous measure), half a whole note
        //   before in source and, consistently, in enrolled time - which pass of m2 that is stays ambiguous
        iterator.moveToPrevious();
        expect(positionOf(iterator), "after moveToPrevious()").to.deep.equal({ enrolled: 4.5, source: 1.5, measureIndex: 1 });
        iterator.moveToNext();
        expect(positionOf(iterator), "after moveToNext()").to.deep.equal({ enrolled: 5, source: 2, measureIndex: 2 });
    });

    it("moveToPrevious() + moveToNext() round trips are neutral at every position of the sheet", () => {
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        const visited: Position[] = [];
        while (!iterator.EndReached) {
            const position: Position = positionOf(iterator);
            visited.push(position);
            iterator.moveToPrevious();
            if (position.source === 0) {
                expect(iterator.FrontReached, "front reached before the first position of the sheet").to.equal(true);
            } else {
                const previous: Position = positionOf(iterator);
                expect(previous.source, "source timestamp after moveToPrevious() from source " + position.source)
                    .to.be.lessThan(position.source);
                // the enrolled timestamp moves back by the same amount as the source timestamp
                expect(position.enrolled - previous.enrolled, "enrolled step back from enrolled " + position.enrolled)
                    .to.equal(position.source - previous.source);
            }
            iterator.moveToNext();
            expect(positionOf(iterator), "position after moveToPrevious() + moveToNext()").to.deep.equal(position);
            iterator.moveToNext();
        }
        expect(visited).to.deep.equal(expectedPositions());
        expect(iterator.CurrentEnrolledTimestamp.RealValue, "enrolled end").to.equal(enrolledEnd);
    });

    it("at the end of the sheet, moveToPrevious() returns to the last position and moveToNext() to the end, repeatedly", () => {
        const iterator: MusicPartManagerIterator = iteratorAt(enrolledEnd);
        expect(iterator.EndReached).to.equal(true);
        expect(iterator.CurrentEnrolledTimestamp.RealValue, "enrolled end").to.equal(enrolledEnd);
        for (let i: number = 1; i <= 3; i++) {
            iterator.moveToPrevious(); // the half rest in the last pass of m4
            expect(iterator.EndReached, "EndReached after moveToPrevious(), round trip " + i).to.equal(false);
            expect(positionOf(iterator), "position after moveToPrevious(), round trip " + i)
                .to.deep.equal({ enrolled: enrolledEnd - 1 / 2, source: 3.5, measureIndex: 3 });
                iterator.moveToNext();
            expect(iterator.EndReached, "EndReached after moveToNext(), round trip " + i).to.equal(true);
            expect(iterator.CurrentEnrolledTimestamp.RealValue, "enrolled timestamp at the end, round trip " + i).to.equal(enrolledEnd);
        }
    });

    it("an end set by Sheet.SelectionEnd is reached at a position of the sheet, moving back from it subtracts nothing extra", () => {
        osmd.Sheet.MusicPartManager.setSelectionRange(new Fraction(0, 1), new Fraction(2, 1)); // up to the end of m2 (source)
        const iterator: MusicPartManagerIterator = iteratorAt(enrolledEnd);
        // the selection end is reached at the first position at or after it: the start of m3, which stays the position
        expect(iterator.EndReached).to.equal(true);
        expect(positionOf(iterator)).to.deep.equal({ enrolled: 3, source: 2, measureIndex: 2 });

        iterator.moveToPrevious(); // the half rest of m2
        expect(iterator.EndReached, "EndReached after moveToPrevious()").to.equal(false);
        expect(positionOf(iterator), "after moveToPrevious()").to.deep.equal({ enrolled: 2.5, source: 1.5, measureIndex: 1 });
        iterator.moveToNext();
        expect(iterator.EndReached, "EndReached after moveToNext()").to.equal(true);
        expect(positionOf(iterator), "after moveToNext()").to.deep.equal({ enrolled: 3, source: 2, measureIndex: 2 });
    });

    it("cursor.previous() + next() round trips keep the position, update() at the end of the sheet keeps showing the end", () => {
        osmd.cursor.show();
        osmd.cursor.reset();
        const iterator: MusicPartManagerIterator = osmd.cursor.Iterator;
        /** cursor x per source timestamp: it depends on the source position only, not on the repetition pass */
        const xBySource: Map<number, number> = new Map<number, number>();
        const visited: Position[] = [];
        while (!iterator.EndReached) {
            const position: Position = positionOf(iterator);
            visited.push(position);
            const x: number = cursorX();
            if (xBySource.has(position.source)) {
                expect(x, "cursor x at source " + position.source + " in a later pass").to.equal(xBySource.get(position.source));
            }
            xBySource.set(position.source, x);
            osmd.cursor.previous();
            osmd.cursor.next();
            expect(positionOf(iterator), "position after previous() + next() at enrolled " + position.enrolled).to.deep.equal(position);
            expect(cursorX(), "cursor x after previous() + next() at enrolled " + position.enrolled).to.equal(x);
            osmd.cursor.next();
        }
        expect(visited).to.deep.equal(expectedPositions());
        expect(osmd.cursor.Iterator === iterator, "the cursor keeps its iterator").to.equal(true);

        // at the end, update() shows the end of the last measure (moving the iterator back and forth for its position)
        //   - each time it is called
        const lastMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[3][0];
        const xEnd: number = cursorXFor(lastMeasure.PositionAndShape.AbsolutePosition.x + lastMeasure.PositionAndShape.Size.width);
        expect(xEnd, "end of the last measure right of its last position").to.be.greaterThan(xBySource.get(3.5));
        for (let i: number = 1; i <= 3; i++) {
            osmd.cursor.update();
            expect(iterator.EndReached, "EndReached after update() " + i).to.equal(true);
            expect(iterator.CurrentEnrolledTimestamp.RealValue, "enrolled timestamp after update() " + i).to.equal(enrolledEnd);
            expect(cursorX(), "cursor x after update() " + i).to.be.closeTo(xEnd, 0.01);
        }

        // walking back from the end to the front: enrolled and source timestamps move back by the same amounts,
        //   and every position shows the cursor where the forward walk showed it for the same source position
        osmd.cursor.previous();
        expect(positionOf(iterator), "after previous() from the end").to.deep.equal({ enrolled: enrolledEnd - 1 / 2, source: 3.5, measureIndex: 3 });
        let before: Position = positionOf(iterator);
        const sourcesBackwards: number[] = [before.source];
        expect(cursorX(), "cursor x at source " + before.source).to.equal(xBySource.get(before.source));
        osmd.cursor.previous();
        while (!iterator.FrontReached) {
            const after: Position = positionOf(iterator);
            sourcesBackwards.push(after.source);
            expect(before.enrolled - after.enrolled, "enrolled step back to source " + after.source).to.equal(before.source - after.source);
            expect(cursorX(), "cursor x at source " + after.source).to.equal(xBySource.get(after.source));
            before = after;
            osmd.cursor.previous();
        }
        expect(sourcesBackwards).to.deep.equal([3.5, 3.25, 3, 2.5, 2.25, 2, 1.5, 1.25, 1, 0.5, 0.25, 0]);
        // at the front, update() shows the start of the first measure; next() returns to the first position
        const firstMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        expect(cursorX(), "cursor x at the front").to.be.closeTo(cursorXFor(firstMeasure.PositionAndShape.AbsolutePosition.x), 0.01);
        osmd.cursor.next();
        expect(positionOf(iterator), "after next() from the front").to.deep.equal(before);
        expect(cursorX(), "cursor x after next() from the front").to.equal(xBySource.get(0));
    });
});
