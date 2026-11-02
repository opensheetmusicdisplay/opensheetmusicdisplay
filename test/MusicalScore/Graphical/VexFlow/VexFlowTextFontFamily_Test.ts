import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * VexFlow draws some texts in fonts of its own (e.g. rehearsal marks in bold sans-serif), which DefaultFontFamily doesn't change.
 * VexFlowTextFontFamily sets their family. Here it is a wide font in a list, as an app may give it with a fallback.
 */
describe("VexFlowTextFontFamily", (): void => {
    const family: string = "Courier New, monospace";
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.EngravingRules.VexFlowTextFontFamily = family;
    });
    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    function texts(): SVGTextElement[] {
        return Array.from(div.querySelectorAll("text"));
    }

    function text(content: string): SVGTextElement {
        const matches: SVGTextElement[] = texts().filter((element: SVGTextElement): boolean => element.textContent === content);
        expect(matches, content).to.have.length(1);
        return matches[0];
    }

    it("draws the texts VexFlow renders in fonts of its own in that family", async (): Promise<void> => {
        osmd.EngravingRules.DefaultFontFamily = family; // so that every text on the page is in that family
        // VexFlow draws fingerings placed left of the notes, and those placed above or below them as string numbers
        osmd.EngravingRules.FingeringPosition = PlacementEnum.Left;
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true; // for the system breaks of the last sample
        const samples: [string, string[]][] = [
            ["test_rehearsal_marks_simple_one_measure.musicxml", ["A"]], // rehearsal mark
            ["test_repeat_da_capo_in_second_ending.musicxml", ["2", "D.C."]], // ending, repetition instruction
            ["test_metronome_beside_tempo_text.musicxml", [" = 88"]], // metronome mark
            ["test_octaveshift_stop_missing_1696.musicxml", ["8", "va"]], // octave shift
            ["test_fingering_Simple_Chords_Treble_Bass.musicxml", ["1", "5"]], // fingerings left and above/below
            ["test_grace_note_modifiers_once.musicxml", ["II"]], // string number
            ["OSMD_Function_Test_Tablature_Alleffects.musicxml", ["5", "2", "H", "sl."]], // tab fret number, two-tone bend, hammer-on, slide
            ["test_tab_hammer-on_pull-off_tie_across_system_breaks.musicxml", ["H", "P"]], // hammer-on, pull-off across a system break
        ];
        for (const [sample, vexFlowTexts] of samples) {
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
            expect(texts().map((element: SVGTextElement): string => element.textContent), sample).to.include.members(vexFlowTexts);
            for (const element of texts()) {
                expect(element.getAttribute("font-family"), `${sample}: ${element.textContent}`).to.equal(family);
            }
        }
    });

    it("reserves space for these texts by their width in that family", async (): Promise<void> => {
        // "D.C. al" closely follows "To" with its coda sign. In the wide family, the two collide,
        //   so "D.C. al" is placed above, as colliding repetition instructions are (#1689).
        await osmd.load(TestUtils.getScore("test_repeat_da_capo_al_coda_after_repeat.musicxml"));
        osmd.render();
        expect(Number(text("D.C. al").getAttribute("y"))).to.be.lessThan(Number(text("To").getAttribute("y")));
        // a custom ITextMeasurer without the optional computeTextWidthInCssFont() (load() sets OSMD's own again)
        osmd.EngravingRules.TextMeasurer.computeTextWidthInCssFont = undefined;
        expect((): void => osmd.render()).not.to.throw();

        // A bend reserves its text width plus 3px, with the text in the middle (VexFlow's Bend.updateWidth()),
        //   so the texts of two consecutive bends are 3px apart. Compared by the text advance, which is what is measured.
        // Use two labelled upward segments: releases are intentionally unlabelled.
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>1</divisions>
            <time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef>
            <staff-details><staff-lines>6</staff-lines></staff-details></attributes>
            <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>whole</type>
            <notations><technical><string>4</string><fret>2</fret>
            <bend><bend-alter>3</bend-alter></bend><bend><bend-alter>1</bend-alter></bend>
            </technical></notations></note></measure></part></score-partwise>`);
        osmd.render();
        const first: SVGTextElement = text("1 1/2");
        const gap: number = Number(text("1/2").getAttribute("x")) - Number(first.getAttribute("x")) - first.getComputedTextLength();
        expect(gap).to.be.closeTo(3, 0.2);
    });
});
