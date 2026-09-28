import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TransposeCalculator } from "../../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { AccidentalEnum } from "../../../../src/Common/DataObjects/Pitch";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

describe("Mid-measure key rendering", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.setOptions({newSystemFromXML: true});
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    async function loadScore(name: string): Promise<void> {
        await osmd.load(TestUtils.getScore(name));
        osmd.render();
    }

    function keys(): SVGGraphicsElement[] {
        return Array.from(div.querySelectorAll<SVGGraphicsElement>(".vf-keysignature"));
    }

    function notesIn(measureIndex: number, staffIndex: number = 0): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex].staffEntries.flatMap(
            (entry: GraphicalStaffEntry): VexFlowGraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                (voiceEntry): VexFlowGraphicalNote[] => voiceEntry.notes as VexFlowGraphicalNote[],
            ),
        );
    }

    function allNotes(): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList.flatMap((measures, measureIndex): VexFlowGraphicalNote[] => measures.flatMap(
            (_measure, staffIndex): VexFlowGraphicalNote[] => notesIn(measureIndex, staffIndex),
        ));
    }

    it("draws the changed key between its notes without redundant accidentals", async (): Promise<void> => {
        await loadScore("test_key_signature_mid_measure.musicxml");

        const [beforeChange, afterChange]: VexFlowGraphicalNote[] = notesIn(0);
        expect(keys(), "the changed key and system carry are rendered").to.have.length(2);
        const key: SVGGraphicsElement = keys()[0];
        const keyBounds: DOMRect = key.getBBox();
        expect(key.querySelectorAll("path"), "the G-major signature has one sharp").to.have.length(1);
        expect(beforeChange.DrawnAccidental, "the C-major F is unchanged").to.equal(AccidentalEnum.NONE);
        expect(afterChange.DrawnAccidental, "the G-major F sharp needs no accidental").to.equal(AccidentalEnum.NONE);
        expect(keyBounds.x).to.be.greaterThan(beforeChange.vfnote[0].getAbsoluteX());
        expect(keyBounds.x + keyBounds.width).to.be.lessThan(afterChange.vfnote[0].getAbsoluteX());

        osmd.EngravingRules.RenderKeySignatures = false;
        osmd.updateGraphic();
        osmd.render();
        expect(keys(), "key glyphs are hidden").to.have.length(0);
        for (const note of notesIn(0)) {
            expect(note.DrawnAccidental, "the hidden key still determines pitch accidentals").to.equal(AccidentalEnum.NONE);
        }
    });

    it("carries the final key across a system, repeated render, and a later range", async (): Promise<void> => {
        await loadScore("test_key_signature_mid_measure.musicxml");
        const positions: number[] = keys().map((key: SVGGraphicsElement): number => key.getBBox().x);
        expect(positions, "the in-measure change and next-system carry are drawn").to.have.length(2);

        osmd.render();
        expect(keys().map((key: SVGGraphicsElement): number => key.getBBox().x), "re-rendering is stable")
            .to.deep.equal(positions);

        osmd.setOptions({drawFromMeasureNumber: 2});
        await loadScore("test_key_signature_mid_measure.musicxml");
        expect(keys(), "a selected later range inherits the preceding key").to.have.length(1);
        expect(keys()[0].querySelectorAll("path"), "the carried G-major key remains complete").to.have.length(1);
    });

    it("transposes the keys and restores their original spelling", async (): Promise<void> => {
        const previous: ITransposeCalculator = osmd.TransposeCalculator;
        try {
            osmd.TransposeCalculator = new TransposeCalculator();
            await osmd.load(TestUtils.getScore("test_key_signature_mid_measure.musicxml"));
            osmd.Sheet.Transpose = 2;
            osmd.updateGraphic();
            osmd.render();
            expect(keys().map((key: SVGGraphicsElement): number => key.querySelectorAll("path").length))
                .to.deep.equal([2, 3, 3]);

            osmd.Sheet.Transpose = 0;
            osmd.updateGraphic();
            osmd.render();
            expect(keys().map((key: SVGGraphicsElement): number => key.querySelectorAll("path").length))
                .to.deep.equal([1, 1]);
        } finally {
            osmd.TransposeCalculator = previous;
        }
    });

    it("renders part-wide changes once on both staves, including cancellation and resting voices", async (): Promise<void> => {
        await loadScore("test_key_signature_multi_staff.musicxml");

        expect(keys(), "three changes are drawn once per staff").to.have.length(6);
        expect(keys().map((key: SVGGraphicsElement): number => key.querySelectorAll("path").length))
            .to.deep.equal([1, 2, 2, 1, 2, 2]);
        for (const note of allNotes().filter((candidate: VexFlowGraphicalNote): boolean => !candidate.sourceNote.isRest())) {
            expect(note.DrawnAccidental, "each changed-key pitch is covered by its active key").to.equal(AccidentalEnum.NONE);
        }
    });

    it("places instruction-only keys at their times across a long measure", async (): Promise<void> => {
        await loadScore("test_key_signature_no_onset.musicxml");

        const keyEntry: GraphicalStaffEntry | undefined = osmd.GraphicSheet.MeasureList[0][0].staffEntries.find(
            (entry: GraphicalStaffEntry): boolean => entry.sourceStaffEntry.Timestamp.RealValue === 1.5,
        );
        expect(keys(), "both keys are rendered despite missing onsets").to.have.length(2);
        expect(keyEntry, "the key creates a staff entry at its timestamp").to.not.equal(undefined);
        expect(keyEntry!.graphicalVoiceEntries, "the key entry carries no note onset").to.have.length(0);
        expect(keyEntry!.PositionAndShape.RelativePosition.x, "the key entry has a nonzero layout anchor").to.be.greaterThan(0);
        expect(keys()[1].getBBox().x, "the second key follows the note on beat five")
            .to.be.greaterThan(notesIn(0)[1].vfnote[0].getAbsoluteX());
    });

    it("keeps a rest measure's key visible and clear of the rest", async (): Promise<void> => {
        await osmd.load(TestUtils.getScore("test_key_signature_rest_sequence.musicxml"));
        expect(osmd.Sheet.SourceMeasures[1].canBeReducedToMultiRest(), "a timed key prevents rest reduction").to.equal(false);
        osmd.render();
        expect(osmd.Sheet.SourceMeasures[1].isReducedToMultiRest, "the change interrupts rest compression").to.equal(false);
        expect(osmd.GraphicSheet.MeasureList[1][0] !== undefined, "the key's measure remains visible").to.equal(true);
        expect(keys(), "the timed key is still drawn").to.have.length(1);
        const restBounds: DOMRect = notesIn(1)[0].getSVGGElement().getBBox();
        expect(keys()[0].getBBox().x, "the key is drawn right of the measure rest, not over it")
            .to.be.greaterThan(restBounds.x + restBounds.width);
        const restEntry: GraphicalStaffEntry = notesIn(1)[0].parentVoiceEntry.parentStaffEntry;
        expect(restEntry.PositionAndShape.AbsolutePosition.x * unitInPixels, "the rest's layout anchor stays inside its drawn glyph")
            .to.be.within(restBounds.x, restBounds.x + restBounds.width);
    });

    it("orders a same-time clef, key, natural, and note without overlap", async (): Promise<void> => {
        await loadScore("test_key_signature_clef_change.musicxml");

        const changedKey: SVGGraphicsElement = keys()[keys().length - 1];
        const changedNote: VexFlowGraphicalNote = notesIn(0)[1];
        const modifiers: SVGGraphicsElement[] = Array.from(changedNote.getSVGGElement()
            .querySelectorAll<SVGGraphicsElement>(".vf-modifiers > path"));
        expect(modifiers, "the note has a natural and an in-staff bass clef").to.have.length(2);
        const [natural, changedClef]: SVGGraphicsElement[] = modifiers;
        expect(keys(), "the changed key is rendered").to.have.length(1);
        expect(changedNote.DrawnAccidental, "the F natural cancels the active G-major sharp")
            .to.equal(AccidentalEnum.NATURAL);
        expect(changedClef.getBBox().x + changedClef.getBBox().width, "the clef precedes the key")
            .to.be.at.most(changedKey.getBBox().x);
        expect(changedKey.getBBox().x + changedKey.getBBox().width, "the key precedes the natural")
            .to.be.at.most(natural.getBBox().x);
        expect(natural.getBBox().x + natural.getBBox().width, "the natural precedes the note")
            .to.be.at.most(changedNote.vfnote[0].getAbsoluteX());
    });

    it("draws a key before a beamed grace-note group", async (): Promise<void> => {
        await loadScore("test_key_signature_grace_beam.musicxml");

        const graceNotes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries.flatMap(
            (entry: GraphicalStaffEntry): VexFlowGraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                (voiceEntry): VexFlowGraphicalNote[] => voiceEntry.parentVoiceEntry.IsGrace
                    ? voiceEntry.notes as VexFlowGraphicalNote[] : [],
            ),
        );
        expect(keys(), "the key before the grace group is rendered").to.have.length(1);
        const key: SVGGraphicsElement = keys()[0];
        expect(graceNotes, "the complete grace group is present").to.have.length(2);
        expect(graceNotes.map((note: VexFlowGraphicalNote): AccidentalEnum => note.DrawnAccidental))
            .to.deep.equal([AccidentalEnum.NONE, AccidentalEnum.NONE]);
        expect(key.getBBox().x + key.getBBox().width, "the key precedes the entire grace group")
            .to.be.lessThan(graceNotes[0].vfnote[0].getAbsoluteX());
    });
});
