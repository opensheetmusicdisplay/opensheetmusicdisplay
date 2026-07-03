/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { TestUtils } from "../../Util/TestUtils";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";

describe("MXL Tests", () => {
  async function testFile(scoreName: string): Promise<void> {
    const mxl: string = TestUtils.getMXL(scoreName);
    expect(mxl).to.not.be.undefined;
    const score: IXmlElement = await MXLHelper.MXLtoIXmlElement(mxl);
    expect(score).to.not.be.undefined;
    expect(score.name).to.equal("score-partwise");
  }

  const scores: string[] = [
    "Mozart_Clarinet_Quintet_Excerpt.mxl",
    "test_mxl_with_utf-16_xml.mxl"
  ];
  for (const score of scores) {
    it(`reads ${score}`, async () => testFile(score));
  }

  it("Corrupted file", async () => {
    try {
      await MXLHelper.MXLtoIXmlElement("");
      expect.fail("Empty zip file was loaded correctly.");
    } catch (_e: unknown) {
      // expected: empty string should fail
    }
  });
});
