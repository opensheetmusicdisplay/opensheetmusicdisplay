import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { ClefEnum, ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { AbstractNotationInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/AbstractNotationInstruction";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";

/**
 * A clef change in the middle of a measure goes before the note of its staff at its time. When the staff had no note starting
 * there, the reader lost the clef (#1836): the staff kept its clef, and the notes after it were drawn with the old one, e.g.
 * far above the staff with many ledger lines. Now the clef goes before the next note of its staff, or to the end of the measure
 * if no note of its staff follows (InstrumentReader.savePendingClefInstructions()).
 */
describe("Clef changes without a note of their staff at their time (#1836)", () => {
    /** Violin and piano, 4/4. Piano m.1: the upper staff starts in the bass clef with G3 and changes to the treble clef after it,
     *  while the next note of its voice, E3, is on the lower staff, then C5 on the upper staff. m.2: the lower staff changes to
     *  the treble clef after a <backup> into its last note (G2, a half note from 1/2), with no note of the staff after it.
     *  m.3: C5 and E4, both in the treble clef. */
    const sampleFilename: string = "test_clef_change_cross_staff_voice_backup_1836.musicxml";
    /** the piano's staves (the violin is staff 0), so that the clefs also have to land on the staves of the right part */
    const upperStaff: number = 1;
    const lowerStaff: number = 2;

    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1000px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function loadAndRender(): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
        return osmd;
    }

    /** e.g. "G2" for the treble clef, "F4" for the bass clef */
    function clefName(clef: ClefInstruction): string {
        return ClefEnum[clef.ClefType] + clef.Line;
    }

    function clefNames(instructions: AbstractNotationInstruction[]): string[] {
        return instructions.filter(instruction => instruction instanceof ClefInstruction).map(clef => clefName(clef as ClefInstruction));
    }

    /** The clef each note of the staff in the measure is drawn with, in timestamp order. */
    function noteClefs(osmd: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): string[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][staffIndex];
        const clefs: string[] = [];
        for (const staffEntry of measure.staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    clefs.push(clefName((note as VexFlowGraphicalNote).Clef()));
                }
            }
        }
        return clefs;
    }

    it("puts a clef change whose voice continues on another staff before the next note of its staff", async () => {
        const osmd: OpenSheetMusicDisplay = await loadAndRender();
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        // the upper staff has no note at 1/4, where its clef changes: the next note of its voice, E3, is on the lower staff
        const staffEntryOfC5: SourceStaffEntry = measure.VerticalSourceStaffEntryContainers
            .find(verticalContainer => verticalContainer.Timestamp.RealValue === 0.5).StaffEntries[upperStaff];
        expect(clefNames(staffEntryOfC5.Instructions), "the clef is on the staff entry of C5, the next note of the upper staff")
            .to.deep.equal(["G2"]);
        expect(noteClefs(osmd, 0, upperStaff), "m.1, upper staff: G3 in the bass clef, C5 in the treble clef").to.deep.equal(["F4", "G2"]);
        expect(noteClefs(osmd, 1, upperStaff), "m.2, upper staff: E5").to.deep.equal(["G2"]);
        expect(noteClefs(osmd, 2, upperStaff), "m.3, upper staff: C5").to.deep.equal(["G2"]);
        expect(noteClefs(osmd, 0, lowerStaff), "m.1, lower staff: C3 and the voice's E3 in the bass clef").to.deep.equal(["F4", "F4"]);
    });

    it("puts a clef change with no note of its staff after it at the end of the measure", async () => {
        const osmd: OpenSheetMusicDisplay = await loadAndRender();
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[1];
        expect(clefNames(measure.LastInstructionsStaffEntries[lowerStaff]?.Instructions ?? []), "m.2, lower staff: clef at the end")
            .to.deep.equal(["G2"]);
        expect(measure.LastInstructionsStaffEntries[upperStaff], "m.2, upper staff: no clef at the end").to.equal(undefined);
        expect(noteClefs(osmd, 1, lowerStaff), "m.2, lower staff: C3 and G2 in the bass clef").to.deep.equal(["F4", "F4"]);
        expect(noteClefs(osmd, 2, lowerStaff), "m.3, lower staff: E4 in the treble clef").to.deep.equal(["G2"]);
    });
});
