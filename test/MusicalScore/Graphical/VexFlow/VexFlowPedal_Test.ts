import { expect } from "chai";
import { MusicSystem } from "../../../../src/MusicalScore/Graphical/MusicSystem";
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
