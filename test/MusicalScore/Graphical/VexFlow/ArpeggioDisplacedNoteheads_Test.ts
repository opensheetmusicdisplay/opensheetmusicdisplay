import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * An arpeggio is drawn left of all the chord's noteheads, also when a notehead of a second is displaced to the left of the
 * stem (stem down) and isn't the chord's lowest note (#794).
 * OSMD attaches the arpeggio (a VexFlow Stroke) to the chord's first key, the lowest note. Stroke.format() made room for a
 * displaced notehead only when that key was displaced, while Accidental.format() checks all keys.
 */
describe("Arpeggio next to displaced noteheads", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });
    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /** A chord note: a pitch like "E5" or "C#5", with an arpeggio and the given stem direction. */
    function chordNote(pitch: string, stem: string, isChordContinuation: boolean): string {
        const alter: string = pitch.includes("#") ? "<alter>1</alter>" : "";
        const accidental: string = pitch.includes("#") ? "<accidental>sharp</accidental>" : "";
        return `<note>${isChordContinuation ? "<chord/>" : ""}<pitch><step>${pitch[0]}</step>${alter}` +
            `<octave>${pitch[pitch.length - 1]}</octave></pitch><duration>4</duration><type>whole</type>${accidental}` +
            `<stem>${stem}</stem><notations><arpeggiate/></notations></note>`;
    }

    /** A score with one measure per chord, each a whole-note chord with an arpeggio. */
    function scoreWithArpeggios(chords: { pitches: string[], stem: string }[]): string {
        const measures: string = chords.map((chord: { pitches: string[], stem: string }, index: number): string =>
            `<measure number="${index + 1}">` +
            (index === 0 ? "<attributes><divisions>1</divisions><key><fifths>0</fifths></key>" +
                "<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" : "") +
            chord.pitches.map((pitch: string, pitchIndex: number): string => chordNote(pitch, chord.stem, pitchIndex > 0)).join("") +
            "</measure>").join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name></part-name></score-part></part-list>" +
            `<part id="P1">${measures}</part></score-partwise>`;
    }

    /** Per chord: the arpeggio's right edge, the leftmost notehead's and the leftmost accidental's left edge, in SVG units. */
    function chordEdges(accidentalCounts: number[]): { strokeRight: number, noteheadsLeft: number, accidentalsLeft: number }[] {
        const stavenotes: Element[] = Array.from(div.querySelectorAll(".vf-stavenote"));
        expect(stavenotes.length, "chords").to.equal(accidentalCounts.length);
        return stavenotes.map((stavenote: Element, index: number) => {
            // The modifiers group has the accidentals' glyphs, then the stroke's (in the order StaveNote.addModifier() got them,
            //   the stroke last, see VexFlowMeasure.createArpeggio()).
            const paths: SVGGraphicsElement[] = Array.from(stavenote.querySelectorAll(":scope > .vf-modifiers > path"));
            const accidentalPaths: SVGGraphicsElement[] = paths.slice(0, accidentalCounts[index]);
            const strokePaths: SVGGraphicsElement[] = paths.slice(accidentalCounts[index]);
            const noteheads: SVGGraphicsElement[] = Array.from(stavenote.querySelectorAll(".vf-notehead"));
            expect(strokePaths.length > 0, `chord ${index + 1} has an arpeggio`).to.equal(true);
            expect(noteheads.length > 1, `chord ${index + 1} has noteheads`).to.equal(true);
            const left: (elements: SVGGraphicsElement[]) => number = (elements) => Math.min(...elements.map((e) => e.getBBox().x));
            return {
                strokeRight: Math.max(...strokePaths.map((path) => path.getBBox().x + path.getBBox().width)),
                noteheadsLeft: left(noteheads),
                accidentalsLeft: accidentalPaths.length > 0 ? left(accidentalPaths) : undefined,
            };
        });
    }

    it("draws the arpeggio left of a displaced notehead in the middle of a stem-down chord", async (): Promise<void> => {
        await osmd.load(scoreWithArpeggios([
            { pitches: ["C5", "E5", "F5"], stem: "down" }, // E5 displaced left, not the lowest note: the bug
            { pitches: ["C5", "D5", "G5"], stem: "down" }, // C5 displaced left, the lowest note: worked before
            { pitches: ["C5", "E5", "F5", "A5"], stem: "down" }, // E5 displaced, two notes above
            { pitches: ["E4", "F4", "A4"], stem: "up" }, // F4 displaced right: no room needed on the left
        ]));
        osmd.render();
        const gaps: number[] = chordEdges([0, 0, 0, 0]).map((edges) => edges.noteheadsLeft - edges.strokeRight);
        for (let i: number = 0; i < gaps.length; i++) {
            expect(gaps[i] >= 0, `chord ${i + 1}: gap between arpeggio and noteheads ${gaps[i]} (negative = overlap)`).to.equal(true);
        }
        // the displaced notehead moves the arpeggio by the same amount, wherever it is in the chord
        expect(Math.abs(gaps[0] - gaps[1]) < 0.5, `gaps of chord 1 (${gaps[0]}) and chord 2 (${gaps[1]})`).to.equal(true);
        expect(Math.abs(gaps[2] - gaps[1]) < 0.5, `gaps of chord 3 (${gaps[2]}) and chord 2 (${gaps[1]})`).to.equal(true);
    });

    it("doesn't add the displaced notehead's room twice when the chord has accidentals", async (): Promise<void> => {
        await osmd.load(scoreWithArpeggios([
            { pitches: ["C5", "E5", "F5"], stem: "down" }, // no accidental
            { pitches: ["C#5", "D5", "G5"], stem: "down" }, // the lowest note displaced, with an accidental
            { pitches: ["C#5", "E5", "F5"], stem: "down" }, // the middle note displaced, accidental on the lowest
        ]));
        osmd.render();
        const edges: { strokeRight: number, noteheadsLeft: number, accidentalsLeft: number }[] = chordEdges([0, 1, 1]);
        const gapWithoutAccidentals: number = edges[0].noteheadsLeft - edges[0].strokeRight;
        expect(gapWithoutAccidentals >= 0, `chord 1: gap between arpeggio and noteheads ${gapWithoutAccidentals}`).to.equal(true);
        for (const i of [1, 2]) {
            const accidentalGap: number = edges[i].accidentalsLeft - edges[i].strokeRight;
            expect(accidentalGap >= 0, `chord ${i + 1}: gap between arpeggio and accidental ${accidentalGap}`).to.equal(true);
            // the arpeggio stays next to the accidental, as far from it as from the noteheads of a chord without accidentals
            expect(accidentalGap < gapWithoutAccidentals + 2,
                   `chord ${i + 1}: gap to the accidental ${accidentalGap}, chord 1's gap to its noteheads ${gapWithoutAccidentals}`)
                .to.equal(true);
        }
    });
});
