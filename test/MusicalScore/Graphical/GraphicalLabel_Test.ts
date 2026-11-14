import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { Label } from "../../../src/MusicalScore/Label";
import { TextAlignmentEnum } from "../../../src/Common/Enums/TextAlignment";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A label measures its text with the measurer of its rules (EngravingRules.TextMeasurer, each OSMD instance's own, in its fonts).
 * The static MusicSheetCalculator.TextMeasurer, which measured labels without one with default rules, was removed.
 */
describe("GraphicalLabel", (): void => {
    function createLabel(rules: EngravingRules): GraphicalLabel {
        return new GraphicalLabel(new Label("dolce"), 2, TextAlignmentEnum.LeftBottom, rules);
    }

    it("measures its text with the measurer of its OSMD instance's rules", async (): Promise<void> => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        try {
            await osmd.load(TestUtils.getScore("test_rest_positioning_8th_quarter.musicxml")); // load() sets the measurer
            const label: GraphicalLabel = createLabel(osmd.EngravingRules);
            label.setLabelPositionAndShapeBorders();
            const width: number = label.PositionAndShape.Size.width;
            expect(width).to.be.greaterThan(0);
            // the instance's measurer, not one shared by all instances: a measurer set on these rules measures the label
            osmd.EngravingRules.TextMeasurer = {
                fontSize: 20,
                fontSizeStandard: 20,
                computeTextWidthToHeightRatio: (): number => 10,
                setFontSize: (fontSize: number): number => fontSize,
            };
            label.setLabelPositionAndShapeBorders();
            expect(label.TextLines[0].width).to.equal(20); // text height 2 * ratio 10
        } finally {
            osmd.clear();
            div.remove();
        }
    });

    it("says that the measurer is missing for rules without one (not of an OSMD instance that has loaded a score)", (): void => {
        expect((): void => createLabel(new EngravingRules()).setLabelPositionAndShapeBorders()).to.throw("EngravingRules.TextMeasurer");
        expect((): void => createLabel(undefined).setLabelPositionAndShapeBorders()).to.throw("EngravingRules.TextMeasurer");
    });
});
