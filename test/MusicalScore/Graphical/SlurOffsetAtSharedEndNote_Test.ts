import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Two slurs ending at the same note, one inside the other (Alma del core, piano m89-90: the slur from the m89 chord to the
 * m90 C#5 over the slur A4-C#5): the offset a second slur takes at a shared note (SlursStartingAtSameStaffEntryYOffset) is
 * for the longer slur only, so the inner slur ends at its note as it does without the outer slur.
 * Slur.isSlurLonger() used CompareTo() as a boolean for the slurs at the end note (the start note's loop had === -1), so a
 * shorter slur was "longer" too: both slurs got the offset and ended at one point, 0.8 units over the note.
 */
describe("Slur offset at a shared end note", () => {
    function note(step: string, octave: number, type: string, duration: number,
                  options: { alter?: string, dot?: boolean, extra?: string, chord?: boolean } = {}): string {
        return `<note>${options.chord ? "<chord/>" : ""}<pitch><step>${step}</step>${options.alter ?? ""}<octave>${octave}</octave>` +
            `</pitch><duration>${duration}</duration><voice>1</voice><type>${type}</type>${options.dot ? "<dot/>" : ""}` +
            `<stem>up</stem>${options.extra ?? ""}</note>`;
    }
    function score(systemBreak: boolean, outerSlur: boolean = true): string {
        const outerStart: string = outerSlur ? "<notations><slur type=\"start\" number=\"1\" placement=\"above\"/></notations>" : "";
        const m1: string = note("E", 4, "half", 4, { extra: outerStart }) +
            note("A", 4, "half", 4, { chord: true }) + note("C", 5, "half", 4, { chord: true }) +
            note("D", 4, "quarter", 2) + note("B", 4, "quarter", 2, { chord: true });
        const m2: string = note("A", 4, "quarter", 3,
                                { dot: true, extra: "<notations><slur type=\"start\" number=\"2\" placement=\"above\"/></notations>" }) +
            note("B", 4, "eighth", 1) +
            note("C", 5, "quarter", 2, {
                alter: "<alter>1</alter>",
                extra: `<notations><slur type="stop" number="2"/>${outerSlur ? "<slur type=\"stop\" number=\"1\"/>" : ""}</notations>`,
            });
        const m3: string = note("A", 4, "half", 4, { dot: true });
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><key><fifths>3</fifths></key><time><beats>3</beats>" +
            `<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${m1}</measure>` +
            `<measure number="2">${systemBreak ? "<print new-system=\"yes\"/>" : ""}${m2}</measure>` +
            `<measure number="3">${m3}</measure></part></score-partwise>`;
    }

    async function render(systemBreak: boolean, outerSlur: boolean = true): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(score(systemBreak, outerSlur));
        osmd.render();
        return osmd;
    }

    /** the staff line of measure 2 and its slur pieces there */
    function pieces(osmd: OpenSheetMusicDisplay): { line: StaffLine, outer: GraphicalSlur, inner: GraphicalSlur } {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            const line: StaffLine = system.StaffLines[0];
            if (!line.Measures.some(m => m.MeasureNumber === 2)) {
                continue;
            }
            const piece: (startMeasure: number) => GraphicalSlur = (startMeasure) =>
                line.GraphicalSlurs.filter(s => s.slur.StartNote.SourceMeasure.MeasureNumber === startMeasure)[0];
            return { line, outer: piece(1), inner: piece(2) };
        }
        throw new Error("no staff line with measure 2");
    }

    it("ends the inner slur at its note, as without the outer slur", async () => {
        // (the offset of a second slur ending at a note is for the longer one only)
        for (const systemBreak of [false, true]) {
            const inner: GraphicalSlur = pieces(await render(systemBreak)).inner;
            const alone: GraphicalSlur = pieces(await render(systemBreak, false)).inner;
            expect(inner.bezierEndPt.y).to.be.closeTo(alone.bezierEndPt.y, 0.01, `system break ${systemBreak}`);
        }
    });
});
