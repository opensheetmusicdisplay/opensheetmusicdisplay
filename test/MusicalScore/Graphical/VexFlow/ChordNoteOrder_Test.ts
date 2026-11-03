import { expect } from "vitest";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

// Two chords written from the bottom up, each with a pitch order other than its staff line order:
//   G sharp and A flat, which have the same pitch, and E sharp and F flat, where E sharp sounds higher but is drawn lower.
//   Vexflow sorts the notes of a chord by staff line, while their accidentals etc. are added at their index in the chord,
//   so OSMD has to sort them the same way (VexFlowVoiceEntry.sortForVexflow()).
describe("VexFlow chord note order", () => {
    /** A quarter note with an accidental, the second one of a chord if chord is true. */
    function note(step: string, alter: number, accidental: string, chord: boolean = false): string {
        return `<note>${chord ? "<chord/>" : ""}<pitch><step>${step}</step><alter>${alter}</alter><octave>4</octave></pitch>
            <duration>1</duration><voice>1</voice><type>quarter</type><accidental>${accidental}</accidental></note>`;
    }
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
            <part id="P1">
                <measure number="1">
                    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                        <clef><sign>G</sign><line>2</line></clef></attributes>
                    ${note("G", 1, "sharp")}${note("A", -1, "flat", true)}
                    ${note("E", 1, "sharp")}${note("F", -1, "flat", true)}
                    <note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>
                </measure>
            </part>
        </score-partwise>`;

    it("Places each note of a chord at its own notehead, also where the pitch order isn't the staff line order", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(new DOMParser().parseFromString(xml, "text/xml"));
        osmd.render();
        for (const [index, chordName] of [[0, "G sharp - A flat"], [1, "E sharp - F flat"]] as [number, string][]) {
            const voiceEntry: GraphicalVoiceEntry = osmd.GraphicSheet.MeasureList[0][0].staffEntries[index].graphicalVoiceEntries[0];
            const [lower, upper] = voiceEntry.parentVoiceEntry.Notes.map(sourceNote =>
                voiceEntry.notes.find(graphicalNote => graphicalNote.sourceNote === sourceNote)) as GraphicalNote[];
            expect(lower.staffLine < upper.staffLine, `${chordName}: the lower note's staff line`).to.equal(true);
            expect(lower.PositionAndShape.AbsolutePosition.y > upper.PositionAndShape.AbsolutePosition.y,
                `${chordName}: the lower note placed below the upper one`).to.equal(true);
        }
        div.remove();
    });
});
