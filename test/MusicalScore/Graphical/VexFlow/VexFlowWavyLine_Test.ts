import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowVibratoBracket } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { WavyLine } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/WavyLine";

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
