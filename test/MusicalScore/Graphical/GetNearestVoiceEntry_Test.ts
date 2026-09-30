import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
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
 * - Notes are at the heights of their note heads. They were placed below their voice entry's top (e.g. the stem tip of an up-stem
 *   note) by the length of a normal stem, but e.g. grace notes and cue notes have shorter stems, and 32nd notes longer ones.
 * - A note is at the centre of its note head, or of its fret number in a TAB staff, not at its staff entry's x (e.g. for the cursor),
 *   which can be elsewhere: at the right end of a fret number (a click on the centre of a fret number could be nearer the right end
 *   of the previous one), at the right edge of a note head with a flag (also of a grace note), between the note heads of a second,
 *   or at the note of another voice, which Vexflow moves aside to not overlap it.
 * - Rests in a TAB staff aren't found: they aren't drawn, and a click on the fret number of the next note could find the rest.
 * - The search can be limited to a page, e.g. the one clicked on: with a page format, each page has its own coordinates, so a position
 *   is on every page, and the nearest object of all pages can be on another page.
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

    /** A description of a note, e.g. a TAB note, or another note found instead, for assertion messages. */
    function describeGraphicalNote(note: GraphicalNote): string {
        const sourceNote: Note = note.sourceNote;
        const description: string = sourceNote instanceof TabNote ? `string ${sourceNote.StringNumberTab} fret ${sourceNote.FretNumber}` :
            sourceNote.isRest() ? "rest" : `note ${sourceNote.Pitch.ToStringShort(3)}`;
        return `${sourceNote.IsGraceNote ? "grace " : ""}${description} ` +
            `in measure ${note.parentVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`;
    }

    /** The box of the note's drawn note head, or of a TAB note's fret number, in pixels (10 per unit). */
    function drawnBox(note: VexFlowGraphicalNote): DOMRect {
        // the note's own drawing, not the grace notes drawn among its modifiers, in the order of the notes' indices in their Vexflow note
        const group: Element = document.getElementById("vf-" + note.getSVGId());
        if (!note.parentVoiceEntry.parentStaffEntry.parentMeasure.isTabMeasure) {
            return (group.querySelectorAll(":scope > .vf-note .vf-notehead")[note.vfnote[1]] as SVGGraphicsElement).getBBox();
        }
        // a fret number spans the advances of its digits: its box can end further right, by 2 pixels (0.2 units) in Firefox on macOS,
        //   by 0.6 pixels for a 4 in Chrome
        const fretNumber: SVGTextElement = group.querySelectorAll(":scope > text")[note.vfnote[1]] as SVGTextElement;
        const box: DOMRect = fretNumber.getBBox();
        return new DOMRect(fretNumber.getStartPositionOfChar(0).x, box.y, fretNumber.getComputedTextLength(), box.height);
    }

    /** The centre of the note's drawn note head, or of a TAB note's fret number, in units. */
    function drawnCenter(note: VexFlowGraphicalNote): PointF2D {
        const box: DOMRect = drawnBox(note);
        return new PointF2D((box.x + box.width / 2) / 10, (box.y + box.height / 2) / 10);
    }

    /** Expects the note's position at the height of its drawn note head (or fret number), and at its centre if checkX is true. */
    function expectAtDrawnCenter(note: VexFlowGraphicalNote, sampleName: string, checkX: boolean): void {
        const center: PointF2D = drawnCenter(note);
        const position: PointF2D = note.PositionAndShape.AbsolutePosition;
        // the note heads' drawings aren't exactly centred on their positions, e.g. by up to 0.08 units for a note head, 0.06 for a fret number
        const tolerance: number = 0.2;
        expect(Math.abs(position.y - center.y), `${sampleName}: y of ${describeGraphicalNote(note)}`).to.be.lessThan(tolerance);
        if (checkX) {
            expect(Math.abs(position.x - center.x), `${sampleName}: x of ${describeGraphicalNote(note)}`).to.be.lessThan(tolerance);
        }
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
                    for (const note of notes) {
                        const found: GraphicalNote = sheet.GetNearestNote(drawnCenter(note), undefined);
                        expect(found === note,
                               `${sampleName}: ${describeGraphicalNote(note)}, found ${found ? describeGraphicalNote(found) : "nothing"}`)
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

    it("places notes at the heights of their note heads, also grace notes and cue notes (shorter stems), 32nd notes (longer)", async () => {
        // grace notes with their stems up and down, cue notes, beamed 32nd notes with their stems up
        for (const sampleName of ["OSMD_function_test_GraceNotes.xml", "test_clef_change_on_invisible_note_norma_fantasy_1605.musicxml",
                                  "test_ornament_fingering_beamed_stem_up_bwv847_measure34.musicxml"]) {
            const sheet: GraphicalMusicSheet = await renderSheet(sampleName);
            for (const measure of sheet.MeasureList.flat()) {
                for (const voiceEntry of measure?.staffEntries.flatMap(staffEntry => staffEntry.graphicalVoiceEntries) ?? []) {
                    for (const note of voiceEntry.notes as VexFlowGraphicalNote[]) {
                        if (!note.sourceNote.isRest()) {
                            expectAtDrawnCenter(note, sampleName, false); // the x: see the next test
                        }
                    }
                }
            }
        }
    });

    it("places notes at the centres of their note heads or TAB fret numbers, not at their staff entries (e.g. the cursor)", async () => {
        // TAB chords of fret numbers with one and two digits, a TAB grace note, grace notes with flags or beamed, with their stems up
        //   or down, before and after their main notes, and notes with flags, a displaced note head of a second, and notes of two voices
        //   that Vexflow moves apart
        for (const sampleName of ["BrookeWestSample.mxl", "test_tab_grace_note_simple.musicxml", "OSMD_function_test_GraceNotes.xml",
                                  "test_grace_notes_after_main_note_1706.musicxml", "OSMD_Function_Test_Voice_Alignment.musicxml"]) {
            const sheet: GraphicalMusicSheet = await renderSheet(sampleName);
            let checkedNotes: number = 0;
            for (const measure of sheet.MeasureList.flat()) {
                for (const staffEntry of measure?.staffEntries ?? []) {
                    let fretNumbersEnd: number = -Infinity; // the right end of the fret numbers of the staff entry's TAB notes
                    for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                        for (const note of voiceEntry.notes as VexFlowGraphicalNote[]) {
                            if (note.sourceNote.isRest()) {
                                continue;
                            }
                            expectAtDrawnCenter(note, sampleName, true);
                            checkedNotes++;
                            if (measure.isTabMeasure && !voiceEntry.parentVoiceEntry.IsGrace) {
                                const box: DOMRect = drawnBox(note);
                                fretNumbersEnd = Math.max(fretNumbersEnd, (box.x + box.width) / 10);
                            }
                        }
                    }
                    if (fretNumbersEnd > -Infinity) {
                        // the staff entry stays at the right end of the fret numbers (by up to 0.07 units in the samples)
                        expect(Math.abs(staffEntry.PositionAndShape.AbsolutePosition.x - fretNumbersEnd),
                               `${sampleName}: x of a TAB staff entry in measure ${measure.MeasureNumber}`).to.be.lessThan(0.15);
                    }
                }
            }
            expect(checkedNotes, `notes in ${sampleName}`).to.be.greaterThan(0);
        }
    });

    it("doesn't find the rests of a TAB staff, which aren't drawn", async () => {
        // a rest's position can be where the fret number of the next note is drawn, and a click there found the rest
        for (const sampleName of ["test_tabs_4_strings_bass_guitar.musicxml", "OSMD_Function_Test_Tablature_Alleffects.musicxml"]) {
            const sheet: GraphicalMusicSheet = await renderSheet(sampleName);
            let tabRests: number = 0;
            for (const measure of sheet.MeasureList.flat()) {
                for (const voiceEntry of measure?.isTabMeasure ? measure.staffEntries.flatMap(staffEntry => staffEntry.graphicalVoiceEntries) : []) {
                    if (!voiceEntry.notes[0].sourceNote.isRest()) {
                        continue;
                    }
                    tabRests++;
                    const found: GraphicalVoiceEntry = sheet.GetNearestVoiceEntry(voiceEntry.notes[0].PositionAndShape.AbsolutePosition);
                    const foundTabRest: boolean = found?.parentStaffEntry.parentMeasure.isTabMeasure && found.notes[0].sourceNote.isRest();
                    expect(found !== undefined && !foundTabRest,
                           `${sampleName}: a click on the TAB rest in measure ${measure.MeasureNumber} found ${found ? "a TAB rest" : "nothing"}`)
                        .to.equal(true);
                }
            }
            expect(tabRests, `TAB rests in ${sampleName}`).to.be.greaterThan(0);
        }
    });

    /** The page the measure is drawn on. */
    function pageOf(measure: GraphicalMeasure): GraphicalMusicPage {
        return measure.ParentStaffLine.ParentMusicSystem.Parent;
    }

    it("searches only the given page (a page format: each page has its own coordinates)", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, pageFormat: "A5_L" });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        const sheet: GraphicalMusicSheet = osmd.GraphicSheet;
        const pages: GraphicalMusicPage[] = sheet.MusicPages;
        expect(pages.length, "pages").to.be.greaterThan(1);
        for (const page of pages) {
            // the page's first note: on the other pages, the position is e.g. in their first system too
            const firstMeasure: GraphicalMeasure = page.MusicSystems[0].StaffLines[0].Measures[0];
            const staffEntry: GraphicalStaffEntry = firstMeasure.staffEntries[0];
            const voiceEntry: GraphicalVoiceEntry = staffEntry.graphicalVoiceEntries[0];
            const note: GraphicalNote = voiceEntry.notes[0];
            const position: PointF2D = note.PositionAndShape.AbsolutePosition;
            for (const pageToSearch of pages) {
                const onPage: string = `the first note of page ${page.PageNumber}, searched on page ${pageToSearch.PageNumber}`;
                const foundVoiceEntry: GraphicalVoiceEntry = sheet.GetNearestVoiceEntry(position, false, pageToSearch);
                const foundNote: GraphicalNote = sheet.GetNearestNote(position, undefined, pageToSearch);
                const foundStaffEntry: GraphicalStaffEntry = sheet.GetNearestStaffEntry(position, pageToSearch);
                const foundMeasure: GraphicalMeasure = sheet.GetNearestObject(position, GraphicalMeasure, pageToSearch);
                if (pageToSearch === page) {
                    expect(foundVoiceEntry === voiceEntry, `${onPage}: voice entry`).to.equal(true);
                    expect(foundNote === note, `${onPage}: note`).to.equal(true);
                    expect(foundStaffEntry === staffEntry, `${onPage}: staff entry`).to.equal(true);
                    expect(foundMeasure === firstMeasure, `${onPage}: measure`).to.equal(true);
                } else {
                    // found on the page searched, or nothing
                    expect(!foundVoiceEntry || pageOf(foundVoiceEntry.parentStaffEntry.parentMeasure) === pageToSearch,
                           `${onPage}: voice entry on page ${pageOf(foundVoiceEntry?.parentStaffEntry.parentMeasure)?.PageNumber}`).to.equal(true);
                    expect(!foundNote || pageOf(foundNote.parentVoiceEntry.parentStaffEntry.parentMeasure) === pageToSearch,
                           `${onPage}: note`).to.equal(true);
                    expect(!foundStaffEntry || pageOf(foundStaffEntry.parentMeasure) === pageToSearch, `${onPage}: staff entry`).to.equal(true);
                    expect(!foundMeasure || pageOf(foundMeasure) === pageToSearch, `${onPage}: measure`).to.equal(true);
                }
            }
        }
    });
});
