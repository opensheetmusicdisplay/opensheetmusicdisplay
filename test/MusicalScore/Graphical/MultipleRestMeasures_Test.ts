import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";

/**
 * test_multiple_rest_measures_auto_key_time_change.musicxml: measures 2-6 are whole-measure rests, measure 2 starts with D major,
 * measure 3 with E major and measure 5 with 3/4. A multiple rest measure only shows the key and time signature of its first measure,
 * so measure 2 stays a single rest measure, and measures 3-4 and 5-6 become multiple rest measures (instead of one for measures 2-6).
 */
describe("Multiple rest measures", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1300px"; // one system, so no courtesy key or time signature is drawn at the end of a system
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("begins a new multiple rest measure at a key or time change, and draws the key and time signature there", async () => {
        await osmd.load(TestUtils.getScore("test_multiple_rest_measures_auto_key_time_change.musicxml"));
        osmd.render();
        const restMeasureCounts: number[] = osmd.Sheet.SourceMeasures.map(measure => measure.multipleRestMeasures ?? 0);
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-7").to.deep.equal([0, 0, 2, 0, 2, 0, 0]);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(1);
        // [measure number, number of accidentals] of the key signatures drawn (none for C major); the group of a measure has its number as id
        const keySignatures: [string, number][] = Array.from(container.querySelectorAll(".vf-keysignature"))
            .map((key): [string, number] => [key.closest(".vf-measure").id, key.querySelectorAll("path").length]);
        expect(keySignatures, "D major in measure 2, E major in measure 3").to.deep.equal([["2", 2], ["3", 4]]);
        // the measure numbers of the time signatures drawn, without the numbers of the multiple rest measures, drawn like time signatures
        const timeSignatures: string[] = Array.from(container.querySelectorAll(".vf-timesignature"))
            .filter(time => !time.closest(".vf-multirest")).map(time => time.closest(".vf-measure").id);
        expect(timeSignatures, "4/4 in measure 1, 3/4 in measure 5").to.deep.equal(["1", "5"]);
        expect(osmd.GraphicSheet.findGraphicalMeasure(3, 0)).to.equal(osmd.GraphicSheet.MeasureList[2][0]);
        expect(osmd.GraphicSheet.findGraphicalMeasure(5, 0)).to.equal(osmd.GraphicSheet.MeasureList[4][0]);
    });

    it("resolves explicit rest members to their representative measure and preserves fallback lookups", async () => {
        await osmd.load(TestUtils.getScore("OSMD_function_test_multiple_rest_measures.musicxml"));
        const graphic: GraphicalMusicSheet = osmd.GraphicSheet;
        const measures: GraphicalMeasure[][] = graphic.MeasureList;
        const staffCount: number = graphic.NumberOfStaves;
        // Measures 19-23 form a five-measure rest in all four staves.
        const restStart: number = 18;
        const restLength: number = 5;
        expect(staffCount).to.equal(4);
        expect(osmd.Sheet.SourceMeasures[restStart].multipleRestMeasures).to.equal(restLength);
        expect(measures[restStart].filter(Boolean)).to.have.length(staffCount);
        for (let index: number = restStart; index < restStart + restLength; index++) {
            for (let staff: number = 0; staff < staffCount; staff++) {
                expect(graphic.findGraphicalMeasure(index, staff), `measure ${index + 1}, staff ${staff}`).to.equal(measures[restStart][staff]);
            }
        }
        for (let staff: number = 0; staff < staffCount; staff++) {
            expect(graphic.findGraphicalMeasure(restStart - 1, staff)).to.equal(measures[restStart - 1][staff]);
            expect(graphic.findGraphicalMeasure(restStart + restLength, staff)).to.equal(measures[restStart + restLength][staff]);
            expect(graphic.findGraphicalMeasure(measures.length, staff)).to.equal(measures[24][staff]);
        }
        expect(graphic.findGraphicalMeasure(-1, 0)).to.equal(undefined);
        expect(graphic.findGraphicalMeasure(22, staffCount)).to.equal(undefined);
    });

    /** Per measure: how many measures the multiple rest measure it begins has (0 for none). */
    function multipleRestMeasureCounts(): number[] {
        return osmd.Sheet.SourceMeasures.map(measure => measure.multipleRestMeasures ?? 0);
    }

    it("draws the measures of generated multiple rest measures again when updateGraphic() follows turning off " +
        "RenderMultipleRestMeasures or the generation", async () => {
        await osmd.load(TestUtils.getScore("test_multiple_rest_measures_auto_key_time_change.musicxml"));
        osmd.render();
        /** The numbers of the measures drawn, a multiple rest measure counting as its first measure (a measure's group has its number as id). */
        const drawnMeasures: () => string[] = () => Array.from(container.querySelectorAll(".vf-measure")).map(measure => measure.id);
        expect(drawnMeasures(), "measures 3-4 and 5-6 as multiple rest measures").to.deep.equal(["1", "2", "3", "5", "7"]);
        // The source measures still had the multiple rest measures of the previous calculation: measures 4 and 6 got no graphical
        //   measures, and updateGraphic() threw a TypeError.
        osmd.EngravingRules.RenderMultipleRestMeasures = false;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "RenderMultipleRestMeasures false").to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
        expect(drawnMeasures(), "RenderMultipleRestMeasures false").to.deep.equal(["1", "2", "3", "4", "5", "6", "7"]);
        osmd.EngravingRules.RenderMultipleRestMeasures = true;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "RenderMultipleRestMeasures true again").to.deep.equal([0, 0, 2, 0, 2, 0, 0]);
        // The generated multiple rest measures were kept, drawn like ones given in the MusicXML.
        osmd.setOptions({ autoGenerateMultipleRestMeasuresFromRestMeasures: false });
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "autoGenerateMultipleRestMeasuresFromRestMeasures false").to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
        expect(drawnMeasures(), "autoGenerateMultipleRestMeasuresFromRestMeasures false").to.deep.equal(["1", "2", "3", "4", "5", "6", "7"]);
    });

    it("generates the multiple rest measures again when updateGraphic() follows hiding or showing an instrument", async () => {
        const note: string = "<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>";
        const rest: string = "<note><rest/><duration>4</duration></note>";
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        /** A part with one measure of 4/4 per content. */
        function part(id: string, contents: string[]): string {
            return `<part id="${id}">` + contents.map((content, index) =>
                `<measure number="${index + 1}">${index === 0 ? attributes : ""}${content}</measure>`).join("") + "</part>";
        }
        // the flute plays in measures 1-5, the violin rests in measures 2-4
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0"><part-list>
            <score-part id="P1"><part-name>Flute</part-name></score-part><score-part id="P2"><part-name>Violin</part-name></score-part>
            </part-list>${part("P1", [note, note, note, note, note])}${part("P2", [note, rest, rest, rest, note])}</score-partwise>`);
        osmd.render();
        expect(multipleRestMeasureCounts(), "both instruments shown").to.deep.equal([0, 0, 0, 0, 0]);
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "flute hidden: the violin's measures 2-4 as a multiple rest measure").to.deep.equal([0, 3, 0, 0, 0]);
        osmd.Sheet.Instruments[0].Visible = true;
        osmd.updateGraphic();
        osmd.render();
        // The multiple rest measure was kept, so the flute's notes in measures 2-4 were missing.
        expect(multipleRestMeasureCounts(), "flute shown again").to.deep.equal([0, 0, 0, 0, 0]);
        expect(container.querySelectorAll(".vf-multirest").length, "multiple rest measures drawn").to.equal(0);
    });

    it("draws the clef change after a multiple rest measure at its end, or at the end of its last measure without " +
        "RenderMultipleRestMeasures, also when updateGraphic() follows changing the rule, and the notes after it in that clef", async () => {
        /** [measure number, number of clefs drawn] per drawn measure, a multiple rest measure counting as its first measure */
        const clefsPerMeasure: () => [string, number][] = () => Array.from(container.querySelectorAll(".vf-measure"))
            .map((measure): [string, number] => [measure.id, measure.querySelectorAll(".vf-clef").length]);
        /** the clef that measure 3 begins with, and the clef its note is drawn in */
        function measure3Clefs(): ClefEnum[] {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
            const note: VexFlowGraphicalNote = measure.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            return [measure.InitiallyActiveClef.ClefType, note.Clef().ClefType];
        }
        const multipleRest: [string, number][] = [["1", 2], ["3", 0]]; // the treble clef at its start, the bass clef at its end
        const singleMeasures: [string, number][] = [["1", 1], ["2", 1], ["3", 0]]; // the bass clef at the end of measure 2
        // Measures 1-2: <multiple-rest>2</multiple-rest> in the treble clef, measure 3 begins with the bass clef.
        //   The reader put the clef change at the end of measure 1 if RenderMultipleRestMeasures was true when loading,
        //   else at the end of measure 2, and the drawing kept it there after a change of the rule.
        const score: Document = TestUtils.getScore("test_multiple_rest_measures_end_instruction_clef_margin.musicxml");
        await osmd.load(score);
        osmd.render();
        expect(clefsPerMeasure(), "multiple rest measure").to.deep.equal(multipleRest);
        expect(measure3Clefs(), "multiple rest measure").to.deep.equal([ClefEnum.F, ClefEnum.F]);
        osmd.EngravingRules.RenderMultipleRestMeasures = false;
        osmd.updateGraphic();
        osmd.render();
        // the bass clef was drawn at the end of measure 1, so that measure 2 began with it
        expect(clefsPerMeasure(), "RenderMultipleRestMeasures true -> false").to.deep.equal(singleMeasures);
        await osmd.load(score); // RenderMultipleRestMeasures still false
        osmd.render();
        expect(clefsPerMeasure(), "RenderMultipleRestMeasures false").to.deep.equal(singleMeasures);
        osmd.EngravingRules.RenderMultipleRestMeasures = true;
        osmd.updateGraphic();
        osmd.render();
        // the bass clef wasn't drawn, and measure 3 began with the treble clef, its note drawn in it (below the staff)
        expect(clefsPerMeasure(), "RenderMultipleRestMeasures false -> true").to.deep.equal(multipleRest);
        expect(measure3Clefs(), "RenderMultipleRestMeasures false -> true").to.deep.equal([ClefEnum.F, ClefEnum.F]);
    });
});
