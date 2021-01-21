/* eslint-disable @typescript-eslint/no-unused-expressions */
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";

describe("Clef Converter MusicXML to VexFlow", () => {

    let reader: MusicSheetReader;
    let parser: DOMParser;

    before((): void => {
      reader = new MusicSheetReader();
      parser = new DOMParser();
    });

    it("reads treble key", (done: Mocha.Done) => {
      getMusicSheetWithClef("G").getStaffFromIndex(0);
      done();
    });

    /**
     * Simulates loading a [[MusicSheet]] with the specified clef.
     *
     * @see https://usermanuals.musicxml.com/MusicXML/Content/EL-MusicXML-clef.htm
     */
    function getMusicSheetWithClef(sign: string, line?: number, clefOcatveChange?: number, additional?: string, size?: string): MusicSheet {
      const doc: Document = parser.parseFromString(getMusicXmlWithClef(sign, line, clefOcatveChange, additional, size), "text/xml");
      chai.expect(doc).to.not.be.undefined;
      const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
      chai.expect(score).to.not.be.undefined;
      return reader.createMusicSheet(score, "template.xml");
    }

    function getMusicXmlWithClef(sign: string, line?: number, clefOcatveChange?: number, additional?: string, size?: string): string {
      // let modeElement: string = mode ? `<mode>${mode}</mode>` : "";
      // let fifthsElement: string = fifths ? `<fifths>${fifths}</fifths>` : "";
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

});
