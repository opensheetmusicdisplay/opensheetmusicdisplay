import { expect } from "vitest";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { MusicSystem } from "../../../../src/MusicalScore/Graphical/MusicSystem";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { VexFlowPedal } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { Staff } from "../../../../src/MusicalScore/VoiceData/Staff";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * A pedal line under the piano's bass staff across three systems, in a score of a violin and a piano. A system's staff lines
 * are only those of the staves drawn, so with the violin or the piano's treble staff hidden, the bass staff (the third staff
 * of the score) has the second staff line of each system, not the third.
 */
describe("Pedal line across systems", () => {
    const sampleFilename: string = "test_pedal_systembreak_first_instrument_invisible.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks: 3 systems regardless of width
    });
    afterEach(() => {
        container.remove();
    });

    /** "system: instrument staff m.start-end" for each drawn pedal line segment, from the measures of its start and end note */
    function pedalSegments(): string[] {
        const segments: string[] = [];
        osmd.GraphicSheet.MusicPages[0].MusicSystems.forEach((system: MusicSystem, systemIndex: number) => {
            for (const staffLine of system.StaffLines) {
                for (const pedal of staffLine.Pedals as VexFlowPedal[]) {
                    const staff: Staff = staffLine.ParentStaff;
                    const startMeasure: number = pedal.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                    const endMeasure: number = pedal.endVfVoiceEntry?.parentStaffEntry.parentMeasure.MeasureNumber;
                    segments.push(`${systemIndex + 1}: ${staff.ParentInstrument.Name} staff ${staff.Id} m.${startMeasure}-${endMeasure}`);
                }
            }
        });
        return segments;
    }

    it("draws the pedal line on the staff lines of its staff when a staff above it is hidden", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
        const segments: string[] = ["1: Piano staff 2 m.1-1", "2: Piano staff 2 m.2-2", "3: Piano staff 2 m.3-3"];
        expect(pedalSegments(), "both instruments shown").to.deep.equal(segments);
        osmd.Sheet.Instruments[0].Visible = false; // the systems' staff line indices no longer match the staff indices
        osmd.render(); // threw a TypeError: the systems after the first have no third staff line
        expect(pedalSegments(), "violin hidden").to.deep.equal(segments);
        osmd.Sheet.Instruments[0].Visible = true;
        osmd.Sheet.Instruments[1].Staves[0].Visible = false; // e.g. to show only the left hand
        osmd.render(); // threw the same TypeError
        expect(pedalSegments(), "piano's treble staff hidden").to.deep.equal(segments);
    });
});

/**
 * Pedal signs (Ped. and *) of a bass staff, one system each: a Ped. under a beam far below the staff (like
 * CharlesGounod_Meditation m25), sign pedals released and pressed again at one note, and the * of a pedal from the system
 * before under such a beam. VexFlow draws the signs above their baseline, but they were placed as if centered on it, so a sign
 * overlapped what was above it by half its height. And a pedal was placed below the space of the pedals placed before it in
 * its staff line, so the signs of pedals released and pressed at one note went further down with each pedal. At that note,
 * the * was drawn on top of the Ped. sign.
 */
