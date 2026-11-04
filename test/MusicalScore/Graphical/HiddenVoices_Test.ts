import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalMusicPage } from "../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { Instrument } from "../../../src/MusicalScore/Instrument";
import { Voice } from "../../../src/MusicalScore/VoiceData/Voice";
import { StemDirectionType } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { TestUtils } from "../../Util/TestUtils";

/** Hiding a voice (Voice.Visible false), e.g. to show a singer's part of a hymn whose soprano and alto share a staff (#1892).
 *  By default, the other voices are laid out as if the hidden voice weren't there, and its lyrics are drawn under the visible
 *  notes that start at the same time. With EngravingRules.HiddenVoicesKeepLayout, its notes keep their space, undrawn.
 *  The sample: soprano (voice 1) and alto (2) on the upper staff, tenor (5) and bass (6) on the lower one, the lyrics given
 *  with the soprano (see the comment in it). */
describe("Hidden voices (Voice.Visible)", (): void => {
    const soprano: number = 1;
    const alto: number = 2;
    /** The soprano's syllables, and the alto's own "with" in measure 1, drawn at the same note as the soprano's. */
    const allLyrics: string[] = ["Praise", "the", "Lord", "with", "with", "voi", "ces", "high", "sing", "on", "now", "A", "men"];
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async (): Promise<void> => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(TestUtils.getScore("test_hidden_voices_hymn_satb.musicxml"));
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    /** The voice with the given MusicXML voice number (1 soprano, 2 alto, 5 tenor, 6 bass). */
    function voice(voiceId: number): Voice {
        return osmd.Sheet.Instruments[0].Voices.find((v: Voice): boolean => v.VoiceId === voiceId);
    }

    /** The graphical staff entries of the staff (0: the upper one), of all measures or of the one with the index. */
    function staffEntries(staffIndex: number, measureIndex?: number): GraphicalStaffEntry[] {
        const measures: GraphicalMeasure[][] = osmd.GraphicSheet.MeasureList;
        return (measureIndex === undefined ? measures : [measures[measureIndex]]).flatMap(
            (verticalMeasures: GraphicalMeasure[]): GraphicalStaffEntry[] => verticalMeasures[staffIndex].staffEntries);
    }

    /** The graphical notes of the voice on the upper staff, of all measures or of the one with the index. */
    function notesOf(voiceId: number, measureIndex?: number): GraphicalNote[] {
        return staffEntries(0, measureIndex)
            .flatMap((staffEntry: GraphicalStaffEntry): GraphicalVoiceEntry[] => staffEntry.graphicalVoiceEntries)
            .filter((voiceEntry: GraphicalVoiceEntry): boolean => voiceEntry.parentVoiceEntry.ParentVoice.VoiceId === voiceId)
            .flatMap((voiceEntry: GraphicalVoiceEntry): GraphicalNote[] => voiceEntry.notes);
    }

    /** The stem direction of the voice's first note on the upper staff, as drawn. */
    function firstStemDirection(voiceId: number): StemDirectionType {
        return notesOf(voiceId)[0].parentVoiceEntry.parentVoiceEntry.StemDirection;
    }

    /** The lyrics under the upper staff, in order. */
    function lyrics(): string[] {
        return staffEntries(0).flatMap((staffEntry: GraphicalStaffEntry): string[] =>
            staffEntry.LyricsEntries.map((lyric: GraphicalLyricEntry): string => lyric.LyricsEntry.Text));
    }

    /** The number of slurs drawn on the upper staff. */
    function slurCount(): number {
        return osmd.GraphicSheet.MusicPages.flatMap((page: GraphicalMusicPage): MusicSystem[] => page.MusicSystems)
            .map((system: MusicSystem): number => system.StaffLines.find((staffLine: StaffLine): boolean =>
                staffLine.ParentStaff === osmd.Sheet.Instruments[0].Staves[0])?.GraphicalSlurs.length ?? 0)
            .reduce((sum: number, count: number): number => sum + count, 0);
    }

    it("lays out the other voices as if the hidden voice weren't there: stems, spacing, accidentals, lyrics", (): void => {
        osmd.render();
        expect(firstStemDirection(alto), "premise: the alto's stems are down, as given, under the soprano").to.equal(StemDirectionType.Down);
        expect(staffEntries(0, 1).length, "premise: measure 2, the upper staff's notes start at 3 beats").to.equal(3);
        // measure 3: the alto's C sharp (after a rest) has no accidental of its own, the soprano's sharp before it applies
        expect(notesOf(alto, 2)[1].DrawnAccidental, "premise: the alto's C sharp without an accidental").to.equal(AccidentalEnum.NONE);
        expect(lyrics(), "premise: the lyrics").to.deep.equal(allLyrics);
        expect(slurCount(), "premise: the soprano's slur in measure 1").to.equal(1);

        voice(soprano).Visible = false;
        osmd.render(); // applies it without updateGraphic()
        expect(osmd.Drawer.Backends.length, "the sheet drawn: the instrument is shown").to.equal(1);
        expect(notesOf(soprano).length, "the soprano's notes laid out: the one at the chord symbol in measure 4 (see below)").to.equal(1);
        expect(slurCount(), "the soprano's slur").to.equal(0);
        expect(firstStemDirection(alto), "the alto's stems by pitch: up at G4").to.equal(StemDirectionType.Up);
        expect(notesOf(alto, 1)[0].parentVoiceEntry.parentVoiceEntry.StemDirection, "and down at C5").to.equal(StemDirectionType.Down);
        expect(staffEntries(0, 1).length, "measure 2: the alto's 2 half notes, not the soprano's quarter between them").to.equal(2);
        expect(notesOf(alto, 2)[1].DrawnAccidental, "the alto's C sharp with its sharp").to.equal(AccidentalEnum.SHARP);
        // under the alto, where it starts a note at the same time as the soprano and has no syllable of its own:
        //   not "ces" (the alto holds a note), nor "sing" (the alto rests), and "with" only once
        expect(lyrics(), "the soprano's lyrics under the alto").to.deep.equal(["Praise", "the", "Lord", "with", "voi", "high", "on", "now", "A", "men"]);
        // measure 4: only the soprano starts a note at beat 2, but with a chord symbol, which stays there
        const chordEntry: GraphicalStaffEntry = staffEntries(0, 3)[1];
        expect(chordEntry?.graphicalChordContainers.length, "measure 4, beat 2: the chord symbol").to.equal(1);
        expect(chordEntry.graphicalVoiceEntries.every((voiceEntry: GraphicalVoiceEntry): boolean =>
            voiceEntry.notes.every((note: GraphicalNote): boolean => !note.isVisible())), "its soprano note isn't drawn").to.equal(true);
    });

    it("keeps the full score's layout with EngravingRules.HiddenVoicesKeepLayout: the hidden notes keep their space", (): void => {
        osmd.EngravingRules.HiddenVoicesKeepLayout = true;
        voice(soprano).Visible = false;
        osmd.render();
        expect(notesOf(soprano).length, "the soprano's notes, laid out").to.equal(14);
        expect(notesOf(soprano).some((note: GraphicalNote): boolean => note.isVisible()), "a soprano note drawn").to.equal(false);
        // measure 1, beat 3: the soprano's first eighth (B4), in unison with the alto's quarter: it doesn't share the alto's head
        //   like a hidden note (print-object="no") would, which would draw its stem and beam from there
        expect(notesOf(soprano, 0)[2].sourceNote.sharesNoteheadWithVisibleUnisonNote(), "the hidden B4 shares the alto's head").to.equal(false);
        expect(slurCount(), "the soprano's slur").to.equal(0);
        expect(firstStemDirection(alto), "the alto's stems down, as given").to.equal(StemDirectionType.Down);
        expect(staffEntries(0, 1).length, "measure 2: the soprano's quarter keeps its place").to.equal(3);
        expect(notesOf(alto, 2)[1].DrawnAccidental, "the alto's C sharp with its sharp").to.equal(AccidentalEnum.SHARP);
        expect(lyrics(), "the soprano's lyrics at its hidden notes").to.deep.equal(allLyrics);

        osmd.EngravingRules.RenderLyricsOfHiddenVoices = false;
        osmd.updateGraphic();
        osmd.render();
        expect(lyrics(), "only the alto's lyrics, with RenderLyricsOfHiddenVoices false").to.deep.equal(["with"]);
    });

    it("shows a singer's part: the staff of hidden voices stays until Staff.Visible hides it; RenderLyricsOfHiddenVoices", (): void => {
        const instrument: Instrument = osmd.Sheet.Instruments[0];
        for (const voiceId of [soprano, 5, 6]) { // the alto alone
            voice(voiceId).Visible = false;
        }
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines.length, "both staves, the lower one empty").to.equal(2);
        expect(staffEntries(1).length, "the lower staff's notes").to.equal(0);
        instrument.Staves[1].Visible = false;
        osmd.render();
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines.length, "the alto's staff only").to.equal(1);
        expect(lyrics().length, "the lyrics under the alto").to.equal(10);

        osmd.EngravingRules.RenderLyricsOfHiddenVoices = false;
        osmd.updateGraphic();
        osmd.render();
        expect(lyrics(), "only the alto's own lyrics, with RenderLyricsOfHiddenVoices false").to.deep.equal(["with"]);
    });

    it("draws no tremolo strokes of hidden notes: of a hidden voice laid out with HiddenVoicesKeepLayout, or print-object=\"no\"", async (): Promise<void> => {
        /** One staff: voice 1 a tremolo between two half notes (3 strokes) and a buzz roll, voice 2 whole notes. */
        function tremoloSample(printObject: boolean): string {
            const hidden: string = printObject ? "" : ' print-object="no"';
            const note: (step: string, type: string, tremolo: string, duration: number) => string =
                (step: string, type: string, tremolo: string, duration: number): string =>
                    `<note${hidden}><pitch><step>${step}</step><octave>5</octave></pitch><duration>${duration}</duration><voice>1</voice>` +
                    `<type>${type}</type><notations><ornaments>${tremolo}</ornaments></notations></note>`;
            const voice2: string = "<backup><duration>4</duration></backup><note><pitch><step>G</step><octave>4</octave></pitch>" +
                "<duration>4</duration><voice>2</voice><type>whole</type></note>";
            return "<?xml version=\"1.0\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\"><part-name>P</part-name>" +
                "</score-part></part-list><part id=\"P1\"><measure number=\"1\"><attributes><divisions>1</divisions><time><beats>4</beats>" +
                "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
                note("C", "half", "<tremolo type=\"start\">3</tremolo>", 2) + note("E", "half", "<tremolo type=\"stop\">3</tremolo>", 2) +
                `${voice2}</measure><measure number="2">` + note("D", "whole", "<tremolo type=\"unmeasured\">0</tremolo>", 4) +
                `${voice2}</measure></part></score-partwise>`;
        }
        /** The strokes drawn by OSMD: between the two notes of a tremolo, and of a buzz roll. */
        const strokes: () => number = (): number => div.querySelectorAll("g.osmd-tremolo").length;

        osmd.EngravingRules.HiddenVoicesKeepLayout = true;
        await osmd.load(tremoloSample(true));
        osmd.render();
        expect(strokes(), "voice 1 shown: the 3 strokes between its notes and the buzz roll").to.equal(4);
        osmd.Sheet.Instruments[0].Voices[0].Visible = false;
        osmd.render();
        expect(strokes(), "voice 1 hidden").to.equal(0);

        await osmd.load(tremoloSample(false));
        osmd.render();
        expect(strokes(), "voice 1 print-object=\"no\"").to.equal(0);
        osmd.EngravingRules.RenderHiddenNotes = true;
        osmd.updateGraphic();
        osmd.render();
        expect(strokes(), "voice 1 print-object=\"no\", drawn with RenderHiddenNotes").to.equal(4);
    });

    it("hides the instrument only when all its voices are hidden, and render() creates the graphic again after a change", (): void => {
        const instrument: Instrument = osmd.Sheet.Instruments[0];
        osmd.render();
        voice(soprano).Visible = false;
        expect(instrument.Visible, "Instrument.Visible, the soprano hidden").to.equal(true);
        expect(osmd.Sheet.getVisibleInstruments().length, "visible instruments, the soprano hidden").to.equal(1);
        const graphic: GraphicalMusicSheet = osmd.GraphicSheet;
        osmd.render();
        expect(osmd.GraphicSheet !== graphic, "render() created the graphic again").to.equal(true);
        expect(notesOf(soprano).length, "the soprano's notes laid out, hidden: the one at the chord symbol").to.equal(1);
        voice(soprano).Visible = true;
        osmd.render();
        expect(notesOf(soprano).length, "the soprano's notes, shown again").to.equal(14);
        const graphicShown: GraphicalMusicSheet = osmd.GraphicSheet;
        osmd.render();
        expect(osmd.GraphicSheet === graphicShown, "nothing changed: render() kept the graphic").to.equal(true);

        for (const voiceId of [soprano, alto, 5, 6]) {
            voice(voiceId).Visible = false;
        }
        expect(instrument.Visible, "Instrument.Visible, all voices hidden").to.equal(false);
        osmd.render();
        expect(osmd.Drawer.Backends.length, "drawn pages, all voices hidden").to.equal(0);
        instrument.Visible = true;
        expect(instrument.Voices.every((v: Voice): boolean => v.Visible), "Instrument.Visible = true shows all voices").to.equal(true);
    });
});
