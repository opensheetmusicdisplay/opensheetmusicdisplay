import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Tablature bends", () => {
    let div: HTMLElement;
    beforeEach(() => { div = TestUtils.getDivElement(document); });
    afterEach(() => { div.remove(); });

    /** A quarter note on string 4 at the given fret, with more `<technical>` children (e.g. bends) and `<note>` children. */
    function tabNote(fret: number, technical: string = "", noteChildren: string = ""): string {
        return `<note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type>${noteChildren}
            <notations><technical><string>4</string><fret>${fret}</fret>${technical}</technical></notations></note>`;
    }

    /** A bend by the given interval in semitones (MusicXML's bend-alter, negative for a release or a pre-bend),
     *  with an optional element that marks it, "release" or "pre-bend". */
    function bend(semitones: number, mark: string = ""): string {
        return `<bend><bend-alter>${semitones}</bend-alter>${mark ? `<${mark}/>` : ""}</bend>`;
    }

    /** Renders the notes as a measure of a guitar tab (SVG backend) and returns them. */
    async function renderTab(container: HTMLElement, notes: string[]): Promise<VexFlowGraphicalNote[]> {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, {autoResize: false, backend: "svg"});
        await osmd.load(`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>1</divisions>
            <time><beats>${notes.length}</beats><beat-type>4</beat-type></time>
            <clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details>
            </attributes>${notes.join("")}</measure></part></score-partwise>`);
        osmd.render();
        for (const path of Array.from(container.querySelectorAll("svg path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
        return osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries
            .map(staffEntry => staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
    }

    /** The labels drawn with the note's bends (a release draws an empty text). */
    function bendLabels(note: VexFlowGraphicalNote): SVGTextElement[] {
        return note.getModifierSVGs().filter(svg => svg.tagName === "text" && svg.textContent !== "") as unknown as SVGTextElement[];
    }

    it("labels a bend by its interval in whole tones, independently of the fret", async () => {
        // [bend-alter (semitones), fret, label]
        const bends: [number, number, string][] = [[0.5, 7, "1/4"], [1, 7, "1/2"], [1.5, 7, "3/4"], [2, 7, "Full"],
            [2.5, 7, "1 1/4"], [3, 7, "1 1/2"], [4, 7, "2"], [1, 0, "1/2"], [1, 12, "1/2"]];
        const notes: VexFlowGraphicalNote[] = await renderTab(div, bends.map(([semitones, fret]) => tabNote(fret, bend(semitones))));
        expect(notes.map(note => bendLabels(note).map(label => label.textContent).join())).to.deep.equal(bends.map(b => b[2]));
    });

    it("labels each bend of a note with how far the string is bent after it, also a release that doesn't go all the way back", async () => {
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg"});
        await osmd.load(TestUtils.getScore("test_tabs_multibend.musicxml"));
        osmd.render();
        const labels: string[][] = osmd.GraphicSheet.MeasureList.flatMap(measures => measures[0].staffEntries).map(staffEntry =>
            bendLabels(staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote).map(label => label.textContent));
        // like Guitar Pro and MuseScore; a release back to the unbent note isn't labeled
        expect(labels).to.deep.equal([
            ["1/2", "Full"], // a half step, then another half step
            ["Full", "Full"], // bend, release, bend
            ["Full", "1/2"], // a whole step, released by a half step
            ["Full", "1/2", "Full"], // the same, bent back up by a half step and released
        ]);
    });

    it("draws a bend and its release as one curve, labeled at the bend, a pre-bend as a bend, and two bends side by side", async () => {
        const notes: VexFlowGraphicalNote[] = await renderTab(div, [
            tabNote(7, bend(2) + bend(-2, "release")),
            tabNote(7, bend(-2)), // only a release, like on the end note of a bend from MuseScore, which writes no <release/>
            tabNote(7, bend(1) + bend(1)),
            tabNote(7, bend(-2, "pre-bend")), // a pre-bend as MuseScore writes it
        ]);
        expect(notes.map(note => bendLabels(note).map(label => label.textContent))).to.deep.equal([["Full"], [], ["1/2", "Full"], ["Full"]]);
        // curves: drawn as paths without a fill (one per segment), the arrowheads and labels are filled
        const curves: number[] = notes.map(note => note.getModifierSVGs().filter(svg => svg.getAttribute("fill") === "none").length);
        expect(curves, "curves of each note").to.deep.equal([2, 1, 2, 1]);
        const [first, second] = bendLabels(notes[2]).map(label => label.getBBox());
        expect(first.x + first.width, "end of the first label").to.be.lessThan(second.x);
    });

    it("reads a release from a second <notations> of a note, and hides a fret in hidden <notations> (MuseScore)", async () => {
        // MuseScore writes a bend as the bent note and an end note at the bent pitch, whose string and fret are hidden,
        //   and the release of that end note in another <notations>.
        const notes: VexFlowGraphicalNote[] = await renderTab(div, [
            tabNote(2, bend(1)),
            `<note><pitch><step>F</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type>
                <notations print-object="no"><technical><string>4</string><fret>2</fret></technical></notations>
                <notations><technical>${bend(-1)}</technical></notations></note>`,
            tabNote(2, "", "<notehead parentheses='yes'>normal</notehead>"),
        ]);
        expect((notes[1].sourceNote as TabNote).BendArray).to.deep.equal([{bendalter: -1, direction: "down"}]);
        expect(notes.map(note => note.getNoteheadSVGs().map(fret => fret.textContent))).to.deep.equal([["2"], [""], ["(2)"]]);
        const hiddenFret: HTMLElement = notes[1].getNoteheadSVGs()[0];
        expect(hiddenFret.previousElementSibling.getAttribute("width"), "no gap behind the hidden fret").to.equal("0");
    });
});
