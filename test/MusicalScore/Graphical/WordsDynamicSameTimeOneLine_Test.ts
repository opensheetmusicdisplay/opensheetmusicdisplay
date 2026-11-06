import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Words and an instantaneous dynamic of the same staff, placement and time are drawn on one line, in the order of the file
 * ("più f", "p dolce"): the words next to the dynamic, which stays at its note (MusicSheetCalculator.placeWordsBesideSameTimeDynamic(),
 * EngravingRules.PlaceWordsBesideSameTimeDynamic). Checked on the PositionAndShape of the words' label and the dynamic,
 * relative to their staff line, against a render with the rule off, which places the words as before: under (over) the dynamic.
 */
describe("Words and a dynamic at the same time on one line", () => {
    const sample: string = "test_words_dynamic_same_time_one_line.musicxml";

    /** The words and the dynamic of a measure on their staff line, with the edges of their boxes relative to the staff line. */
    class Pair {
        public words: GraphicalUnknownExpression;
        public dynamic: GraphicalInstantaneousDynamicExpression;
        public staffLine: StaffLine;
        constructor(words: GraphicalUnknownExpression, dynamic: GraphicalInstantaneousDynamicExpression, staffLine: StaffLine) {
            this.words = words;
            this.dynamic = dynamic;
            this.staffLine = staffLine;
        }
        public get w(): BoundingBox { return this.words.Label.PositionAndShape; }
        public get d(): BoundingBox { return this.dynamic.PositionAndShape; }
        public get wordsLeft(): number { return this.w.RelativePosition.x + this.w.BorderMarginLeft; }
        public get wordsRight(): number { return this.w.RelativePosition.x + this.w.BorderMarginRight; }
        public get wordsTop(): number { return this.w.RelativePosition.y + this.w.BorderMarginTop; }
        public get wordsBottom(): number { return this.w.RelativePosition.y + this.w.BorderMarginBottom; }
        public get dynamicLeft(): number { return this.d.RelativePosition.x + this.d.BorderMarginLeft; }
        public get dynamicRight(): number { return this.d.RelativePosition.x + this.d.BorderMarginRight; }
        public get dynamicTop(): number { return this.d.RelativePosition.y + this.d.BorderMarginTop; }
        public get dynamicBottom(): number { return this.d.RelativePosition.y + this.d.BorderMarginBottom; }
        /** where the words' text has its baseline */
        public get wordsBaseline(): number {
            return this.w.RelativePosition.y + MusicSheetCalculator.labelBaselineOffset(this.words.Label);
        }
        public get dynamicBaseline(): number {
            return this.d.RelativePosition.y + this.dynamic.Label.PositionAndShape.RelativePosition.y +
                MusicSheetCalculator.labelBaselineOffset(this.dynamic.Label);
        }
    }

    const rendered: { container: HTMLElement, osmd: OpenSheetMusicDisplay }[] = [];
    async function render(file: string = sample, oneLine: boolean = true, width: number = 1600): Promise<OpenSheetMusicDisplay> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        rendered.push({ container, osmd });
        osmd.EngravingRules.PlaceWordsBesideSameTimeDynamic = oneLine;
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd;
    }
    afterEach(() => {
        for (const { container, osmd } of rendered.splice(0)) {
            osmd.clear();
            container.remove();
        }
    });

    /** The words containing text in the measure with the number, and the instantaneous dynamic of that measure on the words'
     *  staff line (the first one of the staff with the index, counted over all parts). */
    function pair(osmd: OpenSheetMusicDisplay, measureNumber: number, text: string, staffIndex: number = 0): Pair {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            const staffLine: StaffLine = system.StaffLines[staffIndex];
            const words: GraphicalUnknownExpression = staffLine.AbstractExpressions.find((e): boolean =>
                e instanceof GraphicalUnknownExpression && e.sourceMultiExpression?.SourceMeasureParent.MeasureNumber === measureNumber &&
                e.Label.Label.text.includes(text)) as GraphicalUnknownExpression;
            if (!words) {
                continue;
            }
            const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find((e): boolean =>
                e instanceof GraphicalInstantaneousDynamicExpression &&
                e.InstantaneousDynamic.ParentMultiExpression.SourceMeasureParent.MeasureNumber === measureNumber) as GraphicalInstantaneousDynamicExpression;
            return new Pair(words, dynamic, staffLine);
        }
        throw new Error(`no words "${text}" in measure ${measureNumber}`);
    }

    /** Checks that the words are on the dynamic's line, before it (touching its box) or after it, in the render with the rule on,
     *  and that the dynamic is where the render with the rule off (before) puts it. */
    function expectBeside(osmd: OpenSheetMusicDisplay, before: OpenSheetMusicDisplay, measureNumber: number, text: string, wordsFirst: boolean): void {
        const p: Pair = pair(osmd, measureNumber, text);
        const old: Pair = pair(before, measureNumber, text);
        const where: string = `m. ${measureNumber} "${text}"`;
        expect(p.wordsBaseline, `${where}: the words' baseline on the dynamic's`).to.be.closeTo(p.dynamicBaseline, 0.01);
        if (wordsFirst) {
            expect(p.wordsRight, `${where}: the words end at the dynamic`).to.be.closeTo(p.dynamicLeft, 0.01);
        } else {
            expect(p.wordsLeft, `${where}: the words start at the dynamic`).to.be.closeTo(p.dynamicRight, 0.01);
        }
        expect(p.d.RelativePosition.x, `${where}: the dynamic's x`).to.be.closeTo(old.d.RelativePosition.x, 0.01);
        // the rule off: the words under (over) the dynamic, as before
        expectStacked(old, `${where} with the rule off`);
    }

    /** Checks that the words are under (over) the dynamic: the texts (the boxes' borders without their margins) don't overlap. */
    function expectStacked(p: Pair, where: string): void {
        if (p.dynamic.Placement === PlacementEnum.Below) {
            expect(p.w.RelativePosition.y + p.w.BorderTop, `${where}: the words under the dynamic`)
                .to.be.at.least(p.d.RelativePosition.y + p.d.BorderBottom - 0.01);
        } else {
            expect(p.w.RelativePosition.y + p.w.BorderBottom, `${where}: the words over the dynamic`)
                .to.be.at.most(p.d.RelativePosition.y + p.d.BorderTop + 0.01);
        }
    }

    it("puts the words before the dynamic where they come first in the file: in two directions (m. 2), in the middle of a measure (m. 3), " +
       "above the staff (m. 7), and in one direction with an empty <words> and <sound dynamics> (m. 9, the Gounod sample's \"piu f\")",
       async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        expectBeside(osmd, before, 2, "dolce", true);
        expectBeside(osmd, before, 3, "sempre", true);
        expectBeside(osmd, before, 7, "poco", true);
        expectBeside(osmd, before, 9, "piu", true);
        expect(pair(osmd, 9, "piu").words.Label.Label.text.trim(), "the direction's empty words").to.equal("piu");
        const poco: Pair = pair(osmd, 7, "poco");
        expect(poco.wordsBottom, "m. 7: above the staff").to.be.at.most(0.01);
        // m. 3: the words reach to the left of the f in the middle of the measure, over the notes before it
        const sempre: Pair = pair(osmd, 3, "sempre");
        const measure: BoundingBox = sempre.staffLine.Measures[2].PositionAndShape;
        expect(sempre.wordsLeft, "m. 3: the words start in their measure").to.be.above(measure.RelativePosition.x + 1);
        expect(sempre.dynamicLeft, "m. 3: the f at its note, right of the measure's middle").to.be.above(measure.RelativePosition.x + measure.Size.width / 2);
    });

    it("puts the words after the dynamic where they come after it in the file: in one direction (m. 6), in two directions (m. 11), " +
       "and within a staff space of it by default-y (m. 15)", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        expectBeside(osmd, before, 6, "espress.", false);
        expectBeside(osmd, before, 11, "poco", false);
        expectBeside(osmd, before, 15, "dolce", false);
    });

    it("puts two words around one dynamic on its line in their order: \"sempre ff dolce\" (m. 13)", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        expectBeside(osmd, before, 13, "sempre", true);
        expectBeside(osmd, before, 13, "dolce", false);
        const sempre: Pair = pair(osmd, 13, "sempre");
        const dolce: Pair = pair(osmd, 13, "dolce");
        expect(sempre.dynamic, "the same ff").to.equal(dolce.dynamic);
        expect(sempre.wordsRight).to.be.below(dolce.wordsLeft);
    });

    it("reaches across the barline with words before a dynamic at the start of a measure (m. 2, 7)", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        for (const [measureNumber, text] of [[2, "dolce"], [7, "poco"]] as [number, string][]) {
            const p: Pair = pair(osmd, measureNumber, text);
            const measure: BoundingBox = p.staffLine.Measures[measureNumber - 1].PositionAndShape;
            expect(p.wordsLeft, `m. ${measureNumber}: the words start in the measure before`).to.be.below(measure.RelativePosition.x);
            expect(p.wordsRight, `m. ${measureNumber}: and end in their measure`).to.be.above(measure.RelativePosition.x);
            expect(p.dynamicLeft, `m. ${measureNumber}: the dynamic after the barline`).to.be.above(measure.RelativePosition.x);
        }
    });

    it("keeps the words under the dynamic where there's no room before it at the start of the staff (m. 1), as before", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        const p: Pair = pair(osmd, 1, "leggero e");
        const old: Pair = pair(before, 1, "leggero e");
        expect(p.w.RelativePosition.x).to.be.closeTo(old.w.RelativePosition.x, 0.01);
        expect(p.w.RelativePosition.y).to.be.closeTo(old.w.RelativePosition.y, 0.01);
        expect(p.d.RelativePosition.y).to.be.closeTo(old.d.RelativePosition.y, 0.01);
        expectStacked(p, "m. 1");
        // the same words in m. 2 of test_direction_words_with_sound_dynamics.musicxml, where there is room, go before the pp
        const sound: OpenSheetMusicDisplay = await render("test_direction_words_with_sound_dynamics.musicxml");
        const soundBefore: OpenSheetMusicDisplay = await render("test_direction_words_with_sound_dynamics.musicxml", false);
        expectBeside(sound, soundBefore, 2, "leggero e", true);
        expectBeside(sound, soundBefore, 3, "sempre", false); // "p sempre": the <words> after the <dynamics> in the direction
    });

    it("places words at another time (m. 4) and words of several lines (m. 12) as before", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        for (const [measureNumber, text] of [[4, "ten."], [12, "una"]] as [number, string][]) {
            const p: Pair = pair(osmd, measureNumber, text);
            const old: Pair = pair(before, measureNumber, text);
            expect(p.w.RelativePosition.x, `m. ${measureNumber}`).to.be.closeTo(old.w.RelativePosition.x, 0.01);
            expect(p.w.RelativePosition.y, `m. ${measureNumber}`).to.be.closeTo(old.w.RelativePosition.y, 0.01);
            expect(p.d.RelativePosition.y, `m. ${measureNumber}`).to.be.closeTo(old.d.RelativePosition.y, 0.01);
        }
        expectStacked(pair(osmd, 12, "una"), "m. 12");
        expectBeside(osmd, before, 5, "Solo", true); // an instrument cue goes on the line like other words: "Solo p"
    });

    it("keeps words that the file puts more than a staff space from the dynamic on their own line (m. 14, a fingering as words)", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        const p: Pair = pair(osmd, 14, "1");
        const old: Pair = pair(before, 14, "1");
        expect(p.dynamic.InstantaneousDynamic.YPositionXml, "the f's default-y plus relative-y").to.equal(-80);
        expect(p.words.sourceMultiExpression.UnknownList[0].YPositionXml, "the words' default-y plus relative-y").to.equal(-103);
        expect(p.w.RelativePosition.x).to.be.closeTo(old.w.RelativePosition.x, 0.01);
        expect(p.w.RelativePosition.y).to.be.closeTo(old.w.RelativePosition.y, 0.01);
        expectStacked(p, "m. 14");
        // within a staff space (m. 15, -70 and -75), they go on one line
        const dolce: Pair = pair(osmd, 15, "dolce");
        expect(dolce.dynamic.InstantaneousDynamic.YPositionXml).to.equal(-70);
        expect(dolce.words.sourceMultiExpression.MoodList[0].YPositionXml).to.equal(-75);
        expect(dolce.wordsBaseline).to.be.closeTo(dolce.dynamicBaseline, 0.01);
        expect(pair(osmd, 2, "dolce").words.sourceMultiExpression.MoodList[0].YPositionXml, "no default-y").to.equal(undefined);
    });

    it("moves the words and the dynamic away from the staff together where the words would run into the notes (m. 8)", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(sample, false);
        expectBeside(osmd, before, 8, "dolce", false);
        const p: Pair = pair(osmd, 8, "dolce");
        const old: Pair = pair(before, 8, "dolce");
        expect(p.d.RelativePosition.y, "the p lower than without the words").to.be.above(old.d.RelativePosition.y + 0.5);
        // the words clear the heads of the low notes under them (stems up; a head is a unit high, centered on its position)
        const staffLineBox: BoundingBox = p.staffLine.PositionAndShape;
        let headsUnderWords: number = 0;
        for (const staffEntry of p.staffLine.Measures[7].staffEntries as GraphicalStaffEntry[]) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries as GraphicalVoiceEntry[]) {
                for (const note of voiceEntry.notes as GraphicalNote[]) {
                    const x: number = note.PositionAndShape.AbsolutePosition.x - staffLineBox.AbsolutePosition.x;
                    const headBottom: number = note.PositionAndShape.AbsolutePosition.y - staffLineBox.AbsolutePosition.y + 0.5;
                    if (note.sourceNote.isRest() || x < p.wordsLeft || x > p.wordsRight) {
                        continue;
                    }
                    headsUnderWords++;
                    expect(headBottom, "the fixture: a note below the staff under the words").to.be.above(4);
                    expect(p.wordsTop, `the words under the head at x ${x.toFixed(1)}`).to.be.at.least(headBottom - 0.05);
                }
            }
        }
        expect(headsUnderWords, "the fixture: notes under the words").to.be.at.least(2);
    });

    it("draws the words' text on the dynamic's baseline (SVG text y) and the rule off as before", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const texts: SVGTextElement[] = Array.from(osmd.Drawer.Backends[0].getInnerElement().querySelectorAll("text"));
        const piu: SVGTextElement = texts.find((t): boolean => t.textContent === "piu");
        const piuX: number = Number(piu.getAttribute("x"));
        // the f right after "piu": the nearest f to its right
        const f: SVGTextElement = texts.filter((t): boolean => t.textContent === "f" && Number(t.getAttribute("x")) > piuX)
            .sort((a, b): number => Number(a.getAttribute("x")) - Number(b.getAttribute("x")))[0];
        expect(Number(piu.getAttribute("y")), "piu on the f's baseline").to.be.closeTo(Number(f.getAttribute("y")), 1);
        expect(Number(f.getAttribute("x")) - piuX, "the f right after piu").to.be.below(60);
        const before: OpenSheetMusicDisplay = await render(sample, false);
        const oldTexts: SVGTextElement[] = Array.from(before.Drawer.Backends[0].getInnerElement().querySelectorAll("text"));
        const oldPiu: SVGTextElement = oldTexts.find((t): boolean => t.textContent === "piu");
        const oldF: SVGTextElement = oldTexts.filter((t): boolean => t.textContent === "f" &&
            Math.abs(Number(t.getAttribute("x")) - Number(oldPiu.getAttribute("x"))) < 60)
            .sort((a, b): number => Number(a.getAttribute("y")) - Number(b.getAttribute("y")))[0];
        expect(Number(oldPiu.getAttribute("y")), "with the rule off, piu under the f").to.be.above(Number(oldF.getAttribute("y")) + 10);
    });

    it("draws \"piu f\" in CharlesGounod_Meditation.xml m. 33 (violin) and m. 66 (piano), the words of a direction with <sound dynamics>",
       async () => {
        const osmd: OpenSheetMusicDisplay = await render("CharlesGounod_Meditation.xml", true, 1200);
        for (const [measureNumber, staffIndex] of [[33, 0], [66, 5]] as [number, number][]) {
            const p: Pair = pair(osmd, measureNumber, "piu", staffIndex);
            expect(p.words.Label.Label.text.trim(), `m. ${measureNumber}`).to.equal("piu"); // "piu" + the empty words
            expect(p.dynamic.Label.Label.text, `m. ${measureNumber}`).to.equal("f");
            expect(p.wordsBaseline, `m. ${measureNumber}`).to.be.closeTo(p.dynamicBaseline, 0.01);
            expect(p.wordsRight, `m. ${measureNumber}`).to.be.closeTo(p.dynamicLeft, 0.01);
        }
    });
});