describe("Pedal signs below beams", () => {
    const sampleFilename: string = "test_pedal_signs_below_beams.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks: one system per case
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    /** A drawn shape's box, in units relative to the top staff line of its system */
    interface Box {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }

    /**
     * The boxes of the drawn shapes matching a selector in a system, from left to right.
     * @param selector e.g. ".vf-beam"
     * @param systemIndex the system, by its index on the page
     */
    function boxesInSystem(selector: string, systemIndex: number): Box[] {
        const staffTops: number[] = osmd.GraphicSheet.MusicPages[0].MusicSystems
            .map(system => system.StaffLines[0].PositionAndShape.AbsolutePosition.y);
        const boxes: Box[] = [];
        for (const element of Array.from(container.querySelectorAll(selector)) as SVGGraphicsElement[]) {
            const box: DOMRect = element.getBBox();
            const top: number = box.y / unitInPixels;
            // the system whose staff is the last one starting above the shape (all shapes here are below their staff)
            const index: number = staffTops.filter(staffTop => staffTop < top).length - 1;
            if (index === systemIndex) {
                const staffTop: number = staffTops[index];
                boxes.push({ left: box.x / unitInPixels, right: (box.x + box.width) / unitInPixels,
                    top: top - staffTop, bottom: (box.y + box.height) / unitInPixels - staffTop });
            }
        }
        return boxes.sort((a, b) => a.left - b.left);
    }

    /** The boxes of the drawn Ped. and * signs in a system (the " " texts of a pedal from or into another system aren't drawn) */
    function signBoxes(systemIndex: number): Box[] {
        return boxesInSystem(".vf-pedalmarking path, path.vf-pedalmarking", systemIndex);
    }

    /** The lowest point of the beams drawn above a sign, relative to the top staff line */
    function bottomOfBeamsAbove(sign: Box, systemIndex: number): number {
        return Math.max(...boxesInSystem(".vf-beam", systemIndex)
            .filter(beam => beam.left < sign.right && beam.right > sign.left)
            .map(beam => beam.bottom));
    }

    it("places a Ped. sign below a beam below the staff, close to it", () => {
        const ped: Box = signBoxes(0)[0];
        const beamBottom: number = bottomOfBeamsAbove(ped, 0);
        expect(beamBottom, "the beam is far below the staff (its bottom line at 4)").to.be.greaterThan(7);
        // (the sign's middle was at the beam's bottom)
        expect(ped.top, "the sign is below the beam").to.be.greaterThan(beamBottom);
        expect(ped.top - beamBottom, "the sign is close to the beam").to.be.lessThan(1);
    });

    it("places the signs of pedals released and pressed at one note at one height, 3 units below the staff", () => {
        const signs: Box[] = signBoxes(1);
        expect(signs.length, "Ped., * and Ped. at one note, *").to.equal(4);
        const pedSigns: Box[] = signs.filter(sign => sign.right - sign.left > 2.5); // the * is about 1.7 units wide
        expect(pedSigns.length, "two Ped. signs").to.equal(2);
        for (const ped of pedSigns) {
            // (the second pedal's signs were 2 units lower, below the space of the first pedal's *, then the first pedal's too)
            expect(ped.top, "Ped. 3 units below the staff, as without a pedal before it").to.be.closeTo(7, 0.05);
        }
        const stars: Box[] = signs.filter(sign => !pedSigns.includes(sign));
        expect(stars[1].top, "the * signs at one height").to.be.closeTo(stars[0].top, 0.01);
        // the * is a bit shorter than the Ped., with its top a bit lower
        expect(stars[0].top - pedSigns[0].top, "the * at the height of the Ped.").to.be.within(0, 0.5);
    });

    it("draws the * of pedals released and pressed again at one note left of the Ped. sign there", () => {
        const signs: Box[] = signBoxes(1); // from left to right: Ped., * and Ped. at one note (the pedal change), *
        expect(signs.length, "Ped., * and Ped. at one note, *").to.equal(4);
        for (let i: number = 1; i < signs.length; i++) {
            // (the * at the change was drawn on top of the Ped.)
            expect(signs[i].left, `sign ${i + 1} right of sign ${i}, not on it`).to.be.greaterThan(signs[i - 1].right);
        }
        const star: Box = signs[1];
        const ped: Box = signs[2];
        expect(star.right - star.left, "a * first at the change (about 1.7 units wide, the Ped. 3.1)").to.be.lessThan(2.5);
        expect(ped.left - star.right, "the * PedalReleaseSignMarginToPedSign left of the Ped.")
            .to.be.closeTo(osmd.EngravingRules.PedalReleaseSignMarginToPedSign, 0.05);
    });

    it("places the * of a pedal from the system before below a beam below the staff", () => {
        const signs: Box[] = signBoxes(3);
        expect(signs.length, "only the *").to.equal(1);
        const beamBottom: number = bottomOfBeamsAbove(signs[0], 3);
        expect(beamBottom, "the beam is far below the staff").to.be.greaterThan(7);
        // (only the space under the Ped., which this part of the pedal doesn't draw, was checked)
        expect(signs[0].top, "the sign is below the beam").to.be.greaterThan(beamBottom);
        expect(signs[0].top - beamBottom, "the sign is close to the beam").to.be.lessThan(1);
    });
});

