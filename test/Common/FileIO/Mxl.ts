import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { extractSheetFromMxl } from "../../../src/Common/FileIO/Mxl.ts";

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
        (elem: IXmlElement) => {
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
