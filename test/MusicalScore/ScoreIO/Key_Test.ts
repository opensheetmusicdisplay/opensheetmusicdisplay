/* eslint-disable @typescript-eslint/no-unused-expressions */
import { MusicSheetReader }       from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet }             from "../../../src/MusicalScore/MusicSheet";
import { IXmlElement }            from "../../../src/Common/FileIO/Xml";
import { KeyInstruction }         from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { KeyEnum as KeyModeEnum } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { VexFlowConverter }       from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowConverter";
import { expect }                 from "chai";
import { AbstractNotationInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/AbstractNotationInstruction";
import { RhythmInstruction, RhythmSymbolEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

let reader: MusicSheetReader;
let parser: DOMParser;

describe("MusicXML parser for element 'key'", () => {

  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  describe("for group traditional keys", () => {

    it("enforces single occurrence of element 'fifths'", (done: Mocha.Done) => {
      const keyInstruction: KeyInstruction = getIllegalMusicXmlWithTwoFifthsElements().getFirstSourceMeasure().getKeyInstruction(0);
      // TODO Make sure we detect the multiple fifths and react properly // [it seems like we do this, test passes. ssch]
      expect(keyInstruction.Mode).to.equal(KeyModeEnum.none);
      done();
    });

    it("reads key signature with no optional 'mode' element present", (done: Mocha.Done) => {
      const keyInstruction: KeyInstruction = getMusicSheetWithKey(0, undefined).getFirstSourceMeasure().getKeyInstruction(0);
      expect(keyInstruction.Key).to.equal(0);
      expect(keyInstruction.Mode).to.equal(KeyModeEnum.none);
      done();
    });

    describe("major keys", () => {

      it("reads key signature C-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(0, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(0);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature G-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(1, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(1);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature D-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(2, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(2);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature A-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(3, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(3);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature E-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(4, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(4);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature B-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(5, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(5);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature F#-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(6, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(6);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature C#-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(7, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(7);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature G#-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(8, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(8);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature F-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-1, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-1);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Bb-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-2, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-2);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Eb-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-3, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-3);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Ab-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-4, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-4);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Db-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-5, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-5);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Gb-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-6, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-6);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });

      it("reads key signature Fb-major", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-8, "major").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-8);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.major);
        done();
      });
    });

    describe("minor keys", () => {

      it("reads key signature a-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(0, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(0);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature e-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(1, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(1);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature b-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(2, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(2);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature f#-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(3, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(3);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature c#-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(4, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(4);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature g#-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(5, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(5);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature d#-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(6, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(6);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature a#-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(7, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(7);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature d-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-1, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-1);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature g-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-2, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-2);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature c-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-3, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-3);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature f-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-4, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-4);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature bb-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-5, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-5);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature eb-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-6, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-6);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });

      it("reads key signature ab-minor", (done: Mocha.Done) => {
        const keyInstruction: KeyInstruction = getMusicSheetWithKey(-7, "minor").getFirstSourceMeasure().getKeyInstruction(0);
        expect(keyInstruction.Key).to.equal(-7);
        expect(keyInstruction.Mode).to.equal(KeyModeEnum.minor);
        done();
      });
    });
  });
});

describe("VexFlowConverter for element 'key'", () => {
  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  it("gives key signature G-major with no optional 'mode' element present", (done: Mocha.Done) => {
    const keyInstruction: KeyInstruction = getMusicSheetWithKey(1, "").getFirstSourceMeasure().getKeyInstruction(0);
    const vexflowKeySignature: string = VexFlowConverter.keySignature(keyInstruction);
    const isGMajorOrEminor: boolean = ["G", "E"].indexOf(vexflowKeySignature.charAt(0)) !== -1;
    expect(isGMajorOrEminor).to.equal(true);
    done();
  });
});

