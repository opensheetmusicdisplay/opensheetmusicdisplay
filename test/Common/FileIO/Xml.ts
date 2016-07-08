import chai = require("chai");
import { IXmlElement } from "../../../src/Common/FileIO/Xml.ts";

// Test XML simple document
let xmlTestData: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 2.0 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">\
<score-partwise>  <identification>    <encoding>      <software>Example Software name</software>      \
<encoding-date>2016-04-04</encoding-date>      </encoding>    </identification>   <credit page=\"1\"> \
<credit-words justify=\"center\" valign=\"top\">Example Credit Words</credit-words> </credit>  </score-partwise>";


describe("XML Unit Tests", () => {
  let parser: DOMParser = new DOMParser();
  let doc: Document = parser.parseFromString(xmlTestData, "text/xml");
  let documentElement: IXmlElement = new IXmlElement(doc.documentElement);

  it("IXmlElement Tests", (done: MochaDone) => {
    // Test name attribute
    chai.expect(documentElement.name).to.equal("score-partwise");
    // Test element method
    chai.should().exist(documentElement.element("identification"));
    // Test value attribute
    chai.expect(documentElement
      .element("identification")
      .element("encoding")
      .element("software").value).to.equal("Example Software name");
    done();
  });
  it("IXmlAttribute Tests", (done: MochaDone) => {
    // Test attributes method
    chai.expect(
      documentElement.element("credit").attributes()[0].name
    ).to.equal("page");

    let creditWords: IXmlElement =
      documentElement.element("credit").element("credit-words");
    // Test attributes method
    chai.expect(creditWords.attributes().length).to.equal(2);
    // Test value attribute
    chai.expect(creditWords.attribute("justify").value).to.equal("center");
    done();
  });
});
