import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { SystemLinePosition } from "../../../src/MusicalScore/Graphical/SystemLinePosition";
import { SystemLinesEnum } from "../../../src/MusicalScore/Graphical/SystemLinesEnum";

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

    /** Per measure: how many measures the multiple rest measure it begins has (0 for none). */
    function multipleRestMeasureCounts(): number[] {
        return osmd.Sheet.SourceMeasures.map(measure => measure.multipleRestMeasures ?? 0);
    }

    /** Loads and renders the sample, and returns per measure how many measures the multiple rest measure it begins has (0 for none). */
    async function renderSample(sampleName: string): Promise<number[]> {
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        return multipleRestMeasureCounts();
    }

    /**
     * test_multiple_rest_measures_auto_key_time_change.musicxml: measures 2-6 are whole-measure rests, measure 2 starts with D major,
     * measure 3 with E major and measure 5 with 3/4. A multiple rest measure only shows the key and time signature of its first measure,
     * so measure 2 stays a single rest measure, and measures 3-4 and 5-6 become multiple rest measures (instead of one for measures 2-6).
     */
    it("begins a new multiple rest measure at a key or time change, and draws the key and time signature there", async () => {
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_key_time_change.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-7").to.deep.equal([0, 0, 2, 0, 2, 0, 0]);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(1);
        // [measure group id, number of accidentals] of the key signatures drawn (none for C major); the group of a measure has the id
        //   osmd-m<measure index>-<staff index>
        const keySignatures: [string, number][] = Array.from(container.querySelectorAll(".vf-keysignature"))
            .map((key): [string, number] => [key.closest(".vf-measure").id, key.querySelectorAll("path").length]);
        expect(keySignatures, "D major in measure 2, E major in measure 3").to.deep.equal([["osmd-m1-0", 2], ["osmd-m2-0", 4]]);
        // the measure groups of the time signatures drawn, without the numbers of the multiple rest measures, drawn like time signatures
        const timeSignatures: string[] = Array.from(container.querySelectorAll(".vf-timesignature"))
            .filter(time => !time.closest(".vf-multirest")).map(time => time.closest(".vf-measure").id);
        expect(timeSignatures, "4/4 in measure 1, 3/4 in measure 5").to.deep.equal(["osmd-m0-0", "osmd-m4-0"]);
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

    it("draws the measure that a <multiple-rest> begins as wide as the other rest measures " +
        "when RenderMultipleRestMeasures is false", async () => {
        const note: string = "<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>";
        const rest: string = "<note><rest measure=\"yes\"/><duration>4</duration></note>";
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const multipleRest: string = "<attributes><measure-style><multiple-rest>2</multiple-rest></measure-style></attributes>";
        // measures 2-3: <multiple-rest>2</multiple-rest>
        const contents: string[] = [attributes + note, multipleRest + rest, rest, note];
        osmd.EngravingRules.RenderMultipleRestMeasures = false;
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0"><part-list>
            <score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">` +
            contents.map((content, index) => `<measure number="${index + 1}">${content}</measure>`).join("") + "</part></score-partwise>");
        osmd.render();
        const widths: number[] = osmd.GraphicSheet.MeasureList.map(staves => staves[0].PositionAndShape.Size.width);
        // measure 2 got the width of a multiple rest measure (MultipleRestMeasureDefaultWidth), less than its rest needs
        expect(widths[1], "measure 2").to.equal(widths[2]);
    });

    it("draws the measures of generated multiple rest measures again when updateGraphic() follows turning off " +
        "RenderMultipleRestMeasures or the generation", async () => {
        await osmd.load(TestUtils.getScore("test_multiple_rest_measures_auto_key_time_change.musicxml"));
        osmd.render();
        /** The ids of the measure groups drawn (osmd-m<measure index>-<staff index>), a multiple rest measure has its first measure's. */
        const drawnMeasures: () => string[] = () => Array.from(container.querySelectorAll(".vf-measure")).map(measure => measure.id);
        /** measures 1-7 */
        const allMeasures: string[] = ["osmd-m0-0", "osmd-m1-0", "osmd-m2-0", "osmd-m3-0", "osmd-m4-0", "osmd-m5-0", "osmd-m6-0"];
        expect(drawnMeasures(), "measures 3-4 and 5-6 as multiple rest measures")
            .to.deep.equal(["osmd-m0-0", "osmd-m1-0", "osmd-m2-0", "osmd-m4-0", "osmd-m6-0"]);
        // The source measures still had the multiple rest measures of the previous calculation: measures 4 and 6 got no graphical
        //   measures, and updateGraphic() threw a TypeError.
        osmd.EngravingRules.RenderMultipleRestMeasures = false;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "RenderMultipleRestMeasures false").to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
        expect(drawnMeasures(), "RenderMultipleRestMeasures false").to.deep.equal(allMeasures);
        osmd.EngravingRules.RenderMultipleRestMeasures = true;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "RenderMultipleRestMeasures true again").to.deep.equal([0, 0, 2, 0, 2, 0, 0]);
        // The generated multiple rest measures were kept, drawn like ones given in the MusicXML.
        osmd.setOptions({ autoGenerateMultipleRestMeasuresFromRestMeasures: false });
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "autoGenerateMultipleRestMeasuresFromRestMeasures false").to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
        expect(drawnMeasures(), "autoGenerateMultipleRestMeasuresFromRestMeasures false").to.deep.equal(allMeasures);
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
        /** [measure group id, number of clefs drawn] per drawn measure, a multiple rest measure has its first measure's id */
        const clefsPerMeasure: () => [string, number][] = () => Array.from(container.querySelectorAll(".vf-measure"))
            .map((measure): [string, number] => [measure.id, measure.querySelectorAll(".vf-clef").length]);
        /** the clef that measure 3 begins with, and the clef its note is drawn in */
        function measure3Clefs(): ClefEnum[] {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
            const note: VexFlowGraphicalNote = measure.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            return [measure.InitiallyActiveClef.ClefType, note.Clef().ClefType];
        }
        const multipleRest: [string, number][] = [["osmd-m0-0", 2], ["osmd-m2-0", 0]]; // the treble clef at its start, the bass clef at its end
        const singleMeasures: [string, number][] = [["osmd-m0-0", 1], ["osmd-m1-0", 1], ["osmd-m2-0", 0]]; // the bass clef at the end of measure 2
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

    /**
     * test_multiple_rest_measures_auto_clef_change.musicxml: measures 2-7 are whole-measure rests in both parts, and the violoncello
     * changes to the tenor clef at measure 6 and to the treble clef at measure 8. A multiple rest measure draws the clef change after
     * its last measure at its end, before the barline, so measures 2-5 and 6-7 become multiple rest measures.
     * Before, a rest measure before a clef change stayed a single rest measure: measures 2-4, 5, 6 and 7.
     */
    it("ends a generated multiple rest measure with the measure before a clef change, and draws the clef at its end", async () => {
        await osmd.load(TestUtils.getScore("test_multiple_rest_measures_auto_clef_change.musicxml"));
        osmd.render();
        expect(multipleRestMeasureCounts(), "measures per multiple rest measure, for measures 1-8").to.deep.equal([0, 4, 0, 0, 0, 2, 0, 0]);

        // the violoncello alone, so that each measure drawn is one of its measures
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.updateGraphic();
        osmd.render();
        // [measure group id, number of clefs drawn] per drawn measure, a multiple rest measure has its first measure's id
        //   (staff index 1: the hidden flute's staff keeps index 0)
        const clefsPerMeasure: [string, number][] = Array.from(container.querySelectorAll(".vf-measure"))
            .map((measure): [string, number] => [measure.id, measure.querySelectorAll(".vf-clef").length]);
        expect(clefsPerMeasure, "the bass clef at the start, the tenor and the treble clef at the ends of the multiple rest measures")
            .to.deep.equal([["osmd-m0-1", 1], ["osmd-m1-1", 1], ["osmd-m5-1", 1], ["osmd-m7-1", 0]]);
        // the clef that measure 8 begins with (drawn there at a system start), and the clef its note is drawn in
        const measure8: GraphicalMeasure = osmd.GraphicSheet.MeasureList[7][1];
        const note: VexFlowGraphicalNote = measure8.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
        expect([measure8.InitiallyActiveClef.ClefType, note.Clef().ClefType], "measure 8").to.deep.equal([ClefEnum.G, ClefEnum.G]);

        // the flute alone: the clef changes of the hidden violoncello aren't drawn, so they don't end its multiple rest measure
        osmd.Sheet.Instruments[0].Visible = true;
        osmd.Sheet.Instruments[1].Visible = false;
        osmd.updateGraphic();
        osmd.render();
        expect(multipleRestMeasureCounts(), "flute alone").to.deep.equal([0, 6, 0, 0, 0, 0, 0, 0]);
    });

    /**
     * test_multiple_rest_measures_auto_rehearsal_mark.musicxml: measures 2-5 are whole-measure rests, measure 4 has the rehearsal mark B.
     * A multiple rest measure only shows the rehearsal mark of its first measure, so measures 2-3 and 4-5 become multiple rest measures.
     */
    it("begins a new multiple rest measure at a rehearsal mark, and draws the rehearsal mark there", async () => {
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_rehearsal_mark.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-6").to.deep.equal([0, 2, 0, 2, 0, 0]);
        // [measure group id, text] of the rehearsal marks drawn
        const rehearsalMarks: [string, string][] = Array.from(container.querySelectorAll(".vf-stavesection"))
            .map((mark): [string, string] => [mark.closest(".vf-measure").id, mark.textContent]);
        expect(rehearsalMarks, "A in measure 1, B in measure 4").to.deep.equal([["osmd-m0-0", "A"], ["osmd-m3-0", "B"]]);
    });

    /**
     * test_multiple_rest_measures_auto_barlines.musicxml: measures 2-9 are whole-measure rests, measure 3 ends with a double barline,
     * measure 5 with a heavy-heavy one and measure 7 with a final barline (the end of the first movement).
     * A multiple rest measure only shows the barline of its last measure, so measures 2-3, 4-5, 6-7 and 8-9 become multiple rest measures.
     */
    it("ends a multiple rest measure with a double or final barline, and begins a new part after the final barline", async () => {
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = false; // one system, measure numbers 1-10 (read when loading)
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_barlines.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-10").to.deep.equal([0, 2, 0, 2, 0, 2, 0, 2, 0, 0]);
        // [measure number, barline] of the barlines at the measure ends
        const endBarlines: [number, SystemLinesEnum][] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].SystemLines
            .filter(line => line.linePosition === SystemLinePosition.MeasureEnd)
            .map((line): [number, SystemLinesEnum] => [line.topMeasure.MeasureNumber, line.lineType]);
        expect(endBarlines, "barlines after measures 1, 2-3, 4-5, 6-7, 8-9 and 10").to.deep.equal([
            [1, SystemLinesEnum.SingleThin], [2, SystemLinesEnum.DoubleThin], [4, SystemLinesEnum.DoubleBold],
            [6, SystemLinesEnum.ThinBold], [8, SystemLinesEnum.SingleThin], [10, SystemLinesEnum.ThinBold]]);

        // the second movement begins a new system when the multiple rest measure 6-7 ends the first one with its final barline
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = true; // (read when loading)
        await renderSample("test_multiple_rest_measures_auto_barlines.musicxml");
        const measuresPerSystem: number[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0].Measures.length);
        expect(measuresPerSystem, "measures 1, 2-3, 4-5, 6-7 in the first system, 8-9 and 10 in the second").to.deep.equal([4, 2]);
    });

    /**
     * test_multiple_rest_measures_auto_xml_breaks.musicxml: measures 2-7 are whole-measure rests, measure 4 begins a new system in the XML,
     * measure 6 a new page. The layout can't break within a multiple rest measure, so with newSystemFromXML and newPageFromXML,
     * measures 2-3, 4-5 and 6-7 become multiple rest measures. Without these options, measures 2-7 become one.
     */
    it("begins a new multiple rest measure at a system or page break from the XML that the layout follows", async () => {
        let restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_xml_breaks.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure without the breaks, for measures 1-8").to.deep.equal([0, 6, 0, 0, 0, 0, 0, 0]);

        osmd.setOptions({ newSystemFromXML: true, newPageFromXML: true });
        restMeasureCounts = await renderSample("test_multiple_rest_measures_auto_xml_breaks.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure with the breaks, for measures 1-8").to.deep.equal([0, 2, 0, 2, 0, 2, 0, 0]);
        // per page, the measure numbers of the first measures of its systems
        const systemStarts: number[][] = osmd.GraphicSheet.MusicPages.map(page =>
            page.MusicSystems.map(system => system.StaffLines[0].Measures[0].MeasureNumber));
        expect(systemStarts, "measures 1 and 4 begin the systems of page 1, measure 6 the one of page 2").to.deep.equal([[1, 4], [6]]);
    });

    /**
     * test_multiple_rest_measures_auto_first_measure.musicxml: measures 1-3 are whole-measure rests, and measures 1-4 are repeated.
     * The start markers of the repetitions in measure 1 aren't drawn, so measures 1-3 become a multiple rest measure.
     */
    it("begins a multiple rest measure at the first measure, and draws the clef, key and time signature there", async () => {
        const restMeasureCounts: number[] = await renderSample("test_multiple_rest_measures_auto_first_measure.musicxml");
        expect(restMeasureCounts, "measures per multiple rest measure, for measures 1-5").to.deep.equal([3, 0, 0, 0, 0]);
        // the measure groups of the clefs, key signatures and time signatures drawn, without the number of the multiple rest measure
        const beginInstructions: string[][] = [".vf-clef", ".vf-keysignature", ".vf-timesignature"].map(selector =>
            Array.from(container.querySelectorAll(selector)).filter(element => !element.closest(".vf-multirest"))
                .map(element => element.closest(".vf-measure").id));
        expect(beginInstructions, "the clef, G major and 4/4 in measure 1").to.deep.equal([["osmd-m0-0"], ["osmd-m0-0"], ["osmd-m0-0"]]);
    });

    /**
     * Measures 2-7 are whole-measure rests, the rests of measures 2 and 5 have a fermata (pause bars), the one of measure 5 inverted.
     * A multiple rest measure doesn't show fermatas, so measures 2 and 5 stay single rest measures, and measures 3-4 and 6-7 become
     * multiple rest measures (instead of one for measures 2-7).
     */
    it("keeps a rest measure with a fermata (a pause bar) out of multiple rest measures, and draws the fermata", async () => {
        const note: string = "<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>";
        const rest: string = "<note><rest/><duration>4</duration></note>";
        /** A whole-measure rest with a fermata of the type upright or inverted. */
        function fermataRest(type: string): string {
            return `<note><rest/><duration>4</duration><notations><fermata type="${type}"/></notations></note>`;
        }
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const contents: string[] = [attributes + note, fermataRest("upright"), rest, rest, fermataRest("inverted"), rest, rest, note];
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0"><part-list>
            <score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">` +
            contents.map((content, index) => `<measure number="${index + 1}">${content}</measure>`).join("") + "</part></score-partwise>");
        osmd.render();
        expect(multipleRestMeasureCounts(), "measures per multiple rest measure, for measures 1-8").to.deep.equal([0, 0, 2, 0, 0, 2, 0, 0]);
        // the measure groups of the notes drawn with modifiers: the rests with the fermatas
        const fermataMeasures: string[] = Array.from(container.querySelectorAll(".vf-modifiers")).map(modifiers => modifiers.closest(".vf-measure").id);
        expect(fermataMeasures, "the fermatas of measures 2 and 5").to.deep.equal(["osmd-m1-0", "osmd-m4-0"]);
    });
});
