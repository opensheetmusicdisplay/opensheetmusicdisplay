import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { IntervalTransposeCalculator } from "../../../src/Plugins/Transpose/IntervalTransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalChordSymbolContainer } from "../../../src/MusicalScore/Graphical/GraphicalChordSymbolContainer";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

/** osmd.TransposeCalculator belongs to its instance (EngravingRules.TransposeCalculator), not to all instances on the page. */
describe("TransposeCalculator per OSMD instance", (): void => {
    // D major, measure 1: a B and a G7 chord symbol
    const sample: string = "test_rehearsal_marks_bolivia.musicxml";
    const divs: HTMLElement[] = [];
    const instances: OpenSheetMusicDisplay[] = [];

    function createInstance(): OpenSheetMusicDisplay {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        divs.push(div);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        instances.push(osmd);
        return osmd;
    }

    afterEach((): void => {
        instances.splice(0).forEach((osmd: OpenSheetMusicDisplay): void => osmd.clear());
        divs.splice(0).forEach((div: HTMLElement): void => div.remove());
    });

    /** Loads the sample, transposes it up a halftone and renders it. */
    async function loadTransposedUp(osmd: OpenSheetMusicDisplay): Promise<void> {
        await osmd.load(TestUtils.getScore(sample));
        osmd.Sheet.Transpose = 1;
        osmd.render();
    }

    /** The first measure's key signature (fifths), first note and first chord symbol, as drawn. */
    function firstMeasure(osmd: OpenSheetMusicDisplay): { key: number, note: string, chord: string } {
        const key: KeyInstruction = osmd.Sheet.SourceMeasures[0].FirstInstructionsStaffEntries[0].Instructions
            .find((instruction): instruction is KeyInstruction => instruction instanceof KeyInstruction);
        const entries: GraphicalStaffEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries;
        const note: Pitch = entries[0].graphicalVoiceEntries[0].notes[0].sourceNote.TransposedPitch ??
            entries[0].graphicalVoiceEntries[0].notes[0].sourceNote.Pitch;
        const chord: GraphicalChordSymbolContainer = entries
            .flatMap((entry: GraphicalStaffEntry): GraphicalChordSymbolContainer[] => entry.graphicalChordContainers)[0];
        return { key: key.Key, note: NoteEnum[note.FundamentalNote], chord: chord.GraphicalLabel.Label.text };
    }

    const original: { key: number, note: string, chord: string } = { key: 2, note: "B", chord: "G7" };
    const upAHalftone: { key: number, note: string, chord: string } = { key: -3, note: "C", chord: "Ab7" };

    it("transposes only the instance whose calculator is set", async (): Promise<void> => {
        const withCalculator: OpenSheetMusicDisplay = createInstance();
        const without: OpenSheetMusicDisplay = createInstance();
        const calculator: TransposeCalculator = new TransposeCalculator();
        withCalculator.TransposeCalculator = calculator;

        expect(withCalculator.TransposeCalculator === calculator, "the instance's own calculator").to.equal(true);
        expect(without.TransposeCalculator, "the other instance has none").to.equal(undefined);

        await loadTransposedUp(withCalculator);
        await loadTransposedUp(without);
        expect(firstMeasure(without), "rendered last, without a calculator: not transposed").to.deep.equal(original);
        withCalculator.render();
        expect(firstMeasure(withCalculator), "D major -> Eb major").to.deep.equal(upAHalftone);
    });

    it("keeps different calculators for different instances", (): void => {
        const first: OpenSheetMusicDisplay = createInstance();
        const second: OpenSheetMusicDisplay = createInstance();
        const halftoneCalculator: TransposeCalculator = new TransposeCalculator();
        const intervalCalculator: IntervalTransposeCalculator = new IntervalTransposeCalculator();
        first.TransposeCalculator = halftoneCalculator;
        second.TransposeCalculator = intervalCalculator;
        expect(first.TransposeCalculator === halftoneCalculator, "the first keeps its calculator").to.equal(true);
        expect(second.TransposeCalculator === intervalCalculator, "the second has its own").to.equal(true);
    });

    it("re-renders a changed transposition, unaffected by another instance's calculator", async (): Promise<void> => {
        const osmd: OpenSheetMusicDisplay = createInstance();
        const other: OpenSheetMusicDisplay = createInstance();
        osmd.TransposeCalculator = new TransposeCalculator();
        await osmd.load(TestUtils.getScore(sample));
        osmd.Sheet.Transpose = 1;
        osmd.render();
        const graphic: GraphicalMusicSheet = osmd.GraphicSheet;

        other.TransposeCalculator = new TransposeCalculator();
        osmd.render();
        expect(osmd.GraphicSheet === graphic, "another instance's new calculator keeps this graphic").to.equal(true);

        osmd.Sheet.Transpose = 0;
        osmd.render();
        expect(osmd.GraphicSheet === graphic, "a changed Sheet.Transpose creates the graphic again").to.equal(false);
        expect(firstMeasure(osmd), "back to D major").to.deep.equal(original);

        osmd.Sheet.Transpose = 1;
        osmd.render();
        expect(firstMeasure(osmd), "and up a halftone again").to.deep.equal(upAHalftone);
    });
});
