import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * MusicXML gives the language of a text with xml:lang, and a default language of lyrics with <defaults><lyric-language>.
 * OSMD draws it as the xml:lang of the SVG text, so that a browser picks fitting fonts, e.g. for kanji like 海, which have
 * different glyphs in Japanese and Chinese fonts.
 */
describe("Text language (xml:lang)", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("draws the language of credits, words and lyrics as the xml:lang of their SVG text", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_text_language_xml_lang.musicxml"));
        osmd.render();
        const drawn: string[] = Array.from(container.querySelectorAll("text")).map((text: SVGTextElement): string =>
            `${text.textContent}: ${text.closest("g")?.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang") ?? "-"}`);
        expect(drawn).to.include.members([
            "今日の海: ja", // title credit
            "静かに: ja", "安静地: zh-CN", // words
            "海: ja", "は: ja", "青: ja", "い: ja", // lyrics 1: <lyric-language xml:lang="ja"> for all lyrics
            "海: zh-CN", "是: zh-CN", "蓝: zh-CN", "的: zh-CN", // lyrics 2: <lyric-language number="2" xml:lang="zh-CN">
            "The: en", "sea: en", "is: en", "blue: en", // lyrics 3: the text's own xml:lang comes first
            "Voice: -", // a part name has no xml:lang in MusicXML
        ]);
    });
});
