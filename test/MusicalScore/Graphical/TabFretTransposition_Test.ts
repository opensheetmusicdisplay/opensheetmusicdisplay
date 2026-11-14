import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { IntervalTransposeCalculator } from "../../../src/Plugins/Transpose/IntervalTransposeCalculator";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { TabNote } from "../../../src/MusicalScore/VoiceData/TabNote";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";

/**
 * A transposed sheet's tablature shows the frets of the transposed pitches (see TabFretTransposer).
 * test_slides_standard_and_tab_staff.musicxml: a standard and a TAB staff with the same notes, all on the B string (string 2):
 * frets 3 5 7 8 | 10 8 7 5 | 5 7 3 5 | 5 3 2 2, with slides from fret 8 to 10 (measures 1-2) and from 5 to 7 (measure 3).
 */
describe("Tablature frets of a transposed sheet", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** Loads the sample and renders it transposed by the halftones. Returns its tablature notes in score order. */
    async function renderTransposed(sample: string, halftones: number,
                                    calculator: ITransposeCalculator = new TransposeCalculator()): Promise<TabNote[]> {
        await osmd.load(TestUtils.getScore(sample));
        osmd.TransposeCalculator = calculator;
        osmd.Sheet.Transpose = halftones;
        osmd.render();
        return tabNotes();
    }

    /** The sheet's tablature notes in score order. */
    function tabNotes(): TabNote[] {
        const notes: Note[] = osmd.Sheet.SourceMeasures.flatMap(measure => measure.VerticalSourceStaffEntryContainers)
            .flatMap(entries => entries.StaffEntries).filter(staffEntry => staffEntry?.ParentStaff.isTab)
            .flatMap(staffEntry => staffEntry.VoiceEntries).flatMap(voiceEntry => voiceEntry.Notes);
        return notes.filter((note: Note): note is TabNote => note instanceof TabNote);
    }

    /** The fret number drawn for the note. */
    function drawnFret(note: TabNote): string {
        const measureNumber: number = note.SourceMeasure.MeasureNumber;
        for (const measure of osmd.GraphicSheet.MeasureList[measureNumber - 1]) {
            for (const staffEntry of measure.staffEntries) {
                const graphicalNote: VexFlowGraphicalNote = staffEntry.findGraphicalNoteFromNote(note) as VexFlowGraphicalNote;
                if (graphicalNote) {
                    return graphicalNote.getSVGGElement().textContent.trim();
                }
            }
        }
        return undefined;
    }

    for (const calculator of [new TransposeCalculator(), new IntervalTransposeCalculator()]) {
        it(`moves each fret by the halftones on its string (${calculator.constructor.name})`, async () => {
            const notes: TabNote[] = await renderTransposed("test_slides_standard_and_tab_staff.musicxml", 3, calculator);
            expect(notes.map(note => note.DisplayedFretNumber).slice(0, 8), "frets of measures 1 and 2")
                .to.deep.equal([6, 8, 10, 11, 13, 11, 10, 8]);
            for (const note of notes) {
                expect(note.DisplayedStringNumberTab, "string").to.equal(2);
                expect(note.DisplayedFretNumber - note.FretNumber, "the fret moves like the pitch")
                    .to.equal(note.TransposedPitch.getHalfTone() - note.Pitch.getHalfTone());
            }
            expect(drawnFret(notes[0]), "drawn fret of the first note").to.equal("6");
        });
    }

    it("moves a chord's fingering along the fretboard: D major on frets 2-3-2 is F major on frets 5-6-5", async () => {
        // Beethoven_OdeToJoy.musicxml: the guitar's first chord is D major on the G, B and high E strings
        const notes: TabNote[] = await renderTransposed("Beethoven_OdeToJoy.musicxml", 3);
        const chord: TabNote[] = notes.find(note => note.ParentVoiceEntry.Notes.length === 3).ParentVoiceEntry.Notes as TabNote[];
        chord.sort((a, b) => b.StringNumberTab - a.StringNumberTab);
        expect(chord.map(note => note.FretNumber), "frets in the XML, from the G string").to.deep.equal([2, 3, 2]);
        expect(chord.map(note => note.DisplayedFretNumber), "transposed frets").to.deep.equal([5, 6, 5]);
        expect(chord.map(note => note.DisplayedStringNumberTab), "strings").to.deep.equal([3, 2, 1]);
    });

    it("leaves the frets of the XML when the sheet isn't transposed, also after a transposition", async () => {
        const notes: TabNote[] = await renderTransposed("test_slides_standard_and_tab_staff.musicxml", 0);
        const xmlFrets: number[] = [3, 5, 7, 8, 10, 8, 7, 5];
        expect(notes.map(note => note.DisplayedFretNumber).slice(0, 8), "untransposed").to.deep.equal(xmlFrets);
        expect(notes[0].TransposedFretNumber, "no transposed fret").to.equal(undefined);
        osmd.Sheet.Transpose = 2;
        osmd.render();
        expect(notes[0].DisplayedFretNumber, "transposed by 2").to.equal(5);
        expect(notes.map(note => note.FretNumber).slice(0, 8), "the XML's frets are kept").to.deep.equal(xmlFrets);
        osmd.Sheet.Transpose = 0;
        osmd.render();
        expect(notes.map(note => note.DisplayedFretNumber).slice(0, 8), "transposed back").to.deep.equal(xmlFrets);
        expect(drawnFret(notes[0]), "drawn fret of the first note").to.equal("3");
    });

    it("transposes the frets by the instrument's transposition too", async () => {
        const notes: TabNote[] = await renderTransposed("test_slides_standard_and_tab_staff.musicxml", 1);
        osmd.Sheet.Instruments[0].Transpose = 2;
        osmd.render();
        expect(notes[0].DisplayedFretNumber, "fret 3, transposed by 1 + 2").to.equal(6);
        osmd.Sheet.Instruments[0].Transpose = 0;
    });

    it("moves a note that would be below fret 0 to the next lower string, and reads the strings' tuning", async () => {
        // 5 halftones down, the frets 3 5 7 8 on the B string are -2 0 2 3: the first note moves to the G string, 4 halftones lower
        const notes: TabNote[] = await renderTransposed("test_slides_standard_and_tab_staff.musicxml", -5);
        expect(osmd.Sheet.Staves[1].StringTuning.map(halftone => halftone % 12), "E A D G B E, from the lowest string")
            .to.deep.equal([4, 9, 2, 7, 11, 4]);
        expect(notes.slice(0, 4).map(note => note.DisplayedFretNumber), "frets of measure 1").to.deep.equal([2, 0, 2, 3]);
        expect(notes.slice(0, 4).map(note => note.DisplayedStringNumberTab), "strings of measure 1").to.deep.equal([3, 2, 2, 2]);
        expect(notes[0].StringNumberTab, "the XML's string is kept").to.equal(2);
    });

    it("moves both notes of a slide to the other string, also if only one of them leaves the fretboard", async () => {
        // 9 halftones down, the slide from fret 8 to 10 would go from fret -1 to 1
        const notes: TabNote[] = await renderTransposed("test_slides_standard_and_tab_staff.musicxml", -9);
        expect(notes.slice(3, 5).map(note => note.DisplayedStringNumberTab), "strings of the slide").to.deep.equal([3, 3]);
        expect(notes.slice(3, 5).map(note => note.DisplayedFretNumber), "frets of the slide").to.deep.equal([3, 5]);
        const maxFret: number = osmd.EngravingRules.TabTransposeMaxFret;
        osmd.EngravingRules.TabTransposeMaxFret = 12; // 3 halftones up, the slide would go from fret 11 to 13
        osmd.Sheet.Transpose = 3;
        osmd.render();
        expect(notes.slice(3, 5).map(note => note.DisplayedStringNumberTab), "strings above the highest fret").to.deep.equal([1, 1]);
        expect(notes.slice(3, 5).map(note => note.DisplayedFretNumber), "frets above the highest fret").to.deep.equal([6, 8]);
        osmd.EngravingRules.TabTransposeMaxFret = maxFret;
    });

    it("moves the notes of a hammer-on together, and shows a note below the lowest string an octave higher", async () => {
        // OSMD_Function_Test_Tablature_Hammeron_Pulloff.musicxml starts on the A string (string 5) with a hammer-on from fret 2 to 3
        //   and a pull-off from fret 5 to the open string
        let notes: TabNote[] = await renderTransposed("OSMD_Function_Test_Tablature_Hammeron_Pulloff.musicxml", -3);
        expect(notes.slice(0, 4).map(note => note.DisplayedStringNumberTab), "strings, 3 halftones down").to.deep.equal([6, 6, 6, 6]);
        expect(notes.slice(0, 4).map(note => note.DisplayedFretNumber), "frets, 3 halftones down").to.deep.equal([4, 5, 7, 2]);
        // 6 halftones down, the open A string is below the low E string
        notes = await renderTransposed("OSMD_Function_Test_Tablature_Hammeron_Pulloff.musicxml", -6);
        expect(notes.slice(0, 4).map(note => note.DisplayedStringNumberTab), "strings, 6 halftones down").to.deep.equal([6, 6, 6, 5]);
        expect(notes.slice(0, 4).map(note => note.DisplayedFretNumber), "frets, 6 halftones down").to.deep.equal([1, 2, 4, 6]);
    });
});
