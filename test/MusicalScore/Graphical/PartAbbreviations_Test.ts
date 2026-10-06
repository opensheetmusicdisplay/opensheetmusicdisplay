import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

describe("Part abbreviations on single-staff systems", (): void => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
    });

    afterEach((): void => {
        osmd.clear();
        container.remove();
    });

    function secondSystem(): MusicSystem {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[1];
    }

    function labels(system: MusicSystem): string[] {
        return system.Labels.map((label: GraphicalLabel): string => label.Label.text);
    }

    it("draws a solo violin's later-system abbreviation only when enabled", async (): Promise<void> => {
        expect(osmd.EngravingRules.RenderPartAbbreviationsForSingleStaff).to.equal(false);
        await osmd.load(TestUtils.getScore("test_part_abbreviation_single_staff.musicxml"));
        osmd.render();
        const defaultX: number = secondSystem().StaffLines[0].PositionAndShape.RelativePosition.x;
        expect(labels(secondSystem())).to.deep.equal([]);

        osmd.EngravingRules.RenderPartAbbreviationsForSingleStaff = true;
        osmd.render();
        expect(labels(secondSystem())).to.deep.equal(["Vln."]);
        expect(secondSystem().StaffLines[0].PositionAndShape.RelativePosition.x).to.be.greaterThan(defaultX);

        osmd.EngravingRules.RenderPartNames = false;
        osmd.render();
        expect(labels(secondSystem())).to.deep.equal([]);

        osmd.EngravingRules.RenderPartNames = true;
        osmd.EngravingRules.RenderPartAbbreviations = false;
        osmd.render();
        expect(labels(secondSystem())).to.deep.equal([]);
    });

    it("draws L.H. later when the upper instrument is hidden and enabled", async (): Promise<void> => {
        await osmd.load(TestUtils.getScore("test_octaveshift_first_instrument_invisible_Scale_sixteenth_break_m2.musicxml"));
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.EngravingRules.RenderPartAbbreviationsForSingleStaff = true;
        osmd.render();

        expect(secondSystem().StaffLines).to.have.length(1);
        expect(labels(secondSystem())).to.deep.equal(["L.H."]);
    });
});
