import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { Beam } from "../../../src/MusicalScore/VoiceData/Beam";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

/**
 * A note whose <beam number="2"> comes before its <beam number="1"> (e.g. a sixteenth triplet inside an eighth beam,
 * as some exports write it) was read by its first beam element: a begin of beam 2, which closed the open eighth beam,
 * so the eighths after the triplet were drawn with flags. The reader now takes the primary beam (number 1) whatever
 * the element order.
 *
 * Fixture: m1 the beam elements 2 then 1, m2 1 then 2 — both one beam of six notes.
 */
describe("Beam elements listed number 2 before number 1", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_beam_number_order.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });
    const notesOf: (measureIndex: number) => Note[] = (measureIndex: number) => {
        const notes: Note[] = [];
        for (const verticalContainer of osmd.Sheet.SourceMeasures[measureIndex].VerticalSourceStaffEntryContainers) {
            for (const entry of verticalContainer.StaffEntries) {
                for (const voiceEntry of (entry?.VoiceEntries ?? []) as VoiceEntry[]) {
                    notes.push(...voiceEntry.Notes.filter(n => !n.isRest()));
                }
            }
        }
        return notes;
    };

    for (const [index, name] of [[0, "number 2 first"], [1, "number 1 first"]] as [number, string][]) {
        it(`m${index + 1} (${name}): one beam over the six notes`, () => {
            const notes: Note[] = notesOf(index);
            expect(notes.length).to.equal(6);
            const beams: Set<Beam> = new Set<Beam>(notes.map(n => n.NoteBeam));
            expect(beams.size).to.equal(1);
            const beam: Beam = [...beams][0];
            expect(beam).to.not.equal(undefined);
            expect(beam.Notes.length).to.equal(6);
        });

        it(`m${index + 1} (${name}): drawn as one VexFlow beam, no flags`, () => {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const vfbeams: { [voiceID: number]: any[] } = (measure as any).vfbeams;
            const beams: any[] = [];
            for (const voiceId in vfbeams) {
                if (vfbeams.hasOwnProperty(voiceId)) {
                    beams.push(...vfbeams[voiceId]);
                }
            }
            expect(beams.length).to.equal(1);
            expect(beams[0].notes.length).to.equal(6);
        });
    }
});
