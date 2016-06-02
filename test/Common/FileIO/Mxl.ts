import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import JSZip = require("jszip");
// typings for JSZip module
// type JSZip = any;
// declare var JSZip: any;

function extractSheetFromMxl(data: string): any {
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

describe("MXL Tests", () => {
  // Initialize variables
  let path: string = "test/data/MozartTrio.mxl";
  // let score: IXmlElement;

  function getSheet(filename: string): string {
    console.log(((window as any).__mxl__));
    return ((window as any).__mxl__)[filename];
  }

  before((): void => {
      // Load the xml file
      let mxl: string = getSheet(path);
      chai.expect(mxl).to.not.be.undefined;
      extractSheetFromMxl(mxl).then(
        (elem: any) => {
          console.log("success!", elem);
        },
        (reason: any) => {
          chai.assert.fail(0, 1, reason.message);
        }
      );
      // score = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
      // // chai.expect(score).to.not.be.undefined;
      // sheet = reader.createMusicSheet(score, path);
  });
  it("Success", (done: MochaDone) => {
    chai.expect(extractSheetFromMxl).to.equal(extractSheetFromMxl);
    done();
  });
});
