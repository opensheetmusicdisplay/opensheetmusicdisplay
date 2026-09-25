import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousTempoExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousTempoExpression";

/**
 * When drawing starts after measure 1 (drawFromMeasureNumber), the tempo markings of the drawn measures are rendered,
 * and the space reserved above the first staff line for a metronome mark keeps the lyricist clear of the mark.
 */
describe("Tempo expressions when drawing starts after measure 1 (drawFromMeasureNumber)", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_drawFromMeasureNumber_2_tempo_markings.musicxml"));
        osmd.setOptions({ drawFromMeasureNumber: 2 });
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("draws the tempo text and metronome mark of the first drawn measure", () => {
        const tempoTexts: string[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions
            .filter(expression => expression instanceof GraphicalInstantaneousTempoExpression)
            .map(expression => (expression as GraphicalInstantaneousTempoExpression).GraphicalLabel.Label.text)
            .filter(text => text !== ""); // a metronome mark has an empty label, Vexflow draws the mark on the stave
        expect(tempoTexts).to.deep.equal(["Meno mosso"]);
        const measure2Staves: any[] = osmd.GraphicSheet.MeasureList[1];
        expect(measure2Staves.filter(measure => measure.hasMetronomeMark).length, "metronome marks in measure 2").to.equal(1);
    });

    it("keeps the lyricist above the metronome mark", () => {
        const metronomeMark: Element = container.querySelector(".vf-stavetempo");
        expect(metronomeMark, "the metronome mark is drawn").to.not.equal(null);
        const lyricist: Element = Array.from(container.querySelectorAll("text"))
            .find(text => text.textContent === "Lyricist with a long name");
        expect(metronomeMark.getBoundingClientRect().top).to.be.at.least(lyricist.getBoundingClientRect().bottom);
    });
});
