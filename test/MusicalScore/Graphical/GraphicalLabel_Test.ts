import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { Label } from "../../../src/MusicalScore/Label";
import { TextAlignmentEnum } from "../../../src/Common/Enums/TextAlignment";
import { ITextMeasurer } from "../../../src/MusicalScore/Interfaces/ITextMeasurer";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A label measures its text with the measurer of its rules (EngravingRules.TextMeasurer, each OSMD instance's own, in its fonts),
 * which an OSMD instance's rules have from the start. The static MusicSheetCalculator.TextMeasurer, which measured labels
 * without one with default rules, was removed.
 */
describe("GraphicalLabel", (): void => {
    function createLabel(rules: EngravingRules): GraphicalLabel {
        return new GraphicalLabel(new Label("dolce"), 2, TextAlignmentEnum.LeftBottom, rules);
    }

    it("measures its text with the measurer of its OSMD instance's rules, also before a score is loaded", async (): Promise<void> => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        try {
            const label: GraphicalLabel = createLabel(osmd.EngravingRules);
            label.setLabelPositionAndShapeBorders();
            const width: number = label.PositionAndShape.Size.width;
            expect(width).to.be.greaterThan(0);
            // the instance's measurer, not one shared by all instances: a measurer set on these rules measures the label
            const textMeasurer: ITextMeasurer = {
                fontSize: 20,
                fontSizeStandard: 20,
                computeTextWidthToHeightRatio: (): number => 10,
                setFontSize: (fontSize: number): number => fontSize,
            };
            osmd.EngravingRules.TextMeasurer = textMeasurer;
            label.setLabelPositionAndShapeBorders();
            expect(label.TextLines[0].width).to.equal(20); // text height 2 * ratio 10
            // loading and rendering a score keep the measurer that the app set
            await osmd.load(TestUtils.getScore("test_rest_positioning_8th_quarter.musicxml"));
            osmd.render();
            expect(osmd.EngravingRules.TextMeasurer === textMeasurer, "the measurer set by the app is kept").to.equal(true);
        } finally {
            osmd.clear();
            div.remove();
        }
    });

    it("says that the measurer is missing for rules without one (not created by an OSMD instance)", (): void => {
        expect((): void => createLabel(new EngravingRules()).setLabelPositionAndShapeBorders()).to.throw("EngravingRules.TextMeasurer");
        expect((): void => createLabel(undefined).setLabelPositionAndShapeBorders()).to.throw("EngravingRules.TextMeasurer");
    });
});
