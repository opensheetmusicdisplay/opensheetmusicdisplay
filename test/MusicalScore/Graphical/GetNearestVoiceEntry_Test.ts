import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { TabNote } from "../../../src/MusicalScore/VoiceData/TabNote";
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
 * - The notes of a TAB chord are on their strings, so GetNearestNote() finds the clicked one. They were all at their voice entry's
 *   position, on the string of its last note: GetNearestNote() found the chord's first note, and a click on another string of the
 *   chord could find a neighbouring note.
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

    /** Loads and renders the sample: a MusicXML file, or an MXL file from the karma server. */
    async function renderSheet(sampleName: string): Promise<GraphicalMusicSheet> {
        container.innerHTML = "";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(sampleName.endsWith(".mxl") ? "base/test/data/" + sampleName : TestUtils.getScore(sampleName));
        osmd.render();
        return osmd.GraphicSheet;
    }

    /** Loads and renders the sample, and returns its drawn note heads. */
    async function render(sampleName: string): Promise<{ sheet: GraphicalMusicSheet, heads: DrawnNoteHead[] }> {
        const sheet: GraphicalMusicSheet = await renderSheet(sampleName);
        const heads: DrawnNoteHead[] = [];
        for (const verticalMeasures of sheet.MeasureList) {
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
        return { sheet, heads };
    }

    /** A description of the note of a voice entry for assertion messages. */
    function describeNote(voiceEntry: GraphicalVoiceEntry): string {
        return `${voiceEntry.parentVoiceEntry.IsGrace ? "grace note" : "note"} ${voiceEntry.notes[0].sourceNote.Pitch.ToStringShort(3)} ` +
            `in measure ${voiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`;
    }

    /** A description of a TAB note, or of another note found instead, for assertion messages. */
    function describeTabNote(note: GraphicalNote): string {
        const sourceNote: Note = note.sourceNote;
        const description: string = sourceNote instanceof TabNote ? `string ${sourceNote.StringNumberTab} fret ${sourceNote.FretNumber}` :
            sourceNote.isRest() ? "rest" : `note ${sourceNote.Pitch.ToStringShort(3)}`;
        return `${description} in measure ${note.parentVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`;
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

    it("finds the clicked note of a TAB chord (GetNearestNote())", async () => {
        // guitar chords listed from the lowest string, and bass chords from the highest string: their last notes are on either side
        for (const sampleName of ["BrookeWestSample.mxl", "test_tabs_4_strings_bass_guitar.musicxml"]) {
            const sheet: GraphicalMusicSheet = await renderSheet(sampleName);
            let chords: number = 0;
            for (const measure of sheet.MeasureList.flat()) {
                if (!measure?.isTabMeasure) {
                    continue;
                }
                for (const voiceEntry of measure.staffEntries.flatMap(staffEntry => staffEntry.graphicalVoiceEntries)) {
                    const notes: VexFlowGraphicalNote[] = voiceEntry.notes as VexFlowGraphicalNote[];
                    if (notes[0].sourceNote.isRest()) {
                        continue;
                    }
                    // the fret numbers drawn by the voice entry's Vexflow note, in the order of its notes' indices in it
                    const fretNumbers: SVGGraphicsElement[] = Array.from(
                        document.getElementById("vf-" + notes[0].getSVGId()).querySelectorAll(":scope > text"));
                    for (const note of notes) {
                        const box: DOMRect = fretNumbers[note.vfnote[1]].getBBox();
                        const center: PointF2D = new PointF2D((box.x + box.width / 2) / 10, (box.y + box.height / 2) / 10);
                        const found: GraphicalNote = sheet.GetNearestNote(center, undefined);
                        expect(found === note, `${sampleName}: ${describeTabNote(note)}, found ${found ? describeTabNote(found) : "nothing"}`)
                            .to.equal(true);
                    }
                    if (notes.length > 1) {
                        chords++;
                    }
                }
            }
            expect(chords, `TAB chords in ${sampleName}`).to.be.greaterThan(0);
        }
    });
});
