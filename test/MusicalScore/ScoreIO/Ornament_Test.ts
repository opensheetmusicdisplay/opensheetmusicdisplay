import chai from "chai";
import Vex from "vexflow";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { VexFlowConverter } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowConverter";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { OrnamentContainer, OrnamentEnum } from "../../../src/MusicalScore/VoiceData/OrnamentContainer";

import VF = Vex.Flow;

let reader: MusicSheetReader;
let parser: DOMParser;

describe("MusicXML parser for ornaments", () => {
  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  it("reads additional ornaments from other-ornament aliases", (done: Mocha.Done) => {
    const voiceEntry: any = getMusicSheetWithOtherOrnament("upprall")
      .SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0];

    chai.assert.isDefined(voiceEntry.OrnamentContainer);
    chai.expect(voiceEntry.OrnamentContainer.GetOrnament).to.equal(OrnamentEnum.UpPrall);
    done();
  });

  it("normalizes other-ornament aliases with punctuation", (done: Mocha.Done) => {
    const voiceEntry: any = getMusicSheetWithOtherOrnament("down-prall")
      .SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0];

    chai.assert.isDefined(voiceEntry.OrnamentContainer);
    chai.expect(voiceEntry.OrnamentContainer.GetOrnament).to.equal(OrnamentEnum.DownPrall);
    done();
  });

  const musicXmlOrnamentExpectations: Array<[string, OrnamentEnum]> = [
    ["<trill-mark/>", OrnamentEnum.Trill],
    ["<trill-mark/><wavy-line type=\"start\" number=\"1\"/>", OrnamentEnum.LongTrill],
    ["<mordent/>", OrnamentEnum.Mordent],
    ["<mordent long=\"yes\"/>", OrnamentEnum.LongMordent],
    ["<mordent long=\"yes\" approach=\"below\"/>", OrnamentEnum.UpMordent],
    ["<mordent long=\"yes\" approach=\"above\"/>", OrnamentEnum.DownMordent],
    ["<inverted-mordent/>", OrnamentEnum.InvertedMordent],
    ["<inverted-mordent long=\"yes\"/>", OrnamentEnum.LongInvertedMordent],
    ["<inverted-mordent long=\"yes\" approach=\"below\"/>", OrnamentEnum.UpPrall],
    ["<inverted-mordent long=\"yes\" approach=\"above\"/>", OrnamentEnum.DownPrall],
    ["<inverted-mordent long=\"yes\" departure=\"below\"/>", OrnamentEnum.PrallUp],
    ["<inverted-mordent long=\"yes\" departure=\"above\"/>", OrnamentEnum.PrallDown],
  ];

  for (const [ornamentXml, expectedEnum] of musicXmlOrnamentExpectations) {
    it(`maps ${ornamentXml} to ${OrnamentEnum[expectedEnum]}`, (done: Mocha.Done) => {
      const voiceEntry: any = getMusicSheetWithXmlOrnament(ornamentXml)
        .SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0];

      chai.assert.isDefined(voiceEntry.OrnamentContainer);
      chai.expect(voiceEntry.OrnamentContainer.GetOrnament).to.equal(expectedEnum);
      done();
    });
  }
});

describe("VexFlowConverter.generateOrnaments", () => {
  const ornamentExpectations: Array<[OrnamentEnum, string]> = [
    [OrnamentEnum.LongTrill, "tr"],
    [OrnamentEnum.LongMordent, "lineprall"],
    [OrnamentEnum.LongInvertedMordent, "prallprall"],
    [OrnamentEnum.UpPrall, "upprall"],
    [OrnamentEnum.DownPrall, "downprall"],
    [OrnamentEnum.PrallUp, "prallup"],
    [OrnamentEnum.PrallDown, "pralldown"],
    [OrnamentEnum.UpMordent, "upmordent"],
    [OrnamentEnum.DownMordent, "downmordent"],
    [OrnamentEnum.LinePrall, "lineprall"],
    [OrnamentEnum.PrallPrall, "prallprall"],
  ];

  for (const [ornamentEnum, vexflowType] of ornamentExpectations) {
    it(`maps ${OrnamentEnum[ornamentEnum]} to vexflow ornament '${vexflowType}'`, (done: Mocha.Done) => {
      const note: VF.StaveNote = new VF.StaveNote({ keys: ["c/4"], duration: "q" });
      const ornamentContainer: OrnamentContainer = new OrnamentContainer(ornamentEnum);

      VexFlowConverter.generateOrnaments(note, ornamentContainer);

      const ornamentModifier: any = (note as any).modifiers.find((modifier: any) => modifier.getCategory() === "ornaments");
      chai.assert.isDefined(ornamentModifier);
      chai.expect(ornamentModifier.type).to.equal(vexflowType);
      done();
    });
  }
});

function getMusicSheetWithOtherOrnament(ornamentName: string): MusicSheet {
  const doc: Document = parser.parseFromString(getMusicXmlWithOtherOrnament(ornamentName), "text/xml");
  chai.assert.isDefined(doc);
  const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  chai.assert.isDefined(score);
  return reader.createMusicSheet(score, "ornament-template.xml");
}

function getMusicSheetWithXmlOrnament(ornamentXml: string): MusicSheet {
  const doc: Document = parser.parseFromString(getMusicXmlWithOrnamentMarkup(ornamentXml), "text/xml");
  chai.assert.isDefined(doc);
  const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  chai.assert.isDefined(score);
  return reader.createMusicSheet(score, "ornament-markup-template.xml");
}

function getMusicXmlWithOtherOrnament(ornamentName: string): string {
  return getMusicXmlWithOrnamentMarkup(`<other-ornament>${ornamentName}</other-ornament>`);
}

function getMusicXmlWithOrnamentMarkup(ornamentMarkup: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
          <!DOCTYPE score-partwise PUBLIC
              "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
              "http://www.musicxml.org/dtds/partwise.dtd">
          <score-partwise version="3.1">
            <part-list>
              <score-part id="P1">
                <part-name>Music</part-name>
              </score-part>
            </part-list>
            <part id="P1">
              <measure number="1">
                <attributes>
                  <divisions>1</divisions>
                  <key>
                    <fifths>0</fifths>
                  </key>
                  <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                  </time>
                  <clef>
                    <sign>G</sign>
                    <line>2</line>
                  </clef>
                </attributes>
                <note>
                  <pitch>
                    <step>C</step>
                    <octave>4</octave>
                  </pitch>
                  <duration>4</duration>
                  <voice>1</voice>
                  <type>whole</type>
                  <notations>
                    <ornaments>
                      ${ornamentMarkup}
                    </ornaments>
                  </notations>
                </note>
              </measure>
            </part>
          </score-partwise>`;
}
