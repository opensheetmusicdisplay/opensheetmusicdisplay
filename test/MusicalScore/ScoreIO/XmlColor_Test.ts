import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { musicXmlColorToCss, musicXmlColorsAreAlphaLast } from "../../../src/Common/DataObjects/XmlColor";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { AbstractExpression } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * MusicXML colors are #RRGGBB or #AARRGGBB (alpha first). OSMD hands colors to SVG, where 8-digit hex is CSS #RRGGBBAA.
 * The reader converts once, so the model holds CSS colors: color="#80FF0000" (half-transparent red) must become "#FF000080",
 * not be drawn as R=0x80 G=0xFF B=0x00 with alpha 0 (invisible).
 * Exception: MuseScore exports 8-digit colors as #RRGGBBAA (against the spec, musescore/MuseScore#35476),
 * so they are kept as they are for files whose <software> starts with MuseScore.
 */
describe("MusicXML color attributes", () => {
    const halfTransparentRedXml: string = "#80FF0000";
    const halfTransparentRedCss: string = "#FF000080";

    function score(color: string, software?: string): string {
        const identification: string = software ? `<identification><encoding><software>${software}</software></encoding></identification>` : "";
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  ${identification}
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><words color="${color}">colored words</words></direction-type>
      </direction>
      <note color="${color}"><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
    }

    async function load(xml: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        return { div, osmd };
    }

    function loadFixture(name: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        return load(new XMLSerializer().serializeToString(TestUtils.getScore(name)));
    }

    function notes(osmd: OpenSheetMusicDisplay): Note[] {
        const result: Note[] = [];
        for (const container of osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers) {
            result.push(...container.StaffEntries[0].VoiceEntries[0].Notes);
        }
        return result;
    }

    function wordsExpressions(osmd: OpenSheetMusicDisplay): AbstractExpression[] {
        const expressions: AbstractExpression[] = [];
        for (const multiExpression of osmd.Sheet.SourceMeasures[0].StaffLinkedExpressions[0]) {
            expressions.push(...multiExpression.UnknownList, ...multiExpression.MoodList);
        }
        return expressions;
    }

    function fillsOf(div: HTMLElement, selector: string): string[] {
        return Array.from(div.querySelectorAll(selector)).map(element => element.getAttribute("fill"));
    }

    it("converts #AARRGGBB to CSS #RRGGBBAA and leaves other strings unchanged", () => {
        expect(musicXmlColorToCss("#80FF0000")).to.equal("#FF000080");
        expect(musicXmlColorToCss("#FF000000")).to.equal("#000000FF"); // opaque black, not invisible
        expect(musicXmlColorToCss("#ff0000")).to.equal("#ff0000");
        expect(musicXmlColorToCss("red")).to.equal("red");
        expect(musicXmlColorToCss(undefined)).to.equal(undefined);
        expect(musicXmlColorToCss("#FF000080", true), "alpha last (MuseScore)").to.equal("#FF000080");
    });

    it("recognizes every MuseScore version as alpha last, but no other program", () => {
        expect(musicXmlColorsAreAlphaLast(["MuseScore 4.5.2"])).to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["MuseScore 4.0"])).to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["Dolet 8", "MuseScore 4.6.0"])).to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["MuseScore Studio 4.6.5"]), "4.6+ writes MuseScore Studio").to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["MuseScore Studio 5.0.0"]), "main still writes alpha last").to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["MuseScore 3.6.2"]), "writes 6-digit colors only, so it doesn't matter").to.equal(true);
        expect(musicXmlColorsAreAlphaLast(["Finale v27.4 for Mac", "Dolet 8.4"])).to.equal(false);
        expect(musicXmlColorsAreAlphaLast(["Sibelius 2024.3"])).to.equal(false);
        expect(musicXmlColorsAreAlphaLast([])).to.equal(false);
    });

    it("stores note and words colors as CSS #RRGGBBAA", async () => {
        const { osmd } = await load(score(halfTransparentRedXml));
        expect(osmd.Sheet.XmlColorAlphaLast).to.equal(false);
        const note: Note = notes(osmd)[0];
        expect(note.NoteheadColorXml).to.equal(halfTransparentRedCss);
        expect(note.NoteheadColor).to.equal(halfTransparentRedCss);
        expect(note.StemColorXml).to.equal(halfTransparentRedCss);
        const words: AbstractExpression[] = wordsExpressions(osmd);
        expect(words.length).to.equal(1);
        expect(words[0].ColorXML).to.equal(halfTransparentRedCss);
    });

    it("renders the converted color as SVG fill", async () => {
        const { osmd, div } = await load(score(halfTransparentRedXml));
        osmd.render();
        const noteheadFills: string[] = fillsOf(div, "g.vf-notehead path");
        expect(noteheadFills.length).to.equal(2);
        expect(noteheadFills[0]).to.equal(halfTransparentRedCss);
        expect(noteheadFills[1]).to.not.equal(halfTransparentRedCss);
        const wordsText: Element = Array.from(div.querySelectorAll("text")).find(text => text.textContent === "colored words");
        expect(wordsText, "words label").to.not.equal(undefined);
        expect(wordsText.getAttribute("fill")).to.equal(halfTransparentRedCss);
        expect(fillsOf(div, "*").filter(fill => fill === halfTransparentRedXml), "unconverted MusicXML color").to.deep.equal([]);
    });

    it("converts the note, notehead, stem and words colors of test_note_color_alpha_first_argb.musicxml", async () => {
        const { osmd } = await loadFixture("test_note_color_alpha_first_argb.musicxml");
        expect(osmd.Sheet.XmlColorAlphaLast).to.equal(false);
        const [red, blue, green, plain]: Note[] = notes(osmd);
        expect(red.NoteheadColorXml, "#80FF0000 note").to.equal("#FF000080");
        expect(red.StemColorXml, "stem takes the note color").to.equal("#FF000080");
        expect(blue.NoteheadColorXml, "#FF0000FF note").to.equal("#0000FFFF");
        expect(green.NoteheadColorXml, "#40008000 notehead").to.equal("#00800040");
        expect(green.StemColorXml, "#40008000 stem").to.equal("#00800040");
        expect(plain.NoteheadColorXml ?? undefined, "no color attribute").to.equal(undefined);
        expect(wordsExpressions(osmd)[0].ColorXML).to.equal("#FF000080");
    });

    it("keeps MuseScore's #RRGGBBAA colors and draws them as such", async () => {
        const { osmd, div } = await load(score(halfTransparentRedCss, "MuseScore 4.5.2"));
        expect(osmd.Sheet.XmlColorAlphaLast).to.equal(true);
        expect(notes(osmd)[0].NoteheadColorXml).to.equal(halfTransparentRedCss);
        expect(wordsExpressions(osmd)[0].ColorXML).to.equal(halfTransparentRedCss);
        osmd.render();
        expect(fillsOf(div, "g.vf-notehead path")[0]).to.equal(halfTransparentRedCss);
    });

    it("keeps the transparent note of test_note_notehead_color_transparent.musicxml (MuseScore 4.5.2) transparent", async () => {
        const { osmd } = await loadFixture("test_note_notehead_color_transparent.musicxml");
        expect(osmd.Sheet.XmlColorAlphaLast).to.equal(true);
        expect(notes(osmd)[0].NoteheadColorXml, "#0102B300 = #0102B3 with alpha 0").to.equal("#0102B300");
    });

    it("keeps 6-digit colors as they are, in MuseScore files too", async () => {
        for (const software of [undefined, "MuseScore 3.6.2"]) {
            const { osmd } = await load(score("#FF0000", software));
            expect(notes(osmd)[0].NoteheadColorXml, software).to.equal("#FF0000");
            expect(wordsExpressions(osmd)[0].ColorXML, software).to.equal("#FF0000");
        }
    });
});
