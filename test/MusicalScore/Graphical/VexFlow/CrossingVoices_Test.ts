/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {VexFlowMeasure} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import {VexFlowVoiceEntry} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import {GraphicalStaffEntry} from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import {expect} from "chai";

describe("Crossing voices - lower note with upwards stem, higher note with downwards stem", () => {

    function renderMeasures(path: string = "test_crossing_voices.musicxml"): VexFlowMeasure[] {
        const score: Document = TestUtils.getScore(path);
        expect(score).to.not.be.undefined;
        const partwise: Element = TestUtils.getPartWiseElement(score);
        expect(partwise).to.not.be.undefined;
        const reader: MusicSheetReader = new MusicSheetReader();
        const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
        const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
        const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
        calc.calculate();
        return gms.MeasureList.map((staves) => staves[0] as VexFlowMeasure);
    }

    function voiceEntriesAt(measure: VexFlowMeasure, timestampRealValue: number): VexFlowVoiceEntry[] {
        const staffEntry: GraphicalStaffEntry = measure.staffEntries.find(
            (se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestampRealValue) < 1e-6);
        expect(staffEntry, `expected a staff entry at timestamp ${timestampRealValue}`).to.not.be.undefined;
        return staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[];
    }

    // x of the centre of the voice's note head, where it is drawn
    function noteX(gves: VexFlowVoiceEntry[], voiceId: number): number {
        const gve: VexFlowVoiceEntry = gves.find((g) => g.parentVoiceEntry.ParentVoice.VoiceId === voiceId);
        expect(gve, `voice ${voiceId} should be present`).to.not.be.undefined;
        return gve.notes[0].PositionAndShape.AbsolutePosition.x;
    }

    it("Should shift the stem-up voice right when crossed with a higher stem-down voice (2 voices)", (done: Mocha.Done) => {
        const measures: VexFlowMeasure[] = renderMeasures("test_crossing_voices.musicxml");

        // Measure 1: Voice 1 (G4, stem up) crossed under Voice 2 (C5, B4, A4, G4, stem down)
        const m1: VexFlowMeasure = measures[0];
        // Beats 1 & 2 (0, 0.25): C5 and B4 (a fourth and third above G4) -> small shift for crossed stems
        for (const timestamp of [0, 0.25]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(m1, timestamp);
            expect(noteX(gves, 1) - noteX(gves, 2)).to.be.greaterThan(0.2,
                `measure 1 at ${timestamp}: stem-up G4 should be shifted right of stem-down voice 2`);
        }
        // Beat 3 (0.5): A4 (a second above G4) -> full notehead stagger with stem-up G4 on the right
        const m1Beat3: VexFlowVoiceEntry[] = voiceEntriesAt(m1, 0.5);
        expect(noteX(m1Beat3, 1) - noteX(m1Beat3, 2)).to.be.greaterThan(1,
            "measure 1 at 0.5: stem-up G4 should be staggered a full notehead right of stem-down A4");
        // Beat 4 (0.75): G4 unison -> merged at the same x
        const m1Beat4: VexFlowVoiceEntry[] = voiceEntriesAt(m1, 0.75);
        expect(Math.abs(noteX(m1Beat4, 1) - noteX(m1Beat4, 2))).to.be.lessThan(0.1,
            "measure 1 at 0.75: unison G4 quarter notes should share the same column");

        // Measure 2: uncrossed voices (Voice 1 G4 stem up above Voice 2 F4, E4, D4, C4 stem down)
        const m2: VexFlowMeasure = measures[1];
        // Beat 1 (0): normal second (G4 over F4) -> lower stem-down F4 is staggered right
        expect(noteX(voiceEntriesAt(m2, 0), 2) - noteX(voiceEntriesAt(m2, 0), 1)).to.be.greaterThan(1);
        // Beats 2, 3, 4 (0.25, 0.5, 0.75): uncrossed third, fourth, fifth -> aligned on the beat
        for (const timestamp of [0.25, 0.5, 0.75]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(m2, timestamp);
            expect(Math.abs(noteX(gves, 1) - noteX(gves, 2))).to.be.lessThan(0.1,
                `measure 2 at ${timestamp}: uncrossed voices should stay aligned`);
        }
        done();
    });

    it("Should shift crossed beamed eighth notes and dotted notes (2 voices)", (done: Mocha.Done) => {
        const measures: VexFlowMeasure[] = renderMeasures("test_crossing_voices.musicxml");

        // Measure 3: beamed eighth notes crossing mid-measure
        const m3: VexFlowMeasure = measures[2];
        // 0, 0.125: C5, B4 (up) above G4 (down) -> uncrossed, aligned
        for (const timestamp of [0, 0.125]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(m3, timestamp);
            expect(Math.abs(noteX(gves, 1) - noteX(gves, 2))).to.be.lessThan(0.1);
        }
        // 0.5: F#4 (up) a second below G4 (down) -> Voice 1 staggered a full notehead right
        expect(noteX(voiceEntriesAt(m3, 0.5), 1) - noteX(voiceEntriesAt(m3, 0.5), 2)).to.be.greaterThan(1);
        // 0.625, 0.75, 0.875: D4, D4, C4 (up) below F4, G4, G4 (down) -> Voice 1 shifted right
        for (const timestamp of [0.625, 0.75, 0.875]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(m3, timestamp);
            expect(noteX(gves, 1) - noteX(gves, 2)).to.be.greaterThan(0.2,
                `measure 3 at ${timestamp}: crossed beamed eighth note should be shifted right`);
        }

        // Measure 4: dotted quarter notes (Voice 1 A4. up under Voice 2 C5. and B4. down)
        const m4: VexFlowMeasure = measures[3];
        expect(noteX(voiceEntriesAt(m4, 0), 1) - noteX(voiceEntriesAt(m4, 0), 2)).to.be.greaterThan(0.2);
        expect(noteX(voiceEntriesAt(m4, 0.375), 1) - noteX(voiceEntriesAt(m4, 0.375), 2)).to.be.greaterThan(1);
        done();
    });

    it("Should separate crossed voices in 3-voice measures", (done: Mocha.Done) => {
        const measures: VexFlowMeasure[] = renderMeasures("test_crossing_voices.musicxml");

        // Measure 6, beat 4 (0.75): Voice 2 (D5, down), Voice 3 (C5, up), Voice 1 (A4, up)
        const m6Beat4: VexFlowVoiceEntry[] = voiceEntriesAt(measures[5], 0.75);
        expect(noteX(m6Beat4, 1) - noteX(m6Beat4, 2)).to.be.greaterThan(0.2,
            "measure 6 at 0.75: stem-up A4 should be shifted right of stem-down D5");
        expect(noteX(m6Beat4, 3) - noteX(m6Beat4, 1)).to.be.greaterThan(0.5,
            "measure 6 at 0.75: middle C5 should be shifted further right of A4");

        // Measure 7, beat 1 (0): Voice 2 (D5, down), Voice 3 (B4, up), Voice 1 (A4, up)
        const m7Beat1: VexFlowVoiceEntry[] = voiceEntriesAt(measures[6], 0);
        expect(noteX(m7Beat1, 1) - noteX(m7Beat1, 2)).to.be.greaterThan(0.2,
            "measure 7 at 0: stem-up A4 should be shifted right of stem-down D5");
        expect(noteX(m7Beat1, 3) - noteX(m7Beat1, 1)).to.be.greaterThan(0.5,
            "measure 7 at 0: middle B4 should be shifted further right of A4");
        done();
    });

    it("Should not shift crossed voices when they are far apart or have no stems reaching the other notehead", (done: Mocha.Done) => {
        const measures: VexFlowMeasure[] = renderMeasures("test_crossing_voices_distant_stemless.musicxml");

        // Measure 1 (both stems visible):
        // Voice 1 is G3 (up/none), Voice 2 is B4 (0.25), G4 (0.75).
        // At 0.25 (B4), stems do not reach the other voice's notehead -> no shift.
        // At 0.75 (G4), the visible stem reaches the other notehead -> Voice 1 shifted right.
            const m0: VexFlowMeasure = measures[0];
            const m0Beat2: VexFlowVoiceEntry[] = voiceEntriesAt(m0, 0.25);
            expect(Math.abs(noteX(m0Beat2, 1) - noteX(m0Beat2, 2))).to.be.lessThan(0.1,
                "measure 1 at 0.25: stems do not reach the other notehead, should stay aligned");
            const m0Beat4: VexFlowVoiceEntry[] = voiceEntriesAt(m0, 0.75);
            expect(noteX(m0Beat4, 1) - noteX(m0Beat4, 2)).to.be.greaterThan(0.2,
                "measure 1 at 0.75: stem reaches the other notehead, should shift right");

        // Measure 7: both voices have <stem>none</stem> and do not overlap -> all beats stay aligned
        const m7: VexFlowMeasure = measures[6];
        for (const timestamp of [0, 0.25, 0.5, 0.75]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(m7, timestamp);
            expect(Math.abs(noteX(gves, 1) - noteX(gves, 2))).to.be.lessThan(0.1,
                `measure 7 at ${timestamp}: stemless notes should stay aligned`);
        }

        // Measures 9-11: whole note G4 (Voice 1) below high stem-down half notes C6-G5 (Voice 2) -> stems don't reach G4
        for (const measureIndex of [8, 9, 10]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measures[measureIndex], 0);
            expect(Math.abs(noteX(gves, 1) - noteX(gves, 2))).to.be.lessThan(0.5,
                `measure ${measureIndex + 1}: high stem-down half note does not reach whole note G4`);
        }

        // Measures 15-17: whole note G4 (Voice 1) below lower stem-down half notes D5-B4 (Voice 2) -> stem reaches G4
        for (const measureIndex of [14, 15, 16]) {
            const gves: VexFlowVoiceEntry[] = voiceEntriesAt(measures[measureIndex], 0);
            expect(noteX(gves, 1) - noteX(gves, 2)).to.be.greaterThan(0.5,
                `measure ${measureIndex + 1}: stem-down half note reaches whole note G4, should shift`);
        }
        done();
    });

});
