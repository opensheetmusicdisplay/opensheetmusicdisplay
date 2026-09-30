import {expect} from "chai";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {TestUtils} from "../../Util/TestUtils";

describe("Part group names", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    function renderedLabels(): SVGTextElement[] {
        return Array.from(div.querySelectorAll<SVGTextElement>("svg text"))
            .filter((label: SVGTextElement): boolean => !!label.textContent?.trim());
    }

    function renderedText(): string[] {
        return renderedLabels().map((label: SVGTextElement): string => label.textContent!);
    }

    function renderedLabel(text: string): SVGTextElement {
        return renderedLabels().find((label: SVGTextElement): boolean => label.textContent === text);
    }

    async function load(name: string): Promise<void> {
        await osmd.load(TestUtils.getScore(name));
        osmd.render();
    }

    function staffStartX(systemIndex: number): number {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[systemIndex].StaffLines[0].PositionAndShape.RelativePosition.x;
    }

    it("renders nested group labels, respects hidden names, and updates public label settings", async (): Promise<void> => {
        await load("test_group_names.musicxml");
        const piano: SVGTextElement = renderedLabel("Piano");
        const pianoAbbreviation: SVGTextElement = renderedLabel("Pno.");
        const manualsAbbreviation: SVGTextElement = renderedLabel("Man.");
        const upperAbbreviation: SVGTextElement = renderedLabel("Up.");
        const upper: SVGTextElement = renderedLabel("Upper");
        const lower: SVGTextElement = renderedLabel("Lower");
        const text: string[] = renderedText();
        expect(text.filter((value: string): boolean => value === "Piano"), "the first-system group name is rendered once")
            .to.have.length(1);
        expect(text).to.not.include("Manuals");
        expect(text.filter((value: string): boolean => value === "Pno."), "the later abbreviation is rendered once")
            .to.have.length(1);
        expect(text.filter((value: string): boolean => value === "Man."), "the hidden group's abbreviation is rendered once")
            .to.have.length(1);
        expect(pianoAbbreviation.getBoundingClientRect().right, "the outer abbreviation precedes the nested abbreviation")
            .to.be.lessThan(manualsAbbreviation.getBoundingClientRect().left);
        expect(manualsAbbreviation.getBoundingClientRect().right, "the hidden-name abbreviation precedes the part abbreviation")
            .to.be.lessThan(upperAbbreviation.getBoundingClientRect().left);
        expect((piano.getBoundingClientRect().top + piano.getBoundingClientRect().bottom) / 2,
            "the group label is centered over its member parts").to.be.closeTo(
            (upper.getBoundingClientRect().top + lower.getBoundingClientRect().bottom) / 2, 1,
        );

        const groupStart: number = staffStartX(0);
        osmd.EngravingRules.RenderPartGroupNames = false;
        osmd.render();
        expect(renderedText()).to.not.include("Piano").and.to.not.include("Pno.");
        expect(staffStartX(0), "hiding the group labels removes their layout columns").to.be.lessThan(groupStart);

        osmd.EngravingRules.RenderPartGroupNames = true;
        osmd.render();
        expect(renderedText()).to.include("Piano");
        expect(staffStartX(0), "restoring the rule restores the group-label layout").to.equal(groupStart);

        osmd.Sheet.Instruments[0].Visible = false;
        osmd.Sheet.Instruments[1].Visible = false;
        osmd.render();
        const visiblePiano: SVGTextElement = renderedLabel("Piano");
        const visibleLower: SVGTextElement = renderedLabel("Lower");
        expect((visiblePiano.getBoundingClientRect().top + visiblePiano.getBoundingClientRect().bottom) / 2,
            "the group label stays centered on the visible lower staff").to.be.closeTo(
            (visibleLower.getBoundingClientRect().top + visibleLower.getBoundingClientRect().bottom) / 2, 1,
        );
        expect(renderedText()).to.not.include("Pno.");

        osmd.EngravingRules.RenderPartAbbreviationsForSingleStaff = true;
        osmd.render();
        expect(renderedText()).to.include("Pno.");

        osmd.EngravingRules.RenderPartAbbreviations = false;
        osmd.render();
        expect(renderedText()).to.include("Piano").and.to.not.include("Pno.");

        osmd.EngravingRules.RenderPartAbbreviations = true;
        osmd.EngravingRules.RenderPartNames = false;
        osmd.render();
        expect(renderedText()).to.not.include("Piano").and.to.not.include("Pno.");
    });

    it("does not leave an empty part-label column beside a group name", async (): Promise<void> => {
        await load("test_group_name_only.musicxml");
        const piano: SVGTextElement = renderedLabel("Piano");
        expect(piano, "the group name remains visible").to.not.equal(undefined);
        expect(renderedText()).to.not.include("Pno.");
        expect(renderedLabel("Harp").getBoundingClientRect().left, "a part outside the group keeps its label at the left edge")
            .to.be.closeTo(piano.getBoundingClientRect().left, 1);
        const groupOnlyStart: number = staffStartX(0);
        expect(groupOnlyStart, "the group label reserves the only label column").to.be.greaterThan(0);

        const labelMargin: number = osmd.EngravingRules.SystemLabelsRightMargin;
        osmd.EngravingRules.SystemLabelsRightMargin = 0;
        osmd.render();
        expect(groupOnlyStart - staffStartX(0), "only the margin after the group label is reserved")
            .to.equal(labelMargin);
    });

    it("omits labels for unnamed and crossing groups", async (): Promise<void> => {
        await load("Schubert_An_die_Musik.xml");
        expect(renderedText()).to.not.include("group");

        await load("test_crossing_part_groups.musicxml");
        expect(renderedText()).to.not.include("First group");
        expect(renderedText()).to.not.include("Second group");
        expect(renderedText()).to.include("Violin");
    });
});