/**
 * The line and sign attributes of pedals, a bass staff, a system per line attribute (none, "yes", "no"), each with a pedal per
 * measure for the values of the sign attribute, then a pedal with line="yes" sign="yes" from m9 into the next system, changed
 * there (m10). line="yes" sign="yes" draws the Ped. sign, then the line; it was read as a line only. In m11, two such pedals
 * meet: released and pressed again at one note (a stop and a start), as MuseScore writes pedals that meet. At the system break
 * between m9 and m10, the line ended at m9's last note and went on from m10's first note, without (Ped.).
 */
describe("Pedal line and sign attributes", () => {
    const sampleFilename: string = "test_pedal_line_and_sign.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    /** A drawn pedal shape: "Ped.", "*" or "line" (a piece of a line, with its hooks), the measure it starts in, its box in units */
    interface PedalShape {
        kind: string;
        measure: number;
        left: number;
        right: number;
        bottom: number;
    }

    /** The drawn pedal shapes, by the measure they start in (whose staff is the last one above them) */
    function pedalShapes(): PedalShape[] {
        const measures: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList.map(staffMeasures => staffMeasures[0]);
        const staffTop: (measure: GraphicalMeasure) => number = measure => measure.ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        const shapes: PedalShape[] = [];
        for (const element of Array.from(container.querySelectorAll(".vf-pedalmarking path, path.vf-pedalmarking")) as SVGGraphicsElement[]) {
            const box: DOMRect = element.getBBox();
            if (box.width === 0 && box.height === 0) {
                continue; // a line continued from the system before starts with a move to its start
            }
            const left: number = box.x / unitInPixels;
            const top: number = box.y / unitInPixels;
            const systemTop: number = Math.max(...measures.map(staffTop).filter(y => y < top));
            const measure: GraphicalMeasure = measures.filter(m => staffTop(m) === systemTop && m.PositionAndShape.AbsolutePosition.x <= left)
                .pop();
            const width: number = box.width / unitInPixels;
            // the lines are strokes, the signs filled glyphs, the Ped. about 3 units wide, the * about 1.7, a parenthesis 0.4
            const kind: string = element.getAttribute("fill") === "none" ? "line" : width > 2.5 ? "Ped." : width < 1 ? "parenthesis" : "*";
            shapes.push({ kind, measure: measure.MeasureNumber, left, right: left + width, bottom: (box.y + box.height) / unitInPixels });
        }
        // a Ped. right after a parenthesis: (Ped.), confirming at a system's start that the pedal goes on from the system before
        for (const ped of shapes.filter(shape => shape.kind === "Ped.")) {
            if (shapes.some(shape => shape.kind === "parenthesis" && shape.right <= ped.left && ped.left - shape.right < 0.5)) {
                ped.kind = "(Ped.)";
            }
        }
        return shapes;
    }

    it("draws the Ped. sign, then the line, for line=\"yes\" sign=\"yes\", only where the pedal is pressed", () => {
        const shapes: PedalShape[] = pedalShapes();
        const measuresWith: (kind: string) => number[] = kind =>
            [...new Set(shapes.filter(shape => shape.kind === kind).map(shape => shape.measure))].sort((a, b) => a - b);
        // (m5 and m9 had no Ped. sign; m10 continues m9's pedal into its system and changes it: no Ped. sign there)
        expect(measuresWith("Ped."), "the measures with a Ped. sign").to.deep.equal([2, 5, 7, 8, 9, 11]);
        expect(measuresWith("*"), "the measures with a * sign").to.deep.equal([2, 7, 8]);
        expect(measuresWith("line"), "the measures with a line").to.deep.equal([1, 3, 4, 5, 6, 9, 10, 11]);
        for (const measure of [5, 9]) {
            const ped: PedalShape = shapes.find(shape => shape.kind === "Ped." && shape.measure === measure);
            const line: PedalShape = shapes.find(shape => shape.kind === "line" && shape.measure === measure);
            expect(line.left, `m${measure}: the line starts right of the Ped. sign`).to.be.greaterThan(ped.right);
            expect(line.left - ped.right, `m${measure}: close to it`).to.be.lessThan(1);
            expect(line.bottom, `m${measure}: at the sign's bottom`).to.be.closeTo(ped.bottom, 0.1);
        }
    });

    it("ends the line with its hook left of the Ped. sign where the pedal is released and pressed again at one note", () => {
        const byLeft: (a: PedalShape, b: PedalShape) => number = (a, b) => a.left - b.left;
        const shapes: PedalShape[] = pedalShapes().filter(shape => shape.measure === 11);
        const peds: PedalShape[] = shapes.filter(shape => shape.kind === "Ped.").sort(byLeft);
        const lines: PedalShape[] = shapes.filter(shape => shape.kind === "line").sort(byLeft);
        expect(peds.length, "a Ped. sign per pedal").to.equal(2);
        expect(lines.length, "a line per pedal").to.equal(2);
        // (the hook was drawn inside the second Ped. sign)
        expect(lines[0].right, "the first line ends left of the second Ped. sign").to.be.lessThan(peds[1].left);
        expect(peds[1].left - lines[0].right, "PedalReleaseSignMarginToPedSign left of it")
            .to.be.closeTo(osmd.EngravingRules.PedalReleaseSignMarginToPedSign, 0.1);
    });

    /** The pedal shapes of m10 (at the start of a system, where m9's pedal goes on), from left to right */
    function shapesOfM10(): PedalShape[] {
        return pedalShapes().filter(shape => shape.measure === 10).sort((a, b) => a.left - b.left);
    }

    /** The x of m10's first note */
    function firstNoteOfM10(): number {
        return osmd.GraphicSheet.MeasureList[9][0].staffEntries[0].PositionAndShape.AbsolutePosition.x;
    }

    it("runs a pedal line going on in the next system to the end of the system, and on from the start of the next one", () => {
        const m9: GraphicalMeasure = osmd.GraphicSheet.MeasureList[8][0];
        const line9: PedalShape = pedalShapes().find(shape => shape.kind === "line" && shape.measure === 9);
        // (it ended at the end of m9's last note)
        expect(line9.right, "m9: the line to the end of its system")
            .to.be.closeTo(m9.PositionAndShape.AbsolutePosition.x + m9.PositionAndShape.Size.width, 0.1);
        const inM10: PedalShape[] = shapesOfM10();
        expect(inM10.every(shape => shape.kind === "line"), "m10: lines only (RenderPedalContinuationSign is false by default)")
            .to.equal(true);
        // (it started at m10's first note)
        expect(inM10[0].left, "m10: the line from the start of the system, before the first note").to.be.lessThan(firstNoteOfM10() - 1);
    });

    it("draws (Ped.) there, then the line, with RenderPedalContinuationSign", () => {
        const lineLeft: number = shapesOfM10()[0].left;
        osmd.EngravingRules.RenderPedalContinuationSign = true;
        osmd.render();
        const inM10: PedalShape[] = shapesOfM10();
        expect(inM10.slice(0, 4).map(shape => shape.kind), "m10: (Ped.), then the line")
            .to.deep.equal(["parenthesis", "(Ped.)", "parenthesis", "line"]);
        expect(inM10[0].left, "(Ped.) from where the line starts without it").to.be.closeTo(lineLeft, 0.1);
        expect(inM10[3].left - inM10[2].right, "the line right after it").to.be.within(0, 1);
    });
});

