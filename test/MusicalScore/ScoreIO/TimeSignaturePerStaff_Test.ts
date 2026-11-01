import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RhythmInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";

/**
 * A part with several staves may write its time signature once per staff, `<time number="1">` and `<time number="2">`
 * (the `number` attribute of `<time>` is the staff number, like that of `<clef>` and `<key>`). The reader added up the
 * beats of every `<time>` element of the measure, as if they were the parts of one composite signature: 3/4 and 3/4
 * became 6/4, 9/8 and 3/4 became 15/8 — for every part, since the measure's time signature is shared.
 * InstrumentReader.timeNodesOfOneStaff(): the unnumbered `<time>` elements, otherwise those of the lowest staff number.
 */
describe("Time signature written per staff", () => {
    function note(step: string, octave: number, duration: number, type: string,
                  voice: number = 1, staff: number = 1, dot: boolean = false): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>${voice}</voice><type>${type}</type>${dot ? "<dot/>" : ""}<staff>${staff}</staff></note>`;
    }

    function score(violinTime: string, pianoPart: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Violin</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key>
      ${violinTime}<clef><sign>G</sign><line>2</line></clef></attributes>
      ${note("A", 4, 6, "half", 1, 1, true)}</measure>
    <measure number="2">${note("B", 4, 6, "half", 1, 1, true)}</measure>
  </part>
  <part id="P2">${pianoPart}</part>
</score-partwise>`;
    }

    function pianoMeasures(time: string): string {
        return `
    <measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key>
      ${time}<staves>2</staves>
      <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      ${note("C", 5, 6, "half", 1, 1, true)}<backup><duration>6</duration></backup>
      ${note("C", 3, 6, "half", 5, 2, true)}</measure>
    <measure number="2">
      ${note("D", 5, 6, "half", 1, 1, true)}<backup><duration>6</duration></backup>
      ${note("D", 3, 6, "half", 5, 2, true)}</measure>`;
    }

    const threeFour: string = "<time><beats>3</beats><beat-type>4</beat-type></time>";
    const perStaffThreeFour: string = "<time number=\"1\"><beats>3</beats><beat-type>4</beat-type></time>" +
        "<time number=\"2\"><beats>3</beats><beat-type>4</beat-type></time>";

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    async function load(xml: string): Promise<MusicSheet> {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(xml);
        return osmd.Sheet;
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The time signatures at the start of the measure, one per staff. */
    function rhythms(sheet: MusicSheet, measureIndex: number): string[] {
        const result: string[] = [];
        for (const entry of sheet.SourceMeasures[measureIndex].FirstInstructionsStaffEntries) {
            for (const instruction of entry?.Instructions ?? []) {
                if (instruction instanceof RhythmInstruction) {
                    result.push(`${instruction.Rhythm.Numerator}/${instruction.Rhythm.Denominator}`);
                }
            }
        }
        return result;
    }

    it("reads the same time signature written per staff as one 3/4, not 6/4", async () => {
        const sheet: MusicSheet = await load(score(threeFour, pianoMeasures(perStaffThreeFour)));
        expect(rhythms(sheet, 0)).to.deep.equal(["3/4", "3/4", "3/4"]);
        expect(sheet.SourceMeasures[0].Duration.RealValue).to.equal(0.75);
    });

    it("takes the lowest staff number's time signature when they differ per staff", async () => {
        // staff 1 9/8 (interchangeable with 3/4), staff 2 3/4 — was 15/8
        const perStaff: string = "<time number=\"2\"><beats>3</beats><beat-type>4</beat-type></time>" +
            "<time number=\"1\"><beats>9</beats><beat-type>8</beat-type>" +
            "<interchangeable separator=\"none\"><beats>3</beats><beat-type>4</beat-type></interchangeable></time>";
        const sheet: MusicSheet = await load(score("<time number=\"1\"><beats>9</beats><beat-type>8</beat-type></time>",
                                                   pianoMeasures(perStaff)));
        expect(rhythms(sheet, 0)).to.deep.equal(["9/8", "9/8", "9/8"]);
    });

    it("prefers a <time> without a number to the numbered ones", async () => {
        const mixed: string = "<time number=\"2\"><beats>6</beats><beat-type>8</beat-type></time>" + threeFour;
        const sheet: MusicSheet = await load(score(threeFour, pianoMeasures(mixed)));
        expect(rhythms(sheet, 0)).to.deep.equal(["3/4", "3/4", "3/4"]);
    });

    it("still adds up a composite time signature inside one <time>", async () => {
        const composite: string = "<time><beats>2</beats><beat-type>4</beat-type><beats>3</beats><beat-type>8</beat-type></time>";
        const sheet: MusicSheet = await load(score(composite, pianoMeasures(composite))
            .replace(/<duration>6<\/duration>/g, "<duration>7</duration>"));
        expect(rhythms(sheet, 0)).to.deep.equal(["7/8", "7/8", "7/8"]);
    });
});
