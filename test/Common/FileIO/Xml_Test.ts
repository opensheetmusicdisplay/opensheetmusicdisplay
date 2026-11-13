import { expect } from "vitest";
import {IXmlElement, removeWhitespaceBetweenElements} from "../../../src/Common/FileIO/Xml";
import {TestUtils} from "../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

// Test XML simple document
const xmlTestData: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 2.0 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">\
<score-partwise>  <identification>    <encoding>      <software>Example Software name</software>      \
<encoding-date>2016-04-04</encoding-date>      </encoding>    </identification>   <credit page=\"1\"> \
<credit-words justify=\"center\" valign=\"top\">Example Credit Words</credit-words> </credit>  </score-partwise>";


describe("XML interface", () => {
    const parser: DOMParser = new DOMParser();
    const doc: Document = parser.parseFromString(xmlTestData, "text/xml");
    const documentElement: IXmlElement = new IXmlElement(doc.documentElement);


    // Test all the following xml files. The samples other tests load, and fail on if they don't load, aren't listed
    //   again, e.g. Dichterliebe01.xml (the renderNext tests).
    const xmlTestset: string[] = [
        "ActorPreludeSample.xml",
        "JohannSebastianBach_Air.xml",
        "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
        "MuzioClementi_SonatinaOpus36No1_Part2.xml",
        "MuzioClementi_SonatinaOpus36No3_Part1.xml",
        "MuzioClementi_SonatinaOpus36No3_Part2.xml",
        "OSMD_function_test_chord_tests_various.musicxml",
        "Saltarello.xml",
        "ScottJoplin_EliteSyncopations.xml",
        "ScottJoplin_The_Entertainer.xml",
        "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
    ];
    for (const score of xmlTestset) {
        testFile(score);
    }

    // Generates a test that loads an xml file
    function testFile(scoreName: string): void {
        it(scoreName, async () => {
            // Load the xml file content
            const score: Document = TestUtils.getScore(scoreName);
            const div: HTMLElement = document.createElement("div");
            const openSheetMusicDisplay: OpenSheetMusicDisplay =
                TestUtils.createOpenSheetMusicDisplay(div);
            // load() reports a sample it can't read by rejecting its promise, which fails the test only when awaited
            await openSheetMusicDisplay.load(score);
        });
    }

    it("test IXmlElement", () => {
        // Test name attribute
        expect(documentElement.name).to.equal("score-partwise");
        // Test element method
        expect(documentElement.element("identification")).to.not.equal(undefined);
        // Test value attribute
        expect(documentElement
            .element("identification")
            .element("encoding")
            .element("software").value).to.equal("Example Software name");
    });

    it("test IXmlAttribute", () => {
        // Test attributes method
        expect(
            documentElement.element("credit").attributes()[0].name
        ).to.equal("page");

        const creditWords: IXmlElement =
            documentElement.element("credit").element("credit-words");
        // Test attributes method
        expect(creditWords.attributes().length).to.equal(2);
        // Test value attribute
        expect(creditWords.attribute("justify").value).to.equal("center");
    });

    it("removeWhitespaceBetweenElements() removes the white space next to child elements and keeps the text", () => {
        const xml: string = "<?xml version=\"1.0\"?>\n<score-partwise>\n  <part id=\"P1\">\n    <measure number=\"1\">\n" +
            "      <print/>\n      <words> </words>\n      <text>a b</text>\n      <empty>\n</empty>\n    </measure>\n  </part>\n" +
            "</score-partwise>";
        expect(removeWhitespaceBetweenElements(xml)).to.equal("<?xml version=\"1.0\"?><score-partwise><part id=\"P1\">" +
            "<measure number=\"1\"><print/><words> </words><text>a b</text><empty>\n</empty></measure></part></score-partwise>");
        // the wrapper reads the same values with and without the white space
        for (const xmlString of [xml, removeWhitespaceBetweenElements(xml)]) {
            const measure: IXmlElement = new IXmlElement(parser.parseFromString(xmlString, "text/xml").documentElement)
                .element("part").element("measure");
            expect(measure.elements().length).to.equal(4);
            expect(measure.value).to.equal("");
            expect(measure.element("words").value).to.equal(" ");
            expect(measure.element("text").value).to.equal("a b");
            expect(measure.element("print").hasElements).to.equal(false);
            expect(measure.element("empty").hasElements).to.equal(true);
        }
    });

    it("removeWhitespaceBetweenElements() leaves XML with a CDATA section unchanged", () => {
        const xml: string = "<score-partwise>\n  <words><![CDATA[<a> <b>]]></words>\n</score-partwise>";
        expect(removeWhitespaceBetweenElements(xml)).to.equal(xml);
    });
});
