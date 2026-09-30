import {expect} from "chai";
import {TestUtils} from "../../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

describe("Metronome position rendering", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    function marks(): DOMRect[] {
        return Array.from(div.querySelectorAll<SVGGraphicsElement>(".vf-stavetempo"))
            .map((element: SVGGraphicsElement): DOMRect => element.getBoundingClientRect());
    }

    function separate(first: DOMRect, second: DOMRect): boolean {
        return first.right <= second.left || second.right <= first.left ||
            first.bottom <= second.top || second.bottom <= first.top;
    }

    function note(step: string, duration: number = 1, type: string = "quarter"): string {
        return `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration><type>${type}</type></note>`;
    }

    function mark(contents: string, offset: string = ""): string {
        return `<direction placement="above"><direction-type><metronome>${contents}</metronome></direction-type>${offset}</direction>`;
    }

    function bpm(value: number, type: string = "quarter", dots: string = ""): string {
        return mark(`<beat-unit>${type}</beat-unit>${dots}<per-minute>${value}</per-minute>`);
    }

    function score(content: string, secondPart: string = "", followingMeasures: string = ""): Document {
        const attributes: string = `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef></attributes>`;
        return new DOMParser().parseFromString(`<score-partwise version="4.0">
          <part-list><score-part id="P1"><part-name>Flute</part-name></score-part>
            ${secondPart ? '<score-part id="P2"><part-name>Oboe</part-name></score-part>' : ""}
          </part-list>
          <part id="P1"><measure number="1">${attributes}${content}</measure>${followingMeasures}</part>
          ${secondPart ? `<part id="P2"><measure number="1">${attributes}${secondPart}</measure></part>` : ""}
        </score-partwise>`, "application/xml");
    }

    it("draws both marks at their beats and keeps them stable on rerender", async (): Promise<void> => {
        await osmd.load(TestUtils.getScore("test_metronome_positions.musicxml"));
        osmd.render();
        expect(marks().length).to.equal(2);
        expect(marks()[1].left).to.be.greaterThan(marks()[0].right);
        const notes: NodeListOf<SVGGraphicsElement> = div.querySelectorAll<SVGGraphicsElement>(".vf-stavenote");
        expect(Math.abs(marks()[1].left - notes[2].getBoundingClientRect().left)).to.be.lessThan(20);
        const positions: number[][] = marks().map((box: DOMRect): number[] => [box.left, box.top]);
        osmd.render();
        expect(marks().map((box: DOMRect): number[] => [box.left, box.top])).to.deep.equal(positions);
    });

    it("positions a lone mark between note onsets using its offset", async (): Promise<void> => {
        await osmd.load(score(note("C", 2, "half") +
            mark("<beat-unit>quarter</beat-unit><per-minute>96</per-minute>", "<offset>-1</offset>") +
            note("E") + note("F")));
        osmd.render();
        expect(marks().length).to.equal(1);
        const notes: NodeListOf<SVGGraphicsElement> = div.querySelectorAll<SVGGraphicsElement>(".vf-stavenote");
        expect(marks()[0].left).to.be.greaterThan(notes[0].getBoundingClientRect().left);
        expect(marks()[0].left).to.be.lessThan(notes[1].getBoundingClientRect().left);
    });

    it("keeps later repetitions but draws repeated declarations across parts only once", async (): Promise<void> => {
        const content: string = bpm(80) + note("C") + note("D") + bpm(80) + note("E") + note("F");
        await osmd.load(score(content, content));
        osmd.render();
        expect(marks().length).to.equal(2);
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.render();
        expect(marks().length).to.equal(2);
        const notes: NodeListOf<SVGGraphicsElement> = div.querySelectorAll<SVGGraphicsElement>(".vf-stavenote");
        expect(Math.abs(marks()[1].left - notes[2].getBoundingClientRect().left)).to.be.lessThan(20);
        osmd.Sheet.Instruments[0].Visible = true;
        osmd.render();
        expect(marks().length).to.equal(2);
    });

    it("keeps different printed marks and deduplicates identical note equations", async (): Promise<void> => {
        await osmd.load(score(bpm(80) + bpm(96) + bpm(80, "half") +
            bpm(80, "quarter", "<beat-unit-dot/>") + note("C", 4, "whole")));
        osmd.render();
        const boxes: DOMRect[] = marks();
        expect(boxes.length).to.equal(4);
        for (let i: number = 0; i < boxes.length; i++) {
            for (let j: number = i + 1; j < boxes.length; j++) {
                expect(separate(boxes[i], boxes[j])).to.equal(true);
            }
        }

        const left: string = "<metronome-note><metronome-type>quarter</metronome-type></metronome-note>";
        const equals: string = "<metronome-relation>equals</metronome-relation>";
        const dotted: string = "<metronome-note><metronome-type>quarter</metronome-type><metronome-dot/></metronome-note>";
        const equation: string = mark(left + equals + dotted);
        await osmd.load(score(equation + equation + mark(dotted + equals + left) + note("C", 4, "whole")));
        osmd.render();
        expect(marks().length).to.equal(2);
        expect(separate(marks()[0], marks()[1])).to.equal(true);

        const untied: string = left + "<metronome-note><metronome-type>eighth</metronome-type></metronome-note>";
        const tied: string = "<beat-unit>quarter</beat-unit><beat-unit-tied><beat-unit>eighth</beat-unit></beat-unit-tied>";
        const quarter: string = "<beat-unit>quarter</beat-unit>";
        const leftTie: string = mark(tied + quarter);
        const rightTie: string = mark(quarter + tied);
        await osmd.load(score(mark(untied + equals + left) + leftTie + leftTie +
            mark(left + equals + untied) + rightTie + rightTie + note("C", 4, "whole")));
        osmd.render();
        expect(marks().length, "tied and untied equations remain distinct on either side").to.equal(4);
        expect(div.querySelectorAll(".vf-metronometie path").length, "identical tied equations are still deduplicated").to.equal(2);
    });

    it("separates nearby marks with the geometric skyline", async (): Promise<void> => {
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        await osmd.load(TestUtils.getScore("test_metronome_close_positions.musicxml"));
        osmd.render();
        expect(marks().length).to.equal(2);
        expect(separate(marks()[0], marks()[1])).to.equal(true);
    });

    it("keeps marks clear of tempo text in separate and shared directions", async (): Promise<void> => {
        for (const [sample, label] of [
            ["test_divisions_after_first_note_JingleBellRock_extract.musicxml", "Moderate swing beat"],
            ["test_metronome_beside_tempo_text.musicxml", "Presto"],
        ]) {
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
            const text: SVGGraphicsElement = Array.from(div.querySelectorAll<SVGGraphicsElement>("text"))
                .find((element: SVGGraphicsElement): boolean => element.textContent.trim() === label);
            expect(text).to.not.equal(undefined);
            expect(marks().length).to.be.greaterThan(0);
            expect(separate(marks()[0], text.getBoundingClientRect())).to.equal(true);
        }
    });

    it("places an end-of-measure mark on the next system and respects the drawing range", async (): Promise<void> => {
        await osmd.load(score(note("C", 4, "whole") + bpm(96), "",
            `<measure number="2"><print new-system="yes"/>${note("D", 4, "whole")}</measure>`));
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.render();
        expect(marks().length).to.equal(1);
        const notes: NodeListOf<SVGGraphicsElement> = div.querySelectorAll<SVGGraphicsElement>(".vf-stavenote");
        expect(marks()[0].top).to.be.greaterThan(notes[0].getBoundingClientRect().bottom);
        expect(marks()[0].bottom).to.be.lessThan(notes[1].getBoundingClientRect().top);
        osmd.setOptions({drawFromMeasureNumber: 2});
        osmd.render();
        expect(marks().length).to.equal(1);
    });
});
