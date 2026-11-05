import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { TestUtils } from "../../Util/TestUtils";

describe("SourceMeasure", (): void => {
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

    it("finds the previous and the next measure by its index in SourceMeasures", async (): Promise<void> => {
        // three measures of a whole note in 4/4. getPreviousMeasure() returned undefined for the second measure.
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const measures: string = [1, 2, 3].map((number: number): string => `<measure number="${number}">${number === 1 ? attributes : ""}` +
            "<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>").join("");
        await osmd.load("<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name></part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`);
        const sourceMeasures: SourceMeasure[] = osmd.Sheet.SourceMeasures;
        const indexOf: (measure: SourceMeasure) => number = (measure: SourceMeasure): number =>
            measure ? sourceMeasures.indexOf(measure) : undefined;
        expect(sourceMeasures.map(measure => indexOf(measure.getPreviousMeasure(sourceMeasures))), "previous measures")
            .to.deep.equal([undefined, 0, 1]);
        expect(sourceMeasures.map(measure => indexOf(measure.getNextMeasure(sourceMeasures))), "next measures")
            .to.deep.equal([1, 2, undefined]);
    });
});
