import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalSymbolFactory } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalSymbolFactory";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { OctaveEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";

/** A factory that counts the notes it creates. */
class CountingSymbolFactory extends VexFlowGraphicalSymbolFactory {
    public createdNotes: number = 0;

    public createNote(note: Note, graphicalVoiceEntry: GraphicalVoiceEntry, activeClef: ClefInstruction,
                      octaveShift: OctaveEnum = OctaveEnum.NONE, rules: EngravingRules, graphicalNoteLength: Fraction = undefined): GraphicalNote {
        this.createdNotes++;
        return super.createNote(note, graphicalVoiceEntry, activeClef, octaveShift, rules, graphicalNoteLength);
    }
}

/** The factory of the graphical objects belongs to its instance (EngravingRules.SymbolFactory), not to all instances on the page. */
describe("Symbol factory per OSMD instance", (): void => {
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

    it("each instance creates its graphical objects with its own factory", async (): Promise<void> => {
        const first: OpenSheetMusicDisplay = createInstance();
        const second: OpenSheetMusicDisplay = createInstance();
        await first.load(TestUtils.getScore(sample));
        first.render();
        const firstFactory: VexFlowGraphicalSymbolFactory = first.EngravingRules.SymbolFactory as VexFlowGraphicalSymbolFactory;
        await second.load(TestUtils.getScore(sample));
        second.render();

        expect(firstFactory instanceof VexFlowGraphicalSymbolFactory, "set by the instance's calculator").to.equal(true);
        expect(first.EngravingRules.SymbolFactory === firstFactory, "not replaced by the second instance").to.equal(true);
        expect(second.EngravingRules.SymbolFactory !== firstFactory, "the second instance has its own").to.equal(true);
    });

    it("a factory set on one instance is used by that instance only, and kept", async (): Promise<void> => {
        const counted: OpenSheetMusicDisplay = createInstance();
        const other: OpenSheetMusicDisplay = createInstance();
        const factory: CountingSymbolFactory = new CountingSymbolFactory();
        counted.EngravingRules.SymbolFactory = factory;

        await counted.load(TestUtils.getScore(sample));
        counted.render();
        const notesOfOneRender: number = factory.createdNotes;
        expect(notesOfOneRender, "the instance's notes come from its factory").to.be.greaterThan(0);

        await other.load(TestUtils.getScore(sample));
        other.render();
        expect(factory.createdNotes, "the other instance doesn't use it").to.equal(notesOfOneRender);
        expect(other.EngravingRules.SymbolFactory instanceof CountingSymbolFactory, "the other instance's factory").to.equal(false);

        await counted.load(TestUtils.getScore(sample));
        counted.render();
        expect(counted.EngravingRules.SymbolFactory === factory, "kept after the other instance's render and a new load").to.equal(true);
        expect(factory.createdNotes, "used again for the new load").to.equal(2 * notesOfOneRender);
    });
});
