import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Sustain ties starting at TAB technique endpoints", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(systemBreak: boolean = false, backend: "svg" | "canvas" = "svg"): Promise<void> {
        const score: Document = TestUtils.getScore("test_tab_sustain_after_hp.musicxml").cloneNode(true) as Document;
        if (systemBreak) {
            const print: Element = score.createElement("print");
            print.setAttribute("new-system", "yes");
            score.querySelectorAll("part > measure")[3].prepend(print);
        }
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend, newSystemFromXML: true});
        await osmd.load(score);
        osmd.render();
    }
    function ties(measure: number): GraphicalTie[] {
        return osmd.GraphicSheet.MeasureList[measure][0].staffEntries.flatMap(entry => entry.GraphicalTies);
    }
    function check(): void {
        for (let measure: number = 0; measure < 3; measure++) {
            const all: GraphicalTie[] = ties(measure);
            expect(all.filter(tie => tie.Tie.Type === "")).to.have.length(1);
            expect(all.filter(tie => tie.Tie.Type !== "")).to.have.length(1);
            expect(all.every(tie => tie.vfTies.length > 0)).to.equal(true);
            const sustain: GraphicalTie = all.find(tie => tie.Tie.Type === "");
            expect(sustain.StartNote.sourceNote.NoteTies.map(tie => tie.Type)).to.include.members(["", measure === 1 ? "P" : "H"]);
            expect(sustain.StartNote.sourceNote).not.to.equal(sustain.EndNote.sourceNote);
            expect(sustain.StartNote.sourceNote.Pitch.getHalfTone()).to.equal(sustain.EndNote.sourceNote.Pitch.getHalfTone());
        }
    }
    it("draws both the technique and outgoing sustain, and preserves them on redraw/reflow", async () => {
        await render();
        check();
        expect(div.querySelectorAll(".vf-stavetie path")).to.have.length(6);
        osmd.render();
        check();
        div.style.width = "650px";
        osmd.render();
        check();
    });
    it("draws the outgoing sustain on both sides of a system break", async () => {
        await render(true);
        check();
        const sustain: GraphicalTie = ties(2).find(tie => tie.Tie.Type === "");
        expect(sustain.vfTies).to.have.length(2);
        expect(div.querySelectorAll(".vf-stavetie path")).to.have.length(7);
        for (const path of Array.from(div.querySelectorAll("svg path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
    });
    it("respects a hidden endpoint and restores ties when hidden notes are requested", async () => {
        await render();
        const endpoint: VexFlowGraphicalNote = osmd.GraphicSheet.MeasureList[0][0].staffEntries[1].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
        endpoint.sourceNote.PrintObject = false;
        osmd.render();
        expect(ties(0)).to.have.length(0);
        osmd.EngravingRules.RenderHiddenNotes = true;
        osmd.render();
        check();
    });
    it("uses native ties with canvas", async () => {
        await render(false, "canvas");
        check();
        expect(div.querySelector("canvas")).not.to.equal(null);
    });
    it("does not duplicate a visible technique and sustain for a hidden unison voice", async () => {
        const score: Document = TestUtils.getScore("test_tab_sustain_after_hp.musicxml").cloneNode(true) as Document;
        for (const measure of Array.from(score.querySelectorAll("part > measure"))) {
            const notes: Element[] = Array.from(measure.querySelectorAll("note"));
            const backup: Element = score.createElement("backup");
            const duration: Element = score.createElement("duration");
            duration.textContent = "4";
            backup.append(duration);
            measure.append(backup);
            for (const source of notes) {
                const note: Element = source.cloneNode(true) as Element;
                note.setAttribute("print-object", "no");
                note.querySelector("voice").textContent = "2";
                measure.append(note);
            }
        }
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false});
        await osmd.load(score);
        osmd.render();
        expect(div.querySelectorAll(".vf-stavetie path")).to.have.length(6);
        osmd.render();
        expect(div.querySelectorAll(".vf-stavetie path")).to.have.length(6);
    });
    it("clears outgoing graphical ties when the legacy NoteTie setter is cleared", async () => {
        await render();
        const sustain: GraphicalTie = ties(0).find(tie => tie.Tie.Type === "");
        const source: any = sustain.StartNote.sourceNote;
        const legacy: any = source.NoteTie;
        expect(source.NoteTies).to.have.length(2);
        source.NoteTie = legacy;
        expect(source.NoteTies).to.have.length(2);
        source.NoteTie = undefined;
        expect(source.NoteTies).to.have.length(0);
        osmd.render();
        expect(ties(0).filter(tie => tie.Tie.Type === "")).to.have.length(0);
        expect(ties(0).filter(tie => tie.Tie.Type === "H")).to.have.length(1);
    });
});
