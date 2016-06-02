import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { extractSheetFromMxl } from "../../../src/Common/FileIO/Mxl.ts";


describe("MXL Tests", () => {
  // Load the mxl file
  function getSheet(filename: string): string {
    return ((window as any).__mxl__)[filename];
  }

  // Generates a test for a mxl file name
  function testFile(scoreName: string): void {
    it(scoreName, (done: MochaDone) => {
      // Load the xml file content
      let mxl: string = getSheet("test/data/" + scoreName + ".mxl");
      chai.expect(mxl).to.not.be.undefined;
      // Extract XML from MXL
      // Warning, the sheet is loaded asynchronously,
      // (with Promises), thus we need a little hack to
      // make Mocha work asynch. with "done()"
      extractSheetFromMxl(
        mxl,
        (score: IXmlElement) => {
          try {
            chai.expect(score).to.not.be.undefined;
            chai.expect(score.name).to.equal("score-partwise");
          } catch (e) {
            return done(e);
          }
          done();
        },
        (reason: any) => {
          done(reason.message);
        }
      )
    });
  }

  // Test all the following mxl files:
  let scores: string[] = ["MozartTrio"];
  for (let score of scores) {
    testFile(score);
  }

});
