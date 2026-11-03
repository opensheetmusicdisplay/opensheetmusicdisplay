import { expect } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { TestUtils } from "../../Util/TestUtils";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";
import JSZip from "jszip";

describe("MXL Tests", () => {
  // Generates a test for a mxl file name
  function testFile(scoreName: string): void {
    it(`reads ${scoreName}`, async () => {
      // Load the xml file content
      const mxl: string = TestUtils.getMXL(scoreName);
      expect(mxl).to.not.be.undefined;
      // Extract XML from MXL
      const score: IXmlElement = await MXLHelper.MXLtoIXmlElement(mxl);
      expect(score).to.not.be.undefined;
      expect(score.name).to.equal("score-partwise");
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

  it("reads an MXL file whose container and score files start with a UTF-8 byte order mark", async () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
        <part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>
          <note><rest/><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`;
    const zip: JSZip = new JSZip();
    // JSZip writes strings as UTF-8, so "\ufeff" becomes the byte order mark EF BB BF
    zip.file("META-INF/container.xml", "\ufeff<container><rootfiles><rootfile full-path='score.xml'/></rootfiles></container>");
    zip.file("score.xml", "\ufeff" + xml);
    const xmlString: string = await MXLHelper.MXLtoXMLstring(await zip.generateAsync({type: "binarystring"}));
    expect(xmlString).to.equal(xml);
  });

  // Test failure
  it("Corrupted file", async () => {
    const logged: string[] = TestUtils.catchLogs();
    await expect(MXLHelper.MXLtoIXmlElement(""), "an empty zip file").rejects.toThrow();
    expect(logged.length, "errors logged").to.be.greaterThan(0);
    expect(logged.filter((message: string) => !message.includes("Corrupted zip")), "other messages").to.deep.equal([]);
  });
});
