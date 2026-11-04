import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * EngravingRules.FitPartLabelsToMeasures: in a narrow container, the part names "Clarinet in B♭" and "Violin" left the
 * first measure (clef, key and time signature, two half notes) too little room, so that its notes were drawn past the end
 * of the staff. The first system shows the names on two lines instead, else the abbreviations, else no labels, and later
 * systems leave out their abbreviations when they don't fit.
 */
describe("Part labels in narrow containers", (): void => {
    const sampleFilename: string = "test_part_names_narrow_container.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });

    afterEach((): void => {
        osmd.clear();
        container.remove();
    });

    /** Renders the sample in a container of the given width at zoom 1.5 and returns its systems. */
    async function renderSystems(width: number): Promise<MusicSystem[]> {
        container.style.width = `${width}px`;
        await osmd.load(TestUtils.getScore(sampleFilename));
        osmd.zoom = 1.5;
        osmd.render();
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
    }

    function labels(system: MusicSystem): string[] {
        return system.Labels.map((label: GraphicalLabel): string => label.Label.text);
    }

    /** The stretch factor of the system's first measure: 1 is its minimum width, below 0 its notes pass the staff end. */
    function firstMeasureStretch(system: MusicSystem): number {
        return system.StaffLines[0].Measures[0].staffEntriesScaleFactor;
    }

    // The widths (at zoom 1.5) are in the middle of each range, so that fonts measured slightly differently don't matter:
    //   the names fit from about 620 px on, the names on two lines from about 550 px, the abbreviations from about 500 px.
    it("shows the part names when the first measure fits next to them", async (): Promise<void> => {
        const systems: MusicSystem[] = await renderSystems(700);
        expect(labels(systems[0])).toEqual(["Clarinet in B♭", "Violin"]);
        expect(labels(systems[1])).toEqual(["Cl.", "Vln."]);
    });

    it("shows the part names on two lines when only that way the first measure fits", async (): Promise<void> => {
        const systems: MusicSystem[] = await renderSystems(585);
        expect(labels(systems[0])).toEqual(["Clarinet\nin B♭", "Violin"]);
        expect(firstMeasureStretch(systems[0])).toBeGreaterThanOrEqual(1);
    });

    it("shows the part abbreviations when the names don't fit on two lines either", async (): Promise<void> => {
        const systems: MusicSystem[] = await renderSystems(525);
        expect(labels(systems[0])).toEqual(["Cl.", "Vln."]);
        expect(firstMeasureStretch(systems[0])).toBeGreaterThanOrEqual(1);
    });

    it("leaves out the labels when not even the abbreviations fit, also on later systems", async (): Promise<void> => {
        const systems: MusicSystem[] = await renderSystems(400);
        expect(systems.map(labels)).toEqual(systems.map((): string[] => []));
        // the first measure alone is wider than the system, so it is squeezed, but its notes stay on the staff
        expect(firstMeasureStretch(systems[0])).toBeGreaterThan(0);
    });

    it("keeps the part names with FitPartLabelsToMeasures off", async (): Promise<void> => {
        osmd.EngravingRules.FitPartLabelsToMeasures = false;
        const systems: MusicSystem[] = await renderSystems(400);
        expect(labels(systems[0])).toEqual(["Clarinet in B♭", "Violin"]);
        expect(firstMeasureStretch(systems[0])).toBeLessThan(0); // as before: the notes are drawn past the staff end
    });
});
