import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { InstrumentReader } from "../../../src/MusicalScore/ScoreIO/InstrumentReader";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

/**
 * Three numbers of a MusicXML file say how much OSMD creates: the staves of a part (<staves>), the lines of a staff
 * (<staff-lines>) and the strokes of a tremolo (<tremolo>). A file of 500 bytes with 3000000 in one of them used up all
 * memory in load() or render() (the page crashed, Node ended with "heap out of memory"), which matters for apps that show
 * files their users upload. Now each has a limit that no real score reaches.
 *
 * Fixture: one part with one 4/4 measure and a whole note C4.
 */
describe("Oversized values in MusicXML", () => {
    const oversized: string = "3000000";

    /** The fixture, with more elements in its <attributes> (after <time>, after <clef>) and in its note's <notations>. */
    function score(values: { staves?: string, staffDetails?: string, ornaments?: string }): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>
        ${values.staves ?? ""}<clef><sign>G</sign><line>2</line></clef>${values.staffDetails ?? ""}</attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>
        <notations><ornaments>${values.ornaments ?? ""}</ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`;
    }

    /** An OSMD for the test, and the warnings and errors logged from now on. */
    function createOsmd(): { osmd: OpenSheetMusicDisplay, logged: string[] } {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        onTestFinished((): void => {
            osmd.clear();
            container.remove();
        });
        return { osmd, logged: TestUtils.catchLogs() };
    }

    /** Checks the one warning that was logged, which is also in the errors of measure 1. */
    function expectWarning(osmd: OpenSheetMusicDisplay, logged: string[], warning: string): void {
        expect(logged, logged.join("\n")).to.deep.equal(["[OSMD] " + warning]);
        expect(osmd.Sheet.SheetErrors.measureErrors[1]).to.deep.equal(["Error while reading Measure.", warning]);
    }

    it("a part with 3000000 staves fails to load, with an error that names the part and the value", async () => {
        const { osmd } = createOsmd();
        let error: Error;
        await osmd.load(score({ staves: `<staves>${oversized}</staves>` })).catch((e: Error) => error = e);
        expect(String(error?.message)).to.contain(`Invalid number of staves. Part "P1" has <staves>${oversized}</staves>, ` +
            `the most that is read is ${MusicSheetReader.MaxStavesPerPart} staves per part.`);
    });

    it("a part with as many staves as the limit loads", async () => {
        const { osmd, logged } = createOsmd();
        await osmd.load(score({ staves: `<staves>${MusicSheetReader.MaxStavesPerPart}</staves>` }));
        expect(osmd.Sheet.Staves.length).to.equal(MusicSheetReader.MaxStavesPerPart);
        expect(logged).to.deep.equal([]);
    });

    it("<staff-lines> of 3000000 is ignored with a warning: the staff keeps its 5 lines", async () => {
        const { osmd, logged } = createOsmd();
        await osmd.load(score({ staffDetails: `<staff-details><staff-lines>${oversized}</staff-lines></staff-details>` }));
        osmd.render();
        expect(osmd.Sheet.Staves[0].StafflineCount).to.equal(5);
        expect(osmd.Sheet.Staves[0].xmlStafflineCount).to.equal(undefined);
        expectWarning(osmd, logged, `Measure 1 of part "Flute" (P1): ignored <staff-lines>${oversized}</staff-lines> of staff 1, ` +
            `the most that is read is ${InstrumentReader.MaxStaffLines} lines: the staff keeps its 5 lines`);
    });

    it("a tremolo of 3000000 strokes is reduced to 8 strokes with a warning", async () => {
        const { osmd, logged } = createOsmd();
        await osmd.load(score({ ornaments: `<tremolo type="single">${oversized}</tremolo>` }));
        osmd.render();
        const note: Note = osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0].Notes[0];
        expect(note.TremoloStrokes).to.equal(8);
        expectWarning(osmd, logged, `Measure 1 of part "Flute" (P1): a <tremolo> of ${oversized} strokes was reduced to ` +
            `${InstrumentReader.MaxTremoloStrokes} strokes, the most that is read`);
    });
});
