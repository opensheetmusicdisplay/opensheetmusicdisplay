import { IXmlElement } from "./Xml";
import JSZip = require("jszip");

export function extractSheetFromMxl(data: string, onFullfilled: any, onRejected: any): void {
  "use strict";
  let zip: any = new JSZip();
  zip.loadAsync(data).then(
    (_: any) => {
      return zip.file("META-INF/container.xml").async("string");
    },
    onRejected
  ).then(
    (content: string) => {
      let parser: DOMParser = new DOMParser();
      let doc: Document = parser.parseFromString(content, "text/xml");
      // doc.Root.Element("rootfiles").Element("rootfile").Attribute("full-path").Value;
      let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
      return zip.file(rootFile).async("string");
    },
    onRejected
  ).then(
    (content: string) => {
      let parser: DOMParser = new DOMParser();
      let doc: Document = parser.parseFromString(content, "text/xml");
      onFullfilled(new IXmlElement(doc.documentElement));
    },
    onRejected
  );
}
