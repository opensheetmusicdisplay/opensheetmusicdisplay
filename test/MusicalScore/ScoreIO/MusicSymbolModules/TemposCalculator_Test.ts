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

    async function bpmAtEachNote(filename: string): Promise<number[]> {
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
        return bpms;
    }

    it("keeps an explicit tempo through a tempo word and a BPM-free note equation", async (): Promise<void> => {
        expect(await bpmAtEachNote("test_tempo_state.musicxml"))
            .to.deep.equal([60, 96, 96, 96]);
    });

    it("uses the existing default tempo policy for an initial BPM-free note equation", async (): Promise<void> => {
        expect(await bpmAtEachNote("test_tempo_state_start_fallback.musicxml"))
            .to.deep.equal([106, 106]);
    });
});
