import {expect} from "chai";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {GraphicalLabel} from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import {GraphicalMusicPage} from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import {MusicSheetCalculator} from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {MusicSystem} from "../../../src/MusicalScore/Graphical/MusicSystem";
import {Label} from "../../../src/MusicalScore/Label";
import {TextAlignmentEnum} from "../../../src/Common/Enums/TextAlignment";
import {TestUtils} from "../../Util/TestUtils";

describe("First-page credit words", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.EngravingRules.ReadFirstPageCreditWords = true;
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    async function load(name: string): Promise<void> {
        await osmd.load(TestUtils.getScore(name));
        osmd.render();
    }

    function creditTexts(): string[] {
        return osmd.GraphicSheet.FirstPageCreditWords.map((label: GraphicalLabel): string => label.Label.text);
    }

    function top(label: GraphicalLabel): number {
        return label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderTop;
    }

    function bottom(label: GraphicalLabel): number {
        return label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderBottom;
    }

    function expectHeaderClearance(): void {
        const credits: GraphicalLabel[] = osmd.GraphicSheet.FirstPageCreditWords;
        expect(credits.length).to.be.greaterThan(0);
        for (const heading of [osmd.GraphicSheet.Title, osmd.GraphicSheet.Subtitle]) {
            if (heading && osmd.GraphicSheet.MusicPages[0].Labels.includes(heading)) {
                expect(top(credits[0])).to.be.greaterThan(bottom(heading));
            }
        }
        for (let i: number = 1; i < credits.length; i++) {
            expect(top(credits[i])).to.be.greaterThan(bottom(credits[i - 1]));
        }
        const lastBottom: number = bottom(credits[credits.length - 1]);
        for (const author of [osmd.GraphicSheet.Composer, osmd.GraphicSheet.Lyricist]) {
            if (author) {
                expect(top(author)).to.be.greaterThan(lastBottom);
            }
        }
        const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        expect(lastBottom).to.be.lessThan(system.PositionAndShape.RelativePosition.y + system.PositionAndShape.BorderTop);
    }

    it("keeps the default reader path unchanged until the opt-in is set before load", async (): Promise<void> => {
        osmd.EngravingRules.ReadFirstPageCreditWords = false;
        await load("test_first_page_credit_words.musicxml");
        expect(creditTexts()).to.deep.equal([]);
        expect(osmd.Sheet.TitleString).to.equal("Metadata title");
        expect(osmd.Sheet.Lyricist.text).to.equal("Metadata lyricist");
        osmd.EngravingRules.ReadFirstPageCreditWords = true;
        osmd.render();
        expect(creditTexts()).to.deep.equal([]);
        expect(osmd.Sheet.TitleString).to.equal("Metadata title");
        await load("test_first_page_credit_words.musicxml");
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
        expect(osmd.Sheet.TitleString).to.equal("Printed title\nSecond title");
    });

    it("uses singleton typed roles and retains an independent first-page credit", async (): Promise<void> => {
        osmd.EngravingRules.RenderCopyright = true;
        await load("test_first_page_credit_words.musicxml");
        expect(osmd.Sheet.TitleString).to.equal("Printed title\nSecond title");
        expect(osmd.Sheet.Subtitle.text).to.equal("Printed subtitle\nSecond subtitle line\nThird subtitle");
        expect(osmd.Sheet.ComposerString).to.equal("Printed composer\nSecond composer");
        expect(osmd.Sheet.Lyricist.text).to.equal("Printed lyricist\nSecond lyricist");
        expect(osmd.Sheet.Copyright.text).to.equal("Metadata rights");
        expect(osmd.GraphicSheet.Copyright.Label.text).to.equal("Metadata rights");
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
        expect(osmd.GraphicSheet.FirstPageCreditWords[0].Label.textAlignment).to.equal(TextAlignmentEnum.RightTop);
        expectHeaderClearance();
        osmd.render();
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
        expectHeaderClearance();
    });

    it("keeps unknown and multi-type credits independent", async (): Promise<void> => {
        osmd.EngravingRules.RenderCopyright = true;
        await load("test_first_page_credit_words_ambiguous.musicxml");
        expect(osmd.Sheet.Copyright.text).to.equal("Printed rights");
        expect(osmd.Sheet.ComposerString).to.equal("Metadata composer");
        expect(osmd.Sheet.TitleString).to.equal("Metadata title");
        expect(creditTexts()).to.deep.equal([
            "Ambiguous rights and composer", "Ambiguous title and page number", "Arranged by A. Example"
        ]);
        expect(osmd.GraphicSheet.Copyright.Label.text).to.equal("Printed rights");
    });

    it("keeps independent credits wrapped, stacked and clear of authors and the first system", async (): Promise<void> => {
        div.style.width = "440px";
        await load("test_first_page_credit_words_long.musicxml");
        expect(osmd.GraphicSheet.FirstPageCreditWords.map((label: GraphicalLabel): TextAlignmentEnum => label.Label.textAlignment))
            .to.deep.equal([TextAlignmentEnum.LeftTop, TextAlignmentEnum.RightTop, TextAlignmentEnum.CenterTop]);
        expect(creditTexts().map((text: string): string => text.replace(/\n/g, " ")))
            .to.deep.equal(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text));
        const [first]: GraphicalLabel[] = osmd.GraphicSheet.FirstPageCreditWords;
        expect(first.TextLines.length).to.be.greaterThan(1);
        expect(first.PositionAndShape.BorderRight - first.PositionAndShape.BorderLeft)
            .to.be.at.most(osmd.Sheet.pageWidth - osmd.EngravingRules.PageLeftMargin - osmd.EngravingRules.PageRightMargin);
        expectHeaderClearance();
    });

    it("keeps right- and center-aligned long credits inside a horizontal sheet", async (): Promise<void> => {
        osmd.setOptions({renderSingleHorizontalStaffline: true});
        await load("test_first_page_credit_words_long.musicxml");
        expect(osmd.GraphicSheet.FirstPageCreditWords.map((label: GraphicalLabel): TextAlignmentEnum => label.Label.textAlignment))
            .to.deep.equal([TextAlignmentEnum.LeftTop, TextAlignmentEnum.RightTop, TextAlignmentEnum.CenterTop]);
        expect(creditTexts().map((text: string): string => text.replace(/\n/g, " ")))
            .to.deep.equal(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text));
        const page: GraphicalMusicPage = osmd.GraphicSheet.MusicPages[0];
        for (const credit of osmd.GraphicSheet.FirstPageCreditWords) {
            expect(credit.PositionAndShape.RelativePosition.x + credit.PositionAndShape.BorderLeft)
                .to.be.at.least(osmd.EngravingRules.PageLeftMargin);
            expect(credit.PositionAndShape.RelativePosition.x + credit.PositionAndShape.BorderRight)
                .to.be.at.most(page.PositionAndShape.BorderRight);
        }
        const svg: SVGSVGElement = div.querySelector("svg");
        const bounds: DOMRect = svg.getBoundingClientRect();
        for (const text of Array.from(svg.querySelectorAll("text"))) {
            const textBounds: DOMRect = text.getBoundingClientRect();
            expect(textBounds.left).to.be.at.least(bounds.left - 1);
            expect(textBounds.right).to.be.at.most(bounds.right + 1);
        }
    });

    it("separates drawCredits and RenderCredits visibility without changing the loaded model", async (): Promise<void> => {
        osmd.setOptions({drawCredits: false});
        await load("test_first_page_credit_words.musicxml");
        expect(creditTexts()).to.deep.equal([]);
        expect(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text))
            .to.deep.equal(["Play twice; second time softly"]);
        osmd.setOptions({drawCredits: true});
        osmd.render();
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
        const headerTexts: string[] = osmd.GraphicSheet.MusicPages[0].Labels.map((label: GraphicalLabel): string => label.Label.text);
        osmd.EngravingRules.RenderCredits = false;
        osmd.render();
        expect(creditTexts()).to.deep.equal([]);
        expect(osmd.GraphicSheet.MusicPages[0].Labels.map((label: GraphicalLabel): string => label.Label.text))
            .to.deep.equal(headerTexts.filter((text: string): boolean => text !== "Play twice; second time softly"));
        expect(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text))
            .to.deep.equal(["Play twice; second time softly"]);
        osmd.EngravingRules.RenderCredits = true;
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].Labels.map((label: GraphicalLabel): string => label.Label.text)).to.deep.equal(headerTexts);
        osmd.setOptions({drawCredits: false});
        osmd.render();
        expect(creditTexts()).to.deep.equal([]);
        osmd.setOptions({drawCredits: true});
        osmd.render();
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
    });

    it("keeps compact visibility separate from compact header geometry", async (): Promise<void> => {
        osmd.setOptions({drawingParameters: "compact"});
        await load("test_first_page_credit_words_long.musicxml");
        expect(creditTexts()).to.deep.equal([]);
        osmd.setOptions({drawCredits: true, drawTitle: false});
        osmd.render();
        expectHeaderClearance();
        osmd.setOptions({drawingParameters: "compact"});
        osmd.render();
        expect(creditTexts()).to.deep.equal([]);
        osmd.setOptions({drawingParameters: "allon"});
        osmd.render();
        expectHeaderClearance();
    });

    it("places credits below a multiline title even without a subtitle", async (): Promise<void> => {
        osmd.EngravingRules.RenderSubtitle = false;
        await load("test_first_page_credit_words.musicxml");
        expectHeaderClearance();
    });

    it("wraps at the last fitting space without losing words", async (): Promise<void> => {
        await osmd.load(`<?xml version="1.0" encoding="utf-8"?>
            <score-partwise version="3.1">
              <movement-title>Word wrapping boundary</movement-title>
              <credit><credit-words>aaaa bbbb cccc</credit-words></credit>
              <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
              <part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>
                <note><rest/><duration>4</duration><type>whole</type></note>
              </measure></part>
            </score-partwise>`);
        const label: Label = new Label("", TextAlignmentEnum.LeftTop);
        const width: (text: string) => number = (text: string): number => osmd.EngravingRules.SheetSubtitleHeight *
            MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(text, label.font, label.fontStyle, label.fontFamily);
        const availableWidth: number = (width("aaaa bbbb") + width("aaaa bbbb ")) / 2;
        div.style.width = `${Math.round((availableWidth + osmd.EngravingRules.PageLeftMargin +
            osmd.EngravingRules.PageRightMargin) * 10)}px`;
        osmd.render();
        expect(osmd.GraphicSheet.FirstPageCreditWords[0].Label.text).to.equal("aaaa bbbb\ncccc");
    });

    it("preserves the credit-to-author gap when notes raise the system skyline", async (): Promise<void> => {
        const gaps: number[] = [];
        for (const octave of [4, 7]) {
            await osmd.load(`<?xml version="1.0" encoding="utf-8"?>
                <score-partwise version="3.1">
                  <movement-title>Credit clearance above high notes</movement-title>
                  <credit><credit-type>composer</credit-type><credit-words>Composer</credit-words></credit>
                  <credit><credit-words>Play softly</credit-words></credit>
                  <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
                  <part id="P1"><measure number="1"><attributes><divisions>1</divisions>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                    <note><pitch><step>C</step><octave>${octave}</octave></pitch><duration>4</duration><type>whole</type></note>
                  </measure></part>
                </score-partwise>`);
            osmd.render();
            expectHeaderClearance();
            gaps.push(top(osmd.GraphicSheet.Composer) - bottom(osmd.GraphicSheet.FirstPageCreditWords[0]));
        }
        expect(Math.abs(gaps[1] - gaps[0])).to.be.lessThan(0.5);
    });

    it("uses the shared page-label drawing path on Canvas", async (): Promise<void> => {
        osmd.setOptions({backend: "canvas"});
        await load("test_first_page_credit_words.musicxml");
        expect(div.querySelectorAll("canvas").length).to.be.greaterThan(0);
        expect(creditTexts()).to.deep.equal(["Play twice; second time softly"]);
    });
});
