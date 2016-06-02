import { IXmlElement } from "./Xml";
import { Promise } from "es6-promise";
import JSZip = require("jszip");

// Usage for extractSheetMusicFromMxl:
// extractSheetFromMxl(" *** binary content *** ").then(
//   (score: IXmlElement) => {
//     // Success! use the score here!
//   },
//   (error: any) => {
//     // There was an error.
//     // Handle it here.
//   }
// )
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
      let xml: Document = parser.parseFromString(content, "text/xml");
      let doc: IXmlElement = new IXmlElement(xml.documentElement);
      return Promise.resolve(doc);
    },
    (err: any) => {
      throw err;
    }
  ).then(
    (content: IXmlElement) => {
      return Promise.resolve(content);
    },
    (err: any) => {
      throw new Error("extractSheetFromMxl: " + err.message);
    }
  );
}
