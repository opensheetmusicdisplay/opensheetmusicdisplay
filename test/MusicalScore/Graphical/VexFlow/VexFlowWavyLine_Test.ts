import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { MusicSystem } from "../../../../src/MusicalScore/Graphical/MusicSystem";
import { VexFlowVibratoBracket } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { WavyLine } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * calculateSingleWavyLine falls back to `measure.staffEntries[0]` (and to the last
 * staffEntry of the last staffline measure) when it cannot find a staff entry for the
 * wavy line's timestamp. A measure can legitimately have no staff entries -- e.g. an
 * IsExtraGraphicalMeasure used to show a key/rhythm change, or an empty measure in the
 * drawing range of a large score -- in which case that lookup yields `undefined`.
 *
 * setStartNote/setEndNote then dereferenced `.graphicalVoiceEntries` on it and the
 * TypeError aborted the entire render. They now report "no note found" (false), which
 * is the same contract the callers already handle for the multi-system case.
 */
describe("VexFlowVibratoBracket", () => {
    function createBracket(): VexFlowVibratoBracket {
        return new VexFlowVibratoBracket(new WavyLine(undefined), new BoundingBox(undefined));
    }

    it("setStartNote returns false for an undefined staff entry instead of throwing", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        let result: boolean;
        expect(() => result = bracket.setStartNote(undefined)).to.not.throw();
        expect(result, "no start note could be found").to.be.false;
        expect(bracket.startNote, "start note stays unset").to.be.undefined;
        done();
    });

    it("setEndNote returns false for an undefined staff entry instead of throwing", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        let result: boolean;
        expect(() => result = bracket.setEndNote(undefined)).to.not.throw();
        expect(result, "no end note could be found").to.be.false;
        expect(bracket.endNote, "end note stays unset").to.be.undefined;
        done();
    });

    it("still reports false for a staff entry without voice entries", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        const emptyStaffEntry: GraphicalStaffEntry = { graphicalVoiceEntries: [] } as GraphicalStaffEntry;
        expect(bracket.setStartNote(emptyStaffEntry), "no start note in an empty staff entry").to.be.false;
        expect(bracket.setEndNote(emptyStaffEntry), "no end note in an empty staff entry").to.be.false;
        done();
    });
});

/**
 * A trill's wavy line crossing two system breaks, in two parts (Violin I and II), with each of the two systems it leaves
 * ending in an extra measure (courtesy key signature, then courtesy time signature) that has no staff entries.
 */
describe("Wavy line across systems", () => {
    const sampleFilename: string = "test_wavy_line_multiline_extragraphicalmeasure.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks: 3 systems regardless of width
    });
    afterEach(() => {
        container.remove();
    });

    /** "system: part m.start-end" for each drawn wavy line segment, from the measures of its start and end note */
    function wavyLineSegments(): string[] {
        const segments: string[] = [];
        osmd.GraphicSheet.MusicPages[0].MusicSystems.forEach((system: MusicSystem, systemIndex: number) => {
            for (const staffLine of system.StaffLines) {
                for (const wavyLine of staffLine.WavyLines) {
                    const bracket: VexFlowVibratoBracket = wavyLine as VexFlowVibratoBracket;
                    const startMeasure: number = bracket.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                    const endMeasure: number = bracket.endVfVoiceEntry?.parentStaffEntry.parentMeasure.MeasureNumber;
                    segments.push(`${systemIndex + 1}: ${staffLine.ParentStaff.ParentInstrument.Name} m.${startMeasure}-${endMeasure}`);
                }
            }
        });
        return segments;
    }

    it("draws each segment up to the last note of its system, not to the extra measure at its end", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render(); // threw a TypeError for the second system, whose last measure is an extra measure
        expect(wavyLineSegments()).to.deep.equal([
            "1: Violin I m.1-2", "1: Violin II m.1-2", // ended in m.1 before (drawn up to the end of its start measure)
            "2: Violin I m.3-4", "2: Violin II m.3-4",
            "3: Violin I m.5-6", "3: Violin II m.5-6",
        ]);
    });

    it("draws the wavy line of a part after a hidden instrument on that part's staff lines", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.Sheet.Instruments[0].Visible = false; // the systems' staff line indices no longer match the staff indices
        osmd.render();
        expect(wavyLineSegments()).to.deep.equal(["1: Violin II m.1-2", "2: Violin II m.3-4", "3: Violin II m.5-6"]);
    });

    it("skips the segment of a system without a start note instead of aborting the render", async () => {
        const score: Document = TestUtils.getScore(sampleFilename).cloneNode(true) as Document;
        // empty the first measure of the second system: a measure without notes has no staff entries
        score.querySelectorAll("measure[number='3'] note").forEach((note: Element) => note.remove());
        await osmd.load(score);
        osmd.render();
        expect(wavyLineSegments()).to.deep.equal([
            "1: Violin I m.1-2", "1: Violin II m.1-2",
            "3: Violin I m.5-6", "3: Violin II m.5-6",
        ]);
    });
});
