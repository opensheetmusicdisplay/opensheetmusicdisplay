import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";

/**
 * Words directions like "espress." become GraphicalUnknownExpressions. The AbstractGraphicalExpression constructor
 * registers them in their staff line's AbstractExpressions, and calculateMoodAndUnknownExpression() pushed them there
 * a second time, so the drawer drew every words label twice at the same position.
 */
describe("Words expressions (GraphicalUnknownExpression)", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("registers and draws each words label once", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_direction_several_direction_types.musicxml"));
        osmd.render();
        const words: string[] = ["espress.", "poco", "molto"];
        const registered: string[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions
            .filter(expression => expression instanceof GraphicalUnknownExpression)
            .map(expression => (expression as GraphicalUnknownExpression).Label.Label.text);
        expect(registered, "in the staff line's AbstractExpressions").to.deep.equal(words);
        const drawn: string[] = Array.from(container.querySelectorAll("text"))
            .map(text => text.textContent)
            .filter(text => words.includes(text));
        expect(drawn, "text elements in the SVG").to.deep.equal(words);
    });
});
