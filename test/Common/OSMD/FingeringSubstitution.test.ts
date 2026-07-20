import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

async function renderScore(fixture: string): Promise<{osmd: OpenSheetMusicDisplay, div: HTMLElement}> {
    const score: Document = TestUtils.getScore(fixture);
    const div: HTMLElement = TestUtils.getDivElement(document);
    const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
    await osmd.load(score);
    osmd.render();
    return { osmd, div };
}

describe("Fingering Substitution", () => {
    it("single note: substitution flag parsed and slur rendered", async () => {
        const { osmd, div } = await renderScore("fingering-substitution.musicxml");

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
        expect(div.querySelectorAll("g.vf-curve").length).to.be.at.least(1);
    });

    it("chord: substitution slur at correct note height", async () => {
        const { osmd, div } = await renderScore("fingering-substitution-chord.musicxml");

        // Chord: C4 fingering "2", E4 fingerings "3" + "4"(subst).
        // Entries should be [2(C4), 3(E4), 4(E4,subst)] or similar.
        // Substitution must pair y-level with its predecessor entry, not with the C4 entry.
        let entries: GraphicalLabel[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const measure of staffLine.Measures) {
                        for (const staffEntry of measure.staffEntries) {
                            entries = staffEntry.FingeringEntries as GraphicalLabel[];
                        }
                    }
                }
            }
        }
        expect(entries.length).to.be.at.least(3);

        // Find substitution index and its predecessor
        let subIdx: number = -1;
        for (let i: number = 0; i < entries.length; i++) {
            if (entries[i].isSubstitution) {
                subIdx = i;
                break;
            }
        }
        expect(subIdx).to.be.greaterThan(0, "substitution must not be first entry");

        const substLabel: GraphicalLabel = entries[subIdx];
        const pairLabel: GraphicalLabel = entries[subIdx - 1];
        const otherLabel: GraphicalLabel = subIdx >= 2 ? entries[0] : entries[entries.length - 1];

        // Substitution and its pair should share y-level
        const pairY: number = pairLabel.PositionAndShape.RelativePosition.y;
        const substY: number = substLabel.PositionAndShape.RelativePosition.y;
        expect(Math.abs(pairY - substY)).to.be.lessThan(0.05);

        // A different entry (e.g. C4 entry) should be at a distinct y-level
        const otherY: number = otherLabel.PositionAndShape.RelativePosition.y;
        expect(Math.abs(otherY - substY)).to.be.greaterThan(0.1, "substitution must NOT share y-level with unrelated note entry");

        expect(div.querySelectorAll("g.vf-curve").length).to.be.at.least(1);
    });
});
