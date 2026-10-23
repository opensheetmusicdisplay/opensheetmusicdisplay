import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { TestUtils } from "../../Util/TestUtils";
import { MXLHelper } from "../../../src/Common/FileIO/Mxl";
import JSZip from "jszip";

describe("MXL Tests", () => {
  // Generates a test for a mxl file name
  function testFile(scoreName: string): void {
    it(`reads ${scoreName}`, (done: Mocha.Done) => {
      // Load the xml file content
      const mxl: string = TestUtils.getMXL(scoreName);
      expect(mxl).to.not.be.undefined;
      // Extract XML from MXL
      // Warning: the sheet is loaded asynchronously,
      // (with Promises), thus we need a little fix
      // in the end with 'then(null, done)' to
      // make Mocha work asynchronously
      MXLHelper.MXLtoIXmlElement(mxl).then(
        (score: IXmlElement) => {
          expect(score).to.not.be.undefined;
          expect(score.name).to.equal("score-partwise");
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
  it("Corrupted file", (done: Mocha.Done) => {
    MXLHelper.MXLtoIXmlElement("").then(
      (score: IXmlElement) => {
        expect(score).to.not.be.undefined;
        expect(score.name).to.equal("score-partwise");
        done(new Error("Empty zip file was loaded correctly. How is that even possible?"));
      },
      (exc: any) => { done(); }
    );
  });
});