// not key tests, but if we outsource this, we need to make getMusicSheetWithKey() accessible from other test files.
describe("InstrumentReader for element 'time'", () => {
  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  it("gives common time RythmSymbolEnum from xml", (done: Mocha.Done) => {
    const instructions: AbstractNotationInstruction[] =
      getMusicSheetWithKey(1, "major", "common").getFirstSourceMeasure().FirstInstructionsStaffEntries[0].Instructions;
    for (const instruction of instructions) {
      if (instruction instanceof RhythmInstruction) {
        expect(instruction.SymbolEnum).to.equal(RhythmSymbolEnum.COMMON);
      }
    }
    done();
  });

  it("gives alla breve/cut time RythmSymbolEnum from xml", (done: Mocha.Done) => {
    const instructions: AbstractNotationInstruction[] =
      getMusicSheetWithKey(1, "major", "cut").getFirstSourceMeasure().FirstInstructionsStaffEntries[0].Instructions;
    for (const instruction of instructions) {
      if (instruction instanceof RhythmInstruction) {
        expect(instruction.SymbolEnum).to.equal(RhythmSymbolEnum.CUT);
      }
    }
    done();
  });
});

describe("Mid-measure keys", (): void => {
  const meterAndClef: string = `<divisions>1</divisions>
    <time><beats>4</beats><beat-type>4</beat-type></time>
    <clef><sign>G</sign><line>2</line></clef>`;

  function readMeasures(measures: string): MusicSheet {
    const doc: Document = new DOMParser().parseFromString(`<score-partwise version="3.1">
      <part-list><score-part id="P1"><part-name>Keys</part-name></score-part></part-list>
      <part id="P1">${measures}</part>
    </score-partwise>`, "text/xml");
    return new MusicSheetReader().createMusicSheet(new IXmlElement(doc.documentElement), "keys");
  }

  function timedKeys(sheet: MusicSheet, measure: number = 0): SourceStaffEntry[] {
    return sheet.SourceMeasures[measure].getEntriesPerStaff(0).filter((entry: SourceStaffEntry): boolean =>
      entry.Instructions.some((instruction: AbstractNotationInstruction): boolean => instruction instanceof KeyInstruction));
  }

  it("applies numbered keys to their staff and unnumbered keys to all staves", (): void => {
    const score: Document = TestUtils.getScore("test_staff_specific_keys.musicxml");
    const sheet: MusicSheet = new MusicSheetReader().createMusicSheet(
      new IXmlElement(TestUtils.getPartWiseElement(score)), "staff-specific keys");
    expect([0, 1].map((staff: number): number => sheet.SourceMeasures[0].getKeyInstruction(staff).Key))
      .to.deep.equal([1, -1]);
    expect([0, 1].map((staff: number): number => sheet.SourceMeasures[1].getKeyInstruction(staff).Key))
      .to.deep.equal([2, 2]);
    const changes: KeyInstruction[][] = [0, 1].map((staff: number): KeyInstruction[] =>
      sheet.SourceMeasures[2].getEntriesPerStaff(staff).flatMap((entry: SourceStaffEntry): KeyInstruction[] =>
        entry.Instructions.filter((instruction: AbstractNotationInstruction): instruction is KeyInstruction =>
          instruction instanceof KeyInstruction)));
    expect(changes.map((keys: KeyInstruction[]): number[] => keys.map((key: KeyInstruction): number => key.Key)))
      .to.deep.equal([[], [-1]]);
  });

  it("keeps the opening key and owns the change at its exact timestamp", (): void => {
    const doc: Document = TestUtils.getScore("test_key_signature_mid_measure.musicxml");
    const sheet: MusicSheet = new MusicSheetReader().createMusicSheet(
      new IXmlElement(TestUtils.getPartWiseElement(doc)), "keys");
    expect(sheet.SourceMeasures[0].getKeyInstruction(0).Key).to.equal(0);
    const entries: SourceStaffEntry[] = timedKeys(sheet);
    expect(entries.length).to.equal(1);
    expect(entries[0].Timestamp.RealValue).to.equal(0.5);
    const key: KeyInstruction = entries[0].Instructions[0] as KeyInstruction;
    expect(key.Key).to.equal(1);
    expect(key.Parent).to.equal(entries[0]);
  });

  it("uses C before the first explicit key and ignores a same-key redeclaration", (): void => {
    const sheet: MusicSheet = readMeasures(`<measure number="1">
      <attributes>${meterAndClef}</attributes>
      <note><rest/><duration>1</duration><type>quarter</type></note>
      <attributes><key><fifths>0</fifths></key></attributes>
      <note><rest/><duration>1</duration><type>quarter</type></note>
      <attributes><key><fifths>1</fifths></key></attributes>
      <note><rest/><duration>2</duration><type>half</type></note>
    </measure>`);
    expect(sheet.SourceMeasures[0].getKeyInstruction(0).Key).to.equal(0);
    expect(timedKeys(sheet).map((entry: SourceStaffEntry): number => entry.Timestamp.RealValue)).to.deep.equal([0.5]);
  });

  it("moves an exact-end key to the next measure, for full measures and pickups", (): void => {
    for (const [duration, type] of [[4, "whole"], [1, "quarter"]]) {
      const sheet: MusicSheet = readMeasures(`<measure number="1">
        <attributes>${meterAndClef}</attributes>
        <note><rest/><duration>${duration}</duration><type>${type}</type></note>
        <attributes><key><fifths>1</fifths></key></attributes>
      </measure>
      <measure number="2">
        <note><rest/><duration>4</duration><type>whole</type></note>
      </measure>`);
      expect(timedKeys(sheet).length, `${type} measure has no in-measure key`).to.equal(0);
      expect(sheet.SourceMeasures[1].getKeyInstruction(0).Key).to.equal(1);
    }
  });

  it("resolves keys in musical order after backup, including changes followed only by forward", (): void => {
    const sheet: MusicSheet = readMeasures(`<measure number="1">
      <attributes>${meterAndClef}</attributes>
      <note><rest/><duration>4</duration><type>whole</type></note>
      <backup><duration>2</duration></backup>
      <attributes><key><fifths>2</fifths></key></attributes>
      <backup><duration>1</duration></backup>
      <attributes><key><fifths>1</fifths></key></attributes>
      <forward><duration>3</duration></forward>
    </measure>
    <measure number="2">
      <attributes><key><fifths>1</fifths></key></attributes>
      <note><rest/><duration>4</duration><type>whole</type></note>
    </measure>`);
    const entries: SourceStaffEntry[] = timedKeys(sheet);
    expect(entries.map((entry: SourceStaffEntry): number => entry.Timestamp.RealValue)).to.deep.equal([0.25, 0.5]);
    expect(entries.map((entry: SourceStaffEntry): number => (entry.Instructions[0] as KeyInstruction).Key)).to.deep.equal([1, 2]);
    expect(entries.every((entry: SourceStaffEntry): boolean => entry.VoiceEntries.length === 0)).to.equal(true);
    expect(sheet.SourceMeasures[1].getKeyInstruction(0).Key, "G is a new key after ending in D").to.equal(1);

    for (const firstBeat of [0, 1]) {
      const redeclaredSheet: MusicSheet = readMeasures(`<measure number="1">
        <attributes>${meterAndClef}</attributes>
        <note><rest/><duration>4</duration><type>whole</type></note>
        <backup><duration>2</duration></backup>
        <attributes><key><fifths>1</fifths></key></attributes>
        <backup><duration>${2 - firstBeat}</duration></backup>
        <attributes><key><fifths>1</fifths></key></attributes>
        <forward><duration>${4 - firstBeat}</duration></forward>
      </measure>`);
      expect(redeclaredSheet.SourceMeasures[0].getKeyInstruction(0).Key).to.equal(firstBeat === 0 ? 1 : 0);
      expect(timedKeys(redeclaredSheet).map((entry: SourceStaffEntry): number => entry.Timestamp.RealValue))
        .to.deep.equal(firstBeat === 0 ? [] : [0.25]);
    }
  });
});

function getMusicSheetWithKey(fifths: number = undefined, mode: string = undefined, timeSymbol: string = ""): MusicSheet {
  const doc: Document = parser.parseFromString(getMusicXmlWithKey(fifths, mode, timeSymbol), "text/xml");
  expect(doc).to.not.be.undefined;
  const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  expect(score).to.not.be.undefined;
  return reader.createMusicSheet(score, "template.xml");
}

function getMusicXmlWithKey(fifths: number = undefined, mode: string = undefined, timeSymbol: string = ""): string {
  const modeElement: string = mode ? `<mode>${mode}</mode>` : "";
  const fifthsElement: string = fifths ? `<fifths>${fifths}</fifths>` : "";
  const timeSymbolAttribute: string = timeSymbol ? `symbol="${timeSymbol}"` : "";
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
                  <time ${timeSymbolAttribute}>
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
  const doc: Document = parser.parseFromString(
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
  expect(doc).to.not.be.undefined;
  const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  expect(score).to.not.be.undefined;
  return reader.createMusicSheet(score, "template.xml");
}
