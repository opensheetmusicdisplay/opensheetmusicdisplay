import { IXmlElement } from "../../../src/Common/FileIO/Xml.ts";

// Test XML simple document
let xml_test_data: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 2.0 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">\
<score-partwise>  <identification>    <encoding>      <software>Example Software Name</software>      \
<encoding-date>2016-04-04</encoding-date>      </encoding>    </identification>   <credit page=\"1\"> \
<credit-words justify=\"center\" valign=\"top\">Example Credit Words</credit-words> </credit>  </score-partwise>";


describe("XML Unit Tests", () => {
  let parser: DOMParser = new DOMParser();
  let doc: Document = parser.parseFromString(xml_test_data, "text/xml");
  let documentElement: IXmlElement = new IXmlElement(doc.documentElement);

  it("IXmlElement Tests", (done: MochaDone) => {
    // Test Name attribute
    chai.expect(documentElement.Name).to.equal("score-partwise");
    // Test Element method
    chai.should().exist(documentElement.Element("identification"));
    // Test Value attribute
    chai.expect(documentElement
      .Element("identification")
      .Element("encoding")
      .Element("software").Value).to.equal("Example Software Name");
    done();
  });
  it("IXmlAttribute Tests", (done: MochaDone) => {
    // Test Attributes method
    chai.expect(
      documentElement.Element("credit").Attributes()[0].Name
    ).to.equal("page");

    let creditWords: IXmlElement =
      documentElement.Element("credit").Element("credit-words");
    // Test Attributes method
    chai.expect(creditWords.Attributes().length).to.equal(2);
    // Test Value attribute
    chai.expect(creditWords.Attribute("justify").Value).to.equal("center");
    done();
  });
});
