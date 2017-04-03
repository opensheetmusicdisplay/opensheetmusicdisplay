import { MusicSheetReader }       from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet }             from "../../../src/MusicalScore/MusicSheet";
import { IXmlElement }            from "../../../src/Common/FileIO/Xml";
import { KeyInstruction }         from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { KeyEnum as KeyModeEnum } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import * as chai                  from "chai";

let reader: MusicSheetReader;
let parser: DOMParser;

/* tslint:disable:no-unused-expression */
describe("MusicXML parser for element 'key'", () => {

  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  describe("for group traditional keys", () => {

    xit("enforces single occurrence of element 'fifths'", (done: MochaDone) => {
      let keyInstruction: KeyInstruction = getIllegalMusicXmlWithTwoFifthsElements().getFirstSourceMeasure().getKeyInstruction(0);
      // TODO Make sure we detect the multiple fifths and react properly
      chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.none);
      done();
    });

    it("reads key signature with no optional 'mode' element present", (done: MochaDone) => {
      let keyInstruction: KeyInstruction = getMusicSheetWithKey(0, undefined).getFirstSourceMeasure().getKeyInstruction(0);
      chai.expect(keyInstruction.Key).to.equal(0);
      chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.none);
      done();
    });

    describe("major keys", () => {

      it("reads key signature C-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(0, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(0);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature G-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(1, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(1);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature D-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(2, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(2);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature A-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(3, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(3);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature E-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(4, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(4);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature B-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(5, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(5);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Fis-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(6, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(6);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Cis-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(7, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(7);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Gis-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(8, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(8);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature F-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-1, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-1);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature B-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-2, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-2);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Es-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-3, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-3);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature As-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-4, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-4);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Des-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-5, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-5);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Ges-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-6, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-6);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Fes-major", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-8, "major").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-8);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });
    });

    describe("minor keys", () => {

      it("reads key signature a-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(0, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(0);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature e-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(1, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(1);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature b-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(2, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(2);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature fis-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(3, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(3);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature cis-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(4, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(4);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature gis-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(5, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(5);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature dis-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(6, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(6);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature ais-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(7, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(7);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature d-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-1, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-1);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature g-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-2, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-2);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature c-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-3, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-3);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature f-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-4, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-4);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature bb-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-5, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-5);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature es-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-6, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-6);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature as-minor", (done: MochaDone) => {
        let keyInstruction: KeyInstruction = getMusicSheetWithKey(-7, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        chai.expect(keyInstruction.Key).to.equal(-7);
        chai.expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });
    });
  });
});

function getMusicSheetWithKey(fifths: number = undefined, mode: string = undefined): MusicSheet {
  let doc: Document = parser.parseFromString(getMusicXmlWithKey(fifths, mode), "text/xml");
  chai.expect(doc).to.not.be.undefined;
  let score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  chai.expect(score).to.not.be.undefined;
  return reader.createMusicSheet(score, "template.xml");
}

function getMusicXmlWithKey(fifths: number = undefined, mode: string = undefined): string {
  let modeElement: string = mode ? `<mode>${mode}</mode>` : "";
  let fifthsElement: string = fifths ? `<fifths>${fifths}</fifths>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
          <!DOCTYPE score-partwise PUBLIC
              "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
              "http://www.musicxml.org/dtds/partwise.dtd">
          <score-partwise version="3.0">
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
                    ${fifthsElement}
                    ${modeElement}
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
                  <type>whole</type>
                </note>
              </measure>
            </part>
          </score-partwise>`;
}

function getIllegalMusicXmlWithTwoFifthsElements(): MusicSheet {
  let doc: Document = parser.parseFromString(
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <!DOCTYPE score-partwise PUBLIC
          "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
          "http://www.musicxml.org/dtds/partwise.dtd">
      <score-partwise version="3.0">
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
                <fifths>1</fifths>
                <fifths>2</fifths>
                <fifths>3</fifths>
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
              <type>whole</type>
            </note>
          </measure>
        </part>
      </score-partwise>`,
    "text/xml"
  );
  chai.expect(doc).to.not.be.undefined;
  let score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  chai.expect(score).to.not.be.undefined;
  return reader.createMusicSheet(score, "template.xml");
}
