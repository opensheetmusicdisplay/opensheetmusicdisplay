import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/** The centre of a drawn note head (or TAB fret number), in units, and the voice entry of its note. */
interface DrawnNoteHead {
    center: PointF2D;
    voiceEntry: GraphicalVoiceEntry;
}

/**
 * GraphicalMusicSheet.GetNearestVoiceEntry() finds the voice entry of the note drawn at a position, e.g. of a click.
 * - It compares the distances of the entries' notes, not of the entries' positions: that's the top of the entry's bounding box,
 *   e.g. the stem tip of an up-stem note, and a click on its note head found another voice's note next to it.
 * - The voice entries of grace notes are where the grace notes are drawn, beside their main note. They were at the main note's
 *   position, so a click on the main note could find its grace note, and a click on a grace note found another note.
 */
describe("GetNearestVoiceEntry", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1200px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** Loads and renders the sample, and returns its drawn note heads. */
    async function render(sampleName: string): Promise<{ sheet: GraphicalMusicSheet, heads: DrawnNoteHead[] }> {
        container.innerHTML = "";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        const heads: DrawnNoteHead[] = [];
        for (const verticalMeasures of osmd.GraphicSheet.MeasureList) {
            for (const measure of verticalMeasures) {
                for (const voiceEntry of measure?.staffEntries.flatMap(staffEntry => staffEntry.graphicalVoiceEntries) ?? []) {
                    const note: VexFlowGraphicalNote = voiceEntry.notes[0] as VexFlowGraphicalNote;
                    if (note.sourceNote.isRest()) {
                        continue;
                    }
                    // the note's own drawing, not the grace notes drawn among its modifiers: its note heads, or the fret numbers of a TAB note
                    const group: Element = document.getElementById("vf-" + note.getSVGId());
                    const shapes: SVGGraphicsElement[] = Array.from(measure.isTabMeasure ?
                        group.querySelectorAll(":scope > text") : group.querySelectorAll(":scope > .vf-note .vf-notehead"));
                    expect(shapes.length, `drawn note heads of ${note.sourceNote.Pitch.ToStringShort(3)}`).to.be.greaterThan(0);
                    for (const shape of shapes) {
                        const box: DOMRect = shape.getBBox();
                        heads.push({ center: new PointF2D((box.x + box.width / 2) / 10, (box.y + box.height / 2) / 10), voiceEntry });
                    }
                }
            }
        }
        return { sheet: osmd.GraphicSheet, heads };
    }

    /** A description of the note of a voice entry for assertion messages. */
    function describeNote(voiceEntry: GraphicalVoiceEntry): string {
        return `${voiceEntry.parentVoiceEntry.IsGrace ? "grace note" : "note"} ${voiceEntry.notes[0].sourceNote.Pitch.ToStringShort(3)} ` +
            `in measure ${voiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`;
    }

    /** Expects a click on the note head to find its voice entry. Compared by identity: chai would print the whole object graph. */
    function expectFound(sheet: GraphicalMusicSheet, { center, voiceEntry }: DrawnNoteHead, sampleName: string): void {
        const found: GraphicalVoiceEntry = sheet.GetNearestVoiceEntry(center);
        expect(found === voiceEntry, `${sampleName}: ${describeNote(voiceEntry)}, found ${found ? describeNote(found) : "nothing"}`)
            .to.equal(true);
    }

    it("finds the note clicked on, also next to another voice's notes", async () => {
        // two voices on each staff: up-stem chords above down-stem notes
        const sampleName: string = "test_fingering_two_voices_pitch_order.musicxml";
        const { sheet, heads } = await render(sampleName);
        expect(heads.length).to.equal(12);
        for (const head of heads) {
            expectFound(sheet, head, sampleName);
        }
    });

    it("finds grace notes and their main notes (grace notes before and after the main note, TAB)", async () => {
        for (const sampleName of ["OSMD_function_test_GraceNotes.xml", "test_grace_notes_after_main_note_1706.musicxml",
                                  "test_tab_grace_note_simple.musicxml"]) {
            const { sheet, heads } = await render(sampleName);
            expect(heads.some(({ voiceEntry }) => voiceEntry.parentVoiceEntry.IsGrace), `grace notes in ${sampleName}`).to.equal(true);
            for (const head of heads) {
                expectFound(sheet, head, sampleName);
            }
        }
    });
});