/**
 * Pedal lines without the hook at their start (MusicXML type="resume") or end (type="discontinue"), a bass staff, a pedal per
 * measure, the one of m4 into the next system: m1 resume line="yes" sign="yes" (MuseScore 4.2-4.7.1's Ped. + line pedal) and
 * stop, m2 resume and stop, m3 start and discontinue, m4-m5 resume and discontinue. Both types were ignored: the pedals
 * started with resume weren't drawn, and the one ended with discontinue went on.
 */
describe("Pedal lines resumed and discontinued", () => {
    const sampleFilename: string = "test_pedal_resume_discontinue.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system break
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    /** A drawn pedal (in one system): the measure it starts in, its parts, and where its line starts and ends, in units */
    interface DrawnPedal {
        measure: number;
        parts: string;
        lineLeft: number;
        lineRight: number;
    }

    /** The drawn pedals, by the measure they start in (whose staff is the last one above them) */
    function drawnPedals(): DrawnPedal[] {
        const measures: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList.map(staffMeasures => staffMeasures[0]);
        const staffTop: (measure: GraphicalMeasure) => number = measure => measure.ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        const pedals: DrawnPedal[] = [];
        for (const marking of Array.from(container.querySelectorAll("g.vf-pedalmarking, path.vf-pedalmarking"))) {
            const paths: SVGGraphicsElement[] = marking.tagName === "path" ? [marking as SVGGraphicsElement] :
                Array.from(marking.querySelectorAll("path"));
            // (a line going on from the system before, or resumed, starts with a move to its start: no box)
            const boxes: { box: DOMRect, stroke: boolean }[] = paths.map(path => ({ box: path.getBBox(), stroke: path.getAttribute("fill") === "none" }))
                .filter(shape => shape.box.width > 0 || shape.box.height > 0);
            const units: (pixels: number) => number = pixels => pixels / unitInPixels;
            const strokes: DOMRect[] = boxes.filter(shape => shape.stroke).map(shape => shape.box);
            // the lines are strokes, the Ped. sign a filled glyph; a start hook is drawn on its own, the end hook with the line
            const line: DOMRect = strokes.reduce((widest, box) => box.width > widest.width ? box : widest);
            const ped: boolean = boxes.some(shape => !shape.stroke);
            const startHook: boolean = strokes.some(box => units(box.width) < 0.1 && units(box.height) > 0.5);
            const endHook: boolean = units(line.height) > 0.5;
            const left: number = units(Math.min(...boxes.map(shape => shape.box.x)));
            const top: number = units(Math.min(...boxes.map(shape => shape.box.y)));
            const systemTop: number = Math.max(...measures.map(staffTop).filter(y => y < top));
            const measure: GraphicalMeasure = measures.filter(m => staffTop(m) === systemTop && m.PositionAndShape.AbsolutePosition.x <= left)
                .pop();
            const parts: string = [ped ? "Ped." : undefined, startHook ? "start hook" : undefined, "line", endHook ? "end hook" : undefined]
                .filter(part => part !== undefined).join(" + ");
            pedals.push({ measure: measure.MeasureNumber, parts, lineLeft: units(Math.min(...strokes.map(box => box.x))),
                          lineRight: units(Math.max(...strokes.map(box => box.x + box.width))) });
        }
        return pedals;
    }

    it("draws a resumed line without the start hook and a discontinued line without the end hook", () => {
        expect(drawnPedals().map(pedal => `m${pedal.measure}: ${pedal.parts}`)).to.deep.equal([
            "m1: Ped. + line + end hook", // resume line="yes" sign="yes", stop
            "m2: line + end hook", // resume, stop
            "m3: start hook + line", // start, discontinue
            "m4: line", // resume, into the next system
            "m5: line", // discontinue
        ]);
    });

    it("starts a resumed line where a start draws its hook, and ends a discontinued line where a stop draws its hook", () => {
        const pedals: DrawnPedal[] = drawnPedals();
        const resumed: DrawnPedal = pedals.find(pedal => pedal.measure === 2); // resume, stop
        const discontinued: DrawnPedal = pedals.find(pedal => pedal.measure === 3); // start, discontinue
        /** the x of the quarter (0-3) of the measure, where the pedals of m2 and m3 start (0) and end (3) */
        const noteX: (measure: number, quarter: number) => number = (measure, quarter) =>
            osmd.GraphicSheet.MeasureList[measure - 1][0].staffEntries[quarter].PositionAndShape.AbsolutePosition.x;
        expect(resumed.lineLeft - noteX(2, 0), "the line's start from its note").to.be.closeTo(discontinued.lineLeft - noteX(3, 0), 0.05);
        // (not at the end of the end note, like a line going on in the next system)
        expect(discontinued.lineRight - noteX(3, 3), "the line's end from its note").to.be.closeTo(resumed.lineRight - noteX(2, 3), 0.05);
    });
});

