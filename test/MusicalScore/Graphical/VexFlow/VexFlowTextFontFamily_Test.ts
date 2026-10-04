import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { MusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";
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
            ["OSMD_Function_Test_Tablature_Alleffects.musicxml", ["5", "Full", "H", "sl."]], // tab fret number, bend, hammer-on, slide
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
        MusicSheetCalculator.TextMeasurer.computeTextWidthInCssFont = undefined;
        expect((): void => osmd.render()).not.to.throw();

        // A bend reserves its text width plus 3px, with the text in the middle (VexFlow's Bend.updateWidth()),
        //   so the texts of two consecutive bends are 3px apart. Compared by the text advance, which is what is measured.
        await osmd.load(TestUtils.getScore("OSMD_Function_Test_Tablature_Multibends.musicxml"));
        osmd.render();
        const full: SVGTextElement = text("Full");
        const gap: number = Number(text("1/4").getAttribute("x")) - Number(full.getAttribute("x")) - full.getComputedTextLength();
        expect(gap).to.be.closeTo(3, 0.2);
    });
});
