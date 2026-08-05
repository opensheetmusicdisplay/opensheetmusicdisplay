import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { NoteHeadShape } from "../../../../src/MusicalScore/VoiceData/Notehead";
import { ArticulationEnum } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import * as VF from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowAdapter";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlow 5 compatibility geometry", () => {
    it("renders mixed slash and normal noteheads in one percussion chord", async (): Promise<void> => {
        const score: Document = TestUtils.getScore("test_drums_slash_chord.musicxml");
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

        await osmd.load(score);
        osmd.render();

        const chordEntry: any = osmd.GraphicSheet.MeasureList
            .flatMap((measureList: any[]) => measureList)
            .flatMap((measure: any) => measure.staffEntries)
            .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
            .find((voiceEntry: any) => voiceEntry.notes?.length === 2);
        expect(chordEntry, "expected a two-note percussion chord").to.not.equal(undefined);

        const slashNote: any = chordEntry.notes.find(
            (note: any): boolean => note.sourceNote.Notehead?.Shape === NoteHeadShape.SLASH,
        );
        const staveNote: VF.StaveNote = chordEntry.vfStaveNote;
        const slashGlyph: string = VF.Note.getGlyphProps(staveNote.getDuration(), "s").codeHead;
        expect(slashNote, "expected a slash notehead in the chord").to.not.equal(undefined);
        expect(staveNote.noteHeads[slashNote.vfnoteIndex].getText()).to.equal(slashGlyph);
    });

    it("keeps inverted fermata source data and modifier counts stable across rebuilds", async (): Promise<void> => {
        const score: Document = TestUtils.getScore("test_fermata_inverted_placement.musicxml");
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        await osmd.load(score);

        const articulationCounts: () => number[] = (): number[] => osmd.Sheet.SourceMeasures
            .flatMap((measure: any) => measure.VerticalSourceStaffEntryContainers)
            .flatMap((container: any) => container.StaffEntries.filter(Boolean))
            .flatMap((staffEntry: any) => staffEntry.VoiceEntries)
            .map((voiceEntry: any) => voiceEntry.Articulations.length);
        const renderedInvertedFermatas: () => any[] = (): any[] => osmd.GraphicSheet.MeasureList
            .flatMap((measureList: any[]) => measureList)
            .flatMap((measure: any) => measure.staffEntries)
            .flatMap((staffEntry: any) => staffEntry.graphicalVoiceEntries)
            .flatMap((voiceEntry: any) => voiceEntry.vfStaveNote?.modifiers ?? [])
            .filter((modifier: any): boolean =>
                modifier.osmdArticulationEnum === ArticulationEnum.invertedfermata,
            );

        osmd.render();
        const initialCounts: number[] = articulationCounts();
        expect(renderedInvertedFermatas()).to.have.length(1);

        osmd.updateGraphic();
        osmd.render();
        expect(articulationCounts()).to.deep.equal(initialCounts);
        expect(renderedInvertedFermatas()).to.have.length(1);
    });

    it("draws unmeasured buzz rolls with finite finalized stem geometry", async (): Promise<void> => {
        const score: Document = TestUtils.getScore("test_tremolo_unmeasured_buzz_roll.musicxml");
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(score);
        osmd.render();

        const buzzRolls: Element[] = Array.from(container.querySelectorAll("g[id^='vf-buzzRoll']"));
        expect(buzzRolls.length).to.be.greaterThan(0);
        for (const path of buzzRolls.flatMap((group: Element): Element[] => Array.from(group.querySelectorAll("path")))) {
            expect(path.getAttribute("d")).to.not.match(/NaN|Infinity/);
        }
    });
});
