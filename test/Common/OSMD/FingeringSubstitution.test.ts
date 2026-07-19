import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

describe("Fingering Substitution", () => {
    async function renderScore(): Promise<{osmd: OpenSheetMusicDisplay, div: HTMLElement}> {
        const score: Document = TestUtils.getScore("fingering-substitution.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();
        return { osmd, div };
    }

    it("parses substitution flag and creates substitution slur SVG", async () => {
        const { osmd, div } = await renderScore();

        // Verify isSubstitution flag on fingering labels
        let foundSubstitution: boolean = false;
        let fingeringCount: number = 0;
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const measure of staffLine.Measures) {
                        for (const staffEntry of measure.staffEntries) {
                            for (const label of staffEntry.FingeringEntries as GraphicalLabel[]) {
                                fingeringCount++;
                                if (label.isSubstitution) {
                                    foundSubstitution = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        expect(fingeringCount).to.be.at.least(2);
        expect(foundSubstitution).to.equal(true);

        // Verify SVG output contains curve group (substitution slur)
        // VexFlow prefixes classes with "vf-".
        const curveGroups: NodeListOf<Element> = div.querySelectorAll("g.vf-curve");
        expect(curveGroups.length).to.be.at.least(1);
    });

    it("renders fingering labels as SVG text elements", async () => {
        const { div } = await renderScore();
        // Fingering labels are rendered as <g class="vf-text"> groups
        const textGroups: NodeListOf<Element> = div.querySelectorAll("g.vf-text");
        expect(textGroups.length).to.be.at.least(2);
    });
});
