import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Pitch } from "../../../../src/Common/DataObjects/Pitch";
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { MusicSystem } from "../../../../src/MusicalScore/Graphical/MusicSystem";
import { VexFlowVibratoBracket } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { WavyLine } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * calculateSingleWavyLine falls back to `measure.staffEntries[0]` (and to the last
 * staffEntry of the last staffline measure) when it cannot find a staff entry for the
 * wavy line's timestamp. A measure can legitimately have no staff entries -- e.g. an
 * IsExtraGraphicalMeasure used to show a key/rhythm change, or an empty measure in the
 * drawing range of a large score -- in which case that lookup yields `undefined`.
 *
 * setStartNote/setEndNote then dereferenced `.graphicalVoiceEntries` on it and the
 * TypeError aborted the entire render. They now report "no note found" (false), which
 * is the same contract the callers already handle for the multi-system case.
 */
describe("VexFlowVibratoBracket", () => {
    function createBracket(): VexFlowVibratoBracket {
        return new VexFlowVibratoBracket(new WavyLine(undefined), new BoundingBox(undefined));
    }

    it("setStartNote returns false for an undefined staff entry instead of throwing", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        let result: boolean;
        expect(() => result = bracket.setStartNote(undefined)).to.not.throw();
        expect(result, "no start note could be found").to.be.false;
        expect(bracket.startNote, "start note stays unset").to.be.undefined;
        done();
    });

    it("setEndNote returns false for an undefined staff entry instead of throwing", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        let result: boolean;
        expect(() => result = bracket.setEndNote(undefined)).to.not.throw();
        expect(result, "no end note could be found").to.be.false;
        expect(bracket.endNote, "end note stays unset").to.be.undefined;
        done();
    });

    it("still reports false for a staff entry without voice entries", (done: Mocha.Done) => {
        const bracket: VexFlowVibratoBracket = createBracket();
        const emptyStaffEntry: GraphicalStaffEntry = { graphicalVoiceEntries: [] } as GraphicalStaffEntry;
        expect(bracket.setStartNote(emptyStaffEntry), "no start note in an empty staff entry").to.be.false;
        expect(bracket.setEndNote(emptyStaffEntry), "no end note in an empty staff entry").to.be.false;
        done();
    });
});

/**
 * A trill's wavy line crossing two system breaks, in two parts (Violin I and II), with each of the two systems it leaves
 * ending in an extra measure (courtesy key signature, then courtesy time signature) that has no staff entries.
 */
describe("Wavy line across systems", () => {
    const sampleFilename: string = "test_wavy_line_multiline_extragraphicalmeasure.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // the sample's system breaks: 3 systems regardless of width
    });
    afterEach(() => {
        container.remove();
    });

    /** "system: part m.start-end" for each drawn wavy line segment, from the measures of its start and end note */
    function wavyLineSegments(): string[] {
        const segments: string[] = [];
        osmd.GraphicSheet.MusicPages[0].MusicSystems.forEach((system: MusicSystem, systemIndex: number) => {
            for (const staffLine of system.StaffLines) {
                for (const wavyLine of staffLine.WavyLines) {
                    const bracket: VexFlowVibratoBracket = wavyLine as VexFlowVibratoBracket;
                    const startMeasure: number = bracket.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                    const endMeasure: number = bracket.endVfVoiceEntry?.parentStaffEntry.parentMeasure.MeasureNumber;
                    segments.push(`${systemIndex + 1}: ${staffLine.ParentStaff.ParentInstrument.Name} m.${startMeasure}-${endMeasure}`);
                }
            }
        });
        return segments;
    }

    it("draws each segment up to the last note of its system, not to the extra measure at its end", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render(); // threw a TypeError for the second system, whose last measure is an extra measure
        expect(wavyLineSegments()).to.deep.equal([
            "1: Violin I m.1-2", "1: Violin II m.1-2", // ended in m.1 before (drawn up to the end of its start measure)
            "2: Violin I m.3-4", "2: Violin II m.3-4",
            "3: Violin I m.5-6", "3: Violin II m.5-6",
        ]);
    });

    it("draws the wavy line of a part after a hidden instrument on that part's staff lines", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.Sheet.Instruments[0].Visible = false; // the systems' staff line indices no longer match the staff indices
        osmd.render();
        expect(wavyLineSegments()).to.deep.equal(["1: Violin II m.1-2", "2: Violin II m.3-4", "3: Violin II m.5-6"]);
    });

    it("starts the segment of a system whose first measure has no notes at the first note of the system", async () => {
        const score: Document = TestUtils.getScore(sampleFilename).cloneNode(true) as Document;
        // empty the first measure of the second system: a measure without notes has no staff entries
        score.querySelectorAll("measure[number='3'] note").forEach((note: Element) => note.remove());
        await osmd.load(score);
        osmd.render(); // threw a TypeError before PR #1733, then left out the segments of the second system
        expect(wavyLineSegments()).to.deep.equal([
            "1: Violin I m.1-2", "1: Violin II m.1-2",
            "2: Violin I m.4-4", "2: Violin II m.4-4",
            "3: Violin I m.5-6", "3: Violin II m.5-6",
        ]);
    });
});

