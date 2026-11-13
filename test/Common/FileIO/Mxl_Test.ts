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

  describe("a zip file without a usable META-INF/container.xml", () => {
    const xml: string = "<score-partwise version=\"4.0\"/>";
    const container: (rootFile: string) => string = (rootFile: string): string =>
      `<container><rootfiles><rootfile full-path="${rootFile}"/></rootfiles></container>`;
    async function read(files: {[name: string]: string}): Promise<string> {
      const zip: JSZip = new JSZip();
      for (const name of Object.keys(files)) {
        zip.file(name, files[name]);
      }
      return MXLHelper.jszipToXMLstring(zip).catch((error: Error): string => "rejected: " + error.message);
    }

    it("reads the first .musicxml file instead, or else the first .xml file, with a warning", async () => {
      const logged: string[] = TestUtils.catchLogs();
      expect(await read({"notes.xml": "<notes/>", "score.musicxml": xml}), "no container file").to.equal(xml);
      expect(await read({"META-INF/container.xml": "", "score.xml": xml}), "empty container file").to.equal(xml);
      expect(await read({"META-INF/container.xml": container("Score.xml"), "score.xml": xml}), "rootfile not in the zip").to.equal(xml);
      expect(logged).to.deep.equal([
        "[OSMD] MXL file: META-INF/container.xml is missing, reading \"score.musicxml\" instead.",
        "[OSMD] MXL file: META-INF/container.xml names no rootfile, reading \"score.xml\" instead.",
        "[OSMD] MXL file: the rootfile \"Score.xml\" of META-INF/container.xml is not in the archive, reading \"score.xml\" instead.",
      ]);
    });

    it("rejects with what is missing if the zip has no other MusicXML file", async () => {
      const noOtherFile: string = ", and the archive has no other .musicxml or .xml file";
      expect(await read({"notes.txt": "x"})).to.equal("rejected: META-INF/container.xml is missing" + noOtherFile);
      expect(await read({"META-INF/container.xml": "<container/>", "notes.txt": "x"}))
        .to.equal("rejected: META-INF/container.xml names no rootfile" + noOtherFile);
      expect(await read({"META-INF/container.xml": container("score.xml")}))
        .to.equal("rejected: the rootfile \"score.xml\" of META-INF/container.xml is not in the archive" + noOtherFile);
    });
  });

  // Test failure
  it("Corrupted file", async () => {
    const logged: string[] = TestUtils.catchLogs();
    await expect(MXLHelper.MXLtoIXmlElement(""), "an empty zip file").rejects.toThrow();
    expect(logged.length, "errors logged").to.be.greaterThan(0);
    expect(logged.filter((message: string) => !message.includes("Corrupted zip")), "other messages").to.deep.equal([]);
  });
});
