import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("Tempo state", (): void => {
    let container: HTMLElement;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
    });

    afterEach((): void => {
        container.remove();
    });

    async function tempoState(filename: string): Promise<{ bpms: number[], metronomeBpms: number[] }> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(filename));
        osmd.render();
        osmd.cursor.show();
        osmd.cursor.reset();
        const bpms: number[] = [];
        while (!osmd.cursor.Iterator.EndReached) {
            bpms.push(osmd.cursor.Iterator.CurrentBpm);
            osmd.cursor.next();
        }
        const metronomeBpms: number[] = osmd.Sheet.TimestampSortedTempoExpressionsList
            .map(expression => expression.InstantaneousTempo)
            .filter(expression => expression?.isMetronomeMark)
            .map(expression => expression.TempoInBpm);
        return { bpms, metronomeBpms };
    }

    it("keeps an explicit tempo through BPM-free note equations and a tempo word", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state.musicxml");
        expect(state.bpms).to.deep.equal([60, 96, 96, 96, 96]);
        expect(state.metronomeBpms).to.deep.equal([60, 96, 96, 96]);
    });

    it("keeps a defined tempo for an initial swing mark", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state_start_fallback.musicxml");
        expect(state.bpms).to.have.lengthOf(2);
        expect(state.bpms[0]).to.be.greaterThan(0);
        expect(state.bpms[1]).to.equal(state.bpms[0]);
        expect(state.metronomeBpms).to.deep.equal([state.bpms[0]]);
    });

    it("keeps a defined tempo when the first swing mark follows an unmarked measure", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state_delayed_equation.musicxml");
        expect(state.bpms).to.have.lengthOf(2);
        expect(state.bpms[0]).to.be.greaterThan(0);
        expect(state.bpms[1]).to.equal(state.bpms[0]);
        expect(state.metronomeBpms).to.deep.equal([state.bpms[0]]);
    });
});
