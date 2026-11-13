import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Pitch } from "../../../src/Common/DataObjects/Pitch";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

/**
 * An element of a measure that the reader can't read (it throws there, e.g. a <harmony> without <kind> or a <forward>
 * without <duration>) made InstrumentReader.readNextXmlMeasure() drop the rest of that part's measure: the following notes,
 * directions and the barline, with only a debug log. Now only that element is skipped, with a warning that names the
 * measure, the part and the element, which is also in MusicSheet.SheetErrors.measureErrors.
 *
 * Fixture: two parts with two 4/4 measures. The Flute's first measure has the quarter notes C4 D4 E4 F4, a forte below the
 * E4 and a light-light barline; the test's element is put between C4 and D4.
 */
describe("Measure elements that can't be read", () => {
    /** A quarter note of the fixture (a whole note with duration 4), with more child elements, or another <type>. */
    function note(step: string, moreElements: string = "", type: string = "quarter", duration: number = 1): string {
        return `<note>${moreElements}<pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type></note>`;
    }

    /** The fixture, with the given elements between the first two notes of the Flute's first measure. */
    function score(elementsAfterFirstNote: string): string {
        const attributes: string = "<attributes><divisions>1</divisions><key><fifths>0</fifths></key>" +
            "<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Flute</part-name></score-part>
    <score-part id="P2"><part-name>Oboe</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">${attributes}
      ${note("C")}${elementsAfterFirstNote}${note("D")}
      <direction placement="below"><direction-type><dynamics><f/></dynamics></direction-type></direction>
      ${note("E")}${note("F")}
      <barline location="right"><bar-style>light-light</bar-style></barline>
    </measure>
    <measure number="2">
      ${note("G")}${note("A")}${note("B")}${note("C")}
      <barline location="right"><bar-style>light-heavy</bar-style></barline>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">${attributes}${note("C", "", "whole", 4)}</measure>
    <measure number="2">${note("D", "", "whole", 4)}</measure>
  </part>
</score-partwise>`;
    }

    /** Loads the fixture with the given elements and renders it. Returns the sheet's OSMD and the warnings and errors logged. */
    async function load(elementsAfterFirstNote: string): Promise<{ osmd: OpenSheetMusicDisplay, logged: string[] }> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        onTestFinished((): void => {
            osmd.clear();
            container.remove();
        });
        const logged: string[] = TestUtils.catchLogs();
        await osmd.load(score(elementsAfterFirstNote));
        osmd.render();
        return { osmd, logged };
    }

    /**
     * What was read of a staff's measure: its notes with their timestamps in the measure (chord notes joined by "+"), the
     * number of expressions (the forte) and the barline, e.g. "C4 at 0/1, D4 at 1/4; 1 expression; barline light-light".
     */
    function measureRead(osmd: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): string {
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[measureIndex];
        const notes: string[] = [];
        for (const verticalContainer of measure.VerticalSourceStaffEntryContainers) {
            const staffEntry: SourceStaffEntry = verticalContainer.StaffEntries[staffIndex];
            for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                const pitches: string = voiceEntry.Notes.map((n: Note) => n.Pitch.ToStringShort(Pitch.OctaveXmlDifference)).join("+");
                notes.push(`${pitches} at ${verticalContainer.Timestamp.toString()}`);
            }
        }
        const expressions: number = measure.StaffLinkedExpressions[staffIndex].length;
        return `${notes.join(", ")}; ${expressions} expression${expressions === 1 ? "" : "s"}; barline ${measure.endingBarStyleXml}`;
    }

    const fluteMeasure1: string = "C4 at 0/1, D4 at 1/4, E4 at 1/2, F4 at 3/4; 1 expression; barline light-light";
    const fluteMeasure2: string = "G4 at 0/1, A4 at 1/4, B4 at 1/2, C4 at 3/4; 0 expressions; barline light-heavy";
    const oboeMeasure1: string = "C4 at 0/1; 0 expressions; barline light-light";
    /** The start of a skipped element's warning, for the regular expressions below. */
    const skipped: (element: string, position: number) => string = (element: string, position: number): string =>
        `Measure 1 of part "Flute" \\(P1\\): skipped the <${element}> element \\(element ${position} of the measure\\), which could not be read: `;

    it("a well-formed score is read without warnings or measure errors", async () => {
        const { osmd, logged } = await load("");
        expect(measureRead(osmd, 0, 0)).to.equal(fluteMeasure1);
        expect(measureRead(osmd, 1, 0)).to.equal(fluteMeasure2);
        expect(measureRead(osmd, 0, 1)).to.equal(oboeMeasure1);
        expect(logged).to.deep.equal([]);
        expect(osmd.Sheet.SheetErrors.measureErrors).to.deep.equal({ 1: [], 2: [] });
    });

    const unreadableElements: [string, string, string][] = [ // description, the element, its name
        ["a <harmony> without <kind>", "<harmony><root><root-step>C</root-step></root></harmony>", "harmony"],
        ["a <forward> without <duration>", "<forward/>", "forward"],
        ["a <backup> without <duration>", "<backup/>", "backup"],
        ["a <direction> without <direction-type>", "<direction><staff>1</staff></direction>", "direction"],
        ["<staff-details> of a staff that the part doesn't have",
         "<attributes><staff-details number=\"3\"><staff-lines>5</staff-lines></staff-details></attributes>", "attributes"],
    ];
    for (const [description, element, name] of unreadableElements) {
        it(`${description} is skipped with a warning, and the rest of the measure is read`, async () => {
            const { osmd, logged } = await load(element);
            // before: "C4 at 0/1; 0 expressions; barline undefined"
            expect(measureRead(osmd, 0, 0)).to.equal(fluteMeasure1);
            expect(measureRead(osmd, 1, 0)).to.equal(fluteMeasure2);
            expect(measureRead(osmd, 0, 1)).to.equal(oboeMeasure1);
            // the reason is the browser's message, e.g. "Cannot read properties of undefined (reading 'attribute')"
            const warning: RegExp = new RegExp(skipped(name, 3) + ".+");
            expect(logged.length, logged.join("\n")).to.equal(1);
            expect(logged[0]).to.match(new RegExp("^\\[OSMD\\] " + warning.source));
            const measureErrors: string[] = osmd.Sheet.SheetErrors.measureErrors[1];
            expect(measureErrors.length, measureErrors.join("\n")).to.equal(2);
            expect(measureErrors[0]).to.equal("Error while reading Measure.");
            expect(measureErrors[1]).to.match(new RegExp("^" + warning.source));
            expect(osmd.Sheet.SheetErrors.measureErrors[2]).to.deep.equal([]);
        });
    }

    it("a note that can't be read is skipped with its chord notes, and the following notes keep their timestamps", async () => {
        // a G4 + B4 chord between C4 and D4 (so the measure has a quarter too many), whose first note has an unknown <type>
        const { osmd, logged } = await load(note("G", "", "weird") + note("B", "<chord/>"));
        // before: "C4 at 0/1; 0 expressions; barline undefined". The chord leaves a gap at 1/4: D4 isn't moved there.
        expect(measureRead(osmd, 0, 0)).to.equal("C4 at 0/1, D4 at 1/2, E4 at 3/4, F4 at 1 0/1; 1 expression; barline light-light");
        expect(measureRead(osmd, 1, 0)).to.equal(fluteMeasure2);
        expect(logged.length, logged.join("\n")).to.equal(2);
        expect(logged[0]).to.match(new RegExp("^\\[OSMD\\] " + skipped("note", 3) + "Invalid note duration\\.$"));
        expect(logged[1]).to.match(new RegExp("^\\[OSMD\\] " + skipped("note", 4) + "it belongs to the chord of the skipped note before it$"));
    });
});
