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

    it("draws plain group names and later abbreviations beside part names", async (): Promise<void> => {
        await load("test_group_names.musicxml");
        const piano: SVGTextElement = renderedLabel("Piano");
        const upper: SVGTextElement = renderedLabel("Upper");
        const lower: SVGTextElement = renderedLabel("Lower");
        const text: string[] = renderedText();
        expect(piano, "the first-system group name is rendered").to.not.equal(undefined);
        expect(upper, "the upper part name is rendered").to.not.equal(undefined);
        expect(lower, "the lower part name is rendered").to.not.equal(undefined);
        expect(text).to.include("Pno.");
        expect(text).to.not.include("Grand Piano");
        expect(text).to.not.include("Lower desk");
        expect(piano.getBoundingClientRect().right, "the group column precedes the part column")
            .to.be.lessThan(upper.getBoundingClientRect().left);
        expect((piano.getBoundingClientRect().top + piano.getBoundingClientRect().bottom) / 2,
            "the group label is centered over its member parts").to.be.closeTo(
            (upper.getBoundingClientRect().top + lower.getBoundingClientRect().bottom) / 2, 1,
        );
    });

    it("does not leave an empty part-label column beside a group name", async (): Promise<void> => {
        await load("test_group_name_only.musicxml");
        const piano: SVGTextElement = renderedLabel("Piano");
        expect(piano, "the group name remains visible").to.not.equal(undefined);
        expect(renderedText()).to.not.include("Pno.");
        const groupOnlyStart: number = staffStartX(0);
        expect(groupOnlyStart, "the group label reserves the only label column").to.be.greaterThan(0);

        osmd.EngravingRules.RenderPartGroupNames = false;
        osmd.render();
        expect(staffStartX(0), "no part-label column remains when the only group label is hidden").to.equal(0);

        osmd.EngravingRules.RenderPartGroupNames = true;
        osmd.render();
        expect(staffStartX(0), "restoring the group label restores its measured layout").to.equal(groupOnlyStart);
    });

    it("honors print-object for a group name independently of its abbreviation", async (): Promise<void> => {
        await load("test_group_hidden_name.musicxml");
        expect(renderedText()).to.not.include("Piano");
        expect(renderedText()).to.include("Pno.");
        const hiddenNameStart: number = staffStartX(0);
        osmd.EngravingRules.RenderPartGroupNames = false;
        osmd.render();
        expect(staffStartX(0), "a hidden first-system name leaves no extra label column").to.equal(hiddenNameStart);
        osmd.EngravingRules.RenderPartGroupNames = true;
        osmd.render();
        expect(staffStartX(1), "the visible later abbreviation reserves its own column").to.be.greaterThan(0);
    });

    it("can hide and restore group labels without changing the part-label or bracket contracts", async (): Promise<void> => {
        await osmd.load(TestUtils.getScore("test_group_names.musicxml"));
        osmd.render();
        const groupStart: number = staffStartX(0);
        expect(renderedText()).to.include("Piano").and.include("Upper").and.include("Pno.").and.include("Up.");

        osmd.EngravingRules.RenderPartGroupNames = false;
        osmd.render();
        expect(renderedText()).to.not.include("Piano");
        expect(renderedText()).to.not.include("Pno.");
        expect(renderedText()).to.include("Upper").and.include("Up.");
        expect(staffStartX(0), "hiding the group labels removes their layout column").to.be.lessThan(groupStart);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].GroupBrackets.length,
            "the existing group bracket remains").to.be.greaterThan(0);

        osmd.EngravingRules.RenderPartGroupNames = true;
        osmd.render();
        expect(renderedText()).to.include("Piano").and.include("Pno.");
        expect(staffStartX(0), "restoring the rule restores the group-label layout").to.equal(groupStart);

        osmd.EngravingRules.RenderPartNames = false;
        osmd.render();
        expect(renderedText()).to.not.include("Piano").and.to.not.include("Upper");

        osmd.EngravingRules.RenderPartNames = true;
        osmd.EngravingRules.RenderPartAbbreviations = false;
        osmd.render();
        expect(renderedText()).to.not.include("Pno.").and.to.not.include("Up.");
    });

    it("uses the single-staff abbreviation setting for group and part labels together", async (): Promise<void> => {
        await osmd.load(TestUtils.getScore("test_group_names.musicxml"));
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.render();
        const piano: SVGTextElement = renderedLabel("Piano");
        const lower: SVGTextElement = renderedLabel("Lower");
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[1].StaffLines,
            "only the lower staff remains on the later system").to.have.length(1);
        expect((piano.getBoundingClientRect().top + piano.getBoundingClientRect().bottom) / 2,
            "the first-system group name stays centered on the visible lower staff").to.be.closeTo(
            (lower.getBoundingClientRect().top + lower.getBoundingClientRect().bottom) / 2, 1,
        );
        expect(renderedText()).to.not.include("Pno.").and.to.not.include("Lo.");

        osmd.EngravingRules.RenderPartAbbreviationsForSingleStaff = true;
        osmd.render();
        expect(renderedText()).to.include("Pno.").and.include("Lo.");
    });

    it("keeps valid outer and nested group names in distinct columns", async (): Promise<void> => {
        await load("test_nested_part_group_names.musicxml");
        const winds: SVGTextElement = renderedLabel("Winds");
        const reeds: SVGTextElement = renderedLabel("Reeds");
        const flute: SVGTextElement = renderedLabel("Flute");
        expect(winds, "the outer group label is rendered").to.not.equal(undefined);
        expect(reeds, "the nested group label is rendered").to.not.equal(undefined);
        expect(flute, "the part label is rendered").to.not.equal(undefined);
        expect(winds.getBoundingClientRect().right, "the outer group column precedes the nested group column")
            .to.be.lessThan(reeds.getBoundingClientRect().left);
        expect(reeds.getBoundingClientRect().right, "the nested group column precedes the part column")
            .to.be.lessThan(flute.getBoundingClientRect().left);
    });

    it("does not invent a fallback label for an unnamed group", async (): Promise<void> => {
        await load("Schubert_An_die_Musik.xml");
        expect(renderedText()).to.not.include("group");
    });

    it("suppresses labels for overlapping and malformed group boundaries", async (): Promise<void> => {
        await load("test_crossing_part_groups.musicxml");
        expect(renderedText()).to.not.include("First group");
        expect(renderedText()).to.not.include("Second group");
        expect(renderedText()).to.include("Violin");
        await load("test_malformed_part_groups.musicxml");
        expect(renderedText()).to.not.include("Malformed group");
        expect(renderedText()).to.include("Flute");
    });
});
