import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB augmentation dots", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    async function render(dots: number, chord: boolean = false, backend: "svg" | "canvas" = "svg"): Promise<void> {
        const duration: number = dots === 2 ? 7 : 6;
        const note: (isChord: boolean) => string = isChord => `<note>${isChord ? "<chord/>" : ""}
            <pitch><step>${isChord ? "A" : "E"}</step><octave>3</octave></pitch><duration>${duration}</duration><type>quarter</type>${"<dot/>".repeat(dots)}
            <notations><technical><string>${isChord ? 3 : 4}</string><fret>2</fret></technical></notations></note>`;
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend});
        // Complete 4/4 bar: dotted quarter, half rest, and eighth/sixteenth rest.
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>4</divisions>
            <time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef>
            <staff-details><staff-lines>6</staff-lines></staff-details></attributes>${note(false)}${chord ? note(true) : ""}
            <note><rest/><duration>8</duration><type>half</type></note>
            <note><rest/><duration>${8 - duration}</duration><type>${dots === 2 ? "16th" : "eighth"}</type></note>
            </measure></part></score-partwise>`);
        osmd.render();
    }

    function firstNote(): VexFlowGraphicalNote {
        return osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
    }

    it("draws single and double dots once per note or chord without changing the source duration", async () => {
        for (const chord of [false, true]) {
            for (const dots of [1, 2]) {
                osmd?.clear();
                await render(dots, chord);
                expect(div.querySelectorAll(".vf-tab-rhythm-dot path")).to.have.length(dots);
                expect(firstNote().sourceNote.Length.RealValue).to.equal((dots === 2 ? 7 : 6) / 16);
                for (const path of Array.from(div.querySelectorAll("svg path"))) {
                    expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
                }
            }
        }
    });

    it("retains dot coordinates on redraw and makes dots follow note colouring", async () => {
        await render(2, true);
        const paths: () => Element[] = () => Array.from(div.querySelectorAll(".vf-tab-rhythm-dot path"));
        const initial: (string | null)[] = paths().map(path => path.getAttribute("d"));
        osmd.render();
        expect(paths().map(path => path.getAttribute("d"))).to.deep.equal(initial);
        firstNote().setColor("#ff0000");
        expect(paths().map(path => path.getAttribute("fill"))).to.deep.equal(["#ff0000", "#ff0000"]);
    });

    it("renders dotted chords with the canvas backend", async () => {
        await render(2, true, "canvas");
        expect(div.querySelector("canvas")).not.to.equal(null);
        expect(firstNote().sourceNote.Length.RealValue).to.equal(7 / 16);
    });
});
