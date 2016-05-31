import {IXmlElement} from "../../../src/Common/FileIO/Xml";

// typings for JSZip module
type JSZip = any;
declare var JSZip: any;

function extractSheetFromMxl(data: string): any {
  "use strict";
  // let buf = Buffer.concat(data);
  let zip: JSZip = new JSZip();

  return zip.loadAsync(data).then((_: any) => {
    return zip.file("META-INF/container.xml").async("string");
  }).then((content: string) => {
    let parser: DOMParser = new DOMParser();
    let doc: Document = parser.parseFromString(content, "text/xml");
    console.log(content);
    // doc.Root.Element("rootfiles").Element("rootfile").Attribute("full-path").Value;
    let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
    return zip.file(rootFile).async("string");
  }).then((content: string) => {
    let parser: DOMParser = new DOMParser();
    let doc: Document = parser.parseFromString(content, "text/xml");
    return new IXmlElement(doc.documentElement);
  });
}

describe("MXL Tests", () => {
  chai.expect(extractSheetFromMxl).to.equal(extractSheetFromMxl);
});
