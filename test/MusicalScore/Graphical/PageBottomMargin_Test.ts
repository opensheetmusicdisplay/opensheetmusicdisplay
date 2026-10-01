import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

describe("Page bottom margin", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });

    afterEach(() => {
        container.remove();
    });

    it("keeps the last system inside the bottom margin after shifting the page's systems down", async () => {
        osmd.setOptions({ pageFormat: "A4_P", newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        const pages: GraphicalMusicPage[] = osmd.GraphicSheet.MusicPages;
        expect(pages.length, "several pages exercise the first-system offset on each page").to.be.greaterThan(1);
        for (const page of pages) {
            const last: BoundingBox = page.MusicSystems[page.MusicSystems.length - 1].PositionAndShape;
            expect(last.RelativePosition.y + last.BorderBottom, `last system on page ${page.PageNumber}`)
                .to.be.at.most(osmd.EngravingRules.PageHeight - osmd.EngravingRules.PageBottomMargin);
        }
    });

    it("keeps the copyright below page 1's last system above the bottom margin", async () => {
        container.style.width = "960px";
        osmd.setOptions({ pageFormat: "A5_L", newSystemFromXML: true });
        osmd.EngravingRules.RenderCopyright = true;
        await osmd.load(TestUtils.getScore("test_renderNext_copyright_below_last_system_1710.musicxml"));
        osmd.render();
        const first: GraphicalMusicPage = osmd.GraphicSheet.MusicPages[0];
        expect(first.Labels).to.include(osmd.GraphicSheet.Copyright);
        const copyright: BoundingBox = osmd.GraphicSheet.Copyright.PositionAndShape;
        expect(copyright.RelativePosition.y + copyright.BorderBottom, "copyright stays above the bottom margin")
            .to.be.at.most(osmd.EngravingRules.PageHeight - osmd.EngravingRules.PageBottomMargin);
    });
});
