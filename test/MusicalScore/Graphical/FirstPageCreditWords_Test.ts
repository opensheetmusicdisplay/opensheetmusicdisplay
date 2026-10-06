import {expect} from "chai";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {GraphicalLabel} from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import {MusicSystem} from "../../../src/MusicalScore/Graphical/MusicSystem";
import {Label} from "../../../src/MusicalScore/Label";
import {TextAlignmentEnum} from "../../../src/Common/Enums/TextAlignment";
import {TestUtils} from "../../Util/TestUtils";

describe("First-page credit words", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "440px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    it("reads additional first-page words only without page layout, without repeating the headings", async (): Promise<void> => {
        const sample: Document = TestUtils.getScore("test_first_page_credit_words.musicxml");
        await osmd.load(sample);
        expect(osmd.Sheet.TitleString).to.equal("Metadata title");
        expect(osmd.Sheet.FirstPageCreditWords).to.have.length(0);

        osmd.EngravingRules.ReadFirstPageCreditWords = true;
        await osmd.load(sample);
        expect(osmd.Sheet.TitleString).to.equal("Printed title\nSecond title");
        expect(osmd.Sheet.Subtitle.text).to.equal("Printed subtitle\nSecond subtitle line\nThird subtitle");
        expect(osmd.Sheet.ComposerString).to.equal("Printed composer\nSecond composer");
        expect(osmd.Sheet.Lyricist.text).to.equal("Printed lyricist\nSecond lyricist");
        expect(osmd.Sheet.Copyright.text).to.equal("Metadata rights");
        expect(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text)).to.deep.equal([
            "Play twice; second time softly", "Ambiguous rights and composer", "Ambiguous title and page number", "Arranged by A. Example"
        ]);
        expect(osmd.Sheet.FirstPageCreditWords[0].textAlignment).to.equal(TextAlignmentEnum.RightTop);

        // This existing score needs position-based reading: it has no metadata title.
        await osmd.load(TestUtils.getScore("Schubert_An_die_Musik.xml"));
        expect(osmd.Sheet.TitleString).to.equal("An die Musik");
        expect(osmd.Sheet.FirstPageCreditWords).to.have.length(0);
    });

    it("wraps and stacks the additional words above the music, and hides them with drawCredits", async (): Promise<void> => {
        osmd.EngravingRules.ReadFirstPageCreditWords = true;
        await osmd.load(TestUtils.getScore("test_first_page_credit_words_long.musicxml"));
        osmd.render();
        const credits: GraphicalLabel[] = osmd.GraphicSheet.FirstPageCreditWords;
        expect(credits.map((label: GraphicalLabel): TextAlignmentEnum => label.Label.textAlignment))
            .to.deep.equal([TextAlignmentEnum.LeftTop, TextAlignmentEnum.RightTop, TextAlignmentEnum.CenterTop]);
        expect(credits.map((label: GraphicalLabel): string => label.Label.text.replace(/\n/g, " ")))
            .to.deep.equal(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text));
        expect(credits[0].TextLines.length).to.be.greaterThan(1);
        expect(credits[0].PositionAndShape.BorderRight - credits[0].PositionAndShape.BorderLeft)
            .to.be.at.most(osmd.Sheet.pageWidth - osmd.EngravingRules.PageLeftMargin - osmd.EngravingRules.PageRightMargin);

        const top: (label: GraphicalLabel) => number = (label: GraphicalLabel): number =>
            label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderTop;
        const bottom: (label: GraphicalLabel) => number = (label: GraphicalLabel): number =>
            label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderBottom;
        expect(top(credits[0])).to.be.greaterThan(bottom(osmd.GraphicSheet.Title));
        for (let i: number = 1; i < credits.length; i++) {
            expect(top(credits[i])).to.be.greaterThan(bottom(credits[i - 1]));
        }
        const lastBottom: number = bottom(credits[credits.length - 1]);
        expect(top(osmd.GraphicSheet.Composer)).to.be.greaterThan(lastBottom);
        expect(top(osmd.GraphicSheet.Lyricist)).to.be.greaterThan(lastBottom);
        const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        expect(lastBottom).to.be.lessThan(system.PositionAndShape.RelativePosition.y + system.PositionAndShape.BorderTop);

        // This render recalculates the label layout; it does not reread the words.
        osmd.setOptions({drawCredits: false});
        osmd.render();
        expect(osmd.GraphicSheet.FirstPageCreditWords).to.have.length(0);
        expect(osmd.Sheet.FirstPageCreditWords).to.have.length(3);
    });
});
