import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { DynamicEnum, InstantaneousDynamicExpression } from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { MultiExpression } from "../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";

/** The volume of each dynamic marking belongs to its instance (EngravingRules.DynamicToRelativeVolumeDict), not to all
 *  instances on the page. */
describe("Dynamic volumes per OSMD instance", (): void => {
    // pf, sfzp and n
    const sample: string = "test_dynamics_musicxml4_n_pf_sfzp.musicxml";
    const defaultPocoForte: number = 92 / 127;
    const divs: HTMLElement[] = [];
    const instances: OpenSheetMusicDisplay[] = [];

    async function createInstance(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        divs.push(div);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        instances.push(osmd);
        await osmd.load(TestUtils.getScore(sample));
        return osmd;
    }

    afterEach((): void => {
        instances.splice(0).forEach((osmd: OpenSheetMusicDisplay): void => osmd.clear());
        divs.splice(0).forEach((div: HTMLElement): void => div.remove());
    });

    /** The volume of the score's first marking, the pf. */
    function pocoForteVolume(osmd: OpenSheetMusicDisplay): number {
        const dynamics: InstantaneousDynamicExpression[] = osmd.Sheet.SourceMeasures.flatMap(
            (measure: SourceMeasure): InstantaneousDynamicExpression[] => measure.StaffLinkedExpressions.flatMap(
                (staffExpressions: MultiExpression[]): InstantaneousDynamicExpression[] => staffExpressions
                    .map((expression: MultiExpression): InstantaneousDynamicExpression => expression.InstantaneousDynamic)
                    .filter((expression: InstantaneousDynamicExpression): boolean => expression !== undefined)));
        expect(dynamics[0].DynEnum, "the first marking is the pf").to.equal(DynamicEnum.pf);
        return dynamics[0].Volume;
    }

    it("a volume changed in one instance doesn't change the other instance's", async (): Promise<void> => {
        const louder: OpenSheetMusicDisplay = await createInstance();
        const other: OpenSheetMusicDisplay = await createInstance();
        expect(pocoForteVolume(louder), "default").to.be.closeTo(defaultPocoForte, 1e-9);

        louder.EngravingRules.DynamicToRelativeVolumeDict.setValue(DynamicEnum.pf, 0.9);
        expect(pocoForteVolume(louder), "the instance's own value").to.equal(0.9);
        expect(pocoForteVolume(other), "the other instance keeps the default").to.be.closeTo(defaultPocoForte, 1e-9);

        other.EngravingRules.DynamicToRelativeVolumeDict.setValue(DynamicEnum.pf, 0.2);
        expect(pocoForteVolume(louder), "each keeps its own value").to.equal(0.9);
        expect(pocoForteVolume(other), "each keeps its own value").to.equal(0.2);
    });

    it("a marking without a measure has the default volume", (): void => {
        const marking: InstantaneousDynamicExpression =
            new InstantaneousDynamicExpression("pf", 0, PlacementEnum.Below, 1, undefined);
        expect(marking.Volume).to.be.closeTo(defaultPocoForte, 1e-9);
        expect(marking.MidiVolume).to.be.closeTo(92, 1e-9);
    });
});
