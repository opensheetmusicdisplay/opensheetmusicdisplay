import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../Util/TestUtils";

/** EngravingRules.RenderHiddenNotes (OSMDOptions.drawHiddenNotes) draws hidden notes and rests (print-object="no") like
 *  visible ones, in EngravingRules.HiddenNotesColor (OSMDOptions.hiddenNotesColor): without that color, the image has to be
 *  the one of the same sample with the notes visible in the XML, with their beams, ties and tuplets, and the cursor has to
 *  stop at them. */
describe("Drawing hidden notes (EngravingRules.RenderHiddenNotes)", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1440px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "canvas" });
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /**
     * The images of the rendered pages (canvas backend), as data URLs.
     * @returns one data URL per page
     */
    function pageImages(): string[] {
        return Array.from(div.querySelectorAll("canvas")).map((canvas: HTMLCanvasElement): string => canvas.toDataURL());
    }

    /**
     * Expects the same page images, without printing the (long) data URLs if they differ.
     * @param actual the page images to check
     * @param expected the expected page images
     * @param message what is compared, for a failure
     */
    function expectSameImages(actual: string[], expected: string[], message: string): void {
        expect(actual.length, message + ": number of pages").to.equal(expected.length);
        for (let i: number = 0; i < expected.length; i++) {
            expect(actual[i] === expected[i], `${message}: page ${i + 1} differs`).to.equal(true);
        }
    }

    /**
     * Sets OSMDOptions.drawHiddenNotes after load() and renders again, with the graphic created anew for it.
     * @param drawHiddenNotes whether to draw the hidden notes
     */
    function renderWithDrawHiddenNotes(drawHiddenNotes: boolean): void {
        osmd.setOptions({ drawHiddenNotes: drawHiddenNotes });
        osmd.updateGraphic();
        osmd.render();
    }

    /**
     * Expects the hidden notes of the score drawn like visible ones (without hiddenNotesColor) when drawHiddenNotes is
     * switched on after load(), and hidden again when it's switched off.
     * @param xml the MusicXML of a score with hidden notes
     */
    async function expectHiddenNotesDrawnLikeVisibleOnes(xml: string): Promise<void> {
        const xmlWithNotesVisible: string = xml.replace(/(<note\b[^>]*?)\s+print-object="no"/g, "$1");
        expect(xmlWithNotesVisible !== xml, "premise: the score has hidden notes").to.equal(true);
        osmd.setOptions({ hiddenNotesColor: "" });
        await osmd.load(xmlWithNotesVisible);
        osmd.render();
        const notesVisible: string[] = pageImages();

        await osmd.load(xml);
        osmd.render();
        const notesHidden: string[] = pageImages();
        expect(notesHidden.some((image: string, i: number): boolean => image !== notesVisible[i]),
            "premise: the hidden notes aren't drawn by default").to.equal(true);

        renderWithDrawHiddenNotes(true);
        expectSameImages(pageImages(), notesVisible, "hidden notes drawn");
        renderWithDrawHiddenNotes(false);
        expectSameImages(pageImages(), notesHidden, "hidden notes hidden again");
    }

    // OSMD_function_test_invisible_notes: hidden notes and rests of two voices, a hidden chord note, grace notes before a
    //   hidden note and hidden grace notes, with slur, beams and lyrics.
    // test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33: a tremolo written out for playback as hidden 16ths,
    //   beamed among themselves, the first one in unison with the visible dotted half.
    // test_unison_notehead_tuplet_arabesque_measure3: a hidden triplet eighth in unison with a visible half note.
    for (const sampleName of ["OSMD_function_test_invisible_notes.musicxml",
        "test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33.musicxml",
        "test_unison_notehead_tuplet_arabesque_measure3.musicxml"]) {
        it(`draws the hidden notes of ${sampleName} like visible ones, switched on and off after load()`, async (): Promise<void> => {
            await expectHiddenNotesDrawnLikeVisibleOnes(new XMLSerializer().serializeToString(TestUtils.getScore(sampleName)));
        });
    }

    it("draws the ties of hidden notes, within a measure and across the barline", async (): Promise<void> => {
        const hiddenNote: (type: string, duration: number, ties: string[]) => string =
            (type: string, duration: number, ties: string[]): string =>
            `<note print-object="no"><pitch><step>E</step><octave>4</octave></pitch><duration>${duration}</duration>` +
            ties.map((tie: string): string => `<tie type="${tie}"/>`).join("") + `<voice>2</voice><type>${type}</type>` +
            `<notations>${ties.map((tie: string): string => `<tied type="${tie}"/>`).join("")}</notations></note>`;
        const wholeNoteC5: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>" +
            "<type>whole</type></note><backup><duration>4</duration></backup>";
        await expectHiddenNotesDrawnLikeVisibleOnes(`<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
              <part-list><score-part id="P1"><part-name>Voices</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  ${wholeNoteC5}${hiddenNote("half", 2, ["start"])}${hiddenNote("half", 2, ["stop", "start"])}
                </measure>
                <measure number="2">
                  ${wholeNoteC5}${hiddenNote("whole", 4, ["stop"])}
                </measure>
              </part>
            </score-partwise>`);
    });

    // A tie in a measure with another voice curves on its stem side, away from the other voice (setTieDirections()), and a
    //   hidden voice counts only while it's drawn. Before the fix, the direction chosen while the hidden notes were drawn was
    //   kept: the tie stayed above when they were hidden again, instead of curving away from the stem as before.
    it("chooses the direction of a tie again when the hidden notes of another voice are drawn or hidden", async (): Promise<void> => {
        /** A half note E4 in voice 1, stem up, with a tie of the given type. */
        const tiedHalfNoteE4: (tie: string) => string = (tie: string): string =>
            `<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><tie type="${tie}"/><voice>1</voice>` +
            `<type>half</type><stem>up</stem><notations><tied type="${tie}"/></notations></note>`;
        await expectHiddenNotesDrawnLikeVisibleOnes(`<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
              <part-list><score-part id="P1"><part-name>Voices</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  ${tiedHalfNoteE4("start")}${tiedHalfNoteE4("stop")}<backup><duration>4</duration></backup>
                  <note print-object="no"><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice>
                    <type>whole</type></note>
                </measure>
              </part>
            </score-partwise>`);
    });

    // The cymbal tremolo of the Actor Prelude written out for playback as twelve hidden 16ths: a dotted half with tremolo
    //   strokes in voice 1, and the 16ths in voice 2.
    it("lets the cursor stop at the hidden notes it draws", async (): Promise<void> => {
        osmd.setOptions({ drawHiddenNotes: true });
        await osmd.load(TestUtils.getScore("test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33.musicxml"));
        osmd.render();
        /** The number of positions the cursor stops at from the start to the end of the piece. */
        const cursorStops: () => number = (): number => {
            osmd.cursor.reset();
            let stops: number = 0;
            while (!osmd.cursor.Iterator.EndReached && stops < 100) {
                stops++;
                osmd.cursor.next();
            }
            return stops;
        };
        expect(cursorStops(), "at each 16th").to.equal(12);
        renderWithDrawHiddenNotes(false);
        expect(cursorStops(), "only at the dotted half").to.equal(1);
    });

    // The same cymbal tremolo: the hidden 16ths with their stems and their beam in the color of hidden notes, the dotted half
    //   as usual. The color can change between renders, like the colors of visible notes.
    it("draws hidden notes in hiddenNotesColor, by default a light gray", async (): Promise<void> => {
        osmd.setOptions({ backend: "svg", drawHiddenNotes: true });
        await osmd.load(TestUtils.getScore("test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33.musicxml"));
        /** The colors drawn for the notes of the measure: of the visible note's head, and of the hidden notes' heads,
         *  stems and beam, each listed once. */
        const drawnColors: () => { visible: string[], hidden: string[] } = (): { visible: string[], hidden: string[] } => {
            const visible: Set<string> = new Set<string>();
            const hidden: Set<string> = new Set<string>();
            const add: (colors: Set<string>, color: string) => void = (colors: Set<string>, color: string): void => {
                colors.add(color === "black" ? "#000000" : color?.toUpperCase()); // "black": an element drawn without a style
            };
            for (const staffEntry of osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    const note: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
                    const colors: Set<string> = note.sourceNote.PrintObject ? visible : hidden;
                    for (const notehead of note.getNoteheadSVGs()) {
                        add(colors, notehead.querySelector("path").getAttribute("fill"));
                    }
                    if (!note.sourceNote.PrintObject) {
                        add(colors, note.getStemSVG().getAttribute("stroke"));
                        for (const beam of note.getBeamSVGs()) { // the group of each beam line
                            add(colors, beam.querySelector("path").getAttribute("fill"));
                        }
                    }
                }
            }
            return { visible: [...visible], hidden: [...hidden] };
        };
        /** Expects the drawn colors, listing them in the message if they differ. */
        const expectColors: (expected: { visible: string[], hidden: string[] }, message: string) => void =
            (expected: { visible: string[], hidden: string[] }, message: string): void => {
            const actual: string = JSON.stringify(drawnColors());
            expect(actual, `${message}: ${actual}`).to.equal(JSON.stringify(expected));
        };
        osmd.render();
        expect(osmd.EngravingRules.HiddenNotesColor, "default: a light, slightly transparent gray").to.equal("#A0A0A0CC");
        expectColors({ visible: ["#000000"], hidden: ["#A0A0A0CC"] }, "default");
        osmd.setOptions({ hiddenNotesColor: "#FF0000" });
        osmd.render();
        expectColors({ visible: ["#000000"], hidden: ["#FF0000"] }, "red");
        osmd.setOptions({ hiddenNotesColor: "" });
        osmd.render();
        expectColors({ visible: ["#000000"], hidden: ["#000000"] }, "no color for hidden notes");
    });
});