/**
 * Trill lines on notes with grace notes (osmd-extended issue 112, from Dolet for Sibelius). A grace note before a main note
 * shares its staff entry and comes first in it: the wavy line was attached to the grace note, so it was drawn from the
 * grace note on, before or through the trill mark of the main note.
 * A trill line over one note, which Dolet writes as trill-mark, wavy-line start and wavy-line stop on the note, ended at the
 * end of the note, before the end of its trill mark, where its wavy line starts: it was drawn as a stub or not at all.
 */
describe("Wavy line of a trill on a note with grace notes", () => {
    /** 4/4, flute. m.1: grace note C5, B4 quarter with a trill line over it, C5 dotted half.
     *  m.2: D5 half, C5 quarter, B4 quarter with a trill line over it, followed by its Nachschlag: grace notes A4 B4.
     *  m.3: grace note D5, C5 quarter with a trill line up to the B4 quarter after grace note C5, A4 half. */
    const sampleFilename: string = "test_wavy_line_trill_grace_notes.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** e.g. "B4", or "grace A4" */
    function noteName(voiceEntry: VexFlowVoiceEntry): string {
        const pitch: Pitch = voiceEntry.notes[0].sourceNote.Pitch;
        return `${voiceEntry.parentVoiceEntry.IsGrace ? "grace " : ""}${Pitch.getNoteEnumString(pitch.FundamentalNote)}${pitch.Octave + 3}`;
    }

    /** "m.<measure> <start note>-<end note>, <where it ends>" for each drawn wavy line */
    function wavyLines(): string[] {
        const lines: string[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const bracket of staffLine.WavyLines as VexFlowVibratoBracket[]) {
                    let end: string = "at the end of the end note";
                    if (bracket.ToEndOfStopStave) {
                        end = "at the end of the measure";
                    } else if (bracket.nextVfVoiceEntry) {
                        end = `in front of ${noteName(bracket.nextVfVoiceEntry)}`;
                    }
                    const measureNumber: number = bracket.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                    lines.push(`m.${measureNumber} ${noteName(bracket.startVfVoiceEntry)}-${noteName(bracket.endVfVoiceEntry)}, ${end}`);
                }
            }
        }
        return lines;
    }

    it("is attached to the trilled main notes, and covers the whole note it starts and stops at", async () => {
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.render();
        const lines: string[] = wavyLines();
        expect(lines, lines.join("; ")).to.deep.equal([
            "m.1 B4-B4, in front of C5", // was "m.1 grace C5-grace C5, at the end of the end note"
            "m.2 B4-B4, in front of grace A4", // over the Nachschlag until the end of the measure before
            "m.3 C5-B4, at the end of the end note", // was "m.3 grace D5-grace C5, ...", from grace note to grace note
        ]);
    });
});
