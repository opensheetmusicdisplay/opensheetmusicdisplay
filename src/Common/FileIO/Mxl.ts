import { IXmlElement } from "./Xml";
import { Promise } from "es6-promise";
import JSZip = require("jszip");

export function extractSheetFromMxl(data: string): Promise<any> {
  "use strict";
  // _zip_ must be of type 'any' for now, since typings for JSZip are not up-to-date
  let zip: any = new JSZip();
  // asynchronously load zip file and process it - with Promises
  return zip.loadAsync(data).then(
    (_: any) => {
      return zip.file("META-INF/container.xml").async("string");
    },
    (err: any) => {
      throw err;
    }
  ).then(
    (content: string) => {
      let parser: DOMParser = new DOMParser();
      let doc: Document = parser.parseFromString(content, "text/xml");
      let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
      return zip.file(rootFile).async("string");
    },
    (err: any) => {
      throw err;
    }
  ).then(
    (content: string) => {
      let parser: DOMParser = new DOMParser();
      let doc: Document = parser.parseFromString(content, "text/xml");
      return Promise.resolve(new IXmlElement(doc.documentElement));
    },
    (err: any) => {
      throw err;
    }
  );
}
