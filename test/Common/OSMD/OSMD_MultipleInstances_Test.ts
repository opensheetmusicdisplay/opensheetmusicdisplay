import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { VexFlowBackend } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowBackend";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Several OSMD instances on one web page, e.g. a preview and a main view, or two sheets.
 * Every instance gives the element of its page N the same id, "osmdCanvasPage" + N, so an instance has to find its pages through
 * its own backends: document.getElementById() returns the first instance's page. The cursor of the second instance moved to a page
 * of the first sheet, and the backends' getCanvasSize() measured the first sheet's page.
 */
describe("Multiple OSMD instances on a web page", () => {
    let containers: HTMLElement[] = [];
    afterEach(() => {
        for (const container of containers) {
            container.remove();
        }
        containers = [];
    });

    /** Loads and renders the sample with a new OSMD instance, in a new container of the given width at the end of the web page. */
    async function renderInNewContainer(width: number, backend: string, pageFormat?: string): Promise<OpenSheetMusicDisplay> {
        const container: HTMLElement = document.createElement("div");
        container.style.width = width + "px";
        document.body.appendChild(container);
        containers.push(container);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend, pageFormat });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        return osmd;
    }

    it("measures and shows the cursor on the instance's own page, with the same page ids in each instance", async () => {
        for (const backendType of ["svg", "canvas"]) {
            // the second sheet is narrower, so its page is higher
            const sheets: OpenSheetMusicDisplay[] = [await renderInNewContainer(1200, backendType), await renderInNewContainer(600, backendType)];
            const pageHeights: number[] = [];
            for (let i: number = 0; i < sheets.length; i++) {
                const backend: VexFlowBackend = sheets[i].Drawer.Backends[0];
                const page: HTMLElement = backend.getInnerElement();
                const sheetName: string = `${backendType}, sheet ${i + 1}`;
                // the ids stay as they were: apps may select or style e.g. #osmdCanvasPage1
                expect(page.id, sheetName).to.equal("osmdCanvasPage1");
                expect(backend.getCanvasSize() === page.offsetHeight,
                       `${sheetName}: getCanvasSize() ${backend.getCanvasSize()}, height of its page ${page.offsetHeight}`).to.equal(true);
                pageHeights.push(page.offsetHeight);
            }
            expect(pageHeights[0] !== pageHeights[1], `${backendType}: the pages have different heights: ${pageHeights}`).to.equal(true);

            const cursor: Cursor = sheets[1].cursor;
            cursor.show();
            expect(containers[1].contains(cursor.cursorElement), `${backendType}: the second sheet's cursor in its container`).to.equal(true);
            for (const container of containers) {
                container.remove();
            }
            containers = [];
        }
    });

    it("moves the cursor to the pages of its own sheet (a page format)", async () => {
        const sheets: OpenSheetMusicDisplay[] = [await renderInNewContainer(1200, "svg", "A5_L"), await renderInNewContainer(1200, "svg", "A5_L")];
        for (const sheet of sheets) {
            expect(sheet.GraphicSheet.MusicPages.length, "pages").to.be.greaterThan(1);
        }
        const osmd: OpenSheetMusicDisplay = sheets[1];
        const cursor: Cursor = osmd.cursor;
        cursor.show();
        const pagesVisited: Set<number> = new Set<number>();
        /** Checks that the cursor is on the page of the second sheet that shows the cursor's measure. */
        const expectOnOwnPage: () => void = (): void => {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[cursor.Iterator.CurrentMeasureIndex][0];
            const pageNumber: number = measure.ParentMusicSystem.Parent.PageNumber;
            pagesVisited.add(pageNumber);
            const pageElement: HTMLElement = osmd.Drawer.Backends[pageNumber - 1].getInnerElement();
            expect(cursor.cursorElement.parentElement === pageElement,
                   `the cursor in measure ${measure.MeasureNumber} on page ${pageNumber} of the second sheet` +
                   ` (in the first sheet's container: ${containers[0].contains(cursor.cursorElement)})`).to.equal(true);
        };
        while (!cursor.Iterator.EndReached) {
            expectOnOwnPage();
            cursor.next();
        }
        expect(pagesVisited.size, "pages visited by the cursor").to.equal(osmd.GraphicSheet.MusicPages.length);
        cursor.reset(); // back to the first page
        expectOnOwnPage();
    });
});
