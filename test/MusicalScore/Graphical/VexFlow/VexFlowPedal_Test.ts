import { expect } from "vitest";
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
