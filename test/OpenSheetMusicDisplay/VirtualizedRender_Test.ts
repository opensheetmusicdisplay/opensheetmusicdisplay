import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalMusicPage } from "../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../Util/TestUtils";

describe("OpenSheetMusicDisplay virtualized render", () => {
    it("lays out the complete score while drawing only the initial systems", async () => {
        const scrollElement: HTMLDivElement = document.createElement("div");
        scrollElement.style.width = "800px";
        scrollElement.style.height = "300px";
        scrollElement.style.overflow = "auto";
        const container: HTMLDivElement = document.createElement("div");
        container.style.width = "800px";
        scrollElement.appendChild(container);
        document.body.appendChild(scrollElement);

        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        osmd.enableSystemVirtualization({ scrollElement, overscanViewports: 0 });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.renderVirtualized({ initialSystems: 1 });

        const totalSystems: number = osmd.GraphicSheet.MusicPages
            .reduce((sum, musicPage): number => sum + musicPage.MusicSystems.length, 0);
        const drawnSystems: number = container.querySelectorAll("g.osmd-system").length;
        expect(osmd.GraphicSheet.MeasureList.length).to.equal(osmd.Sheet.SourceMeasures.length);
        expect(totalSystems).to.be.greaterThan(1);
        expect(drawnSystems).to.be.greaterThan(0);
        expect(drawnSystems).to.be.lessThan(totalSystems);
        expect(osmd.SystemVirtualizationStats.materializedSystems).to.be.lessThan(totalSystems);
        expect(osmd.SystemVirtualizationStats.unmaterializedSystems)
            .to.equal(totalSystems - osmd.SystemVirtualizationStats.materializedSystems);

        const page: GraphicalMusicPage = osmd.GraphicSheet.MusicPages[0];
        const lastSystemIndex: number = page.MusicSystems.length - 1;
        const lastSystem: MusicSystem = page.MusicSystems[lastSystemIndex];
        const futureNote: VexFlowGraphicalNote = lastSystem.StaffLines
            .flatMap(staffLine => staffLine.Measures)
            .flatMap(measure => measure.staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries)
            .flatMap(voiceEntry => voiceEntry.notes)
            .find(note => !!note) as VexFlowGraphicalNote;
        futureNote.setColor("#d40000", {});
        expect(futureNote.getSVGGElement()).to.equal(undefined);

        scrollElement.scrollTop = scrollElement.scrollHeight;
        osmd.updateSystemVirtualization();
        const lastSystemGroup: SVGGElement = container.querySelector(
            `g.osmd-system[data-osmd-system-key='${page.PageNumber}:${lastSystemIndex}']`
        );
        expect(lastSystemGroup).to.not.equal(null);
        const futureNotePath: SVGPathElement = futureNote.getNoteheadSVGs()[0]?.querySelector("path");
        expect(futureNotePath?.getAttribute("fill")).to.equal("#d40000");

        osmd.disableSystemVirtualization();
        scrollElement.remove();
    });
});
