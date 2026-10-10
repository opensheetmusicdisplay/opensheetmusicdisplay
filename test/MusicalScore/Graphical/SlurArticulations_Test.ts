import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { ArticulationEnum } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { Articulation } from "../../../src/MusicalScore/VoiceData/Articulation";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/** A box relative to a staff line, like a slur's points. */
interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * A slur that starts or ends at a note with articulations on the slur's side keeps clear of them. Staccato and tenuto marks go
 * between the note and the slur (Gould, Behind Bars, p. 121); accents and other marks go outside the slur, which passes under
 * them, closer to the note (p. 122), unless they would then be too far from the note, and so does a fermata (pp. 188-189). The
 * slur used to start at the note head as if there were no marks, through them, and end a fixed distance
 * (SlurEndArticulationYOffset) beyond the note head, which didn't clear e.g. a staccato in the stave space above a note on a line,
 * an accent or a fermata just above the staff.
 * test_slur_articulations_start_end: one slur per measure, with marks at its start or end, see the comment in the sample.
 * test_slur_end_clear_of_articulations (from isc's PR #1827): slurs ending at marks, see the comment in the sample.
 * test_slur_articulations_outside: accents and a fermata outside slurs, and slurs beside fingerings, see the comment in the sample.
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

    /** The slur starting in the measure. */
    function slurIn(measure: number): GraphicalSlur {
        return slurs().find((graphicalSlur: GraphicalSlur) => graphicalSlur.staffEntries[0].parentMeasure.MeasureNumber === measure);
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

    /** The start or end note of the slur. */
    function endNote(slur: GraphicalSlur, end: "start" | "end"): GraphicalNote {
        return end === "start"
            ? slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote)
            : slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
    }

    /** The SVG group of the marks drawn at the note (its modifiers). */
    function marksGroup(note: GraphicalNote): SVGGraphicsElement {
        const group: SVGGraphicsElement = (note as VexFlowGraphicalNote).getSVGGElement().querySelector(".vf-modifiers");
        expect(group, `the marks of the note in measure ${note.sourceNote.SourceMeasure.MeasureNumber}`).to.not.equal(null);
        return group;
    }

    /** The box of an SVG element, relative to the staff line like a slur's points. */
    function toStaffLine(element: SVGGraphicsElement, staffLine: StaffLine): Box {
        const box: DOMRect = element.getBBox();
        const origin: {x: number, y: number} = staffLine.PositionAndShape.AbsolutePosition;
        return {
            left: box.x / unitInPixels - origin.x, right: (box.x + box.width) / unitInPixels - origin.x,
            top: box.y / unitInPixels - origin.y, bottom: (box.y + box.height) / unitInPixels - origin.y,
        };
    }

    /** The boxes of the marks drawn at the slur's start or end note, each (or all in one box), from the note outward. */
    function drawnMarks(slur: GraphicalSlur, end: "start" | "end", each: boolean = false): Box[] {
        const staffLine: StaffLine = slur.staffEntries[0].parentMeasure.ParentStaffLine;
        const group: SVGGraphicsElement = marksGroup(endNote(slur, end));
        if (!each) {
            return [toStaffLine(group, staffLine)];
        }
        const boxes: Box[] = Array.from(group.children).map((mark: Element) => toStaffLine(mark as SVGGraphicsElement, staffLine));
        return boxes.sort((a: Box, b: Box) => slur.placement === PlacementEnum.Above ? b.bottom - a.bottom : a.top - b.top);
    }

    /** How far the slur passes beyond the box, at the closest over its width (negative where it runs into it), or, with underBox,
     *  how far it passes under it, between it and the note. */
    function clearanceFrom(slur: GraphicalSlur, box: Box, underBox: boolean = false): number {
        let closest: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 1000; i++) {
            const point: {x: number, y: number} = curvePoint(slur, i / 1000);
            if (point.x >= box.left && point.x <= box.right) {
                const beyond: number = slur.placement === PlacementEnum.Above ? box.top - point.y : point.y - box.bottom;
                const under: number = slur.placement === PlacementEnum.Above ? point.y - box.bottom : box.top - point.y;
                closest = Math.min(closest, underBox ? under : beyond);
            }
        }
        return closest;
    }

    /** How far the slur passes beyond the marks of its start or end note, at the closest over their width (negative where it runs
     *  into them), or, with underMarks, how far it passes under them, between them and the note. */
    function clearance(slur: GraphicalSlur, end: "start" | "end", underMarks: boolean = false): number {
        return clearanceFrom(slur, drawnMarks(slur, end)[0], underMarks);
    }

    /** Whether the slur's start or end note has a mark that goes outside the slur, an accent or a fermata (see GraphicalSlur). */
    function hasMarkOutside(slur: GraphicalSlur, end: "start" | "end"): boolean {
        return endNote(slur, end).sourceNote.ParentVoiceEntry.Articulations.some((articulation: Articulation) =>
            [ArticulationEnum.accent, ArticulationEnum.fermata].includes(articulation.articulationEnum));
    }

    /** "the slur of m.3 from D5 to B4" (OSMD's octave 1 is octave 4). */
    function describeSlur(slur: GraphicalSlur): string {
        return `the slur of m.${slur.staffEntries[0].parentMeasure.MeasureNumber} from ${slur.slur.StartNote.Pitch.ToStringShort(3)}` +
            ` to ${slur.slur.EndNote.Pitch.ToStringShort(3)}`;
    }

    /** What calculateCurve() keeps from a note head, less what a short slur rising steeply to its end comes closer just before it
     *  (test_slur_end_clear_of_articulations m.1: 0.06). */
    function minClearance(): number {
        return osmd.EngravingRules.SlurNoteHeadYOffset - 0.1;
    }
    // what a mark outside the slur keeps from the curve's outer edge (GraphicalSlur.articulationOutsideSlurDistance), from the curve
    const minClearanceUnder: number = 0.3;

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`keeps each slur clear of the articulations of its start and end notes, on every render (${skyline})`, async () => {
            await osmd.load(TestUtils.getScore("test_slur_articulations_start_end.musicxml"));
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            // the measure, and the end of its slur at the marks
            const ends: [number, "start" | "end"][] = [[1, "end"], [2, "start"], [3, "start"], [3, "end"], [4, "start"], [4, "end"],
                                                       [5, "end"], [6, "start"]];
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                expect(slurs().length, render).to.equal(6);
                for (const [measure, end] of ends) {
                    const slur: GraphicalSlur = slurIn(measure);
                    // m.6: the accent goes outside the slur
                    const underMarks: boolean = hasMarkOutside(slur, end);
                    // (before PR #1828, m.1's slur ended in the dot, m.2's started under it, m.3's started through the tenuto, m.4's
                    //   started and ended on the dots, m.6's started through the accent)
                    expect(clearance(slur, end, underMarks), `${render}: ${describeSlur(slur)}, its ${end} ${underMarks ? "under" : "beyond"}` +
                        " the marks").to.be.at.least(underMarks ? minClearanceUnder : minClearance());
                }
            }

            await osmd.load(TestUtils.getScore("test_slur_end_clear_of_articulations.musicxml"));
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                expect(slurs().length, render).to.equal(13);
                for (const slur of slurs()) {
                    // the accents of m.3 and m.6 and the fermatas go outside the slur, which passes under them, but not the accent of
                    //   m.5 at the end of a stem of the upper voice, on the beam, which would then be too far from it (Behind Bars p. 122)
                    const underMarks: boolean = hasMarkOutside(slur, "end") &&
                        slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber !== 5;
                    // (before PR #1828, the slurs ran into the staccato of m.1, the accents of m.3, m.5 and m.6, and the fermata of m.7)
                    expect(clearance(slur, "end", underMarks), `${render}: ${describeSlur(slur)}, its end ${underMarks ? "under" : "beyond"}` +
                        " the marks").to.be.at.least(underMarks ? minClearanceUnder : minClearance());
                }
            }
        });
    }

    // test_slur_overlap_articulation_accent: accents at the start of slurs that are placed in the XML, above and below. They go
    //   outside the slurs, which start closer to the notes, under them.
    it("places an accent at the start of a slur outside it", async () => {
        await osmd.load(TestUtils.getScore("test_slur_overlap_articulation_accent.musicxml"));
        osmd.render();
        for (const placement of [PlacementEnum.Above, PlacementEnum.Below]) {
            const slur: GraphicalSlur = slurs().find((graphicalSlur: GraphicalSlur) => graphicalSlur.placement === placement);
            expect(clearance(slur, "start", true), `the slur ${placement === PlacementEnum.Above ? "above" : "below"}, under the accent`)
                .to.be.at.least(minClearanceUnder);
        }
    });

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`places accents and fermatas outside a slur at its start or end, and starts it beside fingerings (${skyline})`, async () => {
            await osmd.load(TestUtils.getScore("test_slur_articulations_outside.musicxml"));
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            let firstRenderAccent: Box;
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                expect(slurs().length, render).to.equal(9);
                // m.1, m.2, m.4, m.5, m.7: the accent or fermata outside the slur, which passes under it
                for (const [measure, end] of [[1, "start"], [2, "end"], [4, "start"], [5, "end"], [7, "start"]] as [number, "start" | "end"][]) {
                    const slur: GraphicalSlur = slurIn(measure);
                    expect(clearance(slur, end, true), `${render}: ${describeSlur(slur)}, its ${end} under the marks`)
                        .to.be.at.least(minClearanceUnder);
                }
                // m.1: on a re-render, the accent is where the first render put it, not moved on from there
                const accent: Box = drawnMarks(slurIn(1), "start")[0];
                if (!firstRenderAccent) {
                    firstRenderAccent = accent;
                }
                expect(accent.top, `${render}: the accent of m.1`).to.be.closeTo(firstRenderAccent.top, 0.01);

                // m.3: the staccato inside the slur, the accent outside
                const [staccato, accentOutside] = drawnMarks(slurIn(3), "start", true);
                expect(clearanceFrom(slurIn(3), staccato), `${render}: the slur of m.3 beyond the staccato`).to.be.at.least(minClearance());
                expect(clearanceFrom(slurIn(3), accentOutside, true), `${render}: the slur of m.3 under the accent`)
                    .to.be.at.least(minClearanceUnder);

                // m.6: rising steeply, the slur goes over the accent, which would be too far from the note above it
                expect(clearance(slurIn(6), "start"), `${render}: the slur of m.6 beyond the accent`).to.be.at.least(minClearance());

                // m.7: the fingering still above the accent, which moved out of the slur's way
                const fingering: GraphicalLabel = slurIn(7).staffEntries[0].FingeringEntries[0];
                const fingeringBottom: number = fingering.PositionAndShape.RelativePosition.y + fingering.PositionAndShape.BorderBottom;
                expect(drawnMarks(slurIn(7), "start")[0].top - fingeringBottom, `${render}: m.7, the fingering above the accent`)
                    .to.be.at.least(0);

                // m.8 and m.9: the slur starts beside the fingerings, right of them and lower than their top, past the staccato or
                //   tenuto (before, it started over them)
                for (const measure of [8, 9]) {
                    const slur: GraphicalSlur = slurIn(measure);
                    const fingerings: GraphicalLabel[] = slur.staffEntries[0].FingeringEntries;
                    const right: number = Math.max(...fingerings.map((label: GraphicalLabel) =>
                        label.PositionAndShape.RelativePosition.x + label.PositionAndShape.BorderRight));
                    const top: number = Math.min(...fingerings.map((label: GraphicalLabel) =>
                        label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderTop));
                    expect(slur.bezierStartPt.x - right, `${render}: ${describeSlur(slur)}, its start right of the fingerings`)
                        .to.be.at.least(0.2);
                    expect(slur.bezierStartPt.y - top, `${render}: ${describeSlur(slur)}, its start lower than the fingerings' top`)
                        .to.be.above(0);
                    expect(clearance(slur, "start"), `${render}: ${describeSlur(slur)}, its start beyond the mark`)
                        .to.be.at.least(minClearance());
                }
            }

            // without slurs, a re-render draws the accent of m.1 where Vexflow puts it at the note, not where the slur moved it
            //   (the move is reset for every render, see VexFlowMusicSheetCalculator.calculateMeasureXLayout())
            osmd.EngravingRules.RenderSlurs = false;
            osmd.render();
            const firstMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
            const accentAtNote: Box = toStaffLine(marksGroup(firstMeasure.staffEntries[0].graphicalVoiceEntries[0].notes[0]),
                                                  firstMeasure.ParentStaffLine);
            expect(accentAtNote.top - firstRenderAccent.top, "without slurs: the accent of m.1, below where the slur moved it")
                .to.be.at.least(0.3);
        });
    }
});
