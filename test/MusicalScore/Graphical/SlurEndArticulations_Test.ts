import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * A slur ending at a note with an articulation on the slur's side ends past the articulation, by the distance it keeps
 * from a note head. It moved out by a fixed SlurEndArticulationYOffset, which didn't clear an accent, a staccato that
 * VexFlow moves from a line into the next space, or a fermata just above the staff. A fermata well above the staff, which
 * the slur passes under, stays outside the slur.
 * test_slur_end_clear_of_articulations: see the comment in the sample for each measure.
 */
describe("Slur end clear of articulations", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_end_clear_of_articulations.musicxml"));
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

    /** The box of the marks drawn at the note (its SVG group of modifiers), relative to the staff line like a slur's points. */
    function drawnMarksBox(note: GraphicalNote, staffLine: StaffLine): {left: number, right: number, top: number, bottom: number} {
        const group: SVGGraphicsElement = (note as VexFlowGraphicalNote).getSVGGElement().querySelector(".vf-modifiers");
        const box: DOMRect = group.getBBox();
        const origin: {x: number, y: number} = staffLine.PositionAndShape.AbsolutePosition;
        return {
            left: box.x / unitInPixels - origin.x, right: (box.x + box.width) / unitInPixels - origin.x,
            top: box.y / unitInPixels - origin.y, bottom: (box.y + box.height) / unitInPixels - origin.y,
        };
    }

    /** How far the slur passes outside the marks of its end note, at the closest over their width (negative where it runs into
     *  them), or, with underMarks, how far it passes under them, between them and the note. */
    function clearance(slur: GraphicalSlur, staffLine: StaffLine, underMarks: boolean = false): number {
        const endNote: GraphicalNote = slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
        const marks: {left: number, right: number, top: number, bottom: number} = drawnMarksBox(endNote, staffLine);
        let closest: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 1000; i++) {
            const point: {x: number, y: number} = curvePoint(slur, i / 1000);
            if (point.x >= marks.left && point.x <= marks.right) {
                const outside: number = slur.placement === PlacementEnum.Above ? marks.top - point.y : point.y - marks.bottom;
                const under: number = slur.placement === PlacementEnum.Above ? point.y - marks.bottom : marks.top - point.y;
                closest = Math.min(closest, underMarks ? under : outside);
            }
        }
        return closest;
    }

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`ends each slur outside the articulations of its last note, on every render (${skyline})`, () => {
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            // what calculateCurve() keeps from a note head at the end, less what a short slur rising steeply to its end comes
            //   closer just before it (m.1: 0.06)
            const minClearance: number = osmd.EngravingRules.SlurNoteHeadYOffset - 0.1;
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                const slurs: GraphicalSlur[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.flatMap(system =>
                    system.StaffLines.flatMap(line => line.GraphicalSlurs));
                expect(slurs.length, render).to.equal(13);
                for (const slur of slurs) {
                    const line: StaffLine = slur.staffEntries[0].parentMeasure.ParentStaffLine;
                    const measure: number = slur.staffEntries[0].parentMeasure.MeasureNumber;
                    // m.8: the fermata well above the staff stays outside the slur, which passes under it, as on develop
                    const underMarks: boolean = measure === 8;
                    // (OSMD's octave 1 is octave 4)
                    const label: string = `${render}: the slur of m.${measure} from ${slur.slur.StartNote.Pitch.ToStringShort(3)}` +
                        ` ending ${underMarks ? "under" : "outside"} the marks of its ${slur.slur.EndNote.Pitch.ToStringShort(3)}`;
                    // (before the fix, the slurs ran into the staccato of m.1, the accents of m.3, m.5 and m.6, and the fermatas of m.7 and m.10)
                    expect(clearance(slur, line, underMarks), label).to.be.at.least(minClearance);
                }
            }
        });
    }
});
