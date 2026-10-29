import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ClefEnum, ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";

/**
 * With a staff of a multi-staff instrument hidden (Staff.Visible = false, e.g. "left hand only" for a piano, #1599), the staff
 * lines from the hidden staff's position on were drawn with the clef, key and time signature of the staff above them: the
 * system builder took them from a list of the visible instruments' staves that still contained the hidden staff
 * (GraphicalMusicSheet.getVisibleStavesIndicesFromSourceMeasure()). The notes kept the positions of their own staff's clef,
 * so they read as other pitches, e.g. the left hand's D3 as B4 under a treble clef.
 */
describe("Clefs of the staves with a hidden staff of their instrument (#1599)", () => {
    /** Piano (staves 0 and 1) and violin (staff 2), new-system at m.4. m.1-3: D major, 3/4. m.4-6: B-flat major, 2/4.
     *  The piano's lower staff changes to the treble clef at m.5 and back to the bass clef at m.6. */
    const sampleFilename: string = "test_hidden_staff_clef_key_time.musicxml";

    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.setOptions({ newSystemFromXML: true });
    });

    afterEach(() => {
        osmd.clear();
        div.remove();
    });

    /** e.g. "G2" for the treble clef, "F4" for the bass clef */
    function clefName(clef: ClefInstruction): string {
        return ClefEnum[clef.ClefType] + clef.Line;
    }

    function systems(): MusicSystem[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
    }

    /** Per system, the clef each staff line starts with (drawn at the system start, where it also places the key signature),
     *  as "<staff index in the sheet>: <clef>". */
    function systemStartClefs(): string[][] {
        return systems().map(system => system.StaffLines.map((staffLine: StaffLine) =>
            `${staffLine.ParentStaff.idInMusicSheet}: ${clefName(staffLine.Measures[0].InitiallyActiveClef)}`));
    }

    /** The measures that start with another clef than the one their first note is drawn with,
     *  as "m.<number>, staff <index>: <start clef> / <note clef>". */
    function measuresStartingInAnotherClef(): string[] {
        const mismatches: string[] = [];
        for (const staffLine of systems().flatMap(system => system.StaffLines)) {
            for (const measure of staffLine.Measures) {
                const firstNote: VexFlowGraphicalNote = measure.staffEntries[0]?.graphicalVoiceEntries[0]?.notes[0] as VexFlowGraphicalNote;
                if (!firstNote) {
                    continue; // the measure with the courtesy key and time signature at the end of system 1
                }
                const startClef: string = clefName(measure.InitiallyActiveClef);
                const noteClef: string = clefName(firstNote.Clef());
                if (startClef !== noteClef) {
                    mismatches.push(`m.${measure.MeasureNumber}, staff ${staffLine.ParentStaff.idInMusicSheet}: ${startClef} / ${noteClef}`);
                }
            }
        }
        return mismatches;
    }

    it("draws the left hand in the bass clef and the violin in the treble clef when the right hand is hidden", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
        expect(systemStartClefs(), "all staves shown").to.deep.equal([["0: G2", "1: F4", "2: G2"], ["0: G2", "1: F4", "2: G2"]]);

        osmd.Sheet.Instruments[0].Staves[0].Visible = false;
        osmd.render();
        expect(systemStartClefs(), "left hand only").to.deep.equal([["1: F4", "2: G2"], ["1: F4", "2: G2"]]);
        expect(measuresStartingInAnotherClef(), "left hand only: the left hand's clef changes are on its staff").to.deep.equal([]);
    });

    it("draws the violin in the treble clef when the left hand is hidden", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.Sheet.Instruments[0].Staves[1].Visible = false;
        osmd.render();
        expect(systemStartClefs(), "right hand only").to.deep.equal([["0: G2", "2: G2"], ["0: G2", "2: G2"]]);
        expect(measuresStartingInAnotherClef(), "right hand only: the hidden left hand's clef changes aren't drawn on the violin's staff")
            .to.deep.equal([]);
    });
});
