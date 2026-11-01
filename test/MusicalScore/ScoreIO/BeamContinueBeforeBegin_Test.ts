import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Beam } from "../../../src/MusicalScore/VoiceData/Beam";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

/**
 * A beam whose continue/end notes come before its begin note in the document (the notes of a voice written staff by
 * staff, as some exporters do for a voice crossing to the other staff of a piano) was dropped by the reader ("invalid
 * beamnumber"): flags instead of the beam. The reader now keeps such a run as a beam without a begin and merges it into
 * the begun beam it follows in time (VoiceGenerator.orphanBeams).
 *
 * Fixture: piano, 4/4. m1 voice 6: D3 ×4 (begin…end) and E3 (begin) on staff 2, written after its C4 ×3 (continue,
 * continue, end) on staff 1; m2 the same music in time order.
 */
describe("Beam continue/end before its begin in the document", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_beam_continue_before_begin.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });
    const voiceNotes: (measureIndex: number, voiceId: number) => Note[] = (measureIndex: number, voiceId: number) => {
        const notes: Note[] = [];
        for (const verticalContainer of osmd.Sheet.SourceMeasures[measureIndex].VerticalSourceStaffEntryContainers) {
            for (const entry of verticalContainer.StaffEntries) {
                for (const voiceEntry of (entry?.VoiceEntries ?? []) as VoiceEntry[]) {
                    if (voiceEntry.ParentVoice.VoiceId === voiceId) {
                        notes.push(...voiceEntry.Notes);
                    }
                }
            }
        }
        return notes;
    };

    for (const [index, name] of [[0, "staff by staff"], [1, "in time order"]] as [number, string][]) {
        it(`m${index + 1} (${name}): voice 6 reads two beams of four notes`, () => {
            const notes: Note[] = voiceNotes(index, 6);
            expect(notes.length).to.equal(8);
            const beams: Set<Beam> = new Set<Beam>();
            for (const note of notes) {
                expect(note.NoteBeam, `${note.Pitch.ToString()} is beamed`).to.not.equal(undefined);
                beams.add(note.NoteBeam);
            }
            expect(beams.size).to.equal(2);
            for (const beam of beams) {
                expect(beam.Notes.length).to.equal(4);
                const timestamps: number[] = beam.Notes.map(n => n.ParentStaffEntry.Timestamp.RealValue);
                expect(timestamps, "in time order").to.deep.equal([...timestamps].sort((a, b) => a - b));
            }
            const second: Beam = [...beams].find(b => b.Notes[0].Pitch.ToStringShort(3) !== "D3");
            expect(second.Notes.map(n => n.ParentStaffEntry.ParentStaff.Id), "staff 2 then staff 1").to.deep.equal([2, 1, 1, 1]);
        });

    }
});
