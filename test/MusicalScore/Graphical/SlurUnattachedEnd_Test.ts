import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { BrailleConverter, BrailleOutput } from "../../../src/Plugins/Braille/BrailleConverter";
import { BRAILLE_SLUR, BRAILLE_BRACKET_SLUR_OPEN, BRAILLE_BRACKET_SLUR_CLOSE } from "../../../src/Plugins/Braille/BrailleSymbols";

/**
 * A slur start and a slur stop with the same number on the same note, where the stop ends no earlier slur: Dolet for
 * Sibelius writes a slur whose end isn't attached to a note like this, e.g. one running into a repeat barline (PR #1516).
 * Like Sibelius, it's drawn from a measure's last note to the barline (Slur.HasUnattachedEnd).
 * test_slur_unattached_end_to_barline.musicxml has one case per measure, see the comment in the file.
 */
describe("Slur with an unattached end", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_unattached_end_to_barline.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    function graphicalMeasure(measureNumber: number): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
    }

    /** The note of the given staff entry of a measure, the last one for index -1. */
    function noteAt(measureNumber: number, staffEntryIndex: number): Note {
        const staffEntries: GraphicalStaffEntry[] = graphicalMeasure(measureNumber).staffEntries;
        const staffEntry: GraphicalStaffEntry = staffEntries[staffEntryIndex < 0 ? staffEntries.length + staffEntryIndex : staffEntryIndex];
        return staffEntry.graphicalVoiceEntries[0].notes[0].sourceNote;
    }

    function allGraphicalSlurs(): GraphicalSlur[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).flatMap(system => system.StaffLines)
            .flatMap(staffLine => staffLine.GraphicalSlurs);
    }

    function graphicalSlursStartingAt(note: Note): GraphicalSlur[] {
        return allGraphicalSlurs().filter((gSlur: GraphicalSlur) => gSlur.slur.StartNote === note);
    }

    function measureEndX(measureNumber: number): number {
        const measure: GraphicalMeasure = graphicalMeasure(measureNumber);
        return measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.Size.width;
    }

    it("draws a slur with start and stop on a measure's last note from the note to the barline", () => {
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(noteAt(1, -1));
        expect(gSlurs.length).to.equal(1);
        const gSlur: GraphicalSlur = gSlurs[0];
        expect(gSlur.slur.EndNote, "no end note").to.equal(undefined);
        expect(gSlur.slur.HasUnattachedEnd).to.equal(true);
        expect(gSlur.placement, "opposite to the stem (up)").to.equal(PlacementEnum.Below);
        const endX: number = measureEndX(1);
        expect(gSlur.bezierEndPt.x, "ends at the barline").to.be.within(endX - graphicalMeasure(1).endInstructionsWidth - 0.001, endX);
        expect(gSlur.bezierEndPt.x - gSlur.bezierStartPt.x, "long enough to be seen as a slur").to.be.greaterThan(1.5);
        expect(gSlur.bezierEndPt.y, "a short slur with both ends at the same height, like in Sibelius").to.equal(gSlur.bezierStartPt.y);
    });

    it("draws it before a repeat sign, long enough to be seen as a slur", () => {
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(noteAt(2, -1));
        expect(gSlurs.length).to.equal(1);
        const gSlur: GraphicalSlur = gSlurs[0];
        expect(gSlur.slur.EndNote).to.equal(undefined);
        expect(gSlur.placement, "opposite to the stem (down)").to.equal(PlacementEnum.Above);
        expect(gSlur.bezierEndPt.x, "doesn't reach the lines of the repeat sign").to.be.at.most(measureEndX(2) - 0.5 + 0.001);
        expect(gSlur.bezierEndPt.x - gSlur.bezierStartPt.x, "long enough to be seen as a slur").to.be.greaterThan(1.5);
    });

    it("doesn't draw it from an earlier note of the measure, where it's unknown where it ends", () => {
        const note: Note = noteAt(3, 0);
        expect(note.NoteSlurs.length).to.equal(1);
        expect(note.NoteSlurs[0].StartNote).to.equal(note);
        expect(note.NoteSlurs[0].EndNote).to.equal(undefined);
        expect(note.NoteSlurs[0].HasUnattachedEnd).to.equal(true);
        expect(graphicalSlursStartingAt(note).length, "not drawn").to.equal(0);
    });

    it("keeps the end unattached when the next such slur has the same number (its stop is its own)", () => {
        for (const note of [noteAt(1, -1), noteAt(2, -1), noteAt(3, 0), noteAt(5, -1)]) {
            expect(note.NoteSlurs.length, "only its own slur, no slur from the previous one ends here").to.equal(1);
            expect(note.NoteSlurs[0].StartNote).to.equal(note);
            expect(note.NoteSlurs[0].EndNote).to.equal(undefined);
        }
    });

    it("ends it at a later stop of its number (the stop on its start note was an orphan then)", () => {
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(noteAt(4, -1));
        expect(gSlurs.length).to.equal(1);
        expect(gSlurs[0].slur.EndNote).to.equal(noteAt(5, 0));
        expect(gSlurs[0].slur.HasUnattachedEnd).to.equal(false);
    });

    it("reads a stop written before the start the same way, if it ends no earlier slur", () => {
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(noteAt(5, -1));
        expect(gSlurs.length).to.equal(1);
        expect(gSlurs[0].slur.EndNote).to.equal(undefined);
        expect(gSlurs[0].bezierEndPt.x).to.be.within(measureEndX(5) - graphicalMeasure(5).endInstructionsWidth - 0.001, measureEndX(5));
    });

    it("draws each slur once, with a valid SVG path", () => {
        const gSlurs: GraphicalSlur[] = allGraphicalSlurs();
        expect(gSlurs.length, "m.1, m.2, m.4 to m.5 and m.5").to.equal(4);
        for (const gSlur of gSlurs) {
            const path: string = (gSlur.SVGElement as SVGGElement).querySelector("path").getAttribute("d");
            expect(path, "no NaN in the path").to.not.match(/NaN|undefined/);
        }
    });

    it("leaves it out in Braille, which has no sign for a slur without end note", () => {
        const output: BrailleOutput = new BrailleConverter().convert(osmd.Sheet);
        const measures: string[] = output.text.split(" ");
        const slurSigns: RegExp = new RegExp(`${BRAILLE_SLUR}|${BRAILLE_BRACKET_SLUR_OPEN}|${BRAILLE_BRACKET_SLUR_CLOSE}`);
        expect(measures.length).to.equal(5);
        for (const measureIndex of [0, 1, 2, 4]) {
            expect(measures[measureIndex], `no slur sign in m.${measureIndex + 1}`).to.not.match(slurSigns);
        }
        expect(measures[3], "the slur from the last note of m.4 to m.5").to.match(slurSigns);
    });
});
