import chai from "chai";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

let reader: MusicSheetReader;
let parser: DOMParser;

describe("MusicXML parser for ties", () => {
  before((): void => {
    reader = new MusicSheetReader();
    parser = new DOMParser();
  });

  it("matches same-pitch ties by voice before timestamp proximity", (done: Mocha.Done) => {
    const sheet: MusicSheet = getMusicSheetFromXml(getMusicXmlForCrossVoiceSamePitchTies());

    const stopVoice2AtMeasure2Beat0: Note | undefined = findTiedStopNote(sheet, 2, 2, 0);
    chai.assert.isDefined(stopVoice2AtMeasure2Beat0, "missing tied stop: measure2 voice2 t=0");
    const stopVoice2: Note = stopVoice2AtMeasure2Beat0 as Note;
    chai.expect(stopVoice2.NoteTie.StartNote.ParentVoiceEntry.ParentVoice.VoiceId).to.equal(2);
    chai.expect(stopVoice2.NoteTie.StartNote.SourceMeasure.MeasureNumber).to.equal(1);
    chai.expect(stopVoice2.NoteTie.StartNote.ParentVoiceEntry.Timestamp.RealValue).to.equal(0.25);

    const stopVoice1AtMeasure2Beat0: Note | undefined = findTiedStopNote(sheet, 2, 1, 0);
    chai.assert.isDefined(stopVoice1AtMeasure2Beat0, "missing tied stop: measure2 voice1 t=0");
    const stopVoice1Beat0: Note = stopVoice1AtMeasure2Beat0 as Note;
    chai.expect(stopVoice1Beat0.NoteTie.StartNote.ParentVoiceEntry.ParentVoice.VoiceId).to.equal(1);
    chai.expect(stopVoice1Beat0.NoteTie.StartNote.SourceMeasure.MeasureNumber).to.equal(1);
    chai.expect(stopVoice1Beat0.NoteTie.StartNote.ParentVoiceEntry.Timestamp.RealValue).to.equal(0);

    const voice1TiedStopDebug: string = getTiedStopDebug(sheet, 2, 1);
    const stopVoice1AtMeasure2Beat3: Note | undefined = findTiedStopNote(sheet, 2, 1, 1.0);
    chai.assert.isDefined(stopVoice1AtMeasure2Beat3, `missing tied stop: measure2 voice1 t=1.0, found [${voice1TiedStopDebug}]`);
    const stopVoice1Beat3: Note = stopVoice1AtMeasure2Beat3 as Note;
    chai.expect(stopVoice1Beat3.NoteTie.StartNote.ParentVoiceEntry.ParentVoice.VoiceId).to.equal(1);
    chai.expect(stopVoice1Beat3.NoteTie.StartNote.SourceMeasure.MeasureNumber).to.equal(1);
    chai.expect(stopVoice1Beat3.NoteTie.StartNote.ParentVoiceEntry.Timestamp.RealValue).to.equal(0.75);
    done();
  });
});

function getMusicSheetFromXml(xml: string): MusicSheet {
  const doc: Document = parser.parseFromString(xml, "text/xml");
  chai.assert.isDefined(doc);
  const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
  chai.assert.isDefined(score);
  return reader.createMusicSheet(score, "tie-regression-template.musicxml");
}

function findTiedStopNote(sheet: MusicSheet, measureNumber: number, voiceId: number, timestamp: number): Note | undefined {
  for (const measure of sheet.SourceMeasures) {
    if (measure.MeasureNumber !== measureNumber) {
      continue;
    }
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      for (const staffEntry of container.StaffEntries) {
        if (!staffEntry) {
          continue;
        }
        for (const voiceEntry of staffEntry.VoiceEntries) {
          if (voiceEntry.ParentVoice?.VoiceId !== voiceId) {
            continue;
          }
          if (Math.abs(voiceEntry.Timestamp.RealValue - timestamp) > 1e-6) {
            continue;
          }
          for (const note of voiceEntry.Notes) {
            if (note.NoteTie && note.NoteTie.StartNote !== note) {
              return note;
            }
          }
        }
      }
    }
  }
  return undefined;
}

function getTiedStopDebug(sheet: MusicSheet, measureNumber: number, voiceId: number): string {
  const values: string[] = [];
  for (const measure of sheet.SourceMeasures) {
    if (measure.MeasureNumber !== measureNumber) {
      continue;
    }
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      for (const staffEntry of container.StaffEntries) {
        if (!staffEntry) {
          continue;
        }
        for (const voiceEntry of staffEntry.VoiceEntries) {
          if (voiceEntry.ParentVoice?.VoiceId !== voiceId) {
            continue;
          }
          for (const note of voiceEntry.Notes) {
            if (note.NoteTie && note.NoteTie.StartNote !== note) {
              const startVoiceId: number = note.NoteTie.StartNote.ParentVoiceEntry.ParentVoice.VoiceId;
              const startTimestamp: number = note.NoteTie.StartNote.ParentVoiceEntry.Timestamp.RealValue;
              values.push(`stop=${voiceEntry.Timestamp.RealValue.toFixed(5)}->startVoice=${startVoiceId}@${startTimestamp.toFixed(5)}`);
            }
          }
        }
      }
    }
  }
  return values.join(", ");
}

function getMusicXmlForCrossVoiceSamePitchTies(): string {
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
        <key><fifths>-3</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>1</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="start"/>
        <voice>1</voice>
        <type>quarter</type>
        <notations><tied type="start"/></notations>
      </note>
      <note>
        <rest/>
        <duration>2</duration>
        <voice>1</voice>
        <type>half</type>
      </note>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="start"/>
        <voice>1</voice>
        <type>quarter</type>
        <notations><tied type="start"/></notations>
      </note>
      <backup><duration>4</duration></backup>
      <forward><duration>1</duration></forward>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="start"/>
        <voice>2</voice>
        <type>quarter</type>
        <notations><tied type="start"/></notations>
      </note>
      <forward><duration>2</duration></forward>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="stop"/>
        <voice>2</voice>
        <type>quarter</type>
        <notations><tied type="stop"/></notations>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="stop"/>
        <voice>1</voice>
        <type>quarter</type>
        <notations><tied type="stop"/></notations>
      </note>
      <forward><duration>3</duration></forward>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>1</duration>
        <tie type="stop"/>
        <voice>1</voice>
        <type>quarter</type>
        <notations><tied type="stop"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;
}
