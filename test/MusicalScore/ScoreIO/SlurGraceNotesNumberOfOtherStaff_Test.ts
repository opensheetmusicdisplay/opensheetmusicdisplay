import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { Slur } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Slur";

/**
 * test_slur_grace_notes_number_of_other_staff.musicxml (Mariage d'amour, m. 35): a slur between the right hand's two grace
 * notes, number 2, and a slur over the left hand's notes, number 2 too. The grace notes' slur is Vexflow's
 * (VoiceEntry.GraceSlur), so its start isn't read. Its stop on the second grace note was, since slurs that stop on a grace
 * note are (#2010): it ended no open slur, so it waited for a later start of its number as the end of a cross-staff slur,
 * and the left hand's start, in the same measure at the same timestamp, took it. That drew a slur from the left hand's
 * first note to the grace note, and none over the left hand, whose stop then ended nothing.
 */
describe("Slur between grace notes, and a slur of the other staff with the same number", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_grace_notes_number_of_other_staff.musicxml"));
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The notes of a staff in reading order: per staff entry, grace notes before the main note, then the main note. */
    function notesOfStaff(staffIndex: number): Note[] {
        const order: (voiceEntry: VoiceEntry) => number = (voiceEntry: VoiceEntry): number => voiceEntry.IsGrace ? 0 : 1;
        return osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers
            .map(verticalContainer => verticalContainer.StaffEntries[staffIndex]).filter(staffEntry => staffEntry)
            .flatMap(staffEntry => [...staffEntry.VoiceEntries].sort((a, b) => order(a) - order(b)))
            .flatMap(voiceEntry => voiceEntry.Notes);
    }

    it("reads the left hand's slur from its first to its last note", () => {
        const leftHand: Note[] = notesOfStaff(1); // F3, A3, C4, F4
        const slurs: Slur[] = leftHand[0].NoteSlurs;
        expect(slurs.length).to.equal(1);
        expect(slurs[0].EndNote === leftHand[3], "ends at the left hand's last note").to.equal(true);
        expect(leftHand[3].NoteSlurs.length).to.equal(1);
    });

    it("leaves the grace notes' slur to Vexflow, with no slur of OSMD's ending at a grace note", () => {
        const rightHand: Note[] = notesOfStaff(0); // grace A4, grace C5, F5, G5
        expect(rightHand[0].ParentVoiceEntry.IsGrace && rightHand[1].ParentVoiceEntry.IsGrace).to.equal(true);
        expect(rightHand[0].ParentVoiceEntry.GraceSlur, "Vexflow draws the slur from the grace notes").to.equal(true);
        expect(rightHand.flatMap(note => note.NoteSlurs).length, "no slur of OSMD's in the right hand").to.equal(0);
    });
});
