import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Tablature bends", () => {
    async function renderBend(
        amount: number, fret: number, release: boolean = false, releaseOnly: boolean = false, splitNotations: boolean = false
    ): Promise<any> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg"});
        const bends: string = (releaseOnly ? "" : `<bend><bend-alter>${amount}</bend-alter></bend>`) +
            (release ? `<bend><bend-alter>${amount}</bend-alter><release/></bend>` : "");
        await osmd.load(`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>1</divisions>
            <time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details>
            </attributes><note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>whole</type>
            <notations><technical><string>4</string><fret>${fret}</fret>
            ${splitNotations ? "</technical></notations><notations><technical>" : ""}${bends}</technical></notations>
            </note></measure></part></score-partwise>`);
        osmd.render();
        const note: VexFlowGraphicalNote = osmd.GraphicSheet.findGraphicalMeasure(0, 0)
            .staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
        const modifiers: any[] = (note.vfnote[0] as any).getModifiers().filter((modifier: any) => modifier.getCategory() === "bends");
        // All curve coordinates must be finite: an explicit VexFlow phrase width
        // without draw_width silently produces NaN SVG paths.
        for (const path of Array.from(div.querySelectorAll("svg path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
        const result: any = {modifiers, amount: (note.sourceNote as TabNote).BendArray[0].bendalter,
            labels: Array.from(div.querySelectorAll("svg text")).map((text: Element) => text.textContent)};
        div.remove();
        return result;
    }

    for (const fret of [0, 2, 12]) {
        it(`labels a semitone bend as 1/2 at fret ${fret}`, async () => {
            const result: any = await renderBend(1, fret);
            expect(result.modifiers[0].phrase[0].text).to.equal("1/2");
            expect(result.labels).to.include("1/2");
        });
    }

    it("preserves fractional semitones for quarter-tone bends", async () => {
        const result: any = await renderBend(0.5, 2);
        expect(result.amount).to.equal(0.5);
        expect(result.modifiers[0].phrase[0].text).to.equal("1/4");
    });

    for (const [amount, label] of [[1.5, "3/4"], [2.5, "1 1/4"], [3, "1 1/2"], [4, "2"]] as [number, string][]) {
        it(`labels a ${amount}-semitone bend as ${label}`, async () => {
            const result: any = await renderBend(amount, 2);
            expect(result.modifiers[0].phrase[0].text).to.equal(label);
        });
    }

    it("labels a whole-tone bend as Full", async () => {
        const result: any = await renderBend(2, 2);
        expect(result.modifiers[0].phrase[0].text).to.equal("Full");
    });

    it("reads a negative bend in a separate notations block as a release", async () => {
        const result: any = await renderBend(-1, 2, false, false, true);
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0].phrase.map((step: any) => step.type)).to.deep.equal([1]);
    });

    it("renders a release-only bend without an extra upward segment", async () => {
        const result: any = await renderBend(1, 2, true, true);
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0].phrase.map((step: any) => step.type)).to.deep.equal([1]);
    });

    it("anchors a connected bend peak over its hidden continuation and retains visible parentheses", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg"});
        const xml: string = `<?xml version="1.0"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>1</divisions>
            <time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef>
            <staff-details><staff-lines>6</staff-lines></staff-details></attributes>
            <note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type>
            <notations><technical><string>4</string><fret>2</fret><bend><bend-alter>1</bend-alter></bend></technical></notations></note>
            <note><pitch><step>F</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type>
            <notehead parentheses="yes">normal</notehead>
            <notations print-object="no"><technical><string>4</string><fret>2</fret></technical></notations>
            <notations><technical><bend><bend-alter>-1</bend-alter></bend></technical></notations></note>
            <note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type>
            <notehead parentheses="yes">normal</notehead><notations><technical><string>4</string><fret>2</fret>
            </technical></notations></note></measure></part></score-partwise>`;
        try {
            await osmd.load(xml);
            osmd.render();
            const measure: any = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
            const target: any = measure.staffEntries[1].graphicalVoiceEntries[0].notes[0];
            expect(target.sourceNote.FretVisible).to.equal(false);
            const labels: string[] = Array.from(div.querySelectorAll("svg text")).map((text: Element) => text.textContent);
            expect(labels.filter((text: string) => text === "2")).to.have.length(1);
            expect(labels).to.include("(2)");
            const group: Element = div.querySelector(".vf-tab-bend-span");
            expect(group).not.to.equal(null);
            const bendLabel: SVGGraphicsElement = group.querySelector("text");
            const box: DOMRect = bendLabel.getBBox();
            const targetNote: any = target.vfnote[0];
            expect(box.x + box.width / 2).to.be.closeTo(targetNote.getAbsoluteX() + targetNote.glyph.getWidth() / 2, 0.5);
            expect(group.querySelector("path").getAttribute("d")).not.to.match(/NaN|Infinity/);
        } finally { div.remove(); }
    });

    it("renders a bend and release as one continuous phrase", async () => {
        const result: any = await renderBend(1, 2, true);
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0].phrase.map((step: any) => step.type)).to.deep.equal([0, 1]);
        expect(result.modifiers[0].phrase.map((step: any) => step.text)).to.deep.equal(["1/2", ""]);
    });
});
