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

    it("changes the tempo at metric modulations and keeps it through a tempo word and a swing mark", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state.musicxml");
        // quarter = dotted quarter in m3: the new dotted quarter lasts as long as the old quarter, 96 * 1.5 = 144.
        // dotted quarter = quarter in m5 (written with two beat units): back to 144 * 2 / 3 = 96. The swing mark in m6 keeps it.
        expect(state.bpms).to.deep.equal([60, 96, 144, 144, 96, 96]);
        expect(state.metronomeBpms).to.deep.equal([60, 96, 144, 96, 96]);
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
