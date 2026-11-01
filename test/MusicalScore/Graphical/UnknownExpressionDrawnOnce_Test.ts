import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";

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
        const words: string[] = ["espress.", "poco", "molto", "mit Ausdruck"];
        const registered: string[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions
            .filter(expression => expression instanceof GraphicalUnknownExpression)
            .map(expression => (expression as GraphicalUnknownExpression).Label.Label.text);
        expect(registered, "in the staff line's AbstractExpressions").to.deep.equal(words);
        const drawn: string[] = Array.from(container.querySelectorAll("text"))
            .map(text => text.textContent)
            .filter(text => words.includes(text));
        expect(drawn, "text elements in the SVG").to.deep.equal(words);
    });

    // A verbal crescendo ("cresc.", a ContinuousDynamicExpression) at the same position as words shares their MultiExpression.
    //   The words label joined the labels of all its entries, so it included the "cresc.": next to mood words like "dolce",
    //   the "cresc." was drawn twice, next to other words not as a dynamic at all. The words label also took the placement
    //   and font of the first entry, the "cresc." if it came first.
    it("draws a verbal crescendo at the position of words once, as a dynamic of its own", async () => {
        const dolce: string = '<direction placement="above"><direction-type><words>dolce</words></direction-type></direction>';
        const stringendo: string = '<direction placement="above"><direction-type><words font-weight="bold">stringendo il tempo</words>' +
            "</direction-type></direction>";
        const cresc: string = '<direction placement="below"><direction-type><words font-style="italic">cresc.</words></direction-type></direction>';
        const note: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(`<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="4.0">
              <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  ${dolce}${cresc}${note}
                </measure>
                <measure number="2">${cresc}${stringendo}${note}</measure>
              </part>
            </score-partwise>`);
        osmd.render();
        const expressions: AbstractGraphicalExpression[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions;
        const words: string[] = expressions.filter(expression => expression instanceof GraphicalUnknownExpression)
            .map(expression => `${expression.Label.Label.text} ${PlacementEnum[expression.Placement]} ` +
                FontStyles[expression.Label.Label.fontStyle]);
        expect(words, "words labels").to.deep.equal(["dolce Above Italic", "stringendo il tempo Above Bold"]);
        const dynamics: string[] = expressions.filter(expression => expression instanceof GraphicalContinuousDynamicExpression)
            .map(expression => `${expression.Label.Label.text} ${PlacementEnum[expression.Placement]}`);
        expect(dynamics, "verbal dynamics").to.deep.equal(["cresc. Below", "cresc. Below"]);
        const drawn: string[] = Array.from(container.querySelectorAll("text"))
            .map(text => text.textContent)
            .filter(text => text.includes("cresc."));
        expect(drawn, "text elements in the SVG").to.deep.equal(["cresc.", "cresc."]);
    });
});
