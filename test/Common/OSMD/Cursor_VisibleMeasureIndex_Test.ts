import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { CursorType } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * A cursor position whose notes are all in a hidden instrument, with no visible note before it in its measure either:
 * the cursor is shown at the end of the previous measure, and the measure types (CurrentArea, CurrentAreaLeft) take
 * their box from that measure. They took the box of the iterator's measure instead, so CurrentAreaLeft got width 0.
 */
describe("Cursor at a position without visible notes", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1200px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("takes the measure box of the measure it's shown in (CurrentAreaLeft)", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false,
            cursorsOptions: [{ type: CursorType.CurrentAreaLeft, color: "#33e02f", alpha: 0.5, follow: false }] });
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const whole: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>";
        const quarters: string = "<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>".repeat(4);
        await osmd.load("<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>A</part-name></score-part><score-part id=\"P2\"><part-name>B</part-name></score-part></part-list>" +
            // measure 2 of P1 starts with a hidden rest, so only P2 has a visible note on its first beat
            `<part id="P1"><measure number="1">${attributes}${whole}</measure>` +
            "<measure number=\"2\"><note print-object=\"no\"><rest/><duration>2</duration><type>half</type></note>" +
            "<note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>half</type></note></measure></part>" +
            `<part id="P2"><measure number="1">${attributes}${quarters}</measure><measure number="2">${quarters}</measure></part>` +
            "</score-partwise>");
        osmd.render();
        osmd.cursor.show();
        for (let i: number = 0; i < 4; i++) {
            osmd.cursor.next();
        }
        expect(osmd.cursor.Iterator.CurrentMeasureIndex, "the cursor on the first beat of measure 2").to.equal(1);
        osmd.Sheet.Instruments[1].Visible = false;
        osmd.render(); // shows the cursor again, at the same position, now without visible notes
        const cursor: Cursor = osmd.cursor;
        expect(cursor.Iterator.CurrentVisibleVoiceEntries().length, "visible voice entries at the cursor").to.equal(0);
        const measure1: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const unitInPixels: number = 10 * osmd.zoom;
        // shown at the end of measure 1: CurrentAreaLeft covers measure 1 up to there
        expect(parseFloat(cursor.cursorElement.style.left), "left").to.be.closeTo(measure1.PositionAndShape.AbsolutePosition.x * unitInPixels, 0.1);
        expect(cursor.cursorElement.width, "width").to.be.closeTo(measure1.PositionAndShape.Size.width * unitInPixels, 1);
    });
});
