import { expect } from "chai";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowOctaveShift } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { OctaveEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { FillEmptyMeasuresWithWholeRests } from "../../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("Octave shift start timestamps", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1050px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function note(staff: number, duration: number, type: string, voice: number = 1): string {
        return `<note><pitch><step>C</step><octave>4</octave></pitch><duration>${duration}</duration>
          <voice>${voice}</voice><type>${type}</type><staff>${staff}</staff></note>`;
    }

    function score(sourceStaff: number = 1, targetStaff: number = 2, type: string = "down", size: number = 8): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
          <score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name>
          </score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>8</divisions>
          <time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
          <clef number="1"><sign>F</sign><line>4</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>
          </attributes>${note(sourceStaff, 8, "quarter")}<direction><direction-type>
          <octave-shift type="${type}" size="${size}"/></direction-type><staff>${sourceStaff}</staff></direction>
          ${note(targetStaff, 8, "quarter")}${note(sourceStaff, 16, "half")}
          <backup><duration>32</duration></backup><note><rest/><duration>32</duration><voice>2</voice>
          <type>whole</type><staff>${3 - sourceStaff}</staff></note></measure></part></score-partwise>`;
    }

    function voiceAt(measure: VexFlowMeasure, time: number): VexFlowVoiceEntry {
        return measure.staffEntries.find(entry => entry.relInMeasureTimestamp.RealValue === time)
            .graphicalVoiceEntries[0] as VexFlowVoiceEntry;
    }

    const shifts: {type: string, size: number, staff: number, expected: OctaveEnum}[] = [
        {type: "down", size: 8, staff: 1, expected: OctaveEnum.VA8},
        {type: "up", size: 8, staff: 2, expected: OctaveEnum.VB8},
        {type: "down", size: 15, staff: 2, expected: OctaveEnum.MA15},
        {type: "up", size: 15, staff: 1, expected: OctaveEnum.MB15}
    ];
    for (const shift of shifts) {
        it(`anchors ${shift.type} ${shift.size} at an onset on the other staff without moving the bracket there`, async () => {
            await osmd.load(score(shift.staff, 3 - shift.staff, shift.type, shift.size));
            for (const zoom of [1, 0.75]) {
                osmd.Zoom = zoom;
                osmd.render();
                const own: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][shift.staff - 1] as VexFlowMeasure;
                const other: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][2 - shift.staff] as VexFlowMeasure;
                const target: VexFlowVoiceEntry = voiceAt(other, 0.25);
                const graphical: VexFlowOctaveShift = own.ParentStaffLine.OctaveShifts[0] as VexFlowOctaveShift;
                const bracket: ReturnType<VexFlowOctaveShift["getTextBracket"]> = graphical.getTextBracket();
                expect(graphical.startNote === target.vfStaveNote, "same onset anchor").to.equal(true);
                expect(bracket.start.getAbsoluteX()).to.be.closeTo(target.vfStaveNote.getAbsoluteX(), 0.001);
                expect(bracket.start.getStave() === own.getVFStave(), "source staff").to.equal(true);
                expect(target.octaveShiftValue, "other-staff pitch remains unshifted").to.equal(OctaveEnum.NONE);
                expect(voiceAt(own, 0).octaveShiftValue, "note before the direction").to.equal(OctaveEnum.NONE);
                expect(voiceAt(own, 0.5).octaveShiftValue, "own-staff note after the direction").to.equal(shift.expected);
                expect(other.ParentStaffLine.OctaveShifts.length).to.equal(0);
                const text: SVGTextElement = Array.from(container.querySelectorAll("text"))
                    .find(element => element.textContent === String(shift.size)) as SVGTextElement;
                expect(text, "actual rendered octave label").not.to.equal(undefined);
                expect(Number(text.getAttribute("x"))).to.be.closeTo(target.vfStaveNote.getAbsoluteX(), 0.001);
            }
        });
    }

    it("keeps an exact same-staff anchor", async () => {
        await osmd.load(score(1, 1));
        osmd.render();
        const own: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const graphical: VexFlowOctaveShift = own.ParentStaffLine.OctaveShifts[0] as VexFlowOctaveShift;
        expect(graphical.getTextBracket().start === voiceAt(own, 0.25).vfStaveNote).to.equal(true);
    });

    it("does not borrow another staff's onset at the old timestamp after clipping", async () => {
        const continuation: string = `<measure number="2">${note(1, 32, "whole")}
          <backup><duration>32</duration></backup>${note(2, 8, "quarter", 2)}${note(2, 8, "quarter", 2)}${note(2, 16, "half", 2)}</measure>`;
        await osmd.load(score().replace("</part>", continuation + "</part>"));
        osmd.setOptions({drawFromMeasureNumber: 2});
        osmd.render();
        const own: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const graphical: VexFlowOctaveShift = own.ParentStaffLine.OctaveShifts[0] as VexFlowOctaveShift;
        expect(graphical.getTextBracket().start === voiceAt(own, 0).vfStaveNote).to.equal(true);
    });

    it("keeps a clipped boundary anchor in its later measure when the first visible measure is empty", async () => {
        const continuation: string = `<measure number="2">${note(2, 32, "whole")}</measure>
          <measure number="3">${note(1, 32, "whole")}</measure>`;
        osmd.EngravingRules.FillEmptyMeasuresWithWholeRest = FillEmptyMeasuresWithWholeRests.No;
        await osmd.load(score().replace("</part>", continuation + "</part>"));
        osmd.setOptions({drawFromMeasureNumber: 2});
        osmd.render();
        const empty: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const own: VexFlowMeasure = osmd.GraphicSheet.MeasureList[2][0] as VexFlowMeasure;
        expect(empty.staffEntries.length, "first rendered source measure has no anchors").to.equal(0);
        expect(empty.ParentStaffLine === own.ParentStaffLine, "fallback is later on the same system").to.equal(true);
        const graphical: VexFlowOctaveShift = own.ParentStaffLine.OctaveShifts[0] as VexFlowOctaveShift;
        const fallback: VexFlowVoiceEntry = voiceAt(own, 0);
        expect(graphical.getTextBracket().start.getAbsoluteX()).to.be.closeTo(fallback.vfStaveNote.getAbsoluteX(), 0.001);
        expect(graphical.getTextBracket().start === fallback.vfStaveNote).to.equal(true);
    });

    it("does not borrow an onset from a different instrument", async () => {
        const otherPart: string = `<part id="P2"><measure number="1"><attributes><divisions>8</divisions></attributes>
          ${note(1, 8, "quarter")}${note(1, 8, "quarter")}${note(1, 16, "half")}</measure></part>`;
        const xml: string = score().replace(note(2, 8, "quarter"), "<forward><duration>8</duration></forward>")
            .replace("</part-list>", '<score-part id="P2"><part-name>Other</part-name></score-part></part-list>')
            .replace("</score-partwise>", otherPart + "</score-partwise>");
        await osmd.load(xml);
        osmd.render();
        const own: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const graphical: VexFlowOctaveShift = own.ParentStaffLine.OctaveShifts[0] as VexFlowOctaveShift;
        expect(graphical.getTextBracket().start === voiceAt(own, 0).vfStaveNote).to.equal(true);
    });
});
