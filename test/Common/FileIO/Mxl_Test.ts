/* eslint-disable @typescript-eslint/no-unused-expressions */
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { TestUtils } from "../../Util/TestUtils";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";

describe("MXL Tests", () => {
  // Generates a test for a mxl file name
  function testFile(scoreName: string): void {
    it(`reads ${scoreName}`, (done: Mocha.Done) => {
      // Load the xml file content
      const mxl: string = TestUtils.getMXL(scoreName);
      chai.expect(mxl).to.not.be.undefined;
      // Extract XML from MXL
      // Warning: the sheet is loaded asynchronously,
      // (with Promises), thus we need a little fix
      // in the end with 'then(null, done)' to
      // make Mocha work asynchronously
      MXLHelper.MXLtoIXmlElement(mxl).then(
        (score: IXmlElement) => {
          chai.expect(score).to.not.be.undefined;
          chai.expect(score.name).to.equal("score-partwise");
          done();
        },
        (exc: any) => { throw exc; }
      ).then(undefined, done);
    });
  }

  // Test all the following mxl files:
  const scores: string[] = [
    "Mozart_Clarinet_Quintet_Excerpt.mxl",
    "test_mxl_with_utf-16_xml.mxl"
  ];
  for (const score of scores) {
    testFile(score);
  }

  // Test failure
  it("Corrupted file", (done: Mocha.Done) => {
    MXLHelper.MXLtoIXmlElement("").then(
      (score: IXmlElement) => {
        chai.expect(score).to.not.be.undefined;
        chai.expect(score.name).to.equal("score-partwise");
        done(new Error("Empty zip file was loaded correctly. How is that even possible?"));
      },
      (exc: any) => { done(); }
    );
  });
});
