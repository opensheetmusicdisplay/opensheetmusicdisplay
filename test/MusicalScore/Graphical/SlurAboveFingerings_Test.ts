import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A slur clears the fingerings above the notes it spans, its last note's included, by the distance it keeps from its notes.
 * The slur took the skyline from its first to its last staff entry, without them, and only kept the tangents at its start and end
 * above it: it ended in the fingering of its last note, and could graze one next to its start, since the curve runs under its tangents.
 * test_slur_above_fingerings_traumerei_measures3-4: Schumann's Träumerei m.3-4, with a player's fingerings:
 * a slur from the G4 to the D5 of m.3, over the 3 of the A4, and one from the F4 of m.3 to the half notes of m.4, whose G4 has a 3.
 */
describe("Slur above fingerings", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_above_fingerings_traumerei_measures3-4.musicxml"));
    });

    /** The point of the slur's curve at t, relative to its staff line. */
    function curvePoint(slur: GraphicalSlur, t: number): {x: number, y: number} {
        const u: number = 1 - t;
        const [p0, p1, p2, p3] = [slur.bezierStartPt, slur.bezierStartControlPt, slur.bezierEndControlPt, slur.bezierEndPt];
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        };
    }

    /** How far the slur passes above the label, at the closest (negative where it is lower than the label's top). */
    function clearance(slur: GraphicalSlur, labelBox: BoundingBox, staffLine: StaffLine): number {
        const left: number = labelBox.AbsolutePosition.x - staffLine.PositionAndShape.AbsolutePosition.x + labelBox.BorderLeft;
        const right: number = labelBox.AbsolutePosition.x - staffLine.PositionAndShape.AbsolutePosition.x + labelBox.BorderRight;
        const top: number = labelBox.AbsolutePosition.y - staffLine.PositionAndShape.AbsolutePosition.y + labelBox.BorderTop;
        let closest: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 1000; i++) {
            const point: {x: number, y: number} = curvePoint(slur, i / 1000);
            if (point.x >= left && point.x <= right) {
                closest = Math.min(closest, top - point.y); // negative y is up
            }
        }
        return closest;
    }

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`passes the slurs above the fingerings they span, on every render (${skyline})`, () => {
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            // what calculateCurve() keeps at the edges of the skyline samples, give or take how the curve is sampled here
            const minClearance: number = osmd.EngravingRules.SlurNoteHeadYOffset - 0.05;
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
                const slurs: GraphicalSlur[] = staffLine.GraphicalSlurs;
                expect(slurs.length, render).to.equal(2);
                for (const slur of slurs) {
                    expect(slur.placement, render).to.equal(PlacementEnum.Above);
                    const measure: number = slur.staffEntries[0].parentMeasure.MeasureNumber; // (1 and 2 in the sample)
                    for (const staffEntry of slur.staffEntries) {
                        for (const fingering of staffEntry.FingeringEntries) {
                            const label: string = `${render}: slur from m.${measure} over the fingering ${fingering.Label.text}` +
                                ` of m.${staffEntry.parentMeasure.MeasureNumber}`;
                            // (before the fix: the slur into m.4 ended 0.5 below the top of the 3 of its last note,
                            //   and the one in m.3 passed 0.1 above the 3 next to its start, 0.3 with the voice entry boxes reaching the beams)
                            expect(clearance(slur, fingering.PositionAndShape, staffLine), label).to.be.at.least(minClearance);
                        }
                    }
                }
                // the slur into m.4 ends above the 3 of its last note, instead of in it
                const slurIntoM4: GraphicalSlur = slurs.find(slur =>
                    slur.staffEntries[slur.staffEntries.length - 1].parentMeasure !== slur.staffEntries[0].parentMeasure);
                const lastEntry: GraphicalStaffEntry = slurIntoM4.staffEntries[slurIntoM4.staffEntries.length - 1];
                const three: GraphicalLabel = lastEntry.FingeringEntries.find(fingering => fingering.Label.text === "3");
                expect(three, render).to.not.equal(undefined);
                const threeTop: number = three.PositionAndShape.AbsolutePosition.y - staffLine.PositionAndShape.AbsolutePosition.y +
                    three.PositionAndShape.BorderTop;
                expect(slurIntoM4.bezierEndPt.y, `${render}: end of the slur above the 3 of its last note`).to.be.below(threeTop);
            }
        });
    }
});

/**
 * A slur isn't raised into a fingering it passes under: the sky line doesn't say what is under its points.
 * test_slur_under_fingering_on_other_voice_stem_traumerei_measure11: Schumann's Träumerei m.11, right hand: the lower voice's slur,
 * placed above, passes under the stem of the upper voice's B-flat4 and the 5 on it, which no slur within SlurTangentMaxAngle gets over.
 * Raised as far as that angle allows, it ran into the 5.
 */
describe("Slur under a fingering on the stem of another voice", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_under_fingering_on_other_voice_stem_traumerei_measure11.musicxml"));
    });
    afterEach(() => {
        container.remove();
    });

    for (const geometricSkyline of [true, false]) {
        it(`keeps the slur out of the 5 (${geometricSkyline ? "geometric" : "raster"} skyline)`, () => {
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            osmd.render();
            const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            expect(staffLine.GraphicalSlurs.length).to.equal(1);
            const slur: GraphicalSlur = staffLine.GraphicalSlurs[0];
            const five: GraphicalLabel = slur.staffEntries.flatMap(staffEntry => staffEntry.FingeringEntries)
                .find(fingering => fingering.Label.text === "5");
            expect(five).to.not.equal(undefined);
            const box: BoundingBox = five.PositionAndShape; // relative to the staff line
            const [left, right] = [box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight];
            const [top, bottom] = [box.RelativePosition.y + box.BorderTop, box.RelativePosition.y + box.BorderBottom];
            let highest: number = Number.POSITIVE_INFINITY; // the slur's highest point over the 5 (negative y is up)
            for (let i: number = 0; i <= 1000; i++) {
                const t: number = i / 1000;
                const u: number = 1 - t;
                const [p0, p1, p2, p3] = [slur.bezierStartPt, slur.bezierStartControlPt, slur.bezierEndControlPt, slur.bezierEndPt];
                const x: number = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
                const y: number = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
                if (x > left && x < right) {
                    highest = Math.min(highest, y);
                }
            }
            // under the 5, as it was before the curve cleared obstacles, at most grazing its box
            //   (raised into it, the slur ran through its upper half: 0.2 to 0.3 under its top)
            expect(highest, "the slur's highest point over the 5").to.be.above((top + bottom) / 2);
        });
    }
});
