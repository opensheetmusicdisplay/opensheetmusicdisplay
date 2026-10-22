import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import Vex from "vexflow";

describe("Written augmentation dots", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1100px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });

    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function score(dots: number, nested: boolean, chord: boolean, descending: boolean = false, writtenType: boolean = true): string {
        const factor: number = 2 - 1 / Math.pow(2, dots);
        const pitches: string[] = chord ? (descending ? ["E", "C"] : ["C", "E"]) : ["C"];
        const notes: string = Array.from({length: 2}, (_, index: number) => {
            const actual: number = nested ? (index === 0 ? 12 : 6) : 1;
            const normal: number = nested ? (index === 0 ? 27 : 9) : 1;
            let tuplets: string = "";
            if (nested) {
                if (index === 0) {
                    tuplets = '<tuplet type="start" number="2" show-number="none"><tuplet-actual><tuplet-number>2</tuplet-number>' +
                        "</tuplet-actual><tuplet-normal><tuplet-number>3</tuplet-number></tuplet-normal></tuplet>" +
                        '<tuplet type="stop" number="2"/>';
                } else {
                    tuplets = '<tuplet type="stop" number="1"/>';
                }
            }
            return pitches.map((step: string, pitchIndex: number) => `<note>${pitchIndex > 0 ? "<chord/>" : ""}
                <pitch><step>${step}</step><octave>4</octave></pitch>
                <duration>${480 * normal / actual * factor}</duration><voice>1</voice>
                ${writtenType ? "<type>quarter</type>" + "<dot/>".repeat(dots) : ""}
                ${nested ? `<time-modification><actual-notes>${actual}</actual-notes><normal-notes>${normal}</normal-notes>
                    <normal-type>eighth</normal-type></time-modification>` : ""}
                ${pitchIndex === 0 && tuplets ? `<notations>${tuplets}</notations>` : ""}
                </note>`).join("");
        }).join("");
        return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Dots</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>480</divisions>
            <time><beats>${nested ? 12 + 60 * factor : 32 * factor}</beats><beat-type>64</beat-type></time>
            <clef><sign>G</sign><line>2</line></clef></attributes>
            ${nested ? `<note><rest/><duration>360</duration><voice>1</voice><type>eighth</type>
                <time-modification><actual-notes>6</actual-notes><normal-notes>9</normal-notes></time-modification>
                <notations><tuplet type="start" number="1" show-number="none"/></notations></note>` : ""}
            ${notes}</measure></part></score-partwise>`;
    }

    for (const [description, dots, nested, chord, descending, writtenType] of [
        ["undotted chords in nested and enclosing tuplets", 0, true, true, false, true],
        ["undotted tuplet chords whose XML pitches descend", 0, true, true, true, true],
        ["dotted tuplet chords", 1, true, true, false, true],
        ["double-dotted tuplet chords", 2, true, true, false, true],
        ["dotted single notes in tuplets", 1, true, false, false, true],
        ["ordinary dotted chords", 1, false, true, false, true],
        ["dots inferred from duration when the written type is absent", 1, false, true, false, false],
    ] as [string, number, boolean, boolean, boolean, boolean][]) {
        it(`Renders ${description}`, async () => {
            await osmd.load(score(dots, nested, chord, descending, writtenType));
            for (let render: number = 0; render < 2; render++) {
                osmd.render();
                const entries: VexFlowVoiceEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries
                    .flatMap(entry => entry.graphicalVoiceEntries)
                    .filter(entry => !entry.notes[0].sourceNote.isRest()) as VexFlowVoiceEntry[];
                expect(entries.length).to.equal(2);
                if (nested) {
                    expect(entries[0].notes.some(note => note.sourceNote.NoteTuplets.length === 2), "nested tuplet membership").to.equal(true);
                }
                for (const entry of entries) {
                    expect(entry.notes.length).to.equal(chord ? 2 : 1);
                    expect(entry.vfStaveNote.getDuration(), "written quarter-note shape").to.equal("q");
                    const modifiers: any[] = (entry.vfStaveNote as any).getModifiers();
                    expect(modifiers.filter(modifier => modifier.getCategory() === "dots").length,
                        "augmentation dots on every pitch of the rendered chord").to.equal(dots * entry.notes.length);
                    expect(entry.vfStaveNote.getTicks().value(), "sounding duration stays independent of the written dots")
                        .to.be.closeTo(entry.notes[0].graphicalNoteLength.RealValue * Vex.Flow.RESOLUTION, 1e-8);
                    for (const note of entry.notes) {
                        expect(note.numberOfDots, "each chord member's graphical dot count").to.equal(dots);
                    }
                }
                expect(container.querySelectorAll("svg .vf-notehead").length, "visible noteheads").to.be.greaterThan(0);
            }
        });
    }
});
