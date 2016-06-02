import { IXmlElement } from "./Xml";
import JSZip = require("jszip");

export function extractSheetFromMxl(data: string): any {
  "use strict";
  // let buf = Buffer.concat(data);
  let zip: any = new JSZip();

  return zip.loadAsync(data).then((_: any) => {
    return zip.file("META-INF/container.xml").async("string");
  }).then((content: string) => {
    let parser: DOMParser = new DOMParser();
    let doc: Document = parser.parseFromString(content, "text/xml");
    console.log(content);
    // doc.Root.Element("rootfiles").Element("rootfile").Attribute("full-path").Value;
    let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
    console.log("success..", rootFile);
    return zip.file(rootFile).async("string");
  }).then(
    (content: string) => {
      console.log("success...", content);
      let parser: DOMParser = new DOMParser();
      let doc: Document = parser.parseFromString(content, "text/xml");
      console.log("success...", doc);
      return new IXmlElement(doc.documentElement);
    },
    (reason: any) => {
      chai.assert.fail(0, 1, reason.message);
    }
  );
}
