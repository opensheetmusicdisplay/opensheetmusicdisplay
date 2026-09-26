import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { NoteEnum } from "../../../src/Common/DataObjects/Pitch";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OctaveEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { VexFlowOctaveShift } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";

/**
 * Grace notes after their main note (#1706): a Nachschlag, e.g. the two small notes ending a trill, is written in MusicXML
 * as <grace/> notes after the note they belong to, with no further note in the measure. The reader used to give them
 * their own SourceStaffEntry at the main note's end timestamp, i.e. at the end of the measure: the cursor stopped on them
 * in an extra step, cursor.VoicesUnderCursor() at the main note didn't include them, and the measure got longer by their
 * notated length (SourceMeasure.Duration), delaying all following measures.
 * Now they are attached to the main note's staff entry (VoiceEntry.GraceAfterMainNote, see
 * InstrumentReader.attachGraceNotesAfterMainNote), while still being drawn as separate small notes right of the main note.
 */
describe("Grace notes after the main note (#1706)", () => {
    /** 2/4, piano. m.1: E5 F5 quarters over C3 G3 quarters. m.2: trilled half note G5 followed by two beamed 16th grace notes
     *  F5 G5 (a Nachschlag at the end of the measure) over C3 G3 quarters. m.3: A5 G5 quarters over a C3 half note. */
    const sampleFilename: string = "test_grace_notes_after_main_note_1706.musicxml";
    /** OSMD octave number of the 5th octave (C4 = octave 1) */
    const octave5: number = 2;

    let container: HTMLElement;
    beforeEach(() => {
        // a wide attached container, so that all three measures fit into one system
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function load(sample: string): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        return osmd;
    }

    function expectAttachedGraceNote(grace: VoiceEntry, main: VoiceEntry, description: string): void {
        expect(grace.IsGrace, `${description} is a grace note`).to.equal(true);
        expect(grace.GraceAfterMainNote, `${description} is marked as coming after its main note`).to.equal(true);
        expect(grace.ParentVoice, `${description} stays in the voice of the main note`).to.equal(main.ParentVoice);
        expect(grace.ParentSourceStaffEntry, `${description} is in the staff entry of the main note`).to.equal(main.ParentSourceStaffEntry);
        expect(grace.Timestamp.Equals(main.Timestamp), `${description} has the timestamp of the main note`).to.equal(true);
        for (const note of grace.Notes) {
            expect(note.ParentStaffEntry, `${description}: its note is in the staff entry of the main note too`).to.equal(main.ParentSourceStaffEntry);
        }
    }

    it("reads them into the staff entry of their main note, marked as GraceAfterMainNote, without lengthening the measure", async () => {
        const osmd: OpenSheetMusicDisplay = await load(sampleFilename);
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[1];
        // the containers (cursor steps) of m.2: the half note + bass quarter at 0 and the bass quarter at 1/4,
        //   no extra one at the end of the measure (2/4) for the grace notes anymore
        const containerTimestamps: number[] = measure.VerticalSourceStaffEntryContainers.map(c => c.Timestamp.RealValue);
        expect(containerTimestamps, "staff entry containers of measure 2").to.deep.equal([0, 0.25]);
        const mainStaffEntry: SourceStaffEntry = measure.VerticalSourceStaffEntryContainers[0].StaffEntries[0];
        expect(mainStaffEntry.VoiceEntries.length, "treble staff entry at the start of m.2: half note + 2 grace notes").to.equal(3);
        const [half, graceF, graceG]: VoiceEntry[] = mainStaffEntry.VoiceEntries;
        expect(half.IsGrace, "the half note is the main note").to.equal(false);
        expect(half.Notes[0].Length.Equals(new Fraction(1, 2)), "half note").to.equal(true);
        expectAttachedGraceNote(graceF, half, "grace note F5");
        expectAttachedGraceNote(graceG, half, "grace note G5");
        expect(graceF.Notes[0].Pitch.FundamentalNote).to.equal(NoteEnum.F);
        expect(graceF.Notes[0].Pitch.Octave).to.equal(octave5);
        expect(graceG.Notes[0].Pitch.FundamentalNote).to.equal(NoteEnum.G);
        expect(graceG.Notes[0].Pitch.Octave).to.equal(octave5);
        expect(graceF.Notes[0].Length.Equals(new Fraction(1, 16)), "the grace notes keep their notated length").to.equal(true);
        // the grace notes no longer lengthen the measure: it used to be 9/16 (2/4 + the 16th of the last grace note)
        expect(measure.Duration.Equals(new Fraction(1, 2)), "the 2/4 measure keeps its 2/4 duration").to.equal(true);
        expect(osmd.Sheet.SourceMeasures[2].AbsoluteTimestamp.Equals(new Fraction(1, 1)),
            "so measure 3 starts a whole note after the start of the piece, not a 16th later").to.equal(true);
        // the bass staff is unaffected
        expect(measure.VerticalSourceStaffEntryContainers[0].StaffEntries[1].VoiceEntries.length).to.equal(1);
        expect(measure.VerticalSourceStaffEntryContainers[1].StaffEntries[1].VoiceEntries.length).to.equal(1);
        expect(measure.VerticalSourceStaffEntryContainers[1].StaffEntries[0], "no treble staff entry at 1/4").to.equal(undefined);
    });

    it("leaves grace notes before a following main note where they are (in the staff entry of that note, not marked)", async () => {
        // OSMD_function_test_GraceNotes.xml starts with grace notes before main notes in measure 1
        const osmd: OpenSheetMusicDisplay = await load("OSMD_function_test_GraceNotes.xml");
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        let graceNotesBefore: number = 0;
        for (const verticalContainer of measure.VerticalSourceStaffEntryContainers) {
            for (const staffEntry of verticalContainer.StaffEntries) {
                if (!staffEntry) {
                    continue;
                }
                const voiceEntries: VoiceEntry[] = staffEntry.VoiceEntries;
                for (let i: number = 0; i < voiceEntries.length; i++) {
                    if (voiceEntries[i].IsGrace) {
                        expect(voiceEntries[i].GraceAfterMainNote, "a grace note before a main note is not marked as after it").to.equal(false);
                        expect(voiceEntries.slice(i + 1).some(ve => !ve.IsGrace), "a main note follows it in its staff entry").to.equal(true);
                        graceNotesBefore++;
                    }
                }
            }
        }
        expect(graceNotesBefore, "the first measure of the sample has grace notes before main notes").to.be.greaterThan(0);
    });

    it("cursor: the step of the main note includes them, with no extra step for them at the end of the measure", async () => {
        const osmd: OpenSheetMusicDisplay = await load(sampleFilename);
        osmd.render();
        const cursor: typeof osmd.cursor = osmd.cursor;
        cursor.show();
        cursor.reset();
        const steps: { measure: number, timestamp: number, voiceEntries: VoiceEntry[], left: number }[] = [];
        while (!cursor.Iterator.EndReached && steps.length < 100) {
            steps.push({
                measure: cursor.Iterator.CurrentMeasureIndex,
                timestamp: cursor.Iterator.CurrentRelativeInMeasureTimestamp.RealValue,
                voiceEntries: cursor.VoicesUnderCursor(),
                left: parseFloat(cursor.cursorElement.style.left),
            });
            cursor.next();
        }
        expect(steps.map(s => [s.measure, s.timestamp]), "cursor steps (measure index, timestamp in measure)").to.deep.equal(
            [[0, 0], [0, 0.25], [1, 0], [1, 0.25], [2, 0], [2, 0.25]]); // used to have an extra [1, 0.5] step with only the grace notes
        const mainNoteStep: { measure: number, timestamp: number, voiceEntries: VoiceEntry[], left: number } = steps[2];
        const graceVoiceEntries: VoiceEntry[] = mainNoteStep.voiceEntries.filter(ve => ve.IsGrace);
        expect(graceVoiceEntries.length, "both grace notes are under the cursor at their main note").to.equal(2);
        expect(mainNoteStep.voiceEntries.length, "half note + 2 grace notes + bass quarter").to.equal(4);
        expect(mainNoteStep.voiceEntries.filter(ve => !ve.IsGrace).map(ve => ve.Notes[0].Length.RealValue), "half note and bass quarter")
            .to.deep.equal([0.5, 0.25]);
        cursor.reset();
        cursor.next();
        cursor.next(); // at the main note again
        expect(cursor.NotesUnderCursor().length, "NotesUnderCursor includes the grace notes").to.equal(4);
        expect(cursor.GNotesUnderCursor().length).to.equal(4);
        // the cursor sits on the main note like on any other note (left of the grace notes drawn right of it):
        //   the same offset from the staff entry's x position as at the first note of the piece
        const staffEntryPx: (measureIndex: number) => number = (measureIndex: number) =>
            osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries[0].PositionAndShape.AbsolutePosition.x * 10 * osmd.Zoom;
        const cursorOffsetAtFirstNote: number = steps[0].left - staffEntryPx(0);
        expect(mainNoteStep.left - staffEntryPx(1), "cursor at the staff entry of the main note").to.be.closeTo(cursorOffsetAtFirstNote, 0.5);
        const graphicalMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[1][0];
        const firstGraceNoteX: number = (graphicalMeasure.staffEntries[0].graphicalVoiceEntries[1] as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX();
        expect(mainNoteStep.left, "cursor left of the grace notes").to.be.below(firstGraceNoteX);
    });

    it("still draws them as separate small notes right of their main note, not as a grace note group before another note", async () => {
        const osmd: OpenSheetMusicDisplay = await load(sampleFilename);
        osmd.render();
        const graphicalMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[1][0]; // m.2, treble staff
        expect(graphicalMeasure.staffEntries.length, "one graphical staff entry: the one of the half note").to.equal(1);
        const gves: GraphicalVoiceEntry[] = graphicalMeasure.staffEntries[0].graphicalVoiceEntries;
        expect(gves.length, "half note + 2 grace notes").to.equal(3);
        const [main, graceF, graceG]: VexFlowVoiceEntry[] = gves as VexFlowVoiceEntry[];
        expect(main.vfStaveNote.getCategory(), "the main note is a normal StaveNote").to.equal("stavenotes");
        const graceNoteGroups: any[] = ((main.vfStaveNote as any).modifiers ?? []).filter((m: any) => m.getCategory() === "gracenotegroups");
        expect(graceNoteGroups.length, "no grace note group attached to the main note").to.equal(0);
        for (const grace of [graceF, graceG]) {
            expect(grace.vfStaveNote, "the grace note has its own vexflow note").to.not.equal(undefined);
            expect(grace.vfStaveNote.getCategory(), "drawn as a (small) GraceNote").to.equal("gracenotes");
        }
        const mainX: number = main.vfStaveNote.getAbsoluteX();
        const graceFX: number = graceF.vfStaveNote.getAbsoluteX();
        const graceGX: number = graceG.vfStaveNote.getAbsoluteX();
        expect(graceFX, "first grace note right of the main note").to.be.greaterThan(mainX);
        expect(graceGX, "second grace note right of the first").to.be.greaterThan(graceFX);
        const measureRightX: number = (graphicalMeasure.PositionAndShape.AbsolutePosition.x + graphicalMeasure.PositionAndShape.Size.width) * 10;
        expect(graceGX, "grace notes inside the measure").to.be.below(measureRightX);
        // the grace notes are tickables of the vexflow voice of the main note (half note + 2 grace notes)
        const vfVoices: any = (graphicalMeasure as any).vfVoices;
        const tickableCounts: number[] = Object.keys(vfVoices).map(voiceId => vfVoices[voiceId].getTickables().length);
        expect(tickableCounts, "tickables per vexflow voice").to.deep.equal([3]);
        // the position and size of the staff entry are those of the main note only (cursor position, slur endpoints)
        const staffEntryX: number = graphicalMeasure.staffEntries[0].PositionAndShape.RelativePosition.x;
        const staffEntryBorderRight: number = graphicalMeasure.staffEntries[0].PositionAndShape.BorderRight;
        expect(staffEntryBorderRight, "the bounding box of the staff entry does not extend to the grace notes").to.be.below(3);
        expect((staffEntryX + graphicalMeasure.PositionAndShape.AbsolutePosition.x) * 10, "staff entry at the main note").to.be.below(graceFX);
    });

    it("attaches the trailing grace notes of existing samples too (Haydn Concertante m.90, octave shift sample m.3)", async () => {
        const haydn: OpenSheetMusicDisplay = await load("JosephHaydn_ConcertanteCello.xml");
        const measure90: SourceMeasure = haydn.Sheet.SourceMeasures.find(m => m.MeasureNumber === 90);
        expect(measure90.VerticalSourceStaffEntryContainers.length, "m.90: whole note + 2 grace notes in one container").to.equal(1);
        const [whole, ...graces]: VoiceEntry[] = measure90.VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries;
        expect(whole.Notes[0].Length.Equals(new Fraction(1, 1))).to.equal(true);
        expect(graces.length).to.equal(2);
        for (const grace of graces) {
            expectAttachedGraceNote(grace, whole, "Haydn m.90 grace note");
        }
        expect(measure90.Duration.Equals(new Fraction(1, 1)), "the 4/4 measure keeps its duration (used to be 17/16)").to.equal(true);

        const octaveShift: OpenSheetMusicDisplay = await load("test_octaveshift_multiline_grace_notes.musicxml");
        octaveShift.render();
        const measure3: SourceMeasure = octaveShift.Sheet.SourceMeasures[2];
        expect(measure3.VerticalSourceStaffEntryContainers.length, "m.3: whole note + 8 grace notes in one container").to.equal(1);
        const [wholeNote, ...graceNotes]: VoiceEntry[] = measure3.VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries;
        expect(graceNotes.length).to.equal(8);
        for (const grace of graceNotes) {
            expectAttachedGraceNote(grace, wholeNote, "octave shift sample m.3 grace note");
        }
        expect(measure3.Duration.Equals(new Fraction(1, 1))).to.equal(true);
        // the 8va bracket (m.2 to m.4) still applies to the grace notes
        const graceGves: GraphicalVoiceEntry[] = octaveShift.GraphicSheet.MeasureList[2][0].staffEntries[0].graphicalVoiceEntries
            .filter(gve => gve.parentVoiceEntry.IsGrace);
        expect(graceGves.length).to.equal(8);
        for (const gve of graceGves) {
            expect((gve.notes[0] as VexFlowGraphicalNote).octaveShift, "grace note under the 8va").to.not.equal(OctaveEnum.NONE);
        }
    });

    describe("a measure of grace notes only", () => {
        // m.2 is the second half of m.1, split off so that a system can break inside a cadenza: two grace notes in the
        //   treble staff and nothing else, so no main note to attach them to, and nothing at all in the bass staff.
        const graceOnlySample: string = "test_grace_notes_only_measure.musicxml";

        it("is rendered, its grace notes drawn as stand-alone grace notes", async () => {
            // a voice of such grace notes alone has no timed entry to fill the rest of the measure from
            const osmd: OpenSheetMusicDisplay = await load(graceOnlySample);
            expect(() => osmd.render()).to.not.throw();
            const graceGves: GraphicalVoiceEntry[] = osmd.GraphicSheet.MeasureList[1][0].staffEntries
                .flatMap(staffEntry => staffEntry.graphicalVoiceEntries);
            expect(graceGves.length, "the two grace notes of m.2").to.equal(2);
            for (const gve of graceGves) {
                expect(gve.parentVoiceEntry.IsGrace).to.equal(true);
                expect((gve as VexFlowVoiceEntry).vfStaveNote, "drawn").to.not.equal(undefined);
            }
        });

        it("holds a pedal line through it when it is a system of its own, with nothing on the pedal's staff", async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            osmd.setOptions({ newSystemFromXML: true }); // one system per measure
            await osmd.load(TestUtils.getScore(graceOnlySample));
            expect(() => osmd.render()).to.not.throw();
            const bassStaffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[1]);
            expect(bassStaffLines.length, "three systems").to.equal(3);
            expect(bassStaffLines.map(staffLine => staffLine.Pedals.length), "pedal lines per system")
                .to.deep.equal([1, 0, 1]);
        });

        /** Loads a score with the system breaks of the file (new-system). */
        async function loadWithSystemBreaks(score: Document): Promise<OpenSheetMusicDisplay> {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            osmd.setOptions({ newSystemFromXML: true });
            await osmd.load(score);
            return osmd;
        }

        describe("with spanners on the other staff across it", () => {
            // from the first half of m.1 to m.2, and from the first half of m.3 to m.4: a pedal line, an 8vb, a slur, a glissando
            //   and a trill on the bass staff. With the system breaks of the file, the grace notes of m.1 are a system of their
            //   own, with nothing on the bass staff, and those of m.3 start the system of m.4.
            const spannersSample: string = "test_grace_notes_only_measure_spanners.musicxml";

            function bassStaffLines(osmd: OpenSheetMusicDisplay): StaffLine[] {
                return osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[1]);
            }

            it("draws them in the other systems, and from the first note on the staff in a system starting with the grace notes", async () => {
                // the 8vb, the slur and the glissando used to abort the render in the system of the grace notes alone, and the
                //   segments of the pedal line and the trill were left out in the system starting with the grace notes
                const osmd: OpenSheetMusicDisplay = await loadWithSystemBreaks(TestUtils.getScore(spannersSample));
                expect(() => osmd.render()).to.not.throw();
                const staffLines: StaffLine[] = bassStaffLines(osmd);
                expect(staffLines.length, "systems: m.1 | grace notes | m.2 | m.3 | grace notes and m.4").to.equal(5);
                const segmentsPerSystem: number[] = [1, 0, 1, 1, 1];
                expect(staffLines.map(staffLine => staffLine.Pedals.length), "pedal lines").to.deep.equal(segmentsPerSystem);
                expect(staffLines.map(staffLine => staffLine.OctaveShifts.length), "8vb").to.deep.equal(segmentsPerSystem);
                expect(staffLines.map(staffLine => staffLine.GraphicalSlurs.length), "slurs").to.deep.equal(segmentsPerSystem);
                expect(staffLines.map(staffLine => staffLine.GraphicalGlissandi.length), "glissandi").to.deep.equal(segmentsPerSystem);
                expect(staffLines.map(staffLine => staffLine.WavyLines.length), "trills").to.deep.equal(segmentsPerSystem);
                const m4Bass: VexFlowVoiceEntry = osmd.GraphicSheet.MeasureList[5][1].staffEntries[0].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
                const lastSystem: StaffLine = staffLines[4];
                expect((lastSystem.Pedals[0] as VexFlowPedal).startNote, "pedal line from m.4").to.equal(m4Bass.vfStaveNote);
                expect((lastSystem.OctaveShifts[0] as VexFlowOctaveShift).startNote, "8vb from m.4").to.equal(m4Bass.vfStaveNote);
                expect((lastSystem.WavyLines[0] as VexFlowVibratoBracket).startNote, "trill from m.4").to.equal(m4Bass.vfStaveNote);
            });

            it("draws a pedal marked with signs, also when a system starts with the grace notes", async () => {
                // the "Ped." and "*" of a pedal across systems take another path, which used to leave out the whole pedal when the
                //   system of its end started with a measure with nothing on the staff
                const score: Document = TestUtils.getScore(spannersSample).cloneNode(true) as Document;
                for (const pedal of Array.from(score.getElementsByTagName("pedal"))) {
                    pedal.setAttribute("line", "no");
                    pedal.setAttribute("sign", "yes");
                }
                const osmd: OpenSheetMusicDisplay = await loadWithSystemBreaks(score);
                osmd.render();
                expect(bassStaffLines(osmd).map(staffLine => staffLine.Pedals.length), "\"Ped.\" or \"*\" per system")
                    .to.deep.equal([1, 0, 1, 1, 1]);
            });
        });
    });
});
