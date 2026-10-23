import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";

describe("Written augmentation dots", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1100px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });

    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The dots of the sample's dyads, per measure (see the comment in the sample): m.1 two undotted dyads in nested tuplets,
     *  m.2 an undotted and a dotted one, m.3 two dyads without <type>, dotted quarter notes by their duration. */
    const expectedDots: number[][] = [[0, 0], [0, 1], [1, 1]];

    it("Renders every chord member with the written dots, or with the dots of its duration when the type is absent (#1840)", async () => {
        await osmd.load(TestUtils.getScore("test_tuplet_nested_chord_dots.musicxml"));
        osmd.render();
        osmd.GraphicSheet.MeasureList.forEach((staves: GraphicalMeasure[], measureIndex: number) => {
            const dyads: GraphicalVoiceEntry[] = staves[0].staffEntries
                .flatMap(entry => entry.graphicalVoiceEntries)
                .filter(entry => !entry.notes[0].sourceNote.isRest());
            // VexFlowConverter.StaveNote() draws as many dots as the chord member with the most
            expect(dyads.map(dyad => dyad.notes.map(note => note.numberOfDots)), `dots of the dyads' notes in measure ${measureIndex + 1}`)
                .to.deep.equal(expectedDots[measureIndex].map(dots => [dots, dots]));
        });
    });
});
