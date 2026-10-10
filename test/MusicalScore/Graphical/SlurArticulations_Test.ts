import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * A slur that starts or ends at a note with articulations on the slur's side keeps clear of them. Staccato and tenuto marks go
 * between the note and the slur (Gould, Behind Bars, p. 121), and so do other marks the slur would run into; a mark beyond where
 * the slur starts or ends, e.g. a fermata well above the staff, stays outside the slur, which passes under it.
 * The slur started at the note head as if there were no marks, through them, and ended a fixed distance
 * (SlurEndArticulationYOffset) beyond the note head, which didn't clear e.g. a staccato in the stave space above a note on a line,
 * an accent or a fermata just above the staff.
 * test_slur_articulations_start_end: one slur per measure, with marks at its start or end, see the comment in the sample.
 * test_slur_end_clear_of_articulations (from isc's PR #1827): slurs ending at marks, see the comment in the sample.
 */
describe("Slur at a note with an articulation", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        // the same systems in every browser (ChromeHeadless's page is narrower): a slur across a system break is drawn in two parts
        container.style.width = "1350px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });

    /** The slurs of the sheet, in all systems (where the systems break depends on the page width). */
    function slurs(): GraphicalSlur[] {
        return osmd.GraphicSheet.MusicPages.flatMap((page: GraphicalMusicPage) => page.MusicSystems)
            .flatMap((system: MusicSystem) => system.StaffLines.flatMap((line: StaffLine) => line.GraphicalSlurs));
    }

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
        expect(group, `the marks of the note in measure ${note.sourceNote.SourceMeasure.MeasureNumber}`).to.not.equal(null);
        const box: DOMRect = group.getBBox();
        const origin: {x: number, y: number} = staffLine.PositionAndShape.AbsolutePosition;
        return {
            left: box.x / unitInPixels - origin.x, right: (box.x + box.width) / unitInPixels - origin.x,
            top: box.y / unitInPixels - origin.y, bottom: (box.y + box.height) / unitInPixels - origin.y,
        };
    }

    /** How far the slur passes beyond the marks of its start or end note, at the closest over their width (negative where it runs
     *  into them), or, with underMarks, how far it passes under them, between them and the note. */
    function clearance(slur: GraphicalSlur, end: "start" | "end", underMarks: boolean = false): number {
        const staffLine: StaffLine = slur.staffEntries[0].parentMeasure.ParentStaffLine;
        const note: GraphicalNote = end === "start"
            ? slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote)
            : slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
        const marks: {left: number, right: number, top: number, bottom: number} = drawnMarksBox(note, staffLine);
        let closest: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 1000; i++) {
            const point: {x: number, y: number} = curvePoint(slur, i / 1000);
            if (point.x >= marks.left && point.x <= marks.right) {
                const beyond: number = slur.placement === PlacementEnum.Above ? marks.top - point.y : point.y - marks.bottom;
                const under: number = slur.placement === PlacementEnum.Above ? point.y - marks.bottom : marks.top - point.y;
                closest = Math.min(closest, underMarks ? under : beyond);
            }
        }
        return closest;
    }

    /** "the slur of m.3 from D5 to B4" (OSMD's octave 1 is octave 4). */
    function describeSlur(slur: GraphicalSlur): string {
        return `the slur of m.${slur.staffEntries[0].parentMeasure.MeasureNumber} from ${slur.slur.StartNote.Pitch.ToStringShort(3)}` +
            ` to ${slur.slur.EndNote.Pitch.ToStringShort(3)}`;
    }

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`keeps each slur clear of the articulations of its start and end notes, on every render (${skyline})`, async () => {
            // what calculateCurve() keeps from a note head, less what a short slur rising steeply to its end comes closer just before
            //   it (test_slur_end_clear_of_articulations m.1: 0.06)
            const minClearance: number = osmd.EngravingRules.SlurNoteHeadYOffset - 0.1;
            // what the curve keeps from a mark it leaves outside (GraphicalSlur.articulationOutsideSlurMinDistance)
            const minClearanceUnder: number = 0.3;

            await osmd.load(TestUtils.getScore("test_slur_articulations_start_end.musicxml"));
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            // the measure, and the end of its slur at the marks
            const ends: [number, "start" | "end"][] = [[1, "end"], [2, "start"], [3, "start"], [3, "end"], [4, "start"], [4, "end"],
                                                       [5, "end"], [6, "start"]];
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                expect(slurs().length, render).to.equal(6);
                for (const [measure, end] of ends) {
                    const slur: GraphicalSlur = slurs().find((graphicalSlur: GraphicalSlur) =>
                        graphicalSlur.staffEntries[0].parentMeasure.MeasureNumber === measure);
                    // (before the fix, m.1's slur ended in the dot, m.2's started under it, m.3's started through the tenuto, m.4's
                    //   started and ended on the dots, m.6's started through the accent)
                    expect(clearance(slur, end), `${render}: ${describeSlur(slur)}, its ${end} beyond the marks`).to.be.at.least(minClearance);
                }
            }

            await osmd.load(TestUtils.getScore("test_slur_end_clear_of_articulations.musicxml"));
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                expect(slurs().length, render).to.equal(13);
                for (const slur of slurs()) {
                    // m.8 and m.10: the fermata above the staff stays outside the slur, which passes under it, as on develop
                    const underMarks: boolean = [8, 10].includes(slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber);
                    // (before the fix, the slurs ran into the staccato of m.1, the accents of m.3, m.5 and m.6, and the fermata of m.7)
                    expect(clearance(slur, "end", underMarks), `${render}: ${describeSlur(slur)}, its end ${underMarks ? "under" : "beyond"}` +
                        " the marks").to.be.at.least(underMarks ? minClearanceUnder : minClearance);
                }
            }
        });
    }

    // test_slur_overlap_articulation_accent: accents at the start of slurs that are placed in the XML, above and below. They are
    //   moved out for the slur (EngravingRules.SlurStartArticulationYOffsetOfArticulation): the slur above then starts between
    //   the note and the accent; the one below still ran into its accent, and starts beyond it.
    it("keeps an accent moved out for the slur outside it, unless the slur runs into it", async () => {
        await osmd.load(TestUtils.getScore("test_slur_overlap_articulation_accent.musicxml"));
        osmd.render();
        const [above, below] = [PlacementEnum.Above, PlacementEnum.Below].map((placement: PlacementEnum) =>
            slurs().find((slur: GraphicalSlur) => slur.placement === placement));
        expect(clearance(above, "start", true), "the slur above, under the accent").to.be.at.least(0.3);
        expect(clearance(below, "start"), "the slur below, beyond the accent").to.be.at.least(osmd.EngravingRules.SlurNoteHeadYOffset - 0.1);
    });
});
