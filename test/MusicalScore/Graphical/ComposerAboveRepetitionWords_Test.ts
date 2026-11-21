import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";

/**
 * test_composer_above_fine_end_of_first_system.musicxml ends its first system with a Fine in its default position,
 * which reserves no skyline space (see VexFlowMusicSheetCalculator.placeWordRepetitionInSkyline()), under the composer.
 * The composer is placed above the first system's top border, which has to include the Fine.
 */
describe("Composer above a repetition instruction at the end of the first system", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(TestUtils.getScore("test_composer_above_fine_end_of_first_system.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The box of the text element of the SVG that draws exactly the given text. */
    function drawnBox(text: string): DOMRect {
        const element: SVGTextElement = Array.from(container.querySelectorAll("text")).find(e => e.textContent === text);
        return element.getBBox();
    }

    it("is drawn above the Fine, not over it", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures.length, "measures in the first system").to.equal(2);
        const composer: DOMRect = drawnBox("Traditional");
        const fine: DOMRect = drawnBox("Fine");
        expect(fine.x + fine.width, "the Fine ends under the composer").to.be.greaterThan(composer.x);
        expect(composer.y + composer.height, `the composer's bottom, the Fine's top is ${fine.y.toFixed(1)}`).to.be.at.most(fine.y);
    });

    it("stays below the title, where it is without the Fine: the system moves down instead", () => {
        const rules: EngravingRules = osmd.EngravingRules;
        const belowTitle: number = rules.PageTopMargin + rules.TitleTopDistance + rules.SheetTitleHeight + rules.TitleBottomDistance;
        expect(osmd.GraphicSheet.Composer.PositionAndShape.RelativePosition.y)
            .to.be.closeTo(belowTitle - rules.SystemComposerDistance, 0.1);
    });
});
