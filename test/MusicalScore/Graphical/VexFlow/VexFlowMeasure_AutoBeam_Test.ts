import Vex from "vexflow";
import VF = Vex.Flow;
import { expect } from "vitest";
import { AutoBeamOptions } from "../../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

// The autoBeam option on notes without <beam> elements: beam groups by time signature (compound meters per dotted beat),
//   and each voice of a staff beamed on its own.
describe("VexFlow Measure - autoBeam", () => {
    const steps: string[] = ["C", "D", "E", "F", "G", "A", "B"];
    /** count notes of a type (eighth: 2 divisions) in a voice, stepping up from C5. */
    function notes(count: number, type: string, voice: number = 1, octave: number = 5): string {
        const duration: number = type === "16th" ? 1 : type === "eighth" ? 2 : 4;
        return Array.from({ length: count }, (_, i: number) => `<note><pitch><step>${steps[i % 7]}</step><octave>${octave}</octave>` +
            `</pitch><duration>${duration}</duration><voice>${voice}</voice><type>${type}</type></note>`).join("");
    }
    function score(beats: number, beatType: number, content: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>4</divisions>
                <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef>
            </attributes>${content}</measure></part></score-partwise>`;
    }

    /** Renders the score with autoBeam and returns, per voice id, the number of notes of each automatic beam of measure 1. */
    async function autoBeamsPerVoice(xml: string, autoBeam: boolean = true, autoBeamOptions?: AutoBeamOptions): Promise<Map<number, number[]>> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.setOptions({ autoBeam: autoBeam, autoBeamOptions: autoBeamOptions });
        await osmd.load(new DOMParser().parseFromString(xml, "text/xml"));
        osmd.render();
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const voiceOfNote: Map<VF.StemmableNote, number> = new Map();
        for (const staffEntry of measure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                voiceOfNote.set((gve as VexFlowVoiceEntry).vfStaveNote, gve.parentVoiceEntry.ParentVoice.VoiceId);
            }
        }
        const beamsPerVoice: Map<number, number[]> = new Map();
        for (const beam of (measure as any).autoVfBeams as VF.Beam[]) { // private: the beams autoBeamNotes() created
            const voiceId: number = voiceOfNote.get(beam.getNotes()[0]);
            beamsPerVoice.set(voiceId, [...(beamsPerVoice.get(voiceId) ?? []), beam.getNotes().length]);
        }
        div.remove();
        return beamsPerVoice;
    }

    it("Beams 6/8 per dotted quarter, eighths and 16ths", async () => {
        expect((await autoBeamsPerVoice(score(6, 8, notes(6, "eighth")))).get(1)).to.deep.equal([3, 3]);
        expect((await autoBeamsPerVoice(score(6, 8, notes(12, "16th")))).get(1)).to.deep.equal([6, 6]);
    });

    it("Beams 5/8 as 3+2 and keeps 4/4 per beat", async () => {
        expect((await autoBeamsPerVoice(score(5, 8, notes(5, "eighth")))).get(1)).to.deep.equal([3, 2]);
        expect((await autoBeamsPerVoice(score(4, 4, notes(8, "eighth")))).get(1)).to.deep.equal([2, 2, 2, 2]);
    });

    it("Beams a voice on its own, not ended by another voice's notes", async () => {
        const xml: string = score(4, 4, notes(8, "eighth") + "<backup><duration>16</duration></backup>" + notes(4, "quarter", 2, 4));
        const beamsPerVoice: Map<number, number[]> = await autoBeamsPerVoice(xml);
        expect(beamsPerVoice.get(1)).to.deep.equal([2, 2, 2, 2]);
        expect(beamsPerVoice.has(2), "no beams for the quarter notes").to.equal(false);
    });

    it("Takes the groups given in autoBeamOptions over the default ones", async () => {
        const beamsPerVoice: Map<number, number[]> = await autoBeamsPerVoice(score(6, 8, notes(6, "eighth")), true, { groups: [[2, 8]] });
        expect(beamsPerVoice.get(1)).to.deep.equal([2, 2, 2]);
    });

    it("Creates no automatic beams with autoBeam off", async () => {
        expect((await autoBeamsPerVoice(score(6, 8, notes(6, "eighth")), false)).size).to.equal(0);
    });
});
