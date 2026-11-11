import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A heavy-heavy barline (bar-style heavy-heavy, SystemLinesEnum.DoubleBold) of a part with several staves: each stave's end
 * barline is Barline.type.DOUBLE_HEAVY (8, VexFlowPatch), and a StaveConnector joins the staves at it. Its type comes from
 * VexFlowConverter.line(), which had no case for DoubleBold: the connector kept VexFlow's default type DOUBLE, a heavy line
 * left of the measure's start, so the measure started with a heavy double line across the staves while its heavy-heavy end
 * barlines weren't joined. Now the connector is DOUBLE_HEAVY_RIGHT (9, VexFlowPatch), two heavy lines at the right of the
 * staves, over the staves' end barlines.
 */
describe("Heavy-heavy barline of a part with two staves", () => {
    const DOUBLE: number = 2; // VF.StaveConnector.type.DOUBLE, VexFlow's default
    const DOUBLE_HEAVY_RIGHT: number = 9; // VexFlowPatch
    const BARLINE_DOUBLE_HEAVY: number = 8; // VF.Barline.type.DOUBLE_HEAVY, VexFlowPatch
    const heavyMeasures: number[] = [3, 6]; // test_barline_heavy-heavy_two_staves.musicxml
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    function render(): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        return osmd.load(TestUtils.getScore("test_barline_heavy-heavy_two_staves.musicxml")).then(() => osmd.render());
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function systems(): MusicSystem[] {
        return osmd.GraphicSheet.MusicPages.reduce((all, page) => all.concat(page.MusicSystems), [] as MusicSystem[]);
    }

    it("joins the staves with two heavy lines at the right of the measure, over the staves' heavy-heavy end barlines", () => {
        return render().then(() => {
            let heavyConnectors: number = 0;
            for (const system of systems()) {
                expect(system.StaffLines.length, `system ${system.Id}: stafflines`).to.equal(2);
                const top: VexFlowMeasure[] = system.StaffLines[0].Measures as VexFlowMeasure[];
                const bottom: VexFlowMeasure[] = system.StaffLines[1].Measures as VexFlowMeasure[];
                const connectors: any[] = [];
                for (const measure of bottom) {
                    connectors.push(...(measure as any).connectors);
                }
                // a barline after each measure and the system's left line
                expect(connectors.length, `system ${system.Id}: connectors`).to.equal(top.length + 1);
                for (const connector of connectors) {
                    expect(connector.type, `system ${system.Id}: no connector left at VexFlow's default type`).to.not.equal(DOUBLE);
                }
                top.forEach((measure, i) => {
                    const measureNumber: number = measure.MeasureNumber;
                    const isHeavy: boolean = heavyMeasures.includes(measureNumber);
                    for (const vfMeasure of [measure, bottom[i]]) {
                        const endBarType: number = (vfMeasure.getVFStave() as any).modifiers[1].type;
                        expect(endBarType === BARLINE_DOUBLE_HEAVY, `measure ${measureNumber}: stave end barline double heavy`)
                            .to.equal(isHeavy);
                    }
                    const atMeasure: any[] = connectors.filter(connector => connector.top_stave === measure.getVFStave() &&
                        connector.type !== 1 && connector.type !== 5); // not the system's left line
                    expect(atMeasure.length, `measure ${measureNumber}: one connector at its end`).to.equal(1);
                    expect(atMeasure[0].type === DOUBLE_HEAVY_RIGHT, `measure ${measureNumber}: connector double heavy`)
                        .to.equal(isHeavy);
                    if (isHeavy) {
                        heavyConnectors++;
                    }
                });
            }
            expect(heavyConnectors, "both heavy-heavy barlines joined").to.equal(heavyMeasures.length);
        });
    });
});