/**
 * Pedals pressed at a hidden whole-measure rest of voice 1, with the notes in voice 2 (as MuseScore 3 writes a staff whose music
 * is in its second voice), a bass staff, a system per pedal: m1 a line, a note below the second ledger line first; m2 the same
 * with line="yes" sign="yes" (Ped. + line); m3 a line into the next system, beamed eighths with down stems first. Such a line is
 * drawn from the start of the measure (as at a whole-measure rest of the only voice), but it was placed below what is under the
 * staff only from the rest on, which is centered in the measure: it ran through the notes before the rest.
 */
describe("Pedal lines at whole-measure rests", () => {
    const sampleFilename: string = "test_pedal_at_whole_measure_rest.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks: a system per pedal
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    /** A drawn shape's box, in units, its top and bottom relative to the top staff line of its system */
    interface Box {
        left: number;
        right: number;
        top: number;
        bottom: number;
        filled: boolean;
    }

    /**
     * The boxes of the drawn shapes (paths) matching a selector in a system, from left to right, without the transparent shapes
     * of hidden notes (the rests of voice 1).
     * @param selector e.g. "path.vf-beam"
     * @param systemIndex the system, by its index on the page
     */
    function boxesInSystem(selector: string, systemIndex: number): Box[] {
        const staffTops: number[] = osmd.GraphicSheet.MusicPages[0].MusicSystems
            .map(system => system.StaffLines[0].PositionAndShape.AbsolutePosition.y);
        const boxes: Box[] = [];
        for (const element of Array.from(container.querySelectorAll(selector)) as SVGGraphicsElement[]) {
            const fill: string = element.getAttribute("fill");
            if ((fill !== "none" ? fill : element.getAttribute("stroke")) === "#00000000") {
                continue; // a hidden note (print-object="no"), drawn transparent
            }
            const box: DOMRect = element.getBBox();
            if (box.width === 0 && box.height === 0) {
                continue; // a line continued from the system before starts with a move to its start
            }
            const top: number = box.y / unitInPixels;
            const bottom: number = (box.y + box.height) / unitInPixels;
            // the system whose staff is the last one starting above the shape's middle (a stem can reach above the staff)
            const index: number = staffTops.filter(staffTop => staffTop < (top + bottom) / 2).length - 1;
            if (index === systemIndex) {
                boxes.push({ left: box.x / unitInPixels, right: (box.x + box.width) / unitInPixels, top: top - staffTops[index],
                    bottom: bottom - staffTops[index], filled: element.getAttribute("fill") !== "none" });
            }
        }
        return boxes.sort((a, b) => a.left - b.left);
    }

    /** The drawn notes (their heads, stems etc.) and beams in a system, from left to right */
    function notesInSystem(systemIndex: number): Box[] {
        return boxesInSystem(".vf-stavenote path, path.vf-stavenote, .vf-beam path, path.vf-beam", systemIndex);
    }

    /** The lowest point of the notes (with their stems) and beams drawn in an x range of a system, relative to its top staff line */
    function bottomOfNotesAbove(shape: Box, systemIndex: number): number {
        return Math.max(...notesInSystem(systemIndex)
            .filter(box => box.left < shape.right && box.right > shape.left)
            .map(box => box.bottom));
    }

    it("places a line pressed at a whole-measure rest below the notes before the rest", () => {
        for (const systemIndex of [0, 2]) {
            const paths: Box[] = boxesInSystem(".vf-pedalmarking path, path.vf-pedalmarking", systemIndex);
            // the line, with its end hook if it has one (the start hook is drawn on its own)
            const line: Box = paths.reduce((widest, box) => box.right - box.left > widest.right - widest.left ? box : widest);
            const notesBottom: number = bottomOfNotesAbove(line, systemIndex);
            const firstNoteLeft: number = notesInSystem(systemIndex)[0].left;
            expect(notesBottom, `system ${systemIndex + 1}: notes far below the staff (its bottom line at 4)`).to.be.greaterThan(6.5);
            expect(line.left, `system ${systemIndex + 1}: the line from the start of the measure`).to.be.lessThan(firstNoteLeft);
            // (it was 2 units below the staff, through the notes)
            expect(line.bottom, `system ${systemIndex + 1}: the line below the notes`).to.be.greaterThan(notesBottom);
            expect(line.bottom - notesBottom, `system ${systemIndex + 1}: close to them`).to.be.lessThan(1.5);
        }
    });

    it("places the Ped. sign of a pedal pressed at a whole-measure rest below the notes before the rest", () => {
        const ped: Box = boxesInSystem(".vf-pedalmarking path, path.vf-pedalmarking", 1).find(box => box.filled);
        const notesBottom: number = bottomOfNotesAbove(ped, 1);
        expect(notesBottom, "a note far below the staff above the sign").to.be.greaterThan(6.5);
        // (it was drawn on that note)
        expect(ped.top, "the sign below the note").to.be.greaterThan(notesBottom);
    });
});
